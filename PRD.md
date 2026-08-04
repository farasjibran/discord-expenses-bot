# Product Requirements Document (PRD): Discord Expense Tracker Bot

> **Document Status**: Draft
> **Last Updated**: 2026-08-03
> **Owner**: Muhammad Farras Jibran
> **Contributors**: Hermes (AI Assistant)

---

## 1. Executive Summary

### 1.1 Problem Statement

**Current State**:  
Pengeluaran dan pemasukan saat ini biasanya tercatat di catatan aplikasi yang menyebar: notes WhatsApp, spreadsheet, catatan memo, atau bahkan ingatan. Tidak ada satu tempat terpusat yang mengumpulkan data transaksi secara otomatis.

**Pain Points**:
- **Pencatatan manual yang lambat**: menulis nominal, tanggal, dan kategori satu per satu di notes/Spreadsheet
- **Tidak terstruktur**: format bebas membuat sulit direkap; "makan 20rb", "Makan - 20.000", "Makan Rp25.000"
- **Lupa mencatat**: transaksi kecil di luar sebelum pulang atau bayar cash tidak tercatat
- **Tidak ada ringkasan otomatis**: harus hitung ulang sendiri akhir bulan
- **Laporan tidak ter-update**: data terakhir yang tercatat tidak konsisten antar device

**Impact**:  
- Waktu yang dihabiskan untuk merapikan catatan akhir bulan bisa 1-2 jam per bulan
- Keuangan pribadi sulit di-track karena gap antara transaksi dan pencatatan
- Keputusan penghematan/pengeluaran tidak berbasis data

### 1.2 Proposed Solution

Bangun bot Discord untuk pencatatan keuangan pribadi yang dikontrol lewat chat. User kirim command atau pesan natural seperti:
- `/expense makan siang 25000`
- `/income gaji 5000000`
- Atau pesan natural: "beli kopi 18rb"

Bot mengolah input dengan AI (Groq) untuk mengekstrak: jenis (pemasukan/pengeluaran), nama/nilai, dan waktu. Data disimpan ke Supabase. Ada channel/admin khusus untuk melihat ringkasan: list pengeluaran, list pemasukan, total per periode.

Rollout: MVP pribadi → validasi fitur → perbaiki akurasi AI.

### 1.3 Success Metrics

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| Waktu pencatatan per transaksi | ~30 detik (manual notes) | <5 detik (1 command/pesan) | 1 minggu setelah deploy |
| Persentase transaksi yang tercatat | Estimasi 60-70% | >90% | 1 bulan setelah deploy |
| Akurasi ekstraksi AI (Groq) | 0% (belum ada) | >85% tanpa konfirmasi | 2 minggu pertama |
| Waktu response bot | N/A | <3 detik (p95) | Selalu |

---

## 2. Context & Background

### 2.1 Business Context

**Strategic Alignment**:  
Supporting personal finance visibility untuk owner yang butuh laporan cepat tanpa aplikasi tambahan. Target: hemat waktu administrasi + awareness pengeluaran.

**Market Opportunity**:  
- Banyak bot Discord finance di Indonesia, namun kebanyakan berbasis command rigid yang tidak fleksibel
- AI extraction baru mulai masuk dan belum banyak yang pakai free-tier seperti Groq dengan biaya nol
- Supabase + Discord bot + Groq = stack murah untuk MVP

**Business Impact**:
- Cost: dekat nol (Groq free tier, Supabase free tier, Discord bot free)
- Time: ~1-2 minggu untuk MVP
- User Growth: single user MVP → bisa di-share ke orang lain di kemudian hari

### 2.2 User Research

**User Segments**:
1. **Personal Finance Tracker (Primary)**
   - Size: 1 user (Farras), scalable to small group later
   - Characteristics: punya transaksi mixed cash/e-wallet, butuh ringkasan cepat
   - Pain points: catatan menyebar, lupa catat, tidak ada ringkasan otomatis

2. **Admin (Future)**
   - Size: bisa ditambahkan nanti
   - Characteristics: butuh laporan agregat, filter tanggal, export
   - Pain points: harus gabung manual dari banyak catatan

**Research Findings**:
- Pengeluaran harian tercatat tidak rapi karena tidak ada sistem terpusat
- Transaksi di bawah Rp20.000 sering tidak dicatat karena ribet
- End-of-month rekonsiliasi butuh waktu signifikan

### 2.3 Competitive Analysis

