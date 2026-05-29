/**
 * R2C-Scan — Database Layer (IndexedDB)
 * v2.0 — Modular, with error handling and type validation
 */
const DB_NAME = 'R2C-Scan';
const DB_VER = 4;

// Store names — single source of truth
export const STORES = {
  PRODUCTS: 'products',
  MAINTENANCE: 'maintenance',
  STOCK: 'stock',
  SUPPLIERS: 'suppliers',
  SCAN_HISTORY: 'scanHistory',
  MOVEMENTS: 'movements'
};

let db = null;

/**
 * Initialize database connection
 * @returns {Promise<IDBDatabase>}
 */
export function initDB() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      const storeNames = Object.values(STORES);
      storeNames.forEach(s => {
        if (!d.objectStoreNames.contains(s)) {
          const store = d.createObjectStore(s, { keyPath: 'id' });
          // Add indexes for better query performance
          if (s === STORES.PRODUCTS) {
            store.createIndex('sku', 'sku', { unique: false });
            store.createIndex('category', 'category', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (s === STORES.MAINTENANCE) {
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('date', 'date', { unique: false });
          }
          if (s === STORES.STOCK) {
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('qty', 'qty', { unique: false });
          }
        }
      });
    };
    req.onsuccess = e => {
      db = e.target.result;
      console.log(`✅ IndexedDB connected: ${DB_NAME} v${DB_VER}`);
      resolve(db);
    };
    req.onerror = e => {
      console.error('❌ IndexedDB error:', e.target.error);
      reject(e.target.error);
    };
  });
}

/**
 * Get all records from a store
 * @param {string} storeName
 * @returns {Promise<Array>}
 */
export async function getAll(storeName) {
  const d = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = d.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = e => {
        console.error(`❌ db.getAll(${storeName}):`, e.target.error);
        reject(e.target.error);
      };
    } catch (err) {
      console.error(`❌ db.getAll(${storeName}) exception:`, err);
      reject(err);
    }
  });
}

/**
 * Get a record by ID
 * @param {string} storeName
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getById(storeName, id) {
  const d = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = d.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = e => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Save/update a record
 * @param {string} storeName
 * @param {Object} item
 * @returns {Promise<void>}
 */
export async function save(storeName, item) {
  const d = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = d.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).put(item);
      req.onsuccess = () => resolve();
      req.onerror = e => {
        console.error(`❌ db.save(${storeName}):`, e.target.error);
        reject(e.target.error);
      };
    } catch (err) {
      console.error(`❌ db.save(${storeName}) exception:`, err);
      reject(err);
    }
  });
}

/**
 * Delete a record by ID
 * @param {string} storeName
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function remove(storeName, id) {
  const d = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = d.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Search products by query
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchProducts(query) {
  const all = await getAll(STORES.PRODUCTS);
  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.sku || '').toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q)
  );
}

/**
 * Clear all data from a store (for import/export)
 * @param {string} storeName
 * @returns {Promise<void>}
 */
export async function clearStore(storeName) {
  const d = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = d.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).clear();
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

export default { initDB, getAll, getById, save, remove, searchProducts, clearStore, STORES };