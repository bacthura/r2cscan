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
  movements: 'stock_movements',
  // ── Módulo de Manutenção Industrial (Ordens de Serviço) ──
  workOrders: 'maintenance_orders',
  woPhotos: 'maintenance_photos',
  woHistory: 'maintenance_history',
  woMaterials: 'maintenance_materials',
  woCosts: 'maintenance_costs',
  reports: 'maintenance_reports',
  purchases: 'purchase_requests'
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
      trade_name: data.tradeName,
      cnpj: data.cnpj,
      ie: data.ie,
      contact: data.contact,
      responsible: data.responsible,
      phone: data.phone,
      whatsapp: data.whatsapp,
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
      trade_name: data.tradeName,
      cnpj: data.cnpj,
      ie: data.ie,
      contact: data.contact,
      responsible: data.responsible,
      phone: data.phone,
      whatsapp: data.whatsapp,
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
//  WORK ORDERS (Ordens de Serviço)
// ═══════════════════════════════════════════
function nextOsNumber(existing) {
  const year = new Date().getFullYear();
  const seq = (existing || []).filter(n => (n || '').includes(`OS-${year}-`)).length + 1;
  return `OS-${year}-${String(seq).padStart(4, '0')}`;
}

export const workOrders = {
  async getAll(filters = {}) {
    return query(supabase => {
      let q = supabase.from(TABLES.workOrders).select('*').order('opened_at', { ascending: false });
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.priority) q = q.eq('priority', filters.priority);
      if (filters.type) q = q.eq('type', filters.type);
      return q;
    });
  },

  async getById(id) {
    const order = await query(supabase => supabase.from(TABLES.workOrders).select('*').eq('id', id).single());
    const [photos, history, materials, costs] = await Promise.all([
      query(s => s.from(TABLES.woPhotos).select('*').eq('order_id', id).order('created_at')),
      query(s => s.from(TABLES.woHistory).select('*').eq('order_id', id).order('created_at')),
      query(s => s.from(TABLES.woMaterials).select('*').eq('order_id', id).order('created_at')),
      query(s => s.from(TABLES.woCosts).select('*').eq('order_id', id).order('created_at'))
    ]);
    return { ...order, photos, history, materials, costs };
  },

  async create(data) {
    const all = await query(s => s.from(TABLES.workOrders).select('os_number'));
    const osNumber = data.osNumber || nextOsNumber((all || []).map(r => r.os_number));
    return query(supabase => supabase.from(TABLES.workOrders).insert({
      os_number: osNumber,
      opened_at: new Date(data.openedAt || Date.now()).toISOString(),
      due_at: data.dueAt ? new Date(data.dueAt).toISOString() : null,
      closed_at: data.closedAt ? new Date(data.closedAt).toISOString() : null,
      requester: data.requester,
      technician: data.technician,
      priority: data.priority || 'media',
      type: data.type || 'corretiva',
      equipment: data.equipment,
      asset_id: data.assetId,
      patrimony: data.patrimony,
      sector: data.sector,
      location: data.location,
      failure_desc: data.failureDesc,
      diagnosis: data.diagnosis,
      root_cause: data.rootCause,
      solution: data.solution,
      notes: data.notes,
      status: data.status || 'aberta',
      labor_cost: data.laborCost || 0,
      thirdparty_cost: data.thirdpartyCost || 0,
      additional_cost: data.additionalCost || 0,
      created_by: data.createdBy
    }).select().single());
  },

  async update(id, data) {
    const patch = { updated_at: new Date().toISOString() };
    const map = {
      requester: 'requester', technician: 'technician', priority: 'priority', type: 'type',
      equipment: 'equipment', assetId: 'asset_id', patrimony: 'patrimony', sector: 'sector',
      location: 'location', failureDesc: 'failure_desc', diagnosis: 'diagnosis',
      rootCause: 'root_cause', solution: 'solution', notes: 'notes', status: 'status',
      laborCost: 'labor_cost', thirdpartyCost: 'thirdparty_cost', additionalCost: 'additional_cost'
    };
    for (const [k, col] of Object.entries(map)) if (data[k] !== undefined) patch[col] = data[k];
    if (data.dueAt !== undefined) patch.due_at = data.dueAt ? new Date(data.dueAt).toISOString() : null;
    if (data.status === 'concluida') patch.closed_at = new Date().toISOString();
    return query(supabase => supabase.from(TABLES.workOrders).update(patch).eq('id', id).select().single());
  },

  async delete(id) {
    return query(supabase => supabase.from(TABLES.workOrders).delete().eq('id', id));
  },

  // ── timeline ──
  async addHistory(orderId, ev) {
    return query(s => s.from(TABLES.woHistory).insert({
      order_id: orderId, event: ev.event, note: ev.note, username: ev.username
    }).select().single());
  },

  // ── materiais (baixa de estoque feita pela rota) ──
  async addMaterial(orderId, m) {
    return query(s => s.from(TABLES.woMaterials).insert({
      order_id: orderId, stock_id: m.stockId, code: m.code, name: m.name,
      category: m.category, quantity: m.quantity, unit: m.unit, unit_price: m.unitPrice
    }).select().single());
  },
  async removeMaterial(materialId) {
    return query(s => s.from(TABLES.woMaterials).delete().eq('id', materialId));
  },

  // ── fotos / anexos ──
  async addPhoto(orderId, p) {
    return query(s => s.from(TABLES.woPhotos).insert({
      order_id: orderId, phase: p.phase, url: p.url, caption: p.caption,
      mime: p.mime, uploaded_by: p.uploadedBy
    }).select().single());
  },
  async removePhoto(photoId) {
    return query(s => s.from(TABLES.woPhotos).delete().eq('id', photoId));
  }
};

// ═══════════════════════════════════════════
//  PURCHASE REQUESTS (Lista de compras)
// ═══════════════════════════════════════════
export const purchases = {
  async getAll(status) {
    return query(s => {
      let q = s.from(TABLES.purchases).select('*').order('created_at', { ascending: false });
      if (status && status !== 'all') q = q.eq('status', status);
      return q;
    });
  },
  async create(data) {
    return query(s => s.from(TABLES.purchases).insert({
      stock_id: data.stockId, material: data.material, quantity: data.quantity,
      unit: data.unit, supplier_id: data.supplierId, last_price: data.lastPrice,
      order_id: data.orderId, status: data.status || 'pendente', created_by: data.createdBy
    }).select().single());
  },
  async update(id, data) {
    return query(s => s.from(TABLES.purchases).update({
      ...data, updated_at: new Date().toISOString()
    }).eq('id', id).select().single());
  },
  async delete(id) {
    return query(s => s.from(TABLES.purchases).delete().eq('id', id));
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