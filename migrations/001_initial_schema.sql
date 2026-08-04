-- Migration 001: Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jenis TEXT NOT NULL CHECK (jenis IN ('pemasukan', 'pengeluaran')),
  nama TEXT NOT NULL,
  harga BIGINT NOT NULL CHECK (harga > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_discord_id TEXT NOT NULL,
  raw_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_discord_id ON transactions(source_discord_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_jenis ON transactions(jenis);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at_jenis ON transactions(created_at, jenis);

-- Migration 002: Create admins table (for future multi-user)
CREATE TABLE IF NOT EXISTS admins (
  discord_user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration 003: Create dedup tracking table
CREATE TABLE IF NOT EXISTS processed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_message_id TEXT NOT NULL,
  discord_channel_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(discord_message_id, discord_channel_id)
);

-- Migration 004: Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();