| Competitor | Solution | Strengths | Weaknesses | Our Differentiation |
|------------|----------|-----------|------------|---------------------|
| Notion/Spreadsheet | Manual entry | Fleksibel | Lambat, tidak realtime | Chat-native, 1 pesan/command = 1 transaksi |
| Bluebot/Wallet AI | Mobile app tracking | Fitur lengkap | Harus buka app terpisah | Langsung lewat Discord, tanpa app baru |
| Discord finance bots | Command-based tracking | Terintegrasi di Discord | Format rigid, tidak ada AI | AI natural language extraction + flexible input |

---

## 3. Goals & Non-Goals

### 3.1 Goals

**Primary Goals**:
1. User bisa mencatat transaksi lewat command Discord dalam 1 pesan (P0)
2. Data tersimpan terstruktur di Supabase dengan jenis, nama, harga, dan timestamp (P0)
3. Admin bisa melihat list pengeluaran dan pemasukan lengkap dengan filter waktu (P0)
4. AI Groq mengekstrak data dari pesan natural dengan akurasi >85% (P0)
5. Bot merespon dalam <3 detik untuk input standar (P0)

**Secondary Goals**:
1. Konfirmasi ringkas sebelum menyimpan untuk transaksi ambigu (P1)
2. Ringkasan harian/mingguan/bulanan otomatis (P1)
3. Export laporan ke CSV (P1)
4. Multi-user support dengan role admin/user (P2)
5. Kategori otomatis (makan, transport, dll) berdasarkan AI (P2)

### 3.2 Non-Goals

1. **Integrasi payment gateway / bank statement** — out of scope, manual input only
2. **Web app / mobile app** — MVP Discord-only
3. **Multi-currency** — IDR only untuk MVP
4. **Invoice/receipt upload OCR** — manual text only
5. **Budget alert / reminder automation** — nice-to-have post-MVP
6. **WhatsApp / Telegram bot** — Discord only untuk MVP

**Future Considerations**:
- Receipt OCR via image upload (Discord image attachment)
- Multi-user dengan approval workflow
- Forecasting dan budget limit
- Telegram bot support (parallel channel)

---

## 4. User Stories & Use Cases

### 4.1 Primary User Stories

1. **Story 1: Catat Pengeluaran**
   - **User**: Farras
   - **Goal**: Ketik `/expense makan siang 25000` dan transaksi tersimpan
   - **Benefit**: Cepat, tidak perlu buka app lain
   - **Acceptance Criteria**:
     - [ ] Command `/expense makan siang 25000` berhasil tersimpan
     - [ ] Data tersimpan: jenis=pengeluaran, nama="makan siang", harga=25000, timestamp=waktu kirim
     - [ ] Bot balas konfirmasi singkat dalam <3 detik
     - [ ] Jika format ambigu, bot tanya konfirmasi sebelum simpan

2. **Story 2: Catat Pemasukan**
   - **User**: Farras
   - **Goal**: Ketik `/income gaji 5000000` dan tersimpan sebagai pemasukan
   - **Benefit**: Tracking income sama mudahnya dengan expense
   - **Acceptance Criteria**:
     - [ ] Command `/income gaji 5000000` tersimpan sebagai pemasukan
     - [ ] Data: jenis=pemasukan, nama="gaji", harga=5000000
     - [ ] Bot konfirmasi dalam <3 detik

3. **Story 3: Lihat Ringkasan**
   - **User**: Admin
   - **Goal**: Ketik `/summary bulan ini` dan dapat list transaksi + total pemasukan/pengeluaran
   - **Benefit**: Tidak perlu hitung manual atau buka spreadsheet
   - **Acceptance Criteria**:
     - [ ] `/summary bulan ini` menampilkan semua transaksi bulan berjalan
     - [ ] Menampilkan total pemasukan, total pengeluaran, dan selisih
     - [ ] List terurut dari yang terbaru
     - [ ] Jika tidak ada transaksi, bot balas "belum ada transaksi periode ini"

4. **Story 4: Admin View**
   - **User**: Admin
   - **Goal**: Lihat semua pengeluaran dan pemasukan dengan filter tanggal
   - **Benefit**: Monitoring cepat untuk review
   - **Acceptance Criteria**:
     - [ ] Admin bisa ketik `/expenses` untuk list pengeluaran
     - [ ] Admin bisa ketik `/incomes` untuk list pemasukan
     - [ ] Bisa filter dengan `/expenses hari ini` / `/incomes minggu ini`
     - [ ] Output berupa list terstruktur: no | nama | harga | tanggal & waktu

### 4.2 User Flows

