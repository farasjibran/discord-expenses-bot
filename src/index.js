const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const { saveTransaction, getTransactions, deleteTransactions, updateTransactions, getSummary, getCategories, getOrCreateCategory } = require('./modules/supabaseDB');
const { extractTransaction, detectCategory } = require('./modules/groqExtractor');

const ADMIN_USER_ID = process.env.ADMIN_DISCORD_USER_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName('expense')
    .setDescription('Catat pengeluaran')
    .addStringOption(option =>
      option.setName('nama').setDescription('Nama pengeluaran').setRequired(true))
    .addNumberOption(option =>
      option.setName('harga').setDescription('Nominal (Rupiah)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('income')
    .setDescription('Catat pemasukan')
    .addStringOption(option =>
      option.setName('nama').setDescription('Nama pemasukan').setRequired(true))
    .addNumberOption(option =>
      option.setName('harga').setDescription('Nominal (Rupiah)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('summary')
    .setDescription('Lihat ringkasan transaksi')
    .addStringOption(option =>
      option.setName('periode').setDescription('Periode: hari ini, kemarin, minggu ini, bulan ini, atau custom YYYY-MM-DD sampai YYYY-MM-DD').setRequired(false)),
  new SlashCommandBuilder()
    .setName('expenses')
    .setDescription('Lihat list pengeluaran')
    .addStringOption(option =>
      option.setName('periode').setDescription('Filter periode (opsional)').setRequired(false)),
  new SlashCommandBuilder()
    .setName('incomes')
    .setDescription('Lihat list pemasukan')
    .addStringOption(option =>
      option.setName('periode').setDescription('Filter periode (opsional)').setRequired(false)),
  new SlashCommandBuilder()
    .setName('categories')
    .setDescription('Lihat daftar kategori')
    .addStringOption(option =>
      option.setName('jenis')
      .setDescription('Filter jenis: pengeluaran atau pemasukan')
      .setRequired(false)
      .addChoices(
        { name: 'Pengeluaran', value: 'pengeluaran' },
        { name: 'Pemasukan', value: 'pemasukan' }
      )),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Tampilkan panduan penggunaan bot')
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Registering slash commands...');
    const guildId = process.env.DISCORD_GUILD_ID;
    const route = guildId
      ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId)
      : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

    await rest.put(route, { body: commands.map(c => c.toJSON()) });
    console.log('Slash commands registered successfully.');
  } catch (err) {
    console.error('Failed to register commands:', err.message);
  }
}

function isAdmin(userId) {
  return userId === ADMIN_USER_ID;
}

function formatRupiah(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: process.env.TIMEZONE || 'Asia/Jakarta'
  };
  return date.toLocaleDateString('id-ID', options);
}

function parsePeriode(periode) {
  const now = new Date();
  const timezone = process.env.TIMEZONE || 'Asia/Jakarta';

  const toWIB = (d) => {
    return new Date(d.toLocaleString('en-US', { timeZone: timezone }));
  };

  const lower = periode.toLowerCase().trim();

  if (lower === 'hari ini' || lower === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { dateFrom: start.toISOString(), dateTo: now.toISOString(), label: 'Hari Ini' };
  }

  if (lower === 'kemarin' || lower === 'yesterday') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { dateFrom: start.toISOString(), dateTo: end.toISOString(), label: 'Kemarin' };
  }

  if (lower === 'minggu ini' || lower === 'week this') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString(), dateTo: now.toISOString(), label: 'Minggu Ini' };
  }

  if (lower === 'bulan ini' || lower === 'month this') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: start.toISOString(), dateTo: now.toISOString(), label: 'Bulan Ini' };
  }

  // Custom range: YYYY-MM-DD sampai YYYY-MM-DD
  const match = periode.match(/(\d{4}-\d{2}-\d{2})\s*(?:sampai|s\/d|-)\s*(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return {
      dateFrom: new Date(match[1]).toISOString(),
      dateTo: new Date(match[2] + 'T23:59:59').toISOString(),
      label: `${match[1]} — ${match[2]}`
    };
  }

  // Default: bulan ini
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: start.toISOString(), dateTo: now.toISOString(), label: 'Bulan Ini' };
}

