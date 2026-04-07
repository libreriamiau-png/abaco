// =============================================================
// SYNC.JS — Cola de sincronización offline → Supabase
// =============================================================

import CONFIG from './config.js';
import { getAllPending, updatePendingStatus, deletePending } from './db.js';
import { insertAuditoria, isOnline } from './api.js';

const { retryDelayMs, maxRetries, batchSize } = CONFIG.sync;

let _running = false;
let _listeners = [];

// --- Eventos públicos ---

export function onSyncUpdate(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter((l) => l !== fn); };
}

function emit(event) {
  _listeners.forEach((fn) => fn(event));
}

// --- Motor de sincronización ---

export async function runSync() {
  if (_running) return;
  _running = true;
  emit({ type: 'sync-start' });

  try {
    const online = await isOnline();
    if (!online) {
      emit({ type: 'sync-skip', reason: 'offline' });
      return;
    }

    const pending = await getAllPending();
    const batch = pending.slice(0, batchSize);

    let synced = 0;
    let failed = 0;

    for (const record of batch) {
      try {
        await updatePendingStatus(record.localId, 'syncing');

        // Preparar payload para Supabase (sin localId, sin campos internos)
        const { localId, status, retries, createdAt, ...payload } = record;

        await insertAuditoria(payload);
        await deletePending(localId);
        synced++;
        emit({ type: 'record-synced', localId, synced, total: batch.length });
      } catch (err) {
        const newRetries = (record.retries || 0) + 1;

        if (newRetries >= maxRetries) {
          await updatePendingStatus(record.localId, 'error', {
            retries: newRetries,
            lastError: err.message,
          });
          failed++;
          emit({ type: 'record-error', localId: record.localId, err: err.message });
        } else {
          await updatePendingStatus(record.localId, 'pending', {
            retries: newRetries,
            lastError: err.message,
          });
          failed++;
        }
      }
    }

    emit({ type: 'sync-done', synced, failed, remaining: pending.length - synced });
  } finally {
    _running = false;
  }
}

// --- Sincronización automática ---

let _intervalId = null;

export function startAutoSync(intervalMs = retryDelayMs) {
  if (_intervalId) return;
  _intervalId = setInterval(runSync, intervalMs);
}

export function stopAutoSync() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

// Sincroniza cuando la red vuelve
export function registerNetworkListeners() {
  window.addEventListener('online', () => {
    emit({ type: 'network-online' });
    runSync();
  });
  window.addEventListener('offline', () => {
    emit({ type: 'network-offline' });
  });
}