**Flow 1: Catat Transaksi Baru**
```
1. User ketik di channel Discord: /expense kopi starbucks 48000
2. Bot menerima slash command via Discord gateway
3. AI (Groq) ekstrak: jenis=pengeluaran, nama="kopi starbucks", harga=48000, waktu= sekarang
4. Bot simpan ke Supabase table transactions
5. Bot balas konfirmasi: "Tercatat: Pengeluaran - Kopi Starbucks - Rp48.000 - [timestamp]"
6. User lihat konfirmasi di Discord
```

**Flow 2: Lihat Ringkasan**
```
1. Admin ketik: /summary minggu ini
2. Bot parse intent + periode (minggu ini)
3. Bot query Supabase: transaksi 7 hari terakhir
4. Bot hitung total pemasukan, total pengeluaran, selisih
5. Bot format response:
   - Ringkasan: Pemasukan RpX, Pengeluaran RpY, Selisih RpZ
   - List transaksi: no | nama | harga | tanggal & waktu
6. Kirim response ke Discord (embed atau text)
```

**Flow 3: Handle Ambiguous Input**
```
1. User kirim: /expense 50000
2. Bot tidak bisa tentukan nama transaksi dari input
3. Bot balas: "Nama transaksinya apa? Contoh: /expense makan siang 50000"
4. User kirim ulang dengan format lengkap
5. Bot simpan dengan data yang lengkap
```

### 4.3 Edge Cases & Error Scenarios

| Scenario | Expected Behavior | Priority |
|----------|-------------------|----------|
| Pesan tidak relevan ("halo", "tes") | Bot balas: "Gunakan command: /expense [nama] [harga] atau /income [nama] [harga]" | P0 |
| Harga tidak jelas ("500", "5", "lima ratus") | AI ekstrak angka atau bot minta konfirmasi nominal | P0 |
| Command tanpa parameter | Bot tunjukkan help: format command yang benar | P0 |
| Groq API down/timeout | Fallback: minta user kirim ulang dengan format lebih jelas | P0 |
| Supabase down | Bot balas: "Data sedang disimpan sementara, akan disync nanti" | P1 |
| Pesan >1 tahun ke belakang | Izinkan, tapi flag untuk verifikasi | P2 |
| Admin minta data tapi belum ada transaksi | Balas: "Belum ada transaksi untuk periode ini" | P0 |
| User mengirim attachment (gambar) | Abaikan atau balas untuk minta text | P2 |
| Duplicate command (double send) | Deduplicate berdasarkan message_id atau content + timestamp | P1 |
| User kirim pesan natural (bukan slash command) | AI extraction via Groq untuk parse, fallback ke format command | P1 |

---

## 5. Functional Requirements

### 5.1 Core Features

#### Feature 1: Discord Bot & Slash Commands
**Description**: Bot Discord yang merespons slash commands dan pesan natural untuk mencatat transaksi.

**Requirements**:
- **FR-1.1**: Bot SHALL merespons slash commands: `/expense`, `/income`, `/summary`, `/help`
  - Priority: P0
  - Rationale: Primary input mechanism yang terstruktur
- **FR-1.2**: Bot SHALL menerima pesan natural (teks biasa) dan route ke AI extraction
  - Priority: P1
  - Rationale: Fleksibilitas input — user tidak harus pakai slash command
- **FR-1.3**: Bot SHALL mendeteksi admin vs regular user dari role/ID di Discord
  - Priority: P0
  - Rationale: Bedakan akses view-only admin vs input user
- **FR-1.4**: Bot SHALL merespons dalam <3 detik untuk command standar (p95)
  - Priority: P0
  - Rationale: UX yang responsif
- **FR-1.5**: Bot SHALL menampilkan help message saat `/help` dipanggil
  - Priority: P0
  - Rationale: Onboarding pengguna

**Dependencies**: discord.js (Node.js) atau discord.py (Python), Discord bot token

#### Feature 2: AI-Powered Transaction Extraction
**Description**: Parse pesan natural bahasa Indonesia untuk mengekstrak jenis, nama, dan harga transaksi.

**Requirements**:
- **FR-2.1**: AI SHALL mengekstrak jenis transaksi (pemasukan/pengeluaran) dari konteks pesan
  - Priority: P0
  - Rationale: Core value — natural language input
- **FR-2.2**: AI SHALL mengekstrak nama transaksi (label singkat)
  - Priority: P0
  - Rationale: Untuk identifikasi di laporan
- **FR-2.3**: AI SHALL mengekstrak harga dalam format angka (Rp)
  - Priority: P0
  - Rationale: Data utama transaksi