async function handleSummaryCommand(interaction) {
  const periode = interaction.options.getString('periode') || 'bulan ini';
  const { dateFrom, dateTo, label } = parsePeriode(periode);

  const transactionsResult = await getTransactions({ dateFrom, dateTo });
  if (!transactionsResult.success) {
    await interaction.reply({ content: `Gagal mengambil data: ${transactionsResult.error}`, ephemeral: true });
    return;
  }

  const summaryResult = await getSummary({ dateFrom, dateTo });
  if (!summaryResult.success) {
    await interaction.reply({ content: `Gagal mengambil ringkasan: ${summaryResult.error}`, ephemeral: true });
    return;
  }

  const summary = summaryResult.data;
  const transactions = transactionsResult.data;

  const embed = new EmbedBuilder()
    .setTitle(`Ringkasan Keuangan — ${label}`)
    .setColor(summary.selisih >= 0 ? 0x16a34a : 0xdc2626)
    .addFields(
      { name: 'Pemasukan', value: formatRupiah(summary.totalPemasukan), inline: true },
      { name: 'Pengeluaran', value: formatRupiah(summary.totalPengeluaran), inline: true },
      { name: 'Selisih', value: formatRupiah(summary.selisih), inline: true }
    )
    .setFooter({ text: `${summary.totalCount} transaksi` })
    .setTimestamp();

  if (transactions.length === 0) {
    embed.setDescription('Belum ada transaksi untuk periode ini.');
  } else {
    const listText = transactions.slice(0, 20).map((t, i) => {
      const icon = t.jenis === 'pemasukan' ? '🟢' : '🔴';
      return `${i + 1}. ${icon} ${t.nama} — ${formatRupiah(t.harga)} — ${formatDate(t.created_at)}`;
    }).join('\n');
    embed.setDescription(listText);
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleListCommand(interaction, jenis) {
  const periode = interaction.options.getString('periode') || 'bulan ini';
  const { dateFrom, dateTo, label } = parsePeriode(periode);

  const result = await getTransactions({ jenis, dateFrom, dateTo });
  if (!result.success) {
    await interaction.reply({ content: `Gagal mengambil data: ${result.error}`, ephemeral: true });
    return;
  }

  const transactions = result.data;

  if (transactions.length === 0) {
    await interaction.reply({ content: `Belum ada transaksi ${jenis} untuk ${label}.`, ephemeral: true });
    return;
  }

  const listText = transactions.slice(0, 20).map((t, i) => {
    const icon = jenis === 'pemasukan' ? '🟢' : '🔴';
    return `${i + 1}. ${icon} ${t.nama} — ${formatRupiah(t.harga)} — ${formatDate(t.created_at)}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`Daftar ${jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} — ${label}`)
    .setColor(jenis === 'pemasukan' ? 0x16a34a : 0xdc2626)
    .setDescription(listText)
    .setFooter({ text: `${transactions.length} transaksi` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleCategoriesCommand(interaction) {
  const jenisFilter = interaction.options.getString('jenis');
  
  const result = await getCategories(jenisFilter ? { jenis: jenisFilter } : {});
  
  if (!result.success) {
    await interaction.reply({ content: `Gagal mengambil kategori: ${result.error}`, ephemeral: true });
    return;
  }

  const categories = result.data;

  if (categories.length === 0) {
    await interaction.reply({ content: 'Belum ada kategori tersedia.', ephemeral: true });
    return;
  }

  const pengeluaranCats = categories.filter(c => c.jenis === 'pengeluaran');
  const pemasukanCats = categories.filter(c => c.jenis === 'pemasukan');

  const embed = new EmbedBuilder()
    .setTitle('📂 Daftar Kategori')
    .setColor(0x3b82f6)
    .setTimestamp();

  if (jenisFilter === 'pengeluaran' || !jenisFilter) {
    if (pengeluaranCats.length > 0) {
      const listText = pengeluaranCats.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
      embed.addFields({ name: '🔴 Pengeluaran', value: listText, inline: false });
    }
  }

  if (jenisFilter === 'pemasukan' || !jenisFilter) {
    if (pemasukanCats.length > 0) {
      const listText = pemasukanCats.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
      embed.addFields({ name: '🟢 Pemasukan', value: listText, inline: false });
    }
  }

  embed.setFooter({ text: `Total: ${categories.length} kategori` });

  await interaction.reply({ embeds: [embed] });
}

async function handleSlashCommand(interaction) {
  const commandName = interaction.commandName;
  const userId = interaction.user.id;

  if (!isAdmin(userId) && ['summary', 'expenses', 'incomes', 'categories'].includes(commandName)) {
    await interaction.reply({ content: 'Maaf, command ini hanya untuk admin.', ephemeral: true });
    return;
  }

  try {
    switch (commandName) {
      case 'expense': {
        const nama = interaction.options.getString('nama');
        const harga = Math.round(interaction.options.getNumber('harga'));
        
        // Auto-detect category
        const categoriesResult = await getCategories({ jenis: 'pengeluaran' });
        let categoryId = null;
        
        if (categoriesResult.success && categoriesResult.data.length > 0) {
          const categoryDetection = await detectCategory(nama, 'pengeluaran', categoriesResult.data);
          
          if (categoryDetection.success) {
            const categoryResult = await getOrCreateCategory(categoryDetection.category, 'pengeluaran');
            if (categoryResult.success) {
              categoryId = categoryResult.data.id;
            }
          }
        }
        
        const result = await saveTransaction({
          jenis: 'pengeluaran',
          nama,
          harga,
          categoryId,
          sourceDiscordId: userId,
          rawMessage: `/expense ${nama} ${harga}`
        });
        
        if (result.success) {
          await interaction.reply(`✅ Tercatat: Pengeluaran — ${nama} — ${formatRupiah(harga)}`);
        } else {
          await interaction.reply({ content: `Gagal menyimpan: ${result.error}`, ephemeral: true });
        }
        break;
      }
      case 'income': {
        const nama = interaction.options.getString('nama');
        const harga = Math.round(interaction.options.getNumber('harga'));
        
        // Auto-detect category
        const categoriesResult = await getCategories({ jenis: 'pemasukan' });
        let categoryId = null;
        
        if (categoriesResult.success && categoriesResult.data.length > 0) {
          const categoryDetection = await detectCategory(nama, 'pemasukan', categoriesResult.data);
          
          if (categoryDetection.success) {
            const categoryResult = await getOrCreateCategory(categoryDetection.category, 'pemasukan');
            if (categoryResult.success) {
              categoryId = categoryResult.data.id;
            }
          }
        }
        
        const result = await saveTransaction({
          jenis: 'pemasukan',
          nama,
          harga,
          categoryId,
          sourceDiscordId: userId,
          rawMessage: `/income ${nama} ${harga}`
        });
        
        if (result.success) {
          await interaction.reply(`✅ Tercatat: Pemasukan — ${nama} — ${formatRupiah(harga)}`);
        } else {
          await interaction.reply({ content: `Gagal menyimpan: ${result.error}`, ephemeral: true });
        }
        break;
      }
      case 'summary':
        await handleSummaryCommand(interaction);
        break;
      case 'expenses':
        await handleListCommand(interaction, 'pengeluaran');
        break;
      case 'incomes':
        await handleListCommand(interaction, 'pemasukan');
        break;
      case 'categories':
        await handleCategoriesCommand(interaction);
        break;
      case 'help':
        await interaction.reply({
          content: `**Panduan Expense Tracker Bot**
\`/expense <nama> <harga>\` — Catat pengeluaran
\`/income <nama> <harga>\` — Catat pemasukan
\`/summary [periode]\` — Ringkasan keuangan
\`/expenses [periode]\` — List pengeluaran
\`/incomes [periode]\` — List pemasukan
\`/categories [jenis]\` — Lihat daftar kategori
\`/help\` — Tampilkan panduan ini

Periode: hari ini, kemarin, minggu ini, bulan ini, atau YYYY-MM-DD sampai YYYY-MM-DD
Contoh: /summary minggu ini

**Kategori Otomatis**: Bot akan otomatis menentukan kategori untuk setiap transaksi menggunakan AI. Jika kategori belum ada, bot akan membuatnya secara otomatis.`
        });
        break;
    }
  } catch (err) {
    console.error('Slash command error:', err.message);
    await interaction.reply({ content: 'Terjadi kesalahan. Coba lagi nanti.', ephemeral: true });
  }
}

