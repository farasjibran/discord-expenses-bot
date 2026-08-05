const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function saveTransaction(transaction) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      jenis: transaction.jenis,
      nama: transaction.nama,
      harga: transaction.harga,
      category_id: transaction.categoryId || null,
      source_discord_id: transaction.sourceDiscordId,
      raw_message: transaction.rawMessage
    }])
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

async function getTransactions(filters = {}) {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.sourceDiscordId) {
    query = query.eq('source_discord_id', filters.sourceDiscordId);
  }

  if (filters.jenis) {
    query = query.eq('jenis', filters.jenis);
  }

  if (filters.namePattern) {
    const words = filters.namePattern.split(/\s+/).filter(w => w.length > 0);
    words.forEach(word => {
      query = query.ilike('nama', `%${word}%`);
    });
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase query error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

async function deleteTransactions(filters = {}) {
  let query = supabase
    .from('transactions')
    .delete()
    .select();

  if (filters.sourceDiscordId) {
    query = query.eq('source_discord_id', filters.sourceDiscordId);
  }

  if (filters.jenis) {
    query = query.eq('jenis', filters.jenis);
  }

  if (filters.namePattern) {
    const words = filters.namePattern.split(/\s+/).filter(w => w.length > 0);
    words.forEach(word => {
      query = query.ilike('nama', `%${word}%`);
    });
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase delete error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [], count: (data || []).length };
}

async function updateTransactions(filters = {}, updates = {}) {
  let query = supabase
    .from('transactions')
    .update(updates)
    .select();

  if (filters.sourceDiscordId) {
    query = query.eq('source_discord_id', filters.sourceDiscordId);
  }

  if (filters.jenis) {
    query = query.eq('jenis', filters.jenis);
  }

  if (filters.namePattern) {
    const words = filters.namePattern.split(/\s+/).filter(w => w.length > 0);
    words.forEach(word => {
      query = query.ilike('nama', `%${word}%`);
    });
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase update error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [], count: (data || []).length };
}

async function getSummary(filters = {}) {
  let query = supabase
    .from('transactions')
    .select('jenis, harga, created_at');

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase summary error:', error.message);
    return { success: false, error: error.message };
  }

  const transactions = data || [];
  const pemasukan = transactions
    .filter(t => t.jenis === 'pemasukan')
    .reduce((sum, t) => sum + t.harga, 0);
  const pengeluaran = transactions
    .filter(t => t.jenis === 'pengeluaran')
    .reduce((sum, t) => sum + t.harga, 0);

  return {
    success: true,
    data: {
      totalPemasukan: pemasukan,
      totalPengeluaran: pengeluaran,
      selisih: pemasukan - pengeluaran,
      countPemasukan: transactions.filter(t => t.jenis === 'pemasukan').length,
      countPengeluaran: transactions.filter(t => t.jenis === 'pengeluaran').length,
      totalCount: transactions.length
    }
  };
}

async function getCategories(filters = {}) {
  let query = supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (filters.jenis) {
    query = query.eq('jenis', filters.jenis);
  }

  if (filters.name) {
    query = query.ilike('name', `%${filters.name}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase categories query error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

async function getCategoryByName(name, jenis) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('name', name)
    .eq('jenis', jenis)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: true, data: null };
    }
    console.error('Supabase category query error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

async function createCategory(name, jenis) {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, jenis }])
    .select()
    .single();

  if (error) {
    console.error('Supabase category insert error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

async function getOrCreateCategory(name, jenis) {
  const existingResult = await getCategoryByName(name, jenis);
  
  if (!existingResult.success) {
    return existingResult;
  }

  if (existingResult.data) {
    return { success: true, data: existingResult.data, created: false };
  }

  const createResult = await createCategory(name, jenis);
  if (createResult.success) {
    return { success: true, data: createResult.data, created: true };
  }

  return createResult;
}

module.exports = { 
  saveTransaction, 
  getTransactions, 
  deleteTransactions, 
  updateTransactions, 
  getSummary,
  getCategories,
  getCategoryByName,
  createCategory,
  getOrCreateCategory
};