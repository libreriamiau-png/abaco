// ============================================
// CONFIGURACIÓN GLOBAL - LIBROS BOSCH
// ============================================

// IMPORTANTE: Reemplaza estos valores con tus credenciales de Supabase
const CONFIG = {
  // URL de tu proyecto Supabase
  SUPABASE_URL: 'https://ohlrldyobyxurnkwheli.supabase.co/rest/v1',
  
  // Clave anónima (anon key) - solo lectura pública con RLS
  SUPABASE_ANON_KEY: 'sb_publishable_-te2q-9zoRa4EPYHJWB3Uw_Jv0V3ZT3',
  
  // Configuración de paginación
  ITEMS_POR_PAGINA: 50,
  
  // Configuración de búsqueda
  DELAY_BUSQUEDA: 350, // ms antes de lanzar búsqueda
  
  // Entorno
  DEBUG: true,
  
  // Información de la librería
  NOMBRE_LIBRERIA: 'Libros Bosch',
  CIUDAD: 'Sevilla',
  DIRECCION: 'Calle Aceituno 6',
  TELEFONO: '647 511 220',
  EMAIL: 'librosbosch@gmail.com',
  WEB: 'librosbosch.com'
};

// Headers para todas las peticiones a Supabase
const API_HEADERS = {
  'apikey': CONFIG.SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Exportar para uso en otros archivos
if (typeof window !== 'undefined') {
  window.APP_CONFIG = CONFIG;
  window.API_HEADERS = API_HEADERS;
}
