-- Migration 002: Add categories support
-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('pemasukan', 'pengeluaran')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, jenis)
);

CREATE INDEX IF NOT EXISTS idx_categories_jenis ON categories(jenis);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Add category_id to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Add trigger to auto-update updated_at for categories
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for pengeluaran
INSERT INTO categories (name, jenis) VALUES
  ('Makanan & Minuman', 'pengeluaran'),
  ('Transportasi', 'pengeluaran'),
  ('Belanja', 'pengeluaran'),
  ('Hiburan', 'pengeluaran'),
  ('Kesehatan', 'pengeluaran'),
  ('Tagihan & Utilitas', 'pengeluaran'),
  ('Pendidikan', 'pengeluaran'),
  ('Investasi', 'pengeluaran'),
  ('Lainnya', 'pengeluaran')
ON CONFLICT (name, jenis) DO NOTHING;

-- Insert default categories for pemasukan
INSERT INTO categories (name, jenis) VALUES
  ('Gaji', 'pemasukan'),
  ('Bonus', 'pemasukan'),
  ('Freelance', 'pemasukan'),
  ('Investasi', 'pemasukan'),
  ('Hadiah', 'pemasukan'),
  ('Lainnya', 'pemasukan')
ON CONFLICT (name, jenis) DO NOTHING;
