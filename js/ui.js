// ============================================
// MÓDULO UI - COMPONENTES DE INTERFAZ
// ============================================

/**
 * Muestra un mensaje toast
 * @param {string} mensaje - Mensaje a mostrar
 * @param {boolean} esError - Si es un mensaje de error
 * @param {number} duracion - Duración en ms (default: 3000)
 */
function toast(mensaje, esError = false, duracion = 3000) {
  let toastEl = document.getElementById('toast');
  
  // Crear toast si no existe
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  
  // Aplicar mensaje y estilo
  toastEl.textContent = mensaje;
  toastEl.className = 'toast' + (esError ? ' error' : '');
  toastEl.classList.add('visible');
  
  // Ocultar después de la duración
  setTimeout(() => {
    toastEl.classList.remove('visible');
  }, duracion);
}

/**
 * Abre el modal con contenido
 * @param {string|HTMLElement} contenido - Contenido del modal
 */
function abrirModal(contenido) {
  let overlay = document.getElementById('modalOverlay');

  // Si no existe el overlay, crearlo
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modalOverlay';
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
  }

  // Si el overlay existe pero está vacío o incompleto, reconstruir su contenido
  let modal = overlay.querySelector('.modal');
  let modalContenido = document.getElementById('modalContenido');

  if (!modal || !modalContenido) {
    overlay.innerHTML = '';

    modal = document.createElement('div');
    modal.className = 'modal';

    const btnCerrar = document.createElement('button');
    btnCerrar.className = 'modal-close';
    btnCerrar.innerHTML = '×';
    btnCerrar.onclick = cerrarModal;

    modalContenido = document.createElement('div');
    modalContenido.id = 'modalContenido';

    modal.appendChild(btnCerrar);
    modal.appendChild(modalContenido);
    overlay.appendChild(modal);
  }

  // Añadir listener de cierre solo una vez
  if (!overlay.dataset.listenerAttached) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cerrarModal();
    });
    overlay.dataset.listenerAttached = 'true';
  }

  // Insertar contenido
  modalContenido.innerHTML = '';

  if (typeof contenido === 'string') {
    const div = document.createElement('div');
    div.textContent = contenido;
    modalContenido.appendChild(div);
  } else {
    modalContenido.appendChild(contenido);
  }

  overlay.classList.add('visible');
}

/**
 * Cierra el modal
 */
function cerrarModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.remove('visible');
  }
  window.libroActivoModal = null;
}

/**
 * Muestra estado de carga en un contenedor
 * @param {string} contenedorId - ID del contenedor
 * @param {string} mensaje - Mensaje de carga
 */
function mostrarCargando(contenedorId, mensaje = 'Cargando...') {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;
  
  contenedor.innerHTML = '';
  
  const wrapper = crearElemento('div', { class: 'estado-carga' });
  const spinner = crearElemento('div', { class: 'spinner' });
  const texto = crearElemento('div', {}, mensaje);
  
  wrapper.appendChild(spinner);
  wrapper.appendChild(document.createElement('br'));
  wrapper.appendChild(texto);
  
  contenedor.appendChild(wrapper);
}

/**
 * Muestra un mensaje de error en un contenedor
 * @param {string} contenedorId - ID del contenedor
 * @param {string} mensaje - Mensaje de error
 * @param {function} onReintentar - Función al hacer clic en reintentar
 */
function mostrarError(contenedorId, mensaje, onReintentar = null) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;
  
  contenedor.innerHTML = '';
  
  const wrapper = crearElemento('div', { 
    class: 'estado-carga',
    style: { color: 'var(--rojo)' }
  });
  
  const icono = crearElemento('div', {}, '⚠️');
  const texto = crearElemento('div', {}, mensaje);
  
  wrapper.appendChild(icono);
  wrapper.appendChild(document.createElement('br'));
  wrapper.appendChild(texto);
  
  if (onReintentar) {
    wrapper.appendChild(document.createElement('br'));
    wrapper.appendChild(document.createElement('br'));
    
    const btnReintentar = crearElemento('button', {
      class: 'btn btn-sm',
      onclick: onReintentar
    }, '↺ Reintentar');
    
    wrapper.appendChild(btnReintentar);
  }
  
  contenedor.appendChild(wrapper);
}

/**
 * Muestra mensaje cuando no hay datos
 * @param {string} contenedorId - ID del contenedor
 * @param {string} mensaje - Mensaje a mostrar
 */
function mostrarVacio(contenedorId, mensaje = 'No hay datos') {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;
  
  contenedor.innerHTML = '';
  
  const wrapper = crearElemento('div', { class: 'estado-carga' }, mensaje);
  contenedor.appendChild(wrapper);
}

/**
 * Confirma una acción con el usuario
 * @param {string} mensaje - Mensaje de confirmación
 * @param {function} onConfirmar - Función a ejecutar si confirma
 * @param {function} onCancelar - Función a ejecutar si cancela
 */
function confirmar(mensaje, onConfirmar, onCancelar = null) {
  if (confirm(mensaje)) {
    if (onConfirmar) onConfirmar();
  } else {
    if (onCancelar) onCancelar();
  }
}

/**
 * Actualiza la información de paginación
 * @param {number} paginaActual - Página actual (0-indexed)
 * @param {number} totalItems - Total de items
 * @param {number} porPagina - Items por página
 * @param {string} infoPaginaId - ID del elemento de info
 * @param {string} btnAnteriorId - ID del botón anterior
 * @param {string} btnSiguienteId - ID del botón siguiente
 */
function actualizarPaginacion(paginaActual, totalItems, porPagina, infoPaginaId, btnAnteriorId, btnSiguienteId) {
  const desde = paginaActual * porPagina + 1;
  const hasta = Math.min((paginaActual + 1) * porPagina, totalItems);
  
  // Actualizar info
  const infoEl = document.getElementById(infoPaginaId);
  if (infoEl) {
    infoEl.textContent = totalItems > 0 ? `${desde}–${hasta} de ${totalItems}` : '';
  }
  
  // Actualizar botones
  const btnAnterior = document.getElementById(btnAnteriorId);
  const btnSiguiente = document.getElementById(btnSiguienteId);
  
  if (btnAnterior) {
    btnAnterior.disabled = paginaActual === 0;
  }
  
  if (btnSiguiente) {
    btnSiguiente.disabled = hasta >= totalItems;
  }
}

/**
 * Debounce para búsquedas
 * @param {function} func - Función a ejecutar
 * @param {number} delay - Delay en ms
 * @returns {function} - Función con debounce
 */
function debounce(func, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Scroll suave a un elemento
 * @param {string} elementoId - ID del elemento
 * @param {string} comportamiento - 'smooth' o 'auto'
 */
function scrollA(elementoId, comportamiento = 'smooth') {
  const elemento = document.getElementById(elementoId);
  if (elemento) {
    elemento.scrollIntoView({ behavior: comportamiento, block: 'start' });
  }
}

/**
 * Deshabilita un botón temporalmente
 * @param {string} botonId - ID del botón
 * @param {string} textoEspera - Texto mientras está deshabilitado
 * @param {function} accion - Acción async a ejecutar
 */
async function ejecutarConBoton(botonId, textoEspera, accion) {
  const boton = document.getElementById(botonId);
  if (!boton) return;
  
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = textoEspera;
  
  try {
    await accion();
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}