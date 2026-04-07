// ============================================
// VARIABLES GLOBALES
// ============================================
let inventario = [];
let pagina = 0;
let totalLibros = 0;
let busquedaActual = '';
let editandoId = null;
let timeoutIsbn = null;
let ultimaFicha = null;

// Variables para selección persistente
let librosSeleccionados = new Set();
let seleccionTotalActiva = false;

const POR_PAGINA = CONFIG.ITEMS_POR_PAGINA || 50;

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // La carga del inventario se hace después del login en auth.js
});

// ============================================
// NAVEGACIÓN ENTRE PANELES
// ============================================
function mostrarPanel(panel, elemento) {
  document.getElementById('panelInventario').style.display = panel === 'inventario' ? 'block' : 'none';
  document.getElementById('panelBuscador').style.display = panel === 'buscador' ? 'block' : 'none';
  document.getElementById('panelLotes').style.display = panel === 'lotes' ? 'block' : 'none';

  // Actualizar nav
  document.querySelectorAll('.header-nav a').forEach(a => a.classList.remove('activo'));
  if (elemento) elemento.classList.add('activo');
}

// ============================================
// TABS
// ============================================
function cambiarTab(tabId, elemento) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('activa'));
  elemento.classList.add('activa');
  
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('visible'));
  document.getElementById(`tab-${tabId}`).classList.add('visible');
}

// ============================================
// CARGAR INVENTARIO
// ============================================
async function cargarInventario() {
  mostrarCargando('tbodyInventario', 'Cargando inventario...');
  
  try {
    const filtros = busquedaActual
      ? `or=(titulo.ilike.*${encodeURIComponent(busquedaActual)}*,autor.ilike.*${encodeURIComponent(busquedaActual)}*,isbn.ilike.*${encodeURIComponent(busquedaActual)}*)`
      : '';
    
    totalLibros = await apiConteo(`/inventario?${filtros}`);
    
    const desde = pagina * POR_PAGINA;
    const hasta = desde + POR_PAGINA - 1;
    
    const response = await fetch(`${CONFIG.SUPABASE_URL}/inventario?${filtros}&order=id.desc&offset=${desde}&limit=${POR_PAGINA}`, {
      headers: {
        ...API_HEADERS,
        'Range': `${desde}-${hasta}`,
        'Prefer': 'count=exact'
      }
    });
    
    inventario = await response.json();
    
    renderTabla();
    actualizarDashboard();
    
  } catch (error) {
    mostrarError('tbodyInventario', error.message, cargarInventario);
  }
}

// ============================================
// RENDER TABLA
// ============================================
function renderTabla() {
  const tbody = document.getElementById('tbodyInventario');
  tbody.innerHTML = '';
  
  if (!inventario.length) {
    mostrarVacio('tbodyInventario', busquedaActual ? 'No se encontraron libros' : 'No hay libros registrados');
    actualizarPaginacion(pagina, totalLibros, POR_PAGINA, 'paginacionInfo', 'btnAnterior', 'btnSiguiente');
    return;
  }
  
  inventario.forEach((libro, i) => {
    const tr = document.createElement('tr');
	// Checkbox de selección
const tdCheckbox = crearElemento('td', { style: { textAlign: 'center' } });
const checkbox = document.createElement('input');
checkbox.type = 'checkbox';
checkbox.className = 'checkbox-libro';
checkbox.value = libro.id;
checkbox.dataset.stockNo = libro.stock_no;

// Añadir evento para mantener sincronización
checkbox.addEventListener('change', function() {
  toggleCheckboxLibro(this);
});

// Marcar si está seleccionado
if (seleccionTotalActiva || librosSeleccionados.has(libro.id)) {
  checkbox.checked = true;
}

tdCheckbox.appendChild(checkbox);
    
    // # Posición
    const tdNum = crearElemento('td', { style: { color: 'var(--muted)', fontSize: '.83rem' } }, 
      String(pagina * POR_PAGINA + i + 1));
    
    // Stock
    const tdStock = crearElemento('td', { class: 'td-stock' }, 
      libro.stock_no ? `#${libro.stock_no}` : '—');
    
    // Título
    const tdTitulo = crearElemento('td', { class: 'td-titulo' }, 
      libro.titulo || '—');
    
    // Autor
    const tdAutor = crearElemento('td', { class: 'td-autor' }, 
      libro.autor || '—');
    
    // Tipo
    const spanTipo = crearElemento('span', { class: 'td-tipo' }, 
      libro.tipo || 'Libro');
    const tdTipo = crearElemento('td');
    tdTipo.appendChild(spanTipo);
    
    // Precio
    const tdPrecio = crearElemento('td', { class: 'td-precio' }, 
      libro.precio ? formatearPrecio(libro.precio) : '—');
    
    // Estado
    const estadoClass = libro.estado === 'Muy bien' || libro.estado === 'Como nuevo' ? 'est-bien' :
                        libro.estado === 'Bien' ? 'est-regular' : 'est-malo';
    const spanEstado = crearElemento('span', { class: `td-estado ${estadoClass}` }, 
      libro.estado || 'Bien');
    const tdEstado = crearElemento('td');
    tdEstado.appendChild(spanEstado);
    
    // Acciones
    const divAcciones = crearElemento('div', { class: 'acciones' });
    
    const btnVer = crearElemento('button', {
      class: 'btn btn-sm',
      onclick: () => verDetalle(libro.id)
    }, '👁️');
    
    const btnEditar = crearElemento('button', {
      class: 'btn btn-sm',
      onclick: () => editarLibro(libro.id)
    }, '✏️');
    
    const btnEliminar = crearElemento('button', {
      class: 'btn btn-sm btn-danger',
      onclick: () => eliminarLibro(libro.id)
    }, '🗑️');
    
    divAcciones.appendChild(btnVer);
    divAcciones.appendChild(btnEditar);
    divAcciones.appendChild(btnEliminar);
    
    const tdAcciones = crearElemento('td');
    tdAcciones.appendChild(divAcciones);
    
    // Agregar todo al tr
    tr.appendChild(tdCheckbox);
	tr.appendChild(tdNum);
    tr.appendChild(tdStock);
    tr.appendChild(tdTitulo);
    tr.appendChild(tdAutor);
    tr.appendChild(tdTipo);
    tr.appendChild(tdPrecio);
    tr.appendChild(tdEstado);
    tr.appendChild(tdAcciones);
    
    tbody.appendChild(tr);
  });
  
  actualizarPaginacion(pagina, totalLibros, POR_PAGINA, 'paginacionInfo', 'btnAnterior', 'btnSiguiente');
  document.getElementById('contadorLibros').textContent = totalLibros;
  // Resetear checkbox de seleccionar todos
const checkboxAll = document.getElementById('checkboxSelectAll');
if (checkboxAll) checkboxAll.checked = false;
}
// ============================================
// FUNCIONES DE SELECCIÓN DE CHECKBOXES
// ============================================
// Función auxiliar: actualizar el estado del checkbox del encabezado
function actualizarCheckboxSelectAll() {
  const checkboxAll = document.getElementById('checkboxSelectAll');
  if (!checkboxAll) return;
  
  const checkboxes = document.querySelectorAll('.checkbox-libro');
  const todosCheckboxes = Array.from(checkboxes);
  
  // Si no hay checkboxes en la página, desmarcar
  if (todosCheckboxes.length === 0) {
    checkboxAll.checked = false;
    checkboxAll.indeterminate = false;
    return;
  }
  
  if (seleccionTotalActiva) {
    checkboxAll.checked = true;
    checkboxAll.indeterminate = false;
  } else if (todosCheckboxes.every(cb => cb.checked)) {
    checkboxAll.checked = true;
    checkboxAll.indeterminate = false;
  } else if (todosCheckboxes.some(cb => cb.checked)) {
    checkboxAll.checked = false;
    checkboxAll.indeterminate = true;
  } else {
    checkboxAll.checked = false;
    checkboxAll.indeterminate = false;
  }
}