- **FR-2.4**: AI SHALL menggunakan timestamp pesan sebagai waktu transaksi (fallback: waktu server)
  - Priority: P0
  - Rationale: Konsistensi data
- **FR-2.5**: AI SHALL return confidence score; jika rendah (<0.7), bot minta konfirmasi
  - Priority: P1
  - Rationale: Reduce wrong data entry
- **FR-2.6**: Model: Groq free tier, model `llama-3.1-70b-versatile` atau `mixtral-8x7b-32768`
  - Priority: P0
  - Rationale: Free, cepat, cocok untuk extraction

**Dependencies**: Groq API, prompt design

#### Feature 3: Data Persistence (Supabase)
**Description**: Simpan transaksi ke database terstruktur dengan schema yang jelas.

**Requirements**:
- **FR-3.1**: Setiap transaksi disimpan dengan: id, jenis, nama, harga, created_at, source (Discord user ID)
  - Priority: P0
  - Rationale: Core data model
- **FR-3.2**: Harga disimpan sebagai integer (dalam Rupiah, hindari floating point)
  - Priority: P0
  - Rationale: Avoid rounding errors
- **FR-3.3**: Timestamp disimpan dalam UTC, display dalam timezone Asia/Jakarta (WIB)
  - Priority: P1
  - Rationale: Accurate timekeeping
- **FR-3.4**: Unique constraint atau dedup logic untuk prevent double-save dari pesan ganda
  - Priority: P1
  - Rationale: Data integrity

**Dependencies**: Supabase project, table schema

#### Feature 4: Admin Reporting
**Description**: Admin bisa minta list transaksi dan ringkasan lewat command Discord.

**Requirements**:
- **FR-4.1**: Admin bisa ketik `/summary [periode]` untuk total + list
  - Priority: P0
  - Rationale: Main admin feature
- **FR-4.2**: Periode yang didukung: hari ini, kemarin, minggu ini, bulan ini, custom (YYYY-MM-DD sampai YYYY-MM-DD)
  - Priority: P0
  - Rationale: Cover common use cases
- **FR-4.3**: List transaksi menampilkan: no, nama, harga, tanggal & waktu
  - Priority: P0
  - Rationale: User requirement
- **FR-4.4**: Ringkasan menampilkan: total pemasukan, total pengeluaran, selisih/saldo
  - Priority: P0
  - Rationale: Financial overview
- **FR-4.5**: Admin bisa filter spesifik: `/expenses minggu ini` atau `/incomes bulan ini`
  - Priority: P1
  - Rationale: Granular view
- **FR-4.6**: Output format: Discord embed untuk ringkasan, text untuk list detail
  - Priority: P1
  - Rationale: Visual hierarchy — ringkasan di embed, detail di scroll

**Dependencies**: Supabase query, Discord embed formatting

#### Feature 5: Confirmation & Error Handling
**Description**: Handle ambiguous input dan API failures dengan feedback yang jelas.

**Requirements**:
- **FR-5.1**: Jika AI extraction gagal, bot balas contoh format yang benar
  - Priority: P0
  - Rationale: Guide user to success
- **FR-5.2**: Jika AI tidak yakin, bot tanya konfirmasi sebelum simpan
  - Priority: P1
  - Rationale: Accuracy
- **FR-5.3**: Jika Supabase down, bot balas error dan simpan sementara di memory/buffer file
  - Priority: P1
  - Rationale: No data loss
- **FR-5.4**: Jika Groq API gagal, bot balas: "Maaf, AI sedang gangguan. Coba kirim dengan format: `/expense nama transaksi harga`"
  - Priority: P0
  - Rationale: Graceful degradation
- **FR-5.5**: Jika Discord rate limit hit, bot tunggu dan retry dengan exponential backoff
  - Priority: P1
  - Rationale: Discord API compliance

**Dependencies**: Error handling, retry logic

### 5.2 User Interface Requirements

**Design Principles**:
- Minimal text: confirmasi 1-2 baris, ringkasan terstruktur tapi padat
- Number formatting: gunakan format Indonesia (Rp 25.000)
- Timestamp: readable format "Senin, 3 Agustus 2026 14:30 WIB"
- Discord embed untuk ringkasan, text biasa untuk list detail

**Key Screens/Components**:
1. **Discord Chat (Primary Interface)**
   - Purpose: Input transaksi via slash command atau text
   - Elements: Slash command menu, text input field
   - Interactions: Ketik command, terima balasan embed/text dari bot
   - Mockup: N/A — native Discord UI

