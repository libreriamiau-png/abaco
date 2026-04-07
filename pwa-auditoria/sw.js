// =============================================================
// SW.JS — Service Worker: cache-first shell, network-first API
// =============================================================

const CACHE_NAME = 'desiderio-auditoria-v2';

const SHELL_FILES = [
  './',
  './index.html',
  './css/app.css',
  './js/config.js',
  './js/db.js',
  './js/sync.js',
  './js/camera.js',
  './js/api.js',
  './js/app.js',
  './manifest.webmanifest',
];

// --- Install: pre-cache app shell ---
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// --- Activate: elimina caches viejos ---
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// --- Fetch: estrategia según destino ---
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignora solicitudes no-GET y extensiones de browser
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Network-first para llamadas a la API Supabase
  if (url.hostname.endsWith('.supabase.co')) {
    e.respondWith(networkFirst(request));
    return;
  }

  // Cache-first para todo lo demás (app shell)
  e.respondWith(cacheFirst(request));
});

// --- Estrategias ---

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Solo devolver index.html como fallback en navegaciones de página,
    // nunca para fetch de recursos o llamadas a APIs externas
    if (request.mode === 'navigate') {
      return caches.match('./index.html');
    }
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(
      JSON.stringify({ error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// --- Background sync (si el navegador lo soporta) ---
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-auditoria') {
    e.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => client.postMessage({ type: 'bg-sync' }));
}
