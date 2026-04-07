/**
 * Imprime una ficha individual de libro
 */
function imprimirLibro(libro) {
  if (!libro) return;
  
  const contenido = `
    <div class="print-ficha">
      <div class="print-ficha-header">
        <h1>📚 LIBROS BOSCH</h1>
        <p>Calle Aceituno 6, Sevilla</p>
        <p>647 511 220 • librosbosch@gmail.com</p>
      </div>
      
      ${libro.stock_no ? `<div class="print-ficha-stock">Stock #${libro.stock_no}</div>` : ''}
      
      <div class="print-ficha-autor">${escaparHTML(libro.autor || '—')}</div>
      <div class="print-ficha-titulo">${escaparHTML(libro.titulo || 'Sin título')}</div>
      
      <div class="print-ficha-editorial">
        ${[
          libro.editorial,
          libro.lugar,
          libro.fecha
        ].filter(Boolean).join(', ')}
      </div>
      
      <div class="print-ficha-fisica">
        ${[
          libro.tamano_cm,
          libro.paginas ? `${libro.paginas} pp.` : '',
          libro.descripcion
        ].filter(Boolean).join(' ')}
      </div>
      
      <div class="print-ficha-detalles">
        ${libro.encuadernacion ? `<div><strong>Encuadernación:</strong> ${escaparHTML(libro.encuadernacion)}</div>` : ''}
        ${libro.estado ? `<div><strong>Estado:</strong> ${escaparHTML(libro.estado)}</div>` : ''}
        ${libro.sobrecubierta && libro.sobrecubierta !== 'Sin sobrecubierta' ? `<div><strong>Sobrecubierta:</strong> ${escaparHTML(libro.sobrecubierta)}</div>` : ''}
      </div>
      
      <div class="print-ficha-detalles">
        ${libro.isbn ? `<div><strong>ISBN:</strong> ${escaparHTML(libro.isbn)}</div>` : ''}
        ${libro.materia ? `<div><strong>Materia:</strong> ${escaparHTML(libro.materia)}</div>` : ''}
        ${libro.idioma ? `<div><strong>Idioma:</strong> ${escaparHTML(libro.idioma)}</div>` : ''}
      </div>
      
      <div class="print-ficha-detalles">
        ${libro.localiz ? `<div><strong>Localización:</strong> ${escaparHTML(libro.localiz)}</div>` : ''}
        ${libro.compra_codigo ? `<div><strong>Código compra:</strong> ${escaparHTML(libro.compra_codigo)}</div>` : ''}
      </div>
      
      ${libro.precio ? `<div class="print-ficha-precio">Precio: ${formatearPrecio(libro.precio)}</div>` : ''}
      
      <div class="print-ficha-footer">
        www.librosbosch.com
      </div>
    </div>
  `;
  
  const areaImpresion = document.createElement('div');
  areaImpresion.className = 'print-area';
  areaImpresion.innerHTML = contenido;
  document.body.appendChild(areaImpresion);
  
  window.print();
  
  setTimeout(() => {
    document.body.removeChild(areaImpresion);
  }, 100);
}

function imprimirResultadosBusqueda() {
  if (!Array.isArray(resultadosBusqueda) || !resultadosBusqueda.length) {
    toast('No hay resultados para imprimir', true);
    return;
  }

  const fichas = resultadosBusqueda.map(libro => {
    const linea1 = [
      libro.autor ? `<strong>${escaparHTML(libro.autor)}.</strong>` : '',
      libro.titulo ? ` <em>${escaparHTML(libro.titulo)}.</em>` : '',
      libro.lugar ? ` ${escaparHTML(libro.lugar)}:` : '',
      libro.editorial ? ` ${escaparHTML(libro.editorial)},` : '',
      libro.fecha ? ` ${escaparHTML(libro.fecha)}` : '',
      libro.stock_no ? ` [${libro.stock_no}]` : ''
    ].join('');

    const partesLinea2 = [];

    if (libro.tamano_cm) partesLinea2.push(escaparHTML(libro.tamano_cm) + '.');
    if (libro.paginas) partesLinea2.push(`${libro.paginas} pp.`);
    if (libro.encuadernacion) partesLinea2.push(`Encuadernación ${escaparHTML(libro.encuadernacion)}.`);
    if (libro.estado) partesLinea2.push(`${escaparHTML(libro.estado)}.`);

    const linea2 = partesLinea2.join(' ');

    return `
      <div class="print-resultado-item">
        <div class="print-resultado-linea1">${linea1}</div>
        <div class="print-resultado-linea2">
          ${linea2}
          ${libro.precio ? ` <strong>${formatearPrecio(libro.precio)}</strong>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const areaImpresion = document.createElement('div');
  areaImpresion.className = 'print-area';
  areaImpresion.innerHTML = `
    <div class="print-resultados-wrap">
      <h1>Resultados de búsqueda</h1>
      ${fichas}
    </div>
  `;
  document.body.appendChild(areaImpresion);

  window.print();

  setTimeout(() => {
    document.body.removeChild(areaImpresion);
  }, 100);
}

document.addEventListener('keydown', function (e) {
  const overlay = document.getElementById('modalOverlay');
  const modalVisible = overlay && overlay.classList.contains('visible');

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && modalVisible && window.libroActivoModal) {
    e.preventDefault();
    imprimirLibro(window.libroActivoModal);
  }
});