2. **Admin Report Embed**
   - Purpose: Laporan ringkasan di Discord
   - Elements: Discord embed dengan title, fields (total pemasukan, total pengeluaran, selisih), description (list transaksi)
   - Interactions: Ketik command, terima formatted embed
   - Mockup: Discord embed template di Section 4.2 Flow 2

**Responsive Behavior**:
- Desktop Discord: Full embed, all fields visible
- Mobile Discord: Embed truncated, scroll untuk list detail

### 5.3 Data Requirements

**Data Models**:
```
Entity: Transaction
Fields:
  - id: UUID (primary key, auto-generated by Supabase)
  - jenis: enum ('pemasukan', 'pengeluaran')
  - nama: text (max 255 chars)
  - harga: bigint / numeric (dalam Rupiah, integer)
  - created_at: timestamptz (UTC, default NOW())
  - source_discord_id: text (Discord user ID, for audit)
  - raw_message: text (original pesan, untuk debug)
Relationships:
  - belongs_to: User (by Discord user ID)
```

```
Entity: Admin (optional, future)
Fields:
  - discord_user_id: text (primary key)
  - role: enum ('admin', 'user')
  - created_at: timestamptz
```

**Data Sources**:
- User input: Discord message text / slash command options
- Timestamp: Discord message timestamp / server time
- AI extraction: Groq API response

**Data Validation**:
- Harga harus angka positif (>0)
- Nama tidak boleh kosong (trim whitespace)
- Jenis harus salah satu dari enum
- Timestamp harus valid ISO8601

---

## 6. Non-Functional Requirements

### 6.1 Performance
- **Response Time**: <3 detik end-to-end untuk slash command → konfirmasi (p95)
- **AI Latency**: Groq API call <1 detik (p95)
- **Database Query**: <500ms untuk ringkasan bulanan (p95)
- **Discord Gateway**: webhook response <5 detik

### 6.2 Scalability
- **User Growth**: 1-5 user awal, bisa scale ke 50+ user dengan index di discord_user_id
- **Data Volume**: Estimasi 2-3 transaksi/hari → ~1.000 transaksi/tahun per user
- **Infrastructure**: Supabase handles scale automatically; bot di-redeploy saat perlu

### 6.3 Security
- **Authentication**: Discord bot token + verify webhook requests
- **Authorization**: Admin whitelist via Discord user ID di database
- **Data Encryption**: TLS 1.3 for Discord gateway + Supabase connection; Supabase encrypts at rest
- **Compliance**: Personal financial data — store minimum necessary, no sharing to third party
- **Audit Logging**: Log every command call + AI extraction result + DB save (minimal PII in logs)

### 6.4 Reliability & Availability
- **Uptime Target**: 95%+ (personal project, not mission-critical)
- **Disaster Recovery**: Supabase auto-backup; re-deploy bot dari Git
- **Backup Strategy**: Supabase handles daily backup; export manual bulanan untuk archive
- **Monitoring**: Log command failures, Groq API errors, Supabase connection errors

### 6.5 Accessibility
- **Standards**: N/A for Discord bot
- **Screen Reader**: Discord built-in screen reader support
- **Keyboard Navigation**: All commands accessible via keyboard in Discord
- **Color Contrast**: Discord embed colors — ensure sufficient contrast

### 6.6 Localization & Internationalization
- **Languages**: Indonesian (MVP), bisa tambah English nanti
- **Timezone Handling**: Asia/Jakarta (WIB) default
- **Currency**: IDR only, format Rp XXX.XXX
- **Date/Time Formats**: "Senin, 3 Agustus 2026 14:30 WIB"

---

## 7. Technical Considerations

### 7.1 Architecture Overview

**System Components**:
- **Discord Bot**: Menerima slash commands dan pesan text dari Discord
- **Webhook/API Server**: Proses input, route ke AI extraction, simpan ke DB, kirim response
- **AI Extraction Service**: Groq API call untuk parse pesan → structured data
- **Supabase**: Database (PostgreSQL) + REST API client
- **Bot Logic**: Orchestrator yang menghubungkan Discord gateway → AI → database → response

**Technology Stack**:
- Backend: Node.js (discord.js) atau Python (discord.py) — pilih setelah cek repo exist
- Database: Supabase (PostgreSQL managed)
- AI: Groq free tier API
- Hosting: Local / VPS / Railway (free tier)
- Discord: Discord Bot (free, no approval needed)

### 7.2 Integration Points

| System | Integration Type | Data Flow | Frequency | Owner |
|--------|------------------|-----------|-----------|-------|
| Discord Gateway | WebSocket (bot connection) | Inbound command/message + Outbound reply | Real-time per event | Backend dev |
| Groq API | REST API (HTTPS POST) | Inbound text → Outbound JSON extraction | Per message | Backend dev |
| Supabase | REST / PostgREST | Inbound write (create transaction), Outbound read (reports) | Real-time per operation | Backend dev |

