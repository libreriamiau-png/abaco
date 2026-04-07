// =============================================================
// DB.JS — IndexedDB wrapper para persistencia offline
// =============================================================

const DB_NAME = 'desiderio-auditoria';
const DB_VERSION = 2;
const STORE_PENDING = 'pending_records';
const STORE_DRAFT = 'draft';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        const store = db.createObjectStore(STORE_PENDING, {
          keyPath: 'localId',
          autoIncrement: true,
        });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_DRAFT)) {
        db.createObjectStore(STORE_DRAFT, { keyPath: 'id' });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

// --- Pending records (cola de sincronización) ---

export async function savePending(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    const req = tx.objectStore(STORE_PENDING).add({
      ...record,
      status: 'pending',   // pending | syncing | done | error
      retries: 0,
      createdAt: Date.now(),
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      const err = req.error;
      if (err && err.name === 'QuotaExceededError') {
        reject(new Error('Almacenamiento lleno. Sincroniza los registros pendientes para liberar espacio.'));
      } else {
        reject(err);
      }
    };
  });
}

export async function getAllPending() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readonly');
    const index = tx.objectStore(STORE_PENDING).index('status');
    const req = index.getAll('pending');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function updatePendingStatus(localId, status, extra = {}) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    const store = tx.objectStore(STORE_PENDING);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (!record) return reject(new Error('Record not found'));
      const updated = { ...record, status, ...extra };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deletePending(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    const req = tx.objectStore(STORE_PENDING).delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function countPending() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readonly');
    const index = tx.objectStore(STORE_PENDING).index('status');
    const req = index.count('pending');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Draft (borrador activo del formulario) ---

export async function saveDraft(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFT, 'readwrite');
    const req = tx.objectStore(STORE_DRAFT).put({ id: 'current', ...data });
    req.onsuccess = () => resolve();
    req.onerror = () => {
      const err = req.error;
      if (err && err.name === 'QuotaExceededError') {
        // Draft no crítico — fallo silencioso controlado, no bloquear al usuario
        console.warn('[DB] QuotaExceededError al guardar draft — ignorado');
        resolve();
      } else {
        reject(err);
      }
    };
  });
}

export async function loadDraft() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFT, 'readonly');
    const req = tx.objectStore(STORE_DRAFT).get('current');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDraft() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFT, 'readwrite');
    const req = tx.objectStore(STORE_DRAFT).delete('current');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