async function handleNaturalMessage(message) {
  if (message.author.bot) return;

  const content = message.content.trim();
  if (!content || content.startsWith('/')) return;

  const result = await extractTransaction(content);

  if (!result.success) {
    await message.reply(`❌ Gagal memproses: ${result.reason}\nGunakan format: /expense <nama> <harga>`);
    return;
  }

  if (result.intent === 'delete') {
    const searchResult = await getTransactions({
      jenis: result.jenis,
      namePattern: result.searchPattern,
      sourceDiscordId: message.author.id
    });

    if (!searchResult.success) {
      await message.reply(`❌ Gagal mencari transaksi: ${searchResult.error}`);
      return;
    }

    if (searchResult.data.length === 0) {
      const jenisLabel = result.jenis === 'pemasukan' ? 'pemasukan' : 'pengeluaran';
      await message.reply(`❌ Tidak ditemukan ${jenisLabel} dengan kata kunci "${result.searchPattern}"`);
      return;
    }

    const deleteResult = await deleteTransactions({
      jenis: result.jenis,
      namePattern: result.searchPattern,
      sourceDiscordId: message.author.id
    });

    if (deleteResult.success) {
      const jenisLabel = result.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
      if (deleteResult.count === 1) {
        const deleted = deleteResult.data[0];
        await message.reply(`✅ Dihapus: ${jenisLabel} — ${deleted.nama} — ${formatRupiah(deleted.harga)}`);
      } else {
        await message.reply(`✅ Dihapus ${deleteResult.count} transaksi ${result.jenis} dengan kata kunci "${result.searchPattern}"`);
      }
    } else {
      await message.reply(`❌ Gagal menghapus: ${deleteResult.error}`);
    }
    return;
  }

  if (result.intent === 'edit') {
    const searchResult = await getTransactions({
      jenis: result.jenis,
      namePattern: result.searchPattern,
      sourceDiscordId: message.author.id
    });

    if (!searchResult.success) {
      await message.reply(`❌ Gagal mencari transaksi: ${searchResult.error}`);
      return;
    }

    if (searchResult.data.length === 0) {
      const jenisLabel = result.jenis === 'pemasukan' ? 'pemasukan' : 'pengeluaran';
      await message.reply(`❌ Tidak ditemukan ${jenisLabel} dengan kata kunci "${result.searchPattern}"`);
      return;
    }

    if (searchResult.data.length > 1) {
      const jenisLabel = result.jenis === 'pemasukan' ? 'pemasukan' : 'pengeluaran';
      await message.reply(`❌ Ditemukan ${searchResult.data.length} transaksi ${jenisLabel} dengan kata kunci "${result.searchPattern}". Gunakan kata kunci lebih spesifik.`);
      return;
    }

    const oldHarga = searchResult.data[0].harga;
    const updateResult = await updateTransactions(
      {
        jenis: result.jenis,
        namePattern: result.searchPattern,
        sourceDiscordId: message.author.id
      },
      { harga: result.harga }
    );

    if (updateResult.success) {
      const updated = updateResult.data[0];
      const jenisLabel = result.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
      await message.reply(`✅ Diperbarui: ${jenisLabel} — ${updated.nama} — ${formatRupiah(updated.harga)} (sebelumnya: ${formatRupiah(oldHarga)})`);
    } else {
      await message.reply(`❌ Gagal memperbarui: ${updateResult.error}`);
    }
    return;
  }

  // Auto-detect category
  const categoriesResult = await getCategories({ jenis: result.jenis });
  let categoryId = null;
  
  if (categoriesResult.success && categoriesResult.data.length > 0) {
    const categoryDetection = await detectCategory(result.nama, result.jenis, categoriesResult.data);
    
    if (categoryDetection.success) {
      const categoryResult = await getOrCreateCategory(categoryDetection.category, result.jenis);
      if (categoryResult.success) {
        categoryId = categoryResult.data.id;
      }
    }
  }
  
  // fallback: no categories or detection failed → Lainnya
  if (categoryId === null) {
    const categoryResult = await getOrCreateCategory('Lainnya', result.jenis);
    if (categoryResult.success) {
      categoryId = categoryResult.data.id;
    }
  }
  
  const dbResult = await saveTransaction({
    jenis: result.jenis,
    nama: result.nama,
    harga: result.harga,
    categoryId,
    sourceDiscordId: message.author.id,
    rawMessage: content
  });

  if (dbResult.success) {
    const icon = result.jenis === 'pemasukan' ? '🟢' : '🔴';
    await message.reply(`${icon} Tercatat: ${result.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} — ${result.nama} — ${formatRupiah(result.harga)}`);
  } else {
    await message.reply({ content: `Gagal menyimpan: ${dbResult.error}`, ephemeral: true });
  }
}

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
  registerCommands();
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
  }
});

client.on('messageCreate', async message => {
  await handleNaturalMessage(message);
});

client.on('error', err => {
  console.error('Discord client error:', err.message);
});

process.on('unhandledRejection', err => {
  console.error('Unhandled rejection:', err.message || err);
});

client.login(process.env.DISCORD_TOKEN);