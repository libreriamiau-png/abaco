// =============================================================
// CONFIG — PLACEHOLDERS: reemplazar antes de desplegar
// No commitear credenciales reales a este archivo
// =============================================================

const CONFIG = {
  supabase: {
    url: '__SUPABASE_URL__',           // ej: https://xyz.supabase.co
    anonKey: '__SUPABASE_ANON_KEY__',  // clave pública anon
  },

  // Tabla destino en Supabase
  tables: {
    auditoria: 'auditoria_libros',
  },

  // Compresión de imágenes
  image: {
    maxWidthPx: 800,
    maxFileSizeKB: 200,
    quality: 0.82,        // JPEG quality 0-1
    mimeType: 'image/jpeg',
  },

  // Cola de sincronización
  sync: {
    retryDelayMs: 5000,
    maxRetries: 5,
    batchSize: 10,
  },

  // Service Worker
  sw: {
    cacheName: 'desiderio-auditoria-v1',
    shellFiles: [
      './index.html',
      './css/app.css',
      './js/config.js',
      './js/db.js',
      './js/sync.js',
      './js/camera.js',
      './js/api.js',
      './js/app.js',
      './manifest.webmanifest',
    ],
  },
};

export default CONFIG;
