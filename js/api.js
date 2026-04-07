// ============================================
// MÓDULO API - FUNCIONES SUPABASE
// ============================================

/**
 * Realiza una petición a la API de Supabase
 * @param {string} endpoint - Endpoint de la API (ej: '/inventario')
 * @param {object} options - Opciones de fetch (method, body, etc.)
 * @returns {Promise} - Respuesta parseada
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${CONFIG.SUPABASE_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      ...API_HEADERS,
      ...(options.headers || {})
    }
  };
  
  try {
    const response = await fetch(url, config);
    
    // Manejar errores HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.message || errorData.hint || `Error ${response.status}`;
      
      const error = new Error(errorMsg);
      error.status = response.status;
      error.code = errorData.code;
      error.details = errorData.details;
      
      if (CONFIG.DEBUG) {
        console.error('API Error:', {
          endpoint,
          status: response.status,
          error: errorData
        });
      }
      
      throw error;
    }
    
    // Parsear respuesta
    const data = await response.json().catch(() => null);
    return data;
    
  } catch (error) {
    if (CONFIG.DEBUG) {
      console.error('Fetch error:', error);
    }
    throw error;
  }
}

/**
 * Obtiene el conteo total de registros
 * @param {string} endpoint - Endpoint con filtros
 * @returns {Promise<number>} - Número total de registros
 */
async function apiConteo(endpoint) {
  const url = `${CONFIG.SUPABASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        ...API_HEADERS,
        'Prefer': 'count=exact'
      }
    });
    
    const range = response.headers.get('Content-Range');
    if (!range) return 0;
    
    const match = range.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
    
  } catch (error) {
    if (CONFIG.DEBUG) {
      console.error('Count error:', error);
    }
    return 0;
  }
}

/**
 * Obtiene el siguiente número de stock disponible
 * @returns {Promise<number>} - Siguiente stock_no
 */
async function obtenerSiguienteStockNo() {
  try {
    const data = await apiFetch('/inventario?select=stock_no&order=stock_no.desc&limit=1');
    
    if (!data || !data.length || !data[0].stock_no) {
      return 1;
    }
    
    return data[0].stock_no + 1;
    
  } catch (error) {
    if (CONFIG.DEBUG) {
      console.error('Error obteniendo stock_no:', error);
    }
    // Si falla, usar timestamp como fallback
    return Math.floor(Date.now() / 1000);
  }
}

/**
 * Validador de ISBN (ISBN-10 o ISBN-13)
 * @param {string} isbn - ISBN a validar
 * @returns {boolean} - true si es válido
 */
function validarISBN(isbn) {
  if (!isbn) return false;
  
  // Limpiar ISBN (quitar guiones y espacios)
  const cleanISBN = isbn.replace(/[\s-]+/g, '');
  
  // ISBN-10
  if (cleanISBN.length === 10) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const digit = parseInt(cleanISBN[i]);
      if (isNaN(digit)) return false;
      sum += digit * (10 - i);
    }
    const checkDigit = cleanISBN[9].toUpperCase();
    sum += (checkDigit === 'X') ? 10 : parseInt(checkDigit);
    return sum % 11 === 0;
  }
  
  // ISBN-13
  if (cleanISBN.length === 13) {
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      const digit = parseInt(cleanISBN[i]);
      if (isNaN(digit)) return false;
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    return sum % 10 === 0;
  }
  
  return false;
}

/**
 * Normaliza el nombre de un autor
 * @param {string} autor - Nombre del autor
 * @returns {string} - Nombre normalizado
 */
function normalizarAutor(autor) {
  if (!autor) return '';
  
  // Eliminar múltiples espacios
  let normalizado = autor.trim().replace(/\s+/g, ' ');
  
  // Capitalizar primera letra de cada palabra
  normalizado = normalizado.replace(/\b\w/g, l => l.toUpperCase());
  
  return normalizado;
}

/**
 * Formatea un precio para mostrar
 * @param {number} precio - Precio numérico
 * @returns {string} - Precio formateado (ej: "25,50 €")
 */
function formatearPrecio(precio) {
  if (precio === null || precio === undefined) return '—';
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(precio);
}

/**
 * Formatea una fecha para mostrar
 * @param {string} fecha - Fecha ISO
 * @param {boolean} incluirHora - Si incluir hora
 * @returns {string} - Fecha formateada
 */
function formatearFecha(fecha, incluirHora = false) {
  if (!fecha) return '—';
  
  const opciones = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  
  if (incluirHora) {
    opciones.hour = '2-digit';
    opciones.minute = '2-digit';
  }
  
  return new Date(fecha).toLocaleDateString('es-ES', opciones);
}

/**
 * Escapa HTML para prevenir XSS
 * @param {string} texto - Texto a escapar
 * @returns {string} - Texto escapado
 */
function escaparHTML(texto) {
  if (!texto) return '';
  
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/**
 * Crea un elemento HTML de forma segura
 * @param {string} tag - Etiqueta HTML
 * @param {object} attrs - Atributos
 * @param {string|Node} contenido - Contenido
 * @returns {HTMLElement} - Elemento creado
 */
function crearElemento(tag, attrs = {}, contenido = '') {
  const elemento = document.createElement(tag);
  
  // Aplicar atributos
  Object.keys(attrs).forEach(key => {
    if (key === 'class') {
      elemento.className = attrs[key];
    } else if (key === 'style' && typeof attrs[key] === 'object') {
      Object.assign(elemento.style, attrs[key]);
    } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
      elemento.addEventListener(key.substring(2).toLowerCase(), attrs[key]);
    } else {
      elemento.setAttribute(key, attrs[key]);
    }
  });
  
  // Aplicar contenido
  if (typeof contenido === 'string') {
    elemento.textContent = contenido;
  } else if (contenido instanceof Node) {
    elemento.appendChild(contenido);
  }
  
  return elemento;
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.apiFetch = apiFetch;
  window.apiConteo = apiConteo;
  window.obtenerSiguienteStockNo = obtenerSiguienteStockNo;
  window.validarISBN = validarISBN;
  window.normalizarAutor = normalizarAutor;
  window.formatearPrecio = formatearPrecio;
  window.formatearFecha = formatearFecha;
  window.escaparHTML = escaparHTML;
  window.crearElemento = crearElemento;
}