### 7.3 API Specifications

**Discord Slash Command: `/expense`**
- **Purpose**: Catat pengeluaran
- **Options**:
  - `nama` (string, required): Nama transaksi, contoh: "makan siang"
  - `harga` (integer, required): Nominal dalam Rupiah, contoh: 25000
- **Response**: Embed confirmation dengan detail transaksi

**Discord Slash Command: `/income`**
- **Purpose**: Catat pemasukan
- **Options**: Sama dengan `/expense`
- **Response**: Embed confirmation

**Discord Slash Command: `/summary`**
- **Purpose**: Lihat ringkasan transaksi
- **Options**:
  - `periode` (string, optional): "hari ini", "minggu ini", "bulan ini", atau custom range
- **Response**: Embed ringkasan + list transaksi

**Discord Slash Command: `/help`**
- **Purpose**: Tampilkan panduan penggunaan bot
- **Response**: Text message dengan format command

**Groq Extraction Call**:
- **Endpoint**: `https://api.groq.com/openai/v1/chat/completions`
- **Purpose**: Extract structured transaction data from natural language
- **Request**:
  ```json
  {
    "model": "llama-3.1-70b-versatile",
    "messages": [
      {"role": "system", "content": "Extract transaction: jenis (pemasukan/pengeluaran), nama, harga (integer Rupiah). Return JSON."},
      {"role": "user", "content": "makan siang 25 ribu"}
    ],
    "response_format": {"type": "json_object"}
  }
  ```
- **Response** (example):
  ```json
  {
    "jenis": "pengeluaran",
    "nama": "makan siang",
    "harga": 25000
  }
  ```
- **Error Codes**:
  - 401: Invalid API key
  - 429: Rate limit exceeded
  - 500: Groq server error

**Supabase Operations**:
- **Insert**: `POST /rest/v1/transactions` with auth header
- **Query**: `GET /rest/v1/transactions?created_at=gte.2026-08-01&order=created_at.desc`

### 7.4 Database Schema Changes