// Función auxiliar: actualizar el contador de selección y mostrar/ocultar botones
function actualizarContadorSeleccion() {
  const badge = document.getElementById('badgeSeleccion');
  if (!badge) return;
  
  if (seleccionTotalActiva) {
    badge.textContent = `${totalLibros} seleccionados`;
    badge.style.display = 'inline-block';
    badge.style.background = 'var(--dorado)';
    badge.style.color = 'white';
  } else if (librosSeleccionados.size > 0) {
    badge.textContent = `${librosSeleccionados.size} seleccionados`;
    badge.style.display = 'inline-block';
    badge.style.background = 'var(--dorado)';
    badge.style.color = 'white';
  } else {
    badge.style.display = 'none';
  }
  
  // Mostrar/ocultar botones de exportación
  const btnExportar = document.getElementById('botonesExportacion');
  if (btnExportar) {
    btnExportar.style.display = (seleccionTotalActiva || librosSeleccionados.size > 0) ? 'flex' : 'none';
  }
}

// Función auxiliar: actualizar checkboxes de la página actual según el estado global
function actualizarCheckboxesPagina() {
  const checkboxes = document.querySelectorAll('.checkbox-libro');
  
  if (seleccionTotalActiva) {
    // Si está activa la selección total, marcar todos y añadirlos al Set
    checkboxes.forEach(cb => {
      cb.checked = true;
      librosSeleccionados.add(parseInt(cb.value));
    });
  } else {
    // Si no, marcar solo los que están en el Set
    checkboxes.forEach(cb => {
      const id = parseInt(cb.value);
      cb.checked = librosSeleccionados.has(id);
    });
  }
  
  actualizarCheckboxSelectAll();
}

// Función principal: manejar el click en el checkbox del encabezado
function toggleSeleccionTodos() {
  const checkboxAll = document.getElementById('checkboxSelectAll');
  if (!checkboxAll) return;
  
  if (checkboxAll.checked) {
    // Si marca "todo", pregunta si quiere seleccionar TODO el inventario
    if (confirm(`¿Seleccionar TODOS los ${totalLibros} libros del inventario?\n\n✓ SÍ → Selecciona todo el inventario completo\n✗ NO → Selecciona solo los ${inventario.length} libros visibles en esta página`)) {
      // Seleccionar TODO el inventario
      seleccionTotalActiva = true;
      librosSeleccionados.clear();
      actualizarCheckboxesPagina();
      actualizarContadorSeleccion();
    } else {
      // Seleccionar solo los de la página actual
      seleccionTotalActiva = false;
      const checkboxes = document.querySelectorAll('.checkbox-libro');
      checkboxes.forEach(cb => {
        cb.checked = true;
        librosSeleccionados.add(parseInt(cb.value));
      });
      actualizarContadorSeleccion();
    }
	  } else {
    // Desmarcar todo
    seleccionTotalActiva = false;
    librosSeleccionados.clear();
    const checkboxes = document.querySelectorAll('.checkbox-libro');
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
    actualizarContadorSeleccion();
  }
}

// Función: manejar el click en un checkbox individual
function toggleCheckboxLibro(checkbox) {
  const id = parseInt(checkbox.value);
  
  if (checkbox.checked) {
    librosSeleccionados.add(id);
  } else {
    librosSeleccionados.delete(id);
    seleccionTotalActiva = false;
  }
  
  actualizarCheckboxSelectAll();
  actualizarContadorSeleccion();
}

// Función: obtener información sobre la selección actual
function obtenerLibrosSeleccionados() {
  return {
    seleccionTotal: seleccionTotalActiva,
    ids: Array.from(librosSeleccionados),
    cantidad: seleccionTotalActiva ? totalLibros : librosSeleccionados.size
  };
}

// ============================================
// DASHBOARD
// ============================================
// ============================================
// CARGAR TODOS LOS PRECIOS (PAGINADO)
// ============================================
async function cargarTodosPrecios() {
  let todos = [], offset = 0;
  while (true) {
const res = await fetch(`${CONFIG.SUPABASE_URL}/inventario?select=precio,cantidad&precio=not.is.null&limit=1000&offset=${offset}`, {
      headers: { 
        ...API_HEADERS,
        'Prefer': 'count=none' 
      }
    });
    if (!res.ok) break;
    const lote = await res.json();
    if (!lote || !lote.length) break;
    todos = todos.concat(lote);
    if (lote.length < 1000) break;
    offset += 1000;
  }
  return todos;
}

// ============================================
// DASHBOARD
// ============================================
async function actualizarDashboard() {
  try {
    const [total, sinPrecio, ultimoStock, todos] = await Promise.all([
      apiConteo('/inventario'),
      apiConteo('/inventario?precio=is.null'),
      apiFetch('/inventario?select=stock_no&order=stock_no.desc&limit=1'),
      cargarTodosPrecios()
    ]);
    
    const valor = (todos || []).reduce((s, l) => s + parseFloat(l.precio || 0) * (parseInt(l.cantidad) || 1), 0);
    
    document.getElementById('statTotal').textContent = total.toLocaleString('es-ES');
    document.getElementById('statUltimo').textContent = ultimoStock?.[0]?.stock_no || '—';
    document.getElementById('statSinPrecio').textContent = sinPrecio;
    
  } catch (error) {
    console.error('Error actualizando dashboard:', error);
  }
}

