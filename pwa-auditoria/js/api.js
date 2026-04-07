// =============================================================
// API.JS — Cliente REST Supabase (sin SDK, fetch nativo)
// =============================================================

import CONFIG from './config.js';

const { url, anonKey } = CONFIG.supabase;
const { auditoria } = CONFIG.tables;

function headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Prefer': 'return=representation',
    ...extra,
  };
}

// Inserta un registro de auditoría (sin fotos base64 en el body principal)
// Las fotos se suben a Storage por separado si se configura bucket.
export async function insertAuditoria(record) {
  const res = await fetch(`${url}/rest/v1/${auditoria}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(record),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Actualiza un registro existente por id remoto
export async function updateAuditoria(remoteId, patch) {
  const res = await fetch(`${url}/rest/v1/${auditoria}?id=eq.${remoteId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Health-check: devuelve true si Supabase responde
export async function isOnline() {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(4000),
    });
    return res.ok || res.status === 401; // 401 = llega pero sin auth
  } catch {
    return false;
  }
}