**New Tables**:
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jenis TEXT NOT NULL CHECK (jenis IN ('pemasukan', 'pengeluaran')),
  nama TEXT NOT NULL,
  harga BIGINT NOT NULL CHECK (harga > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_discord_id TEXT NOT NULL,
  raw_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_discord_id ON transactions(source_discord_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_jenis ON transactions(jenis);

-- Optional: admin table for future
CREATE TABLE admins (
  discord_user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Migrations**:
- Migration 1: Create transactions table
- Migration 2: Create admins table (optional)
- Migration 3: Add indexes for query performance

### 7.5 Third-Party Dependencies

| Service | Purpose | Cost | SLA | Risk Mitigation |
|---------|---------|------|-----|-----------------|
| Discord Bot API | Messaging channel | Free | 99.9% (Discord SLA) | Reconnect logic, fallback to REST if gateway drops |
| Groq | AI extraction (free tier) | Free (limited RPM/RPD) | N/A | Cache frequent patterns, retry with backoff, fallback prompt simpler |
| Supabase | Database + API | Free tier (500MB, 50K MAU) | 99.9% | Export SQL dump regularly, backup via pg_dump |
| VPS/Railway/Render | Bot hosting | Free tier likely enough | N/A | Auto-deploy from Git, restart on crash |

---

## 8. Launch Plan

### 8.1 Rollout Strategy

**Phase 1: Development & Self-Test** (Week 1)
- Audience: Solo dev (Farras)
- Goals: Build core flow, test with real Discord messages
- Success Criteria:
  - 5 transaksi berhasil dicatat via command
  - `/summary` berhasil ditampilkan
  - Response time <3 detik

**Phase 2: Daily Use** (Week 2-3)
- Audience: 1 user (Farras daily)
- Goals: Validasi akurasi AI, fix edge cases
- Success Criteria:
  - Akurasi ekstraksi >85%
  - Zero data loss
  - Bug report <1 per hari

**Phase 3: Stabilization** (Week 4+)
- Audience: Tetap personal, possible add 1-2 user uji
- Goals: Stabilkan bot, dokumentasi setup
- Success Criteria:
  - Bot running 24/7 tanpa restart manual
  - Error handling untuk semua edge case ter-handle

### 8.2 Feature Flags

| Flag Name | Purpose | Default State | Rollout % |
|-----------|---------|---------------|-----------|
| enable_ai_extraction | On/off Groq AI extraction | on | 100 |
| enable_admin_reports | On/off admin reporting commands | on | 100 |
| enable_confidence_check | On/off konfirmasi untuk low confidence | on | 100 |
| enable_dedup | On/off deduplication logic | on | 100 |
| enable_natural_language | On/off natural language input (AI extraction) | on | 100 |

### 8.3 Monitoring & Alerting

**Key Metrics to Monitor**:
- Groq API success rate: Alert if <95%
- Supabase connection errors: Alert if >3 per hour
- Command receive rate: Track daily command count
- Bot response time p95: Alert if >5 detik

**Dashboards**:
- Supabase Dashboard: table size, query performance
- Groq Dashboard: API usage, error rate

### 8.4 Rollback Plan

**Rollback Triggers**:
- Groq API down >1 jam with no fallback working
- Supabase data corruption / migration failure
- Bot consuming too much quota (>500 API calls/day for free tier)

**Rollback Procedure**:
1. Disable bot in Discord server settings (instant)
2. Revert git commit jika ada code issue
3. Restore Supabase dari backup pg_dump jika ada data issue
4. Restart bot dengan previous version

---

## 9. Timeline & Milestones

### 9.1 Project Phases

```
[Phase 1: Setup & Core]                 Week 1
├─ Setup Discord bot + slash commands    Day 1-2
├─ Setup Supabase + schema                Day 1-2
├─ Groq integration + prompt tuning       Day 3-4
├─ Basic transaction save flow            Day 4-5
└─ Confirmation + error handling          Day 5-7

[Phase 2: Admin & Reporting]             Week 2
├─ Admin detection (Discord role/ID)     Day 8-9
├─ /summary command implementation        Day 9-11
├─ Filter periode (hari/minggu/bulan)   Day 11-12
└─ Formatting + edge cases                Day 12-14

[Phase 3: Testing & Stabilization]       Week 3
├─ Real-world testing (daily use)        Day 15-21
├─ Fix edge cases + prompt tuning         Day 15-21
└─ Documentation + deploy script           Day 21
```

### 9.2 Key Milestones

| Milestone | Date | Owner | Status |
|-----------|------|-------|--------|
| PRD Final | 2026-08-03 | Farras | In Progress |
| Discord Bot + Supabase Setup | 2026-08-05 | Farras | Not Started |
| Core Transaction Flow Working | 2026-08-07 | Farras | Not Started |
| Admin Reporting Complete | 2026-08-14 | Farras | Not Started |
| Daily Use Stable | 2026-08-21 | Farras | Not Started |

### 9.3 Dependencies & Blockers

| Dependency | Owner | Due Date | Status | Risk |
|------------|-------|----------|--------|------|
| Discord bot creation + token | Farras | 2026-08-04 | Not Started | Low |
| Groq API key registration | Farras | 2026-08-03 | In Progress | Low |
| Supabase project creation + schema | Farras | 2026-08-04 | Not Started | Low |
| Bot hosting (local/VPS/Railway) | Farras | 2026-08-05 | Not Started | Low |

---

## 10. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation Strategy | Owner |
|------|------------|--------|---------------------|-------|
| Groq free rate limit exhausted | Medium | High | Cache frequent patterns, batch non-urgent, upgrade to paid if needed | Farras |
| Groq extraction accuracy <80% | Medium | High | Prompt tuning, add validation rules, confirmation for low confidence | Farras |
| Discord bot token leaked | Low | High | Store token in .env, never commit, use Discord bot permissions minimally | Farras |
| Supabase free tier limit hit | Low | Medium | Monitor usage; if needed, upgrade Pro ($25/mo) or self-host | Farras |
| Data loss (bot crash mid-write) | Low | High | Ensure DB write happens before bot reply; use transaction | Farras |
| Bot downtime | Medium | Medium | Deploy on uptime-monitored host; auto-restart script | Farras |
| Prompt injection via user message | Low | Medium | Sanitize input, strict JSON schema, limit prompt scope | Farras |

**Contingency Plans**:
- **If Groq accuracy too low**: Add manual format fallback: "Format: `/expense nama harga`"
- **If Discord bot has issues**: Fallback to webhook-based approach
- **If Supabase slow**: Add Redis cache for ringkasan queries, reduce DB round-trips

---

## 11. Open Questions

1. **Mau pakai bahasa apa di prompt Groq?**
   - Context: Prompt bisa "bahasa Indonesia natural" vs "bahasa Inggris instruction + Indonesia input"
   - Owner: Farras
   - Due: 2026-08-04 (saat Groq integration)
   - **Resolved**: Pakai bahasa Inggris untuk prompt/instruction, input user dalam Bahasa Indonesia. Mix: instruction EN + input ID.

2. **Format harga: integer saja atau allow decimal?**
   - Context: "25000" jelas, tapi "25.500" bisa jadi 25,5rb atau 25.500
   - Owner: Farras
   - Due: 2026-08-05 (saat schema final)
   - **Resolved**: Allow decimal. User bisa kirim "25500" atau "17800". Harga disimpan sebagai integer dalam satuan Rupiah (bukan sen), parse dari input: "25.500" → 25500, "17800" → 17800. Tidak ada sen/pecahan kecil.

3. **Mau multi-user support dari awal atau single user dulu?**
   - Context: Multi-user butuh auth lebih kompleks via Discord role
   - Owner: Farras
   - Due: 2026-08-03 (block schema design)
   - **Resolved**: Single user untuk MVP. Schema admin table tidak dibuat di fase ini. User identification via Discord user ID saja.

4. **Hosting bot di mana?**
   - Context: Local Mac vs VPS vs Railway/Render free tier
   - Owner: Farras
   - Due: 2026-08-05
   - **Resolved**: Rekomendasi gratis:
     - **Option A (Recommended)**: Railway free tier — $5 credit/bulan, auto-deploy dari Git, persistent VM, 24/7 uptime
     - **Option B**: Render free tier — gratis tapi spinner setelah 15 min inactivity (bot bisa offline)
     - **Option C**: Local Mac — langsung run di Mac Farras (paling simpel, tapi butuh Mac selalu nyala)
     - **Option D**: Oracle Cloud Free Tier — 4 ARM cores + 24GB RAM gratis seumur hidup, tapi setup manual
     - Pilih: **Railway** (recommended) atau **Local Mac** (simpel untuk MVP)

5. **Slash command only atau boleh juga natural language text?**
   - Context: Natural language butuh AI extraction (Groq), slash command lebih reliable tanpa AI
   - Owner: Farras
   - Due: 2026-08-03 (block feature prioritization)
   - **Resolved**: Keduanya didukung. Slash command (`/expense nama harga`) untuk input cepat & reliable. Natural language text ("beli kopi 18rb") untuk input fleksibel via AI extraction (Groq). AI extraction jadi fitur utama, slash command sebagai fallback yang lebih cepat.

---

## 12. Appendix

### 12.1 Glossary

- **Discord Bot**: Bot account yang terhubung ke Discord server untuk merespons commands dan messages
- **Slash Command**: Discord command yang dimulai dengan `/`, menyediakan structured input via options
- **Groq**: AI inference provider dengan free tier, cepat, cocok untuk LLM extraction
- **Supabase**: Backend-as-a-Service dengan PostgreSQL + REST API + auth
- **Webhook**: Endpoint HTTP yang menerima callback dari Discord saat ada event
- **P0/P1/P2**: Priority levels (P0 = must-have, P1 = should-have, P2 = nice-to-have)
- **Embed**: Discord message format dengan structured fields, title, color, dan thumbnail

### 12.2 References

- Discord Bot Documentation: https://discord.com/developers/docs/intro
- discord.js Guide: https://discordjs.guide/
- Groq API Docs: https://console.groq.com/docs
- Supabase Docs: https://supabase.com/docs
- PRD Template: `/Users/mac/Documents/templates/PRD/PRD_TEMPLATE.md`
- PRD Usage Guide: `/Users/mac/Documents/templates/PRD/PRD_USAGE_GUIDE.md`

### 12.3 Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-08-03 | 1.0 | Hermes (AI Assistant) | Initial draft (WhatsApp version) |
| 2026-08-03 | 2.0 | Hermes (AI Assistant) | Switched from WhatsApp Cloud API to Discord Bot (simpler setup, no Meta approval needed) |

---

## Review & Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | Muhammad Farras Jibran | 2026-08-03 | Pending |
| Engineering | Muhammad Farras Jibran | 2026-08-03 | Pending |
| Design | N/A | — | Pending |

---

**Notes**:
- PRD ini diisi mengikuti template standar di folder `/Users/mac/Documents/templates/PRD/`
- Project bersifat personal MVP, bisa di-scale kemudian
- Tech stack dipilih untuk minimize cost (free tier prioritas)
- Platform dipilih Discord karena tidak memerlukan persetujuan Meta seperti WhatsApp Cloud API
- Setup Discord bot jauh lebih cepat: buat bot di Discord Developer Portal, copy token, invite ke server