// ============================================
// GUARDAR LIBRO (BUG ARREGLADO)
// ============================================
async function guardarLibro() {
  const btn = document.getElementById('btnGuardar');
  if (!btn || btn.disabled) return;

  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const titulo = document.getElementById('fTitulo').value.trim();
    if (!titulo) throw new Error('El título es obligatorio');

    // En edición se conserva stock_no; en alta nueva lo asigna la base de datos
	    const stock_no_actual = parseInt(document.getElementById('fStockNo').value) || null;

    const payload = {
      isbn: document.getElementById('fIsbn').value.trim() || null,
      autor: document.getElementById('fAutor').value.trim() || null,
      tipo: document.getElementById('fTipo').value || 'Libro',
      titulo,
      lugar: document.getElementById('fLugar').value.trim() || null,
      editorial: document.getElementById('fEditorial').value.trim() || null,
      fecha: document.getElementById('fFecha').value.trim() || null,
      encuadernacion: document.getElementById('fEncuadernacion').value || null,
      estado: document.getElementById('fEstado').value || 'Muy bien',
      tamano_cm: document.getElementById('fTamanoCm').value.trim() || null,
      paginas: parseInt(document.getElementById('fPaginas').value) || null,
      sobrecubierta: document.getElementById('fSobrecubierta').value || 'Sin sobrecubierta',
      estado_sobrecubierta: document.getElementById('fSobrecubierta').value === 'Con sobrecubierta'
        ? (document.getElementById('fEstadoSobrecubierta').value || 'Bien')
        : null,
      primera_edicion: document.getElementById('fPrimeraEdicion').checked,
      dedicatoria: document.getElementById('fDedicatoria').checked,
      firma_autor: document.getElementById('fFirmaAutor').checked,
      ex_libris: document.getElementById('fExLibris').checked,
      materia: document.getElementById('fMateria').value.trim() || null,
      materia2: document.getElementById('fMateria2').value.trim() || null,
      idioma: document.getElementById('fIdioma').value || 'Español',
      localiz: document.getElementById('fLocaliz').value.trim() || null,
      cantidad: parseInt(document.getElementById('fCantidad').value) || 1,
      descripcion: document.getElementById('fDescripcion').value.trim() || null,
      precio: parseFloat(document.getElementById('fPrecio').value.replace(',', '.')) || null,
      precio_compra: parseFloat(document.getElementById('fPrecioCompra').value.replace(',', '.')) || null,
      encuadernacion_abebooks: document.getElementById('fEncuadernacionAbebooks').value || null,
      catalogo: document.getElementById('fCatalogo').value.trim() || null,
      publicar_online: document.getElementById('fPublicarOnline').value === 'true',
      procedencia: document.getElementById('fProcedencia').value.trim() || null,
      compra_id: parseInt(document.getElementById('fCompraId').value) || null,
      notas: document.getElementById('fNotas').value.trim() || null
    };

    if (editandoId) {
      payload.stock_no = stock_no_actual;
      await apiFetch(`/inventario?id=eq.${editandoId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      toast(`✓ Libro actualizado (stock ${stock_no_actual || '—'})`);
      editandoId = null;
    } else {
      const resultado = await apiFetch('/inventario', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(payload)
      });
      ultimaFicha = Array.isArray(resultado) ? resultado[0] : null;
      if (ultimaFicha?.stock_no) {
        document.getElementById('fStockNo').value = ultimaFicha.stock_no;
      }
      toast(`✓ Libro guardado (stock ${ultimaFicha?.stock_no ?? 'asignado'})`);
    }

    await cargarInventario();
    limpiarFormulario();

  } catch (error) {
    toast(error.message || 'Error al guardar', true);
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

// ============================================
// EDITAR LIBRO
// ============================================
async function editarLibro(id) {
  try {
    const [libro] = await apiFetch(`/inventario?id=eq.${id}`);
    if (!libro) {
      toast('No se encontró el libro', true);
      return;
    }
    
    editandoId = id;
    
    document.getElementById('formTituloLabel').textContent = `✏️ Editando: ${libro.titulo?.substring(0, 50) || 'libro'}`;
    document.getElementById('btnGuardar').textContent = '✏️ Actualizar libro';
    
    // Rellenar formulario
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') {
          el.value = val || '';
        } else if (el.type === 'checkbox') {
          el.checked = !!val;
        } else {
          el.value = val || '';
        }
      }
    };
	    set('fIsbn', libro.isbn);
    set('fStockNo', libro.stock_no);
    set('fAutor', libro.autor);
    set('fTipo', libro.tipo);
    set('fTitulo', libro.titulo);
    set('fLugar', libro.lugar);
    set('fEditorial', libro.editorial);
    set('fFecha', libro.fecha);
    set('fEncuadernacion', libro.encuadernacion);
    set('fEstado', libro.estado);
    set('fTamanoCm', libro.tamano_cm);
    set('fPaginas', libro.paginas);
    set('fSobrecubierta', libro.sobrecubierta);
    set('fEstadoSobrecubierta', libro.estado_sobrecubierta);
    set('fPrimeraEdicion', libro.primera_edicion);
    set('fDedicatoria', libro.dedicatoria);
    set('fFirmaAutor', libro.firma_autor);
    set('fExLibris', libro.ex_libris);
    set('fMateria', libro.materia);
    set('fMateria2', libro.materia2);
    set('fIdioma', libro.idioma);
    set('fLocaliz', libro.localiz);
    set('fCantidad', libro.cantidad);
    set('fDescripcion', libro.descripcion);
    set('fPrecio', libro.precio);
    set('fPrecioCompra', libro.precio_compra);
    set('fEncuadernacionAbebooks', libro.encuadernacion_abebooks);
    set('fCatalogo', libro.catalogo);
    set('fPublicarOnline', String(libro.publicar_online));
    set('fProcedencia', libro.procedencia);
    set('fCompraId', libro.compra_id);
    set('fNotas', libro.notas);
	set('fFechaAlta', formatearFecha(libro.fecha_alta));
    set('fFechaModificacion', libro.fecha_modificacion ? formatearFecha(libro.fecha_modificacion, true) : '—');
    
    toggleEstadoSobrecubierta();
    
    document.getElementById('isbnAlerta').style.display = 'none';
    document.getElementById('isbnResultado').style.display = 'none';
    
    scrollA('cardFormulario');
    toast(`Editando: ${libro.titulo || 'libro'}`);
    
  } catch (error) {
    toast('Error al cargar: ' + error.message, true);
  }
}

// ============================================
// ELIMINAR LIBRO
// ============================================
async function eliminarLibro(id) {
  confirmar('¿Eliminar este libro?', async () => {
    try {
      await apiFetch(`/inventario?id=eq.${id}`, { method: 'DELETE' });
      toast('Libro eliminado');
      cargarInventario();
    } catch (error) {
      toast('Error al eliminar', true);
    }
  });
}

// ============================================
// VER DETALLE (acepta ID o objeto libro)
// ============================================
async function verDetalle(idOLibro) {
  let libro;
  
  // Detectar si recibe ID (número) o objeto libro
  if (typeof idOLibro === 'object' && idOLibro !== null) {
    // Si recibe objeto libro, usarlo directamente
    libro = idOLibro;
  } else {
    // Si recibe ID, hacer fetch
    try {
      const [libroFetch] = await apiFetch(`/inventario?id=eq.${idOLibro}`);
      libro = libroFetch;
    } catch (error) {
      toast('Error cargando libro', true);
      return;
    }
  }
  
  if (!libro) {
    toast('Libro no encontrado', true);
    return;
  }
  
  // Crear contenedor con clase para estilos
  const contenido = document.createElement('div');
  contenido.className = 'detalle-libro';
  
  const html = `
    <h2>
      ${libro.stock_no ? `<span class="detalle-stock">#${libro.stock_no}</span><br>` : ''}
      ${escaparHTML(libro.titulo || 'Sin título')}
    </h2>
    
    <div class="detalle-autor">${escaparHTML(libro.autor || '—')}</div>
	    <div class="detalle-titulo">${escaparHTML(libro.titulo || 'Sin título')}</div>
    
    <div class="detalle-seccion">
      ${[
        libro.editorial,
        libro.lugar,
        libro.fecha
      ].filter(Boolean).join(', ')}
      ${libro.precio ? ` <strong>${formatearPrecio(libro.precio)}</strong>` : ''}
    </div>
    
    <div class="detalle-seccion">
      ${[
        libro.tamano_cm,
        libro.paginas ? `${libro.paginas} pp.` : '',
        libro.descripcion
      ].filter(Boolean).join(' ')}
    </div>
    
    ${libro.encuadernacion || libro.estado || libro.sobrecubierta ? `
      <div class="detalle-seccion">
        ${libro.encuadernacion ? `${escaparHTML(libro.encuadernacion)}. ` : ''}
        ${libro.estado ? `${escaparHTML(libro.estado)}. ` : ''}
        ${libro.sobrecubierta && libro.sobrecubierta !== 'Sin sobrecubierta' ? escaparHTML(libro.sobrecubierta) : ''}
      </div>
    ` : ''}
    
    ${libro.isbn || libro.materia || libro.idioma ? `
      <div class="detalle-seccion">
        ${libro.isbn ? `<strong>ISBN:</strong> ${escaparHTML(libro.isbn)}<br>` : ''}
        ${libro.materia ? `<strong>Materia:</strong> ${escaparHTML(libro.materia)}<br>` : ''}
        ${libro.idioma ? `<strong>Idioma:</strong> ${escaparHTML(libro.idioma)}` : ''}
      </div>
    ` : ''}
    
    ${libro.localiz || libro.cantidad ? `
      <div class="detalle-seccion">
        ${libro.localiz ? `<strong>Localización:</strong> ${escaparHTML(libro.localiz)}<br>` : ''}
        ${libro.cantidad ? `<strong>Cantidad:</strong> ${libro.cantidad}` : ''}
		${libro.fecha_alta ? `<strong>Fecha de alta:</strong> ${formatearFecha(libro.fecha_alta)}<br>` : ''}
        ${libro.fecha_modificacion ? `<strong>Última modificación:</strong> ${formatearFecha(libro.fecha_modificacion, true)}<br>` : `<strong>Última modificación:</strong> —<br>`}
      </div>
    ` : ''}
    
    ${libro.notas ? `
      <div class="detalle-seccion" style="background:#fff3cd; padding:8px; border-radius:4px;">
        <strong>Notas:</strong> ${escaparHTML(libro.notas)}
      </div>
    ` : ''}
  `;
  
  contenido.innerHTML = html;
  
  // Crear botones
  const botones = document.createElement('div');
  botones.className = 'detalle-botones';
  
  const btnImprimir = crearElemento('button', {
    class: 'btn btn-primary',
    onclick: () => imprimirLibro(libro)
  }, '🖨️ Imprimir ficha');
  
  const btnEditar = crearElemento('button', {
    class: 'btn',
    onclick: () => {
      cerrarModal();
      editarLibro(libro.id);
    }
  }, '✏️ Editar');
  
  botones.appendChild(btnImprimir);
  botones.appendChild(btnEditar);
  contenido.appendChild(botones);
  
  window.libroActivoModal = libro;
  abrirModal(contenido);
}

// ============================================
// GENERAR DESCRIPCIÓN AUTOMÁTICA
// ============================================
function generarDescripcion() {
  const val = (id) => {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  };
  const isChecked = (id) => {
    const el = document.getElementById(id);
    return !!(el && el.checked);
  };

  const encuadernacion = val('fEncuadernacion');
  const estado = val('fEstado');
  const sobrecubierta = val('fSobrecubierta') || 'Sin sobrecubierta';
  const estadoSob = val('fEstadoSobrecubierta') || 'Bien';
  const tamano = val('fTamanoCm');
  const paginas = val('fPaginas');

  const partes = [];
    const fisica = [];
  if(isChecked('fPrimeraEdicion')) fisica.push('Primera edición.');
  if(tamano) {
    let t = tamano;
    if(!/[.!?]$/.test(t)) t += '.';
    fisica.push(t);
  }
  if(paginas) fisica.push(`${paginas} pp.`);
  if(fisica.length) partes.push(fisica.join(' '));

  if(encuadernacion) {
    const enc = encuadernacion.toLowerCase();
    const sinEn = new Set(['cartoné','holandesa','holandesa puntas','pasta española']);
    let frase = sinEn.has(enc)
      ? `Encuadernación ${enc}`
      : `Encuadernación en ${enc}`;
    if(sobrecubierta === 'Con sobrecubierta') frase += ' con sobrecubierta';
    partes.push(frase.charAt(0).toUpperCase() + frase.slice(1) + '.');
  } else if(sobrecubierta === 'Con sobrecubierta') {
    partes.push('Conserva la sobrecubierta.');
  }

  const textosEstado = {
    'Muy bien': 'Ejemplar en muy buen estado, sin nombres del anterior poseedor, ni subrayados, con apenas signos de uso.',
    'Bien': 'Ejemplar en buen estado, con leves signos de uso propios del tiempo, interior limpio y sin marcas destacables.',
    'Como nuevo': 'Ejemplar en estado como nuevo, prácticamente sin signos de uso.',
    'Aceptable': 'Ejemplar en estado aceptable, con signos evidentes de uso aunque completo y legible.',
    'Pobre': 'Ejemplar con signos importantes de uso y desgaste.',
    'Nuevo': 'Ejemplar nuevo, sin uso.'
  };
  if(textosEstado[estado]) partes.push(textosEstado[estado]);

  if(isChecked('fDedicatoria')) partes.push('Dedicatoria autógrafa del autor.');
  if(isChecked('fFirmaAutor')) partes.push('Ejemplar firmado por el autor.');
  if(isChecked('fExLibris')) partes.push('Presenta ex-libris o sello de anterior poseedor.');

  if(sobrecubierta === 'Con sobrecubierta') {
    const textosSob = {
      'Muy bien': 'Conserva la sobrecubierta también en muy buen estado.',
      'Bien': 'Conserva la sobrecubierta en buen estado, con leves signos de uso.',
      'Regular': 'Conserva la sobrecubierta con signos de uso y pequeñas roturas en los márgenes.'
    };
    if(textosSob[estadoSob]) partes.push(textosSob[estadoSob]);
  }

  const descripcion = partes.join(' ').replace(/\s+/g, ' ').trim();
  const out = document.getElementById('fDescripcion');
  if(out) out.value = descripcion;
  toast('Descripción generada — revísala antes de guardar');
}

// ============================================
// LIMPIAR FORMULARIO
// ============================================
function limpiarFormulario() {
  editandoId = null;
  
  document.getElementById('formTituloLabel').textContent = '📝 Nuevo libro';
  document.getElementById('btnGuardar').textContent = '💾 Guardar libro';
  
  document.querySelectorAll('#cardFormulario input[type="text"], #cardFormulario input[type="number"], #cardFormulario textarea').forEach(el => {
    el.value = '';
  });
  
  document.querySelectorAll('#cardFormulario select').forEach(el => {
    el.selectedIndex = 0;
  });
  
  document.querySelectorAll('#cardFormulario input[type="checkbox"]').forEach(el => {
    el.checked = false;
  });
  
  document.getElementById('fCantidad').value = '1';
  document.getElementById('fPublicarOnline').value = 'true';
  document.getElementById('isbnAlerta').style.display = 'none';
  document.getElementById('isbnResultado').style.display = 'none';
  
  toggleEstadoSobrecubierta();
}

// ============================================
// BUSCAR ISBN
// ============================================
async function buscarISBN() {
  const isbn = document.getElementById('fIsbn').value.trim();
  if (!isbn) {
    toast('Introduce un ISBN', true);
    return;
  }
  
  const btn = document.getElementById('btnBuscarIsbn');
  btn.disabled = true;
  btn.textContent = 'Buscando...';
  
  try {
    // Intentar Open Library
    const response = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    
    if (response.ok) {
      const data = await response.json();
	        
      if (data.title) document.getElementById('fTitulo').value = data.title;
      if (data.publishers?.length) document.getElementById('fEditorial').value = data.publishers[0];
      if (data.publish_date) document.getElementById('fFecha').value = data.publish_date;
      if (data.number_of_pages) document.getElementById('fPaginas').value = data.number_of_pages;
      
      // Buscar autor
      if (data.authors?.length) {
        const authorKey = data.authors[0].key;
        const authorResponse = await fetch(`https://openlibrary.org${authorKey}.json`);
        if (authorResponse.ok) {
          const authorData = await authorResponse.json();
          if (authorData.name) {
            document.getElementById('fAutor').value = authorData.name;
          }
        }
      }
      
      document.getElementById('isbnResultado').textContent = '✓ Datos encontrados y rellenados desde Open Library';
      document.getElementById('isbnResultado').style.display = 'block';
      
      toast('✓ ISBN encontrado');
    } else {
      document.getElementById('isbnResultado').textContent = 'ℹ️ ISBN no encontrado en Open Library';
      document.getElementById('isbnResultado').style.display = 'block';
    }
    
  } catch (error) {
    toast('Error buscando ISBN', true);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Buscar ISBN';
  }
}

