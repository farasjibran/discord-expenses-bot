# Discord Expense Tracker Bot

Bot Discord untuk mencatat pengeluaran dan pemasukan pribadi, powered by Groq AI + Supabase.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env dan isi semua nilai
```

### 3. Setup Discord Bot

1. Buka https://discord.com/developers/applications
2. Klik "New Application" → beri nama "Expense Tracker"
3. Tab "Bot" → klik "Add Bot" → copy **Token** ke `.env`
4. Tab "OAuth2" → "URL Generator" → scope: `bot` + `applications.commands` → permissions: `Send Messages`, `Use Slash Commands`
5. Copy URL dan buka di browser untuk invite bot ke server kamu
6. Di `.env`, isi `DISCORD_CLIENT_ID` dan `DISCORD_GUILD_ID`
7. Untuk `ADMIN_DISCORD_USER_ID`: klik kanan profil kamu di Discord → "Copy User ID" (aktifkan Developer Mode dulu di Settings → Advanced)

### 4. Setup Supabase

1. Buka https://supabase.com/dashboard
2. Buat project baru
3. Settings → API → copy **URL** dan **anon key** ke `.env`
4. Settings → API → copy **service_role key** ke `.env`
5. Buka SQL Editor → paste `migrations/001_initial_schema.sql` → Run

### 5. Setup Groq

1. Buka https://console.groq.com/api-keys
2. Buat API key → copy ke `.env` sebagai `GROQ_API_KEY`
3. Gratis: 30 requests/min, 1440 requests/day

### 6. Run

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `/expense nama harga` | Catat pengeluaran |
| `/income nama harga` | Catat pemasukan |
| `/summary [periode]` | Ringkasan keuangan |
| `/expenses [periode]` | List pengeluaran |
| `/incomes [periode]` | List pemasukan |
| `/help` | Panduan penggunaan |

**Periode**: `hari ini`, `kemarin`, `minggu ini`, `bulan ini`, atau custom `YYYY-MM-DD sampai YYYY-MM-DD`

**Natural language**: Selain slash command, kamu bisa kirim pesan natural seperti "makan siang 25000" atau "gaji 5 juta" — bot akan otomatis parse dan simpan.

## Project Structure

```
discord-expense-bot/
├── src/
│   ├── index.js           # Bot entry point
│   ├── commands/          # Slash command handlers
│   ├── modules/
│   │   ├── groqExtractor.js   # AI extraction (Groq)
│   │   └── supabaseDB.js      # Database operations
│   └── utils/             # Helper functions
├── migrations/
│   └── 001_initial_schema.sql  # Database schema
├── scripts/
│   └── deploy.sh        # Deploy script
├── .env.example         # Environment template
├── package.json
└── README.md
```

## Tech Stack

- **Discord.js** — Discord bot framework
- **Groq API** — AI extraction (free tier, Llama 3.1 70B)
- **Supabase** — PostgreSQL database + REST API
- **Node.js** — Runtime

## Cost

- Discord bot: **Free**
- Groq free tier: **Free** (1440 req/day)
- Supabase free tier: **Free** (500MB, 50K MAU)
- Hosting: **Free** (Railway free tier / local)

## License

MIT