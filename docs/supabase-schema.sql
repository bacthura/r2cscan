-- =============================================
-- R2C-Scan v2.0 - Supabase Database Schema
-- Execute this SQL in Supabase SQL Editor
-- =============================================

-- ── Create tables ──

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  description TEXT,
  tech_specs JSONB DEFAULT '[]',
  photo_url TEXT,
  qr_data TEXT,
  fav BOOLEAN DEFAULT false,
  user_id TEXT DEFAULT 'anonymous',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance
CREATE TABLE IF NOT EXISTS maintenance (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Preventiva',
  priority TEXT DEFAULT 'media',
  date TIMESTAMPTZ,
  time TEXT DEFAULT '08:00',
  description TEXT,
  technician TEXT,
  recurrence TEXT DEFAULT 'none',
  checklist JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock items
CREATE TABLE IF NOT EXISTS stock_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 10,
  unit TEXT DEFAULT 'un',
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  ie TEXT,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES stock_items(id) ON DELETE CASCADE,
  item_name TEXT,
  type TEXT CHECK (type IN ('entrada', 'saida')),
  quantity INTEGER,
  reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Scan history
CREATE TABLE IF NOT EXISTS scan_history (
  id TEXT PRIMARY KEY,
  data TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes for performance ──
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance(date);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);
CREATE INDEX IF NOT EXISTS idx_stock_name ON stock_items(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON stock_movements(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scan_history(timestamp DESC);

-- ── Enable Row Level Security ──
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ──

-- Products: public read, authenticated write
CREATE POLICY "Products public read" ON products FOR SELECT USING (true);
CREATE POLICY "Products authenticated insert" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Products authenticated update" ON products FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Products admin delete" ON products FOR DELETE USING (auth.role() = 'service_role');

-- Maintenance: public read, authenticated write
CREATE POLICY "Maintenance public read" ON maintenance FOR SELECT USING (true);
CREATE POLICY "Maintenance authenticated write" ON maintenance FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Maintenance authenticated update" ON maintenance FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Maintenance admin delete" ON maintenance FOR DELETE USING (auth.role() = 'service_role');

-- Stock: public read, authenticated write
CREATE POLICY "Stock public read" ON stock_items FOR SELECT USING (true);
CREATE POLICY "Stock authenticated write" ON stock_items FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Stock authenticated update" ON stock_items FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Stock admin delete" ON stock_items FOR DELETE USING (auth.role() = 'service_role');

-- Suppliers: public read, authenticated write
CREATE POLICY "Suppliers public read" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Suppliers authenticated write" ON suppliers FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Suppliers authenticated update" ON suppliers FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Suppliers admin delete" ON suppliers FOR DELETE USING (auth.role() = 'service_role');

-- Movements: public read, authenticated write
CREATE POLICY "Movements public read" ON stock_movements FOR SELECT USING (true);
CREATE POLICY "Movements authenticated write" ON stock_movements FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Scans: authenticated write
CREATE POLICY "Scans public read" ON scan_history FOR SELECT USING (true);
CREATE POLICY "Scans authenticated write" ON scan_history FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Users: only own data
CREATE POLICY "Users read own" ON users FOR SELECT USING (auth.uid() = id OR auth.role() = 'service_role');
CREATE POLICY "Users update own" ON users FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

-- ── Functions ──

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Storage Bucket for Photos ──
-- Run in Supabase Storage section:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', true);
-- 
-- Storage RLS:
-- CREATE POLICY "Public read product photos" ON storage.objects FOR SELECT USING (bucket_id = 'product-photos');
-- CREATE POLICY "Authenticated upload product photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-photos' AND auth.role() = 'authenticated');

-- ── Realtime ──
-- Enable realtime for tables:
-- ALTER PUBLICATION supabase_realtime ADD TABLE products;
-- ALTER PUBLICATION supabase_realtime ADD TABLE maintenance;
-- ALTER PUBLICATION supabase_realtime ADD TABLE stock_items;