// ============================================
// VERIFICAR ISBN DUPLICADO
// ============================================
async function verificarIsbnDuplicado(isbn) {
  if (!isbn || isbn.length < 10) {
    document.getElementById('isbnAlerta').style.display = 'none';
    return;
  }
  
  try {
    const duplicados = await apiFetch(`/inventario?isbn=eq.${isbn}`);
    
    if (duplicados.length > 0) {
      const alerta = document.getElementById('isbnAlerta');
      alerta.textContent = `⚠️ ISBN duplicado: Ya existe ${duplicados.length} libro(s) con este ISBN`;
      alerta.style.display = 'block';
    } else {
      document.getElementById('isbnAlerta').style.display = 'none';
    }
  } catch (error) {
    console.error('Error verificando ISBN:', error);
  }
}

// ============================================
// HELPERS
// ============================================
function handleIsbnInput() {
  const input = document.getElementById('fIsbn');
  input.value = input.value.replace(/[^0-9X-]/gi, '');
  
  clearTimeout(timeoutIsbn);
  timeoutIsbn = setTimeout(() => {
    verificarIsbnDuplicado(input.value);
  }, 500);
}

function formatearAutor() {
  const input = document.getElementById('fAutor');
  if (input.value) {
    input.value = normalizarAutor(input.value);
  }
}

function toggleEstadoSobrecubierta() {
  const sobrecubierta = document.getElementById('fSobrecubierta').value;
  const wrap = document.getElementById('wrapEstadoSobrecubierta');
  wrap.style.display = sobrecubierta === 'Con sobrecubierta' ? 'block' : 'none';
}

