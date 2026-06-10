/**
 * Supabase Database Service
 * All database operations go through this service layer.
 * Backend-only: uses SERVICE_ROLE_KEY internally - NEVER exposed to frontend.
 * Falls back to local database if Supabase is not configured.
 * R2C-Scan v2.0
 */
import { getSupabaseAdmin, getSupabaseAnon } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';

// ── TABLE NAMES ──
export const TABLES = {
  products: 'products',
  maintenance: 'maintenance',
  stock: 'stock_items',
  suppliers: 'suppliers',
  scans: 'scan_history',
  users: 'users',
  movements: 'stock_movements'
};

/**
 * Execute a Supabase query with error handling
 */
async function query(fn) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new AppError('Supabase não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.', 503, 'SUPABASE_NOT_CONFIGURED');
  }
  try {
    const { data, error } = await fn(supabase);
    if (error) throw new AppError(error.message, 400, error.code);
    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Database error: ${err.message}`, 500, 'DB_ERROR');
  }
}

// ═══════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════
export const products = {
  async getAll() {
    return query(supabase => supabase.from(TABLES.products).select('*').order('created_at', { ascending: false }));
  },

  async getById(id) {
    return query(supabase => supabase.from(TABLES.products).select('*').eq('id', id).single());
  },

  async create(data) {
    return query(supabase => supabase.from(TABLES.products).insert({
      id: data.id,
      name: data.name,
      sku: data.sku,
      category: data.category,
      description: data.description,
      tech_specs: data.techSpecs,
      photo_url: data.photo,
      qr_data: data.qrData,
      fav: data.fav || false,
      user_id: data.userId || 'anonymous',
      created_at: new Date(data.createdAt || Date.now()).toISOString(),
      updated_at: new Date(data.updatedAt || Date.now()).toISOString()
    }).select().single());
  },

  async update(id, data) {
    return query(supabase => supabase.from(TABLES.products).update({
      name: data.name,
      sku: data.sku,
      category: data.category,
      description: data.description,
      tech_specs: data.techSpecs,
      photo_url: data.photo,
      qr_data: data.qrData,
      fav: data.fav,
      updated_at: new Date().toISOString()
    }).eq('id', id).select().single());
  },

  async delete(id) {
    return query(supabase => supabase.from(TABLES.products).delete().eq('id', id));
  },

  async search(term) {
    // Escapa caracteres especiais do PostgREST (vírgula e %) para evitar
    // quebra do filtro .or() e injeção de operadores.
    const safe = String(term).replace(/[%,]/g, '');
    return query(supabase =>
      supabase.from(TABLES.products)
        .select('*')
        .or(`name.ilike.%${safe}%,sku.ilike.%${safe}%,category.ilike.%${safe}%`)
        .order('created_at', { ascending: false })
        .limit(50)
    );
  }
};

// ═══════════════════════════════════════════
//  MAINTENANCE
// ═══════════════════════════════════════════
export const maintenance = {
  async getAll() {
    return query(supabase => supabase.from(TABLES.maintenance).select('*').order('date', { ascending: false }));
  },

  async getById(id) {
    return query(supabase => supabase.from(TABLES.maintenance).select('*').eq('id', id).single());
  },

  async create(data) {
    return query(supabase => supabase.from(TABLES.maintenance).insert({
      id: data.id,
      name: data.name,
      type: data.type,
      priority: data.priority,
      date: new Date(data.date).toISOString(),
      time: data.time,
      description: data.desc,
      technician: data.tech,
      recurrence: data.recurrence,
      checklist: data.checklist,
      status: data.status || 'pending',
      created_at: new Date(data.createdAt || Date.now()).toISOString(),
      updated_at: new Date(data.updatedAt || Date.now()).toISOString()
    }).select().single());
  },

  async update(id, data) {
    return query(supabase => supabase.from(TABLES.maintenance).update({
      name: data.name,
      type: data.type,
      priority: data.priority,
      date: new Date(data.date).toISOString(),
      time: data.time,
      description: data.desc,
      technician: data.tech,
      recurrence: data.recurrence,
      checklist: data.checklist,
      status: data.status,
      updated_at: new Date().toISOString()
    }).eq('id', id).select().single());
  },

  async delete(id) {
    return query(supabase => supabase.from(TABLES.maintenance).delete().eq('id', id));
  }
};

// ═══════════════════════════════════════════
//  STOCK
// ═══════════════════════════════════════════
export const stock = {
  async getAll() {
    return query(supabase => supabase.from(TABLES.stock).select('*').order('name'));
  },

  async getById(id) {
    return query(supabase => supabase.from(TABLES.stock).select('*').eq('id', id).single());
  },

  async create(data) {
    return query(supabase => supabase.from(TABLES.stock).insert({
      id: data.id,
      name: data.name,
      quantity: data.qty,
      min_quantity: data.min,
      unit: data.unit,
      location: data.location,
      notes: data.obs,
      created_at: new Date(data.createdAt || Date.now()).toISOString(),
      updated_at: new Date(data.updatedAt || Date.now()).toISOString()
    }).select().single());
  },

  async update(id, data) {
    return query(supabase => supabase.from(TABLES.stock).update({
      name: data.name,
      quantity: data.qty,
      min_quantity: data.min,
      unit: data.unit,
      location: data.location,
      notes: data.obs,
      updated_at: new Date().toISOString()
    }).eq('id', id).select().single());
  },

  async delete(id) {
    return query(supabase => supabase.from(TABLES.stock).delete().eq('id', id));
  }
};

// ═══════════════════════════════════════════
//  SUPPLIERS
// ═══════════════════════════════════════════
export const suppliers = {
  async getAll() {
    return query(supabase => supabase.from(TABLES.suppliers).select('*').order('name'));
  },

  async getById(id) {
    return query(supabase => supabase.from(TABLES.suppliers).select('*').eq('id', id).single());
  },

  async create(data) {
    return query(supabase => supabase.from(TABLES.suppliers).insert({
      id: data.id,
      name: data.name,
      cnpj: data.cnpj,
      ie: data.ie,
      contact: data.contact,
      phone: data.phone,
      email: data.email,
      address: data.address,
      category: data.category,
      notes: data.obs,
      created_at: new Date(data.createdAt || Date.now()).toISOString(),
      updated_at: new Date(data.updatedAt || Date.now()).toISOString()
    }).select().single());
  },

  async update(id, data) {
    return query(supabase => supabase.from(TABLES.suppliers).update({
      name: data.name,
      cnpj: data.cnpj,
      ie: data.ie,
      contact: data.contact,
      phone: data.phone,
      email: data.email,
      address: data.address,
      category: data.category,
      notes: data.obs,
      updated_at: new Date().toISOString()
    }).eq('id', id).select().single());
  },

  async delete(id) {
    return query(supabase => supabase.from(TABLES.suppliers).delete().eq('id', id));
  }
};

// ═══════════════════════════════════════════
//  MOVEMENTS
// ═══════════════════════════════════════════
export const movements = {
  async getAll(limit = 100) {
    return query(supabase =>
      supabase.from(TABLES.movements).select('*').order('timestamp', { ascending: false }).limit(limit)
    );
  },

  async create(data) {
    return query(supabase => supabase.from(TABLES.movements).insert({
      id: data.id,
      item_id: data.itemId,
      item_name: data.itemName,
      type: data.type,
      quantity: data.qty,
      reason: data.reason,
      timestamp: new Date(data.timestamp || Date.now()).toISOString()
    }).select().single());
  }
};

// ═══════════════════════════════════════════
//  SCANS
// ═══════════════════════════════════════════
export const scans = {
  async create(data) {
    return query(supabase => supabase.from(TABLES.scans).insert({
      id: data.id,
      data: data.data,
      timestamp: new Date(data.timestamp || Date.now()).toISOString()
    }).select().single());
  },

  async getAll(limit = 50) {
    return query(supabase =>
      supabase.from(TABLES.scans).select('*').order('timestamp', { ascending: false }).limit(limit)
    );
  }
};

// ═══════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════
export const dashboard = {
  async getStats() {
    return query(async supabase => {
      const [products, maints, stockItems, supps, scans] = await Promise.all([
        supabase.from(TABLES.products).select('id', { count: 'exact', head: true }),
        supabase.from(TABLES.maintenance).select('id,status', { count: 'exact', head: false }).limit(500),
        supabase.from(TABLES.stock).select('id', { count: 'exact', head: true }),
        supabase.from(TABLES.suppliers).select('id', { count: 'exact', head: true }),
        supabase.from(TABLES.scans).select('id', { count: 'exact', head: true })
      ]);

      return {
        products: products.count || 0,
        maintenance: maints.count || 0,
        pendingMaintenance: (maints.data || []).filter(m => m.status !== 'done').length,
        stock: stockItems.count || 0,
        suppliers: supps.count || 0,
        scans: scans.count || 0
      };
    });
  }
};