async function cambiarPagina(dir) {
  pagina += dir;
  await cargarInventario();
  actualizarCheckboxesPagina();
  actualizarContadorSeleccion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let buscarTimer;
function buscar() {
  clearTimeout(buscarTimer);
  buscarTimer = setTimeout(() => {
    busquedaActual = document.getElementById('busqueda').value.trim();
    pagina = 0;
    cargarInventario();
	  }, 350);
}

function limpiarBusqueda() {
  document.getElementById('busqueda').value = '';
  busquedaActual = '';
  pagina = 0;
  cargarInventario();
}

// ============================================
// BUSCADOR AVANZADO
// ============================================
async function buscarAvanzado() {
  const autor = document.getElementById('bAutor').value.trim();
  const titulo = document.getElementById('bTitulo').value.trim();
  const isbn = document.getElementById('bIsbn').value.trim();
  const materia = document.getElementById('bMateria').value.trim();
  const editorial = document.getElementById('bEditorial').value.trim();
  const fecha = document.getElementById('bFecha').value.trim();
  
  if (!autor && !titulo && !isbn && !materia && !editorial && !fecha) {
    toast('Introduce al menos un criterio', true);
    return;
  }
  
  const filtros = [];
  if (autor) filtros.push(`autor.ilike.*${encodeURIComponent(autor)}*`);
  if (titulo) filtros.push(`titulo.ilike.*${encodeURIComponent(titulo)}*`);
  if (isbn) filtros.push(`isbn.ilike.*${encodeURIComponent(isbn)}*`);
  if (materia) filtros.push(`materia.ilike.*${encodeURIComponent(materia)}*`);
  if (editorial) filtros.push(`editorial.ilike.*${encodeURIComponent(editorial)}*`);
  if (fecha) filtros.push(`fecha.ilike.*${encodeURIComponent(fecha)}*`);
  
  const query = filtros.length > 1 ? `and=(${filtros.join(',')})` : filtros[0];
  
  try {
    const resultados = await apiFetch(`/inventario?${query}&limit=50`);
    
    const container = document.getElementById('resultadoBusqueda');
    container.innerHTML = '';
    
    if (!resultados.length) {
      mostrarVacio('resultadoBusqueda', 'No se encontraron resultados');
      return;
    }
    
    resultados.forEach(libro => {
      const item = document.createElement('div');
      item.className = 'resultado-item';
      item.onclick = () => editarLibro(libro.id);
      
      const stock = crearElemento('span', { class: 'resultado-stock' }, 
        libro.stock_no ? `#${libro.stock_no}` : '—');
      
      const titulo = crearElemento('div', { class: 'resultado-titulo' }, 
        libro.titulo || '—');
      
      const autor = crearElemento('div', { class: 'resultado-autor' }, 
        libro.autor || '—');
      
      const detalles = crearElemento('div', { class: 'resultado-detalles' }, 
        `${libro.editorial || ''} ${libro.fecha || ''} · ${libro.precio ? formatearPrecio(libro.precio) : 'Sin precio'}`);
      
      item.appendChild(stock);
      item.appendChild(titulo);
      item.appendChild(autor);
      item.appendChild(detalles);
      
      container.appendChild(item);
    });
    
    toast(`${resultados.length} resultados encontrados`);
    
  } catch (error) {
    toast('Error en búsqueda', true);
  }
}

function limpiarBusquedaAvanzada() {
  document.getElementById('bAutor').value = '';
  document.getElementById('bTitulo').value = '';
  document.getElementById('bIsbn').value = '';
  document.getElementById('bMateria').value = '';
  document.getElementById('bEditorial').value = '';
  document.getElementById('bFecha').value = '';
  document.getElementById('resultadoBusqueda').innerHTML = '';
}

// ============================================
// EDICIÓN EN LOTE
// ============================================
let lotesLibros = []; // Almacena los libros encontrados

function cambiarTipoBusquedaLote() {
  const tipo = document.querySelector('input[name="tipoBusquedaLote"]:checked').value;
  
  document.getElementById('opcionStock').style.display = tipo === 'stock' ? 'block' : 'none';
  document.getElementById('opcionMateria').style.display = tipo === 'materia' ? 'block' : 'none';
  document.getElementById('opcionTodo').style.display = tipo === 'todo' ? 'block' : 'none';
  }

function limpiarLotes() {
  document.getElementById('lotesInput').value = '';
  document.getElementById('lotesMateria').value = '';
  document.getElementById('lotesResultados').style.display = 'none';
  document.getElementById('lotesAccion').value = '';
  document.getElementById('lotesDescuento').value = '';
  document.getElementById('lotesOpcionDescuento').style.display = 'none';
  document.getElementById('btnAplicarLotes').disabled = true;
  
  // Resetear a búsqueda por stock
  document.querySelector('input[name="tipoBusquedaLote"][value="stock"]').checked = true;
  cambiarTipoBusquedaLote();
  
  lotesLibros = [];
}

function toggleLotesOpciones() {
  const accion = document.getElementById('lotesAccion').value;
  const opcionDescuento = document.getElementById('lotesOpcionDescuento');
  const btnAplicar = document.getElementById('btnAplicarLotes');
  
  if (accion === 'descuento') {
    opcionDescuento.style.display = 'block';
    btnAplicar.disabled = false;
  } else if (accion === 'vendido') {
    opcionDescuento.style.display = 'none';
    btnAplicar.disabled = false;
  } else {
    opcionDescuento.style.display = 'none';
    btnAplicar.disabled = true;
  }
}

async function buscarLotes() {
  const tipo = document.querySelector('input[name="tipoBusquedaLote"]:checked').value;
  
  let query = '';
  let numeros = [];
  
  if (tipo === 'stock') {
    // Búsqueda por números de stock
    const input = document.getElementById('lotesInput').value.trim();
    
    if (!input) {
      toast('Introduce al menos un número de stock', true);
      return;
    }
    
    // Parsear números: separados por espacios (uno o más)
    numeros = input
      .split(/\s+/) // Separa por uno o más espacios
      .map(n => n.trim())
      .filter(n => n && !isNaN(n)) // Solo números válidos
      .map(n => parseInt(n));
    
    if (numeros.length === 0) {
      toast('No se encontraron números válidos', true);
      return;
    }
    
    toast(`Buscando ${numeros.length} libro(s)...`);
    query = numeros.map(n => `stock_no=eq.${n}`).join(',');
    query = `or=(${query})`;
    
  } else if (tipo === 'materia') {
    // Búsqueda por materia
    const materia = document.getElementById('lotesMateria').value.trim();
    
    if (!materia) {
      toast('Introduce una materia', true);
      return;
    }
    
    toast(`Buscando libros de: ${materia}...`);
    query = `materia.ilike.*${encodeURIComponent(materia)}*`;
    
  } else if (tipo === 'todo') {
    // Todo el catálogo
    const confirmar = confirm('¿Cargar TODOS los libros del catálogo?\n\nEsto puede tardar unos segundos.');
    if (!confirmar) return;
    
    toast('Cargando todo el catálogo...');
    query = ''; // Sin filtro = todos
  }
  
  try {
    // Buscar libros
    const libros = await apiFetch(`/inventario?${query}`);
    
    if (libros.length === 0) {
      toast('No se encontraron libros', true);
      return;
    }
    
    // Guardar libros encontrados
    lotesLibros = libros;
    
    // Mostrar resultados
	    mostrarResultadosLotes(libros, numeros);
    
    toast(`✅ ${libros.length} libro(s) encontrado(s)`);
    
  } catch (error) {
    console.error('Error buscando lotes:', error);
    toast('Error al buscar libros', true);
  }
}

function mostrarResultadosLotes(libros, numerosBuscados) {
  const tbody = document.getElementById('lotesTabla');
  tbody.innerHTML = '';
  
  // Ordenar libros por stock_no
  libros.sort((a, b) => a.stock_no - b.stock_no);
  
  libros.forEach(libro => {
    const tr = crearElemento('tr');
    
    // Stock
    const tdStock = crearElemento('td', { class: 'td-stock' }, `#${libro.stock_no}`);
    
    // Título
    const tdTitulo = crearElemento('td', { class: 'td-titulo' }, libro.titulo || '—');
    
    // Autor
    const tdAutor = crearElemento('td', { class: 'td-autor' }, libro.autor || '—');
    
    // Precio
    const tdPrecio = crearElemento('td', { class: 'td-precio' }, 
      libro.precio ? formatearPrecio(libro.precio) : '—');
    
    // Estado
    const estadoClass = libro.estado === 'Muy bien' || libro.estado === 'Como nuevo' ? 'est-bien' :
                        libro.estado === 'Bien' ? 'est-regular' : 'est-malo';
    const spanEstado = crearElemento('span', { class: `td-estado ${estadoClass}` }, 
      libro.estado || 'Bien');
    const tdEstado = crearElemento('td');
    tdEstado.appendChild(spanEstado);
    
    tr.appendChild(tdStock);
    tr.appendChild(tdTitulo);
    tr.appendChild(tdAutor);
    tr.appendChild(tdPrecio);
    tr.appendChild(tdEstado);
    
    tbody.appendChild(tr);
  });
  
  // Actualizar contador
  document.getElementById('lotesContador').textContent = `${libros.length} libros`;
  
  // Mostrar aviso si faltan libros
  if (numerosBuscados.length > 0 && libros.length < numerosBuscados.length) {
    const faltantes = numerosBuscados.length - libros.length;
    toast(`⚠️ No se encontraron ${faltantes} número(s) de stock`, true);
  }
  
  // Mostrar sección de resultados
  document.getElementById('lotesResultados').style.display = 'block';
  
  // Scroll suave hacia resultados
  document.getElementById('lotesResultados').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function aplicarLotes() {
  const accion = document.getElementById('lotesAccion').value;
  
  if (!accion) {
    toast('Selecciona una acción', true);
    return;
  }
  
  if (lotesLibros.length === 0) {
    toast('No hay libros para actualizar', true);
    return;
  }
  
  // Confirmación
  const cantidad = lotesLibros.length;
  const mensaje = accion === 'vendido' 
    ? `¿Marcar ${cantidad} libro(s) como vendido(s)?\n\nSe pondrá cantidad = 0`
    : `¿Aplicar descuento a ${cantidad} libro(s)?`;
  
  if (!confirm(mensaje)) {
    return;
  }
  
  try {
    let actualizados = 0;
    let errores = 0;
    
    toast(`Actualizando ${cantidad} libro(s)...`);
    
    for (const libro of lotesLibros) {
      try {
        let payload = {};
        
        if (accion === 'vendido') {
		          payload = { cantidad: 0 };
        } else if (accion === 'descuento') {
          const descuento = parseFloat(document.getElementById('lotesDescuento').value);
          
          if (!descuento || descuento <= 0 || descuento > 100) {
            toast('Introduce un descuento válido (1-100%)', true);
            return;
          }
          
          const precioActual = parseFloat(libro.precio) || 0;
          if (precioActual <= 0) {
            continue; // Saltar libros sin precio
          }
          
          const nuevoPrecio = precioActual * (1 - descuento / 100);
          payload = { precio: nuevoPrecio.toFixed(2) };
        }
        
        // Actualizar libro
        const resultado = await fetch(`${CONFIG.SUPABASE_URL}/inventario?id=eq.${libro.id}`, {
          method: 'PATCH',
          headers: {
            ...API_HEADERS,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });
        
        if (resultado.ok) {
          actualizados++;
        } else {
          errores++;
        }
        
      } catch (error) {
        console.error('Error actualizando libro:', error);
        errores++;
      }
    }
    
    // Mensaje final
    if (errores === 0) {
      toast(`✅ ${actualizados} libro(s) actualizado(s) correctamente`);
    } else {
      toast(`⚠️ ${actualizados} actualizados, ${errores} errores`, true);
    }
    
    // Limpiar y recargar inventario
    setTimeout(() => {
      limpiarLotes();
      if (document.getElementById('panelInventario').style.display === 'block') {
        cargarInventario();
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error aplicando cambios:', error);
    toast('Error al aplicar cambios', true);
  }
}

// ============================================
// VARIABLES GLOBALES
// ============================================
let resultadosBusqueda = [];

// ============================================
// TOGGLE FILTROS AVANZADOS
// ============================================
function toggleFiltrosAvanzados() {
  const filtros = document.getElementById('filtrosAvanzados');
  const icono = document.getElementById('iconoAvanzado');
  
  if (filtros.classList.contains('visible')) {
    filtros.classList.remove('visible');
    icono.textContent = '▼';
  } else {
    filtros.classList.add('visible');
    icono.textContent = '▲';
  }
}

// ============================================
// CONSTRUIR QUERY SUPABASE
// ============================================
function construirQueryBusqueda() {
  const filtros = [];
  
   
  // ISBN
  const isbn = document.getElementById('bIsbn').value.trim();
  if (isbn) {
    filtros.push(`isbn=ilike.*${encodeURIComponent(isbn)}*`);
  }
  
  // Stock No (exacto)
  const stockNo = document.getElementById('bStockNo').value.trim();
  if (stockNo) {
    filtros.push(`stock_no=eq.${stockNo}`);
  }
  
  // Autor
  const autor = document.getElementById('bAutor').value.trim();
  if (autor) {
  filtros.push(`autor=ilike.*${encodeURIComponent(autor)}*`);  }
  
  // Título
  const titulo = document.getElementById('bTitulo').value.trim();
  if (titulo) {
    filtros.push(`titulo=ilike.*${encodeURIComponent(titulo)}*`);
  }
  
  // Tipo
  const tipo = document.getElementById('bTipo').value;
  if (tipo) {
    filtros.push(`tipo=eq.${encodeURIComponent(tipo)}`);
  }
  
  // Lugar
  const lugar = document.getElementById('bLugar').value.trim();
  if (lugar) {
    filtros.push(`lugar=ilike.*${encodeURIComponent(lugar)}*`);
  }
  
  // Editorial
  const editorial = document.getElementById('bEditorial').value.trim();
  if (editorial) {
  filtros.push(`editorial=ilike.*${encodeURIComponent(editorial)}*`);  }
  
  // Fecha
  const fecha = document.getElementById('bFecha').value.trim();
  if (fecha) {
    filtros.push(`fecha=ilike.${encodeURIComponent(fecha)}*`);
  }
  
  // Encuadernación
  const encuadernacion = document.getElementById('bEncuadernacion').value;
  if (encuadernacion) {
    filtros.push(`encuadernacion=eq.${encodeURIComponent(encuadernacion)}`);
  }
  
  // Estado
  const estado = document.getElementById('bEstado').value;
  if (estado) {
    filtros.push(`estado=eq.${encodeURIComponent(estado)}`);
  }
  
  // Checkboxes (solo si están marcados)
  if (document.getElementById('bPrimeraEdicion').checked) {
    filtros.push('primera_edicion=eq.true');
  }
  if (document.getElementById('bDedicatoria').checked) {
    filtros.push('dedicatoria=eq.true');
  }
  if (document.getElementById('bFirmaAutor').checked) {
    filtros.push('firma_autor=eq.true');
  }
  if (document.getElementById('bExLibris').checked) {
    filtros.push('ex_libris=eq.true');
  }
  
  // Materia
  const materia = document.getElementById('bMateria').value.trim();
  if (materia) {
    filtros.push(`materia=ilike.*${encodeURIComponent(materia)}*`);
  }
  
  // Submateria
  const materia2 = document.getElementById('bMateria2').value.trim();
  if (materia2) {
    filtros.push(`materia2=ilike.*${encodeURIComponent(materia2)}*`);
  }
  
  // Idioma
  const idioma = document.getElementById('bIdioma').value;
  if (idioma) {
    filtros.push(`idioma=eq.${encodeURIComponent(idioma)}`);
  }
    
  // Localización
  const localiz = document.getElementById('bLocaliz').value.trim();
  if (localiz) {
    filtros.push(`localiz=ilike.*${encodeURIComponent(localiz)}*`);
  }
  
  // Cantidad (exacta)
  const cantidad = document.getElementById('bCantidad').value.trim();
  if (cantidad) {
    filtros.push(`cantidad=eq.${cantidad}`);
  }
  
  // Publicar online
  const publicarOnline = document.getElementById('bPublicarOnline').value;
  if (publicarOnline) {
    filtros.push(`publicar_online=eq.${publicarOnline}`);
  }
  // Fecha de alta
const fechaAltaDesde = document.getElementById('bFechaAltaDesde')?.value;
const fechaAltaHasta = document.getElementById('bFechaAltaHasta')?.value;

if (fechaAltaDesde) {
  filtros.push(`fecha_alta=gte.${fechaAltaDesde}`);
}
if (fechaAltaHasta) {
  filtros.push(`fecha_alta=lte.${fechaAltaHasta}`);
}
  // Rangos de precio venta
  const precioDesde = document.getElementById('bPrecioDesde').value.trim();
  const precioHasta = document.getElementById('bPrecioHasta').value.trim();
  if (precioDesde) {
    filtros.push(`precio=gte.${precioDesde}`);
  }
  if (precioHasta) {
    filtros.push(`precio=lte.${precioHasta}`);
  }
  
  // Rangos de precio compra
  const precioCompraDesde = document.getElementById('bPrecioCompraDesde').value.trim();
  const precioCompraHasta = document.getElementById('bPrecioCompraHasta').value.trim();
  if (precioCompraDesde) {
    filtros.push(`precio_compra=gte.${precioCompraDesde}`);
  }
  if (precioCompraHasta) {
    filtros.push(`precio_compra=lte.${precioCompraHasta}`);
  }
  
  // Procedencia
  const procedencia = document.getElementById('bProcedencia').value.trim();
  if (procedencia) {
    filtros.push(`procedencia=ilike.*${encodeURIComponent(procedencia)}*`);
  }
  
  // Compra ID
  const compraId = document.getElementById('bCompraId').value.trim();
  if (compraId) {
    filtros.push(`compra_id=eq.${compraId}`);
  }
  
  // Catálogo
  const catalogo = document.getElementById('bCatalogo').value.trim();
  if (catalogo) {
    filtros.push(`catalogo=ilike.*${encodeURIComponent(catalogo)}*`);
  }
  
  // Encuadernación AbeBooks
  const encuadernacionAbebooks = document.getElementById('bEncuadernacionAbebooks').value;
  if (encuadernacionAbebooks) {
    filtros.push(`encuadernacion_abebooks=eq.${encodeURIComponent(encuadernacionAbebooks)}`);
  }
  
  // Descripción
  const descripcion = document.getElementById('bDescripcion').value.trim();
  if (descripcion) {
    filtros.push(`descripcion=ilike.*${encodeURIComponent(descripcion)}*`);
  }
  
  // Notas
  const notas = document.getElementById('bNotas').value.trim();
  if (notas) {
    filtros.push(`notas=ilike.*${encodeURIComponent(notas)}*`);
  }
  
  // Construir query final (concatenar con &)
  if (filtros.length === 0) {
    return '';
  } else {
    return filtros.join('&');
  }
}

// ============================================
// EJECUTAR BÚSQUEDA
// ============================================
async function ejecutarBusqueda() {
  const query = construirQueryBusqueda();
  
  // 🔍 DIAGNÓSTICO: Ver qué query se genera
  console.log('QUERY GENERADO:', query);
  console.log('URL COMPLETA:', `${CONFIG.SUPABASE_URL}/inventario?${query}&order=stock_no.desc&limit=10000`);
    
  if (!query) {
    toast('Introduce al menos un criterio de búsqueda', true);
    return;
  }
  
  try {
    mostrarCargando('resultadoBusqueda', 'Buscando libros...');
    document.getElementById('contenedorResultados').style.display = 'block';
	document.getElementById('btnExportarCSV').style.display = 'inline-block';
    
    const resultados = await apiFetch(`/inventario?${query}&order=stock_no.desc&limit=10000`);
    
    resultadosBusqueda = resultados;
    
    // Actualizar contador
    document.getElementById('contadorResultados').textContent = 
      `${resultados.length} libro${resultados.length !== 1 ? 's' : ''} encontrado${resultados.length !== 1 ? 's' : ''}`;
	  const btnImprimir = document.getElementById('btnImprimirResultados');
	  
if (btnImprimir) {
  btnImprimir.style.display = resultados.length ? 'inline-block' : 'none';
}
    
    // Mostrar resultados
    mostrarResultados(resultados);
    
    // Scroll a resultados
    document.getElementById('contenedorResultados').scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
    
  } catch (error) {
    console.error('Error en búsqueda:', error);
    mostrarError('resultadoBusqueda', 'Error al buscar libros', ejecutarBusqueda);
    toast('Error al buscar', true);
  }
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================
function mostrarResultados(libros) {
  const container = document.getElementById('resultadoBusqueda');
  container.innerHTML = '';
  
  if (!libros || libros.length === 0) {
    mostrarVacio('resultadoBusqueda', 'No se encontraron libros con estos criterios');
    return;
  }
  
  libros.forEach(libro => {
    const item = document.createElement('div');
    item.className = 'resultado-item';
    
    // Stock
    const stock = document.createElement('span');
    stock.className = 'resultado-stock';
    stock.textContent = libro.stock_no ? `#${libro.stock_no}` : '—';
    
    // Título
    const titulo = document.createElement('div');
    titulo.className = 'resultado-titulo';
    titulo.textContent = libro.titulo || 'Sin título';
    
    // Autor
    const autor = document.createElement('div');
    autor.className = 'resultado-autor';
    autor.textContent = libro.autor || 'Sin autor';
    
    // Detalles
    const detalles = document.createElement('div');
    detalles.className = 'resultado-detalles';
    const partes = [];
    if (libro.editorial) partes.push(libro.editorial);
    if (libro.fecha) partes.push(libro.fecha);
    if (libro.precio) partes.push(formatearPrecio(libro.precio));
    if (libro.estado) partes.push(libro.estado);
    detalles.textContent = partes.join(' · ');
    
    // Acciones
    const acciones = document.createElement('div');
    acciones.className = 'acciones';
    acciones.style.marginTop = '8px';
    
    const btnVer = document.createElement('button');
    btnVer.className = 'btn btn-sm';
    btnVer.textContent = '👁️ Ver';
    btnVer.onclick = (e) => {
      e.stopPropagation();
      verDetalle(libro);
    };
    
    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn btn-sm';
    btnEditar.textContent = '✏️ Editar';
    btnEditar.onclick = (e) => {
      e.stopPropagation();
      toast('Función de editar (por implementar desde inventario principal)');
	      };
    
    acciones.appendChild(btnVer);
    acciones.appendChild(btnEditar);
    
    // Montar item
    item.appendChild(stock);
    item.appendChild(titulo);
    item.appendChild(autor);
    item.appendChild(detalles);
    item.appendChild(acciones);
    
    // Click en toda la tarjeta = ver detalle
    item.onclick = () => verDetalle(libro);
    
    container.appendChild(item);
  });
}

// ============================================
// LIMPIAR BÚSQUEDA COMPLETA
// ============================================
function limpiarBusquedaCompleta() {
  // Búsqueda rápida
  document.getElementById('bAutor').value = '';
  document.getElementById('bTitulo').value = '';
  document.getElementById('bMateria').value = '';
  document.getElementById('bFechaAltaDesde').value = '';
  document.getElementById('bFechaAltaHasta').value = '';
  
  // Filtros avanzados
  document.getElementById('bIsbn').value = '';
  document.getElementById('bStockNo').value = '';
  document.getElementById('bTipo').value = '';
  document.getElementById('bLugar').value = '';
  document.getElementById('bEditorial').value = '';
  document.getElementById('bFecha').value = '';
  document.getElementById('bEncuadernacion').value = '';
  document.getElementById('bEstado').value = '';
  
  document.getElementById('bPrimeraEdicion').checked = false;
  document.getElementById('bDedicatoria').checked = false;
  document.getElementById('bFirmaAutor').checked = false;
  document.getElementById('bExLibris').checked = false;
  
  document.getElementById('bMateria2').value = '';
  document.getElementById('bIdioma').value = '';
  document.getElementById('bLocaliz').value = '';
  document.getElementById('bCantidad').value = '';
  document.getElementById('bPublicarOnline').value = '';
  
  document.getElementById('bPrecioDesde').value = '';
  document.getElementById('bPrecioHasta').value = '';
  document.getElementById('bPrecioCompraDesde').value = '';
  document.getElementById('bPrecioCompraHasta').value = '';
  
  document.getElementById('bProcedencia').value = '';
  document.getElementById('bCompraId').value = '';
  document.getElementById('bCatalogo').value = '';
  document.getElementById('bEncuadernacionAbebooks').value = '';
  document.getElementById('bDescripcion').value = '';
  document.getElementById('bNotas').value = '';
  
  // Ocultar resultados
  document.getElementById('contenedorResultados').style.display = 'none';
  document.getElementById('btnExportarCSV').style.display = 'none';
  resultadosBusqueda = [];
  
  toast('Búsqueda limpiada');
}
// ============================================
// EXPORTAR RESULTADOS A CSV
// ============================================
function exportarCSV() {
  if (!resultadosBusqueda || resultadosBusqueda.length === 0) {
    toast('No hay resultados para exportar', true);
    return;
  }

  // Columnas del CSV en el orden solicitado
  const columnas = [
    { key: 'stock_no', label: 'Nº Stock' },
    { key: 'titulo', label: 'Título' },
    { key: 'autor', label: 'Autor' },
    { key: 'editorial', label: 'Editorial' },
    { key: 'fecha', label: 'Año' },
    { key: 'estado', label: 'Estado' },
    { key: 'precio', label: 'Precio' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'materia', label: 'Materia' },
    { key: 'localiz', label: 'Localización' }
  ];

  // Crear encabezado
  let csv = columnas.map(c => `"${c.label}"`).join(',') + '\n';

  // Añadir filas
  resultadosBusqueda.forEach(libro => {
    const fila = columnas.map(col => {
	      const valor = libro[col.key];
      if (valor === null || valor === undefined) return '""';
      const valorStr = String(valor).replace(/"/g, '""');
      return `"${valorStr}"`;
    }).join(',');
    csv += fila + '\n';
  });

  // Crear blob y descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10);
  const hora = ahora.toTimeString().slice(0, 5).replace(':', '');
  const nombreArchivo = `busqueda_${fecha}_${hora}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', nombreArchivo);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast(`Exportados ${resultadosBusqueda.length} registros a CSV`);
}

// ============================================
// INICIALIZACIÓN
// ============================================

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Buscador avanzado cargado');

  const panelBuscador = document.getElementById('panelBuscador');
  if (!panelBuscador) return;

  panelBuscador.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;

    const tag = e.target.tagName;
    if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return;

    e.preventDefault();
    ejecutarBusqueda();
  });
});

// ============================================
// FUNCIONES DE EXPORTACIÓN MASIVA
// ============================================

async function obtenerTodosLosLibros() {
  // Obtener todos los libros con paginación (evita límite de 1000)
  let todos = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const batch = await apiFetch(`/inventario?select=*&limit=${limit}&offset=${offset}&order=id.desc`);
    if (!batch || batch.length === 0) break;
    todos = todos.concat(batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  
  return todos;
}

async function obtenerLibrosPorIds(ids) {
  // Obtener libros específicos por sus IDs
  // Para evitar URLs muy largas, hacemos peticiones en lotes de 500
  let todos = [];
  const tamanoLote = 500;
  
  for (let i = 0; i < ids.length; i += tamanoLote) {
    const loteIds = ids.slice(i, i + tamanoLote);
    const idsStr = loteIds.join(',');
    const batch = await apiFetch(`/inventario?id=in.(${idsStr})&order=id.desc`);
    if (batch) {
      todos = todos.concat(batch);
    }
  }
  
  return todos;
}

async function exportarAbeBooks() {
  try {
    const seleccion = obtenerLibrosSeleccionados();
    
    if (seleccion.cantidad === 0) {
      alert('No hay libros seleccionados');
      return;
    }
	    if (!confirm(`¿Exportar ${seleccion.cantidad} libros en formato AbeBooks/TodoColección?`)) {
      return;
    }
    
    // Mostrar loading
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'exportLoading';
    loadingMsg.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:white; padding:30px; border:3px solid var(--dorado); border-radius:8px; z-index:10000; box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    loadingMsg.innerHTML = `<div style="text-align:center;"><div style="font-size:24px;margin-bottom:10px;">⏳</div><div style="font-weight:700;">Exportando ${seleccion.cantidad} libros...</div><div style="color:var(--muted);margin-top:5px;">Esto puede tardar unos momentos</div></div>`;
    document.body.appendChild(loadingMsg);
    
    let librosParaExportar;
    
    if (seleccion.seleccionTotal) {
      // Obtener TODOS los libros de la base de datos
      librosParaExportar = await obtenerTodosLosLibros();
    } else {
      // Obtener solo los libros seleccionados
      librosParaExportar = await obtenerLibrosPorIds(seleccion.ids);
    }
    
    // Generar CSV en formato AbeBooks
    const csv = generarCSVAbeBooks(librosParaExportar);
    
    // Descargar archivo
    descargarCSV(csv, `abebooks_export_${new Date().toISOString().slice(0,10)}.csv`);
    
    document.body.removeChild(loadingMsg);
    alert(`✓ Exportados ${librosParaExportar.length} libros correctamente`);
    
  } catch (error) {
    console.error('Error en exportación:', error);
    alert('Error al exportar: ' + error.message);
    const loading = document.getElementById('exportLoading');
    if (loading) document.body.removeChild(loading);
  }
}

async function exportarLibrosBosch() {
  try {
    const seleccion = obtenerLibrosSeleccionados();
    
    if (seleccion.cantidad === 0) {
      alert('No hay libros seleccionados');
      return;
    }
    
    if (!confirm(`¿Exportar ${seleccion.cantidad} libros en formato LibrosBosch?`)) {
      return;
    }
    
    // Mostrar loading
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'exportLoading';
    loadingMsg.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:white; padding:30px; border:3px solid var(--dorado); border-radius:8px; z-index:10000; box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    loadingMsg.innerHTML = `<div style="text-align:center;"><div style="font-size:24px;margin-bottom:10px;">⏳</div><div style="font-weight:700;">Exportando ${seleccion.cantidad} libros...</div><div style="color:var(--muted);margin-top:5px;">Esto puede tardar unos momentos</div></div>`;
    document.body.appendChild(loadingMsg);
    
    let librosParaExportar;
    
    if (seleccion.seleccionTotal) {
      // Obtener TODOS los libros de la base de datos
      librosParaExportar = await obtenerTodosLosLibros();
    } else {
      // Obtener solo los libros seleccionados
      librosParaExportar = await obtenerLibrosPorIds(seleccion.ids);
    }
    
    // Generar CSV en formato LibrosBosch
    const csv = generarCSVLibrosBosch(librosParaExportar);
    
    // Descargar archivo
    descargarCSV(csv, `librosbosch_export_${new Date().toISOString().slice(0,10)}.csv`);
    
    document.body.removeChild(loadingMsg);
    alert(`✓ Exportados ${librosParaExportar.length} libros correctamente`);
    
  } catch (error) {
    console.error('Error en exportación:', error);
    alert('Error al exportar: ' + error.message);
    const loading = document.getElementById('exportLoading');
    if (loading) document.body.removeChild(loading);
  }
}

function generarCSVAbeBooks(libros) {
  // Formato exacto para AbeBooks y TodoColección
  // 14 columnas sin fila de encabezados
  const rows = libros.map(libro => [
    libro.stock_no || '',
    libro.tipo || 'Libro',
    escaparCSV(libro.autor || ''),
    escaparCSV(libro.titulo || ''),
    '', // subtitulo (vacío)
    escaparCSV(libro.descripcion || ''),
    escaparCSV(libro.editorial || ''),
    libro.fecha || '',
    libro.precio ? `€${libro.precio}` : '',
    libro.isbn || '',
    libro.encuadernacion || '',
	    libro.estado || '',
    escaparCSV(libro.materia || ''),
    escaparCSV(libro.materia2 || '')
  ]);
  
  // Sin fila de encabezados, solo datos
  return rows.map(row => row.join(',')).join('\n');
}

function generarCSVLibrosBosch(libros) {
  // Formato personalizado para LibrosBosch (con encabezados)
  const headers = [
    'ID',
    'Stock',
    'Título',
    'Autor',
    'Tipo',
    'Editorial',
    'Lugar',
    'Año',
    'Encuadernación',
    'Estado',
    'Páginas',
    'Precio Venta',
    'Precio Compra',
    'ISBN',
    'Materia',
    'Materia 2',
    'Idioma',
    'Descripción',
    'Notas',
    'Localización',
    'Cantidad'
  ];
  
  const rows = libros.map(libro => [
    libro.id || '',
    libro.stock_no || '',
    escaparCSV(libro.titulo || ''),
    escaparCSV(libro.autor || ''),
    libro.tipo || 'Libro',
    escaparCSV(libro.editorial || ''),
    escaparCSV(libro.lugar || ''),
    libro.fecha || '',
    libro.encuadernacion || '',
    libro.estado || '',
    libro.paginas || '',
    libro.precio || '',
    libro.precio_compra || '',
    libro.isbn || '',
    escaparCSV(libro.materia || ''),
    escaparCSV(libro.materia2 || ''),
    libro.idioma || '',
    escaparCSV(libro.descripcion || ''),
    escaparCSV(libro.notas || ''),
    escaparCSV(libro.localiz || ''),
    libro.cantidad || 1
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function escaparCSV(texto) {
  if (!texto) return '';
  texto = String(texto);
  // Si contiene comas, comillas o saltos de línea, escapar
  if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function descargarCSV(contenido, nombreArchivo) {
  // Añadir BOM para UTF-8 (evita problemas de acentos en Excel)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + contenido], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', nombreArchivo);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Liberar memoria
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ============================================
// FUNCIONES DE IMPRESIÓN
// ============================================

/**
 * Imprime una ficha individual de libro
 */