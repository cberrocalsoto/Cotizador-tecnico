/* ═══════════════════════════════════════════════════
   Constantes y datos iniciales
═══════════════════════════════════════════════════ */
const ITEMS_KEY  = 'cotizador_items';
const CONFIG_KEY  = 'cotizador_config';
const EMPRESA_KEY = 'cotizador_empresa';

const SEED_ITEMS = [
  { nombre: 'Cambio de pantalla hasta 32"',  precio: 28000 },
  { nombre: 'Cambio de pantalla hasta 40"',  precio: 35000 },
  { nombre: 'Cambio de pantalla hasta 50"',  precio: 42000 },
  { nombre: 'Cambio de pantalla hasta 65"',  precio: 58000 },
  { nombre: 'Cambio de tarjeta principal',   precio: 25000 },
  { nombre: 'Cambio de fuente de poder',     precio: 18000 },
  { nombre: 'Cambio de condensadores',       precio: 8000  },
  { nombre: 'Cambio de parlantes',           precio: 12000 },
  { nombre: 'Revisión diagnóstico',          precio: 5000  },
  { nombre: 'Mano de obra general',          precio: 15000 },
];

/* ═══════════════════════════════════════════════════
   Estado global
═══════════════════════════════════════════════════ */
let items      = [];
let config     = { precio_retiro: 5000, precio_despacho: 5000, ultimo_numero_cotizacion: 0 };
let empresa    = { nombre: '', rut: '', direccion: '', telefono: '', email: '', instagram: '', facebook: '', logo: null, logoRatio: 1, garantia: '' };
let quoteItems = [];
let toastTimer;

/* ═══════════════════════════════════════════════════
   Inicialización
═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  if (items.length === 0) seedItems();
  initQuote();
  renderItemsManager();
  refreshItemSelector();
});

function loadStorage() {
  try {
    const si = localStorage.getItem(ITEMS_KEY);
    const sc = localStorage.getItem(CONFIG_KEY);
    const se = localStorage.getItem(EMPRESA_KEY);
    items  = si ? JSON.parse(si) : [];
    if (sc) Object.assign(config,  JSON.parse(sc));
    if (se) Object.assign(empresa, JSON.parse(se));
  } catch (e) {
    console.error('Error al leer localStorage:', e);
  }
}

function saveItems()   { localStorage.setItem(ITEMS_KEY,   JSON.stringify(items));   }
function saveConfig()  { localStorage.setItem(CONFIG_KEY,  JSON.stringify(config));  }
function saveEmpresa() { localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresa)); }

function seedItems() {
  items = SEED_ITEMS.map(s => ({ id: uid(), ...s }));
  saveItems();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* ═══════════════════════════════════════════════════
   Navegación entre vistas
═══════════════════════════════════════════════════ */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.getElementById('btn-' + name).classList.add('active');
  if (name === 'mantenedor') renderItemsManager();
  if (name === 'cotizacion') refreshItemSelector();
  if (name === 'config')     populateEmpresaForm();
}

/* ═══════════════════════════════════════════════════
   Inicializar / limpiar cotización
═══════════════════════════════════════════════════ */
function initQuote() {
  document.getElementById('quote-date').value     = todayISO();
  document.getElementById('precio-retiro').value  = config.precio_retiro;
  document.getElementById('precio-despacho').value = config.precio_despacho;
  quoteItems = [];
  renderQuoteTable();
  updateTotals();
}

function newQuote() {
  document.getElementById('cliente-nombre').value      = '';
  document.getElementById('quote-observaciones').value = '';
  document.getElementById('check-retiro').checked      = false;
  document.getElementById('check-despacho').checked    = false;
  hideAdHocForm();
  initQuote();
  showView('cotizacion');
  showToast('Nueva cotización iniciada.', 'info');
}

/* ═══════════════════════════════════════════════════
   Selector de ítems del catálogo
═══════════════════════════════════════════════════ */
function refreshItemSelector() {
  const sel  = document.getElementById('item-selector');
  const prev = sel.value;
  sel.innerHTML = '<option value="">— Selecciona un ítem del catálogo —</option>' +
    items.map(it =>
      `<option value="${it.id}">${escHtml(it.nombre)} — ${fmtCLP(it.precio)}</option>`
    ).join('');
  if (items.find(i => i.id === prev)) sel.value = prev;
}

/* ═══════════════════════════════════════════════════
   Ítems en la cotización
═══════════════════════════════════════════════════ */
function addItemToQuote() {
  const sel = document.getElementById('item-selector');
  const qty = Math.max(1, parseInt(document.getElementById('item-qty').value) || 1);

  if (!sel.value) { showToast('Selecciona un ítem del catálogo.', 'error'); return; }

  const master = items.find(i => i.id === sel.value);
  if (!master) return;

  const existing = quoteItems.find(qi => qi.id === master.id);
  if (existing) {
    existing.cantidad += qty;
  } else {
    quoteItems.push({ id: master.id, nombre: master.nombre, precio: master.precio, cantidad: qty });
  }

  renderQuoteTable();
  updateTotals();
  sel.value = '';
  document.getElementById('item-qty').value = 1;
}

function addAdHocItem() {
  const nombre = document.getElementById('adhoc-nombre').value.trim();
  const precio = parsePrice(document.getElementById('adhoc-precio').value);

  if (!nombre) { showToast('Ingresa una descripción para el ítem.', 'error'); return; }
  if (precio === null) { showToast('Ingresa un precio válido.', 'error'); return; }

  const dup = items.find(i => i.nombre.toLowerCase() === nombre.toLowerCase());

  if (dup) {
    const reemplazar = confirm(
      `Ya existe el ítem "${dup.nombre}" (${fmtCLP(dup.precio)}).\n` +
      `¿Deseas reemplazar su precio con ${fmtCLP(precio)}?`
    );
    if (reemplazar) {
      dup.precio = precio;
      saveItems();
      renderItemsManager();
      refreshItemSelector();
    }
    const inQuote = quoteItems.find(qi => qi.id === dup.id);
    if (inQuote) { inQuote.cantidad++; }
    else { quoteItems.push({ id: dup.id, nombre: dup.nombre, precio: dup.precio, cantidad: 1 }); }

  } else {
    const newItem = { id: uid(), nombre, precio };
    items.push(newItem);
    saveItems();
    refreshItemSelector();
    quoteItems.push({ id: newItem.id, nombre, precio, cantidad: 1 });
    showToast(`"${nombre}" guardado en el mantenedor.`, 'info');
  }

  renderQuoteTable();
  updateTotals();
  document.getElementById('adhoc-nombre').value = '';
  document.getElementById('adhoc-precio').value = '';
  hideAdHocForm();
}

function removeFromQuote(id) {
  quoteItems = quoteItems.filter(qi => qi.id !== id);
  renderQuoteTable();
  updateTotals();
}

function updateQty(id, value) {
  const qty = parseInt(value);
  if (!qty || qty < 1) return;
  const qi = quoteItems.find(qi => qi.id === id);
  if (qi) { qi.cantidad = qty; updateTotals(); }
}

function renderQuoteTable() {
  const tbody = document.getElementById('quote-tbody');
  if (!quoteItems.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Aún no hay ítems. Selecciona del catálogo o agrega uno personalizado.</td></tr>';
    return;
  }
  tbody.innerHTML = quoteItems.map((qi, i) => `
    <tr>
      <td class="col-num">${i + 1}</td>
      <td>${escHtml(qi.nombre)}</td>
      <td class="col-qty">
        <input type="number" class="qty-inline" value="${qi.cantidad}" min="1"
          onchange="updateQty('${qi.id}', this.value)"
          oninput="updateQty('${qi.id}', this.value)">
      </td>
      <td class="col-price">${fmtCLP(qi.precio)}</td>
      <td class="col-price">${fmtCLP(qi.precio * qi.cantidad)}</td>
      <td class="col-action">
        <button class="btn-remove" onclick="removeFromQuote('${qi.id}')" title="Quitar ítem">✕</button>
      </td>
    </tr>
  `).join('');
}

function updateTotals() {
  const subtotal    = quoteItems.reduce((s, qi) => s + qi.precio * qi.cantidad, 0);
  const retiroOn    = document.getElementById('check-retiro').checked;
  const despachoOn  = document.getElementById('check-despacho').checked;
  const descuentoOn = document.getElementById('check-descuento').checked;
  const pRetiro     = parseFloat(document.getElementById('precio-retiro').value)    || 0;
  const pDespacho   = parseFloat(document.getElementById('precio-despacho').value)  || 0;
  const pDescuento  = parseFloat(document.getElementById('precio-descuento').value) || 0;
  const retiro      = retiroOn    ? pRetiro    : 0;
  const despacho    = despachoOn  ? pDespacho  : 0;
  const descuento   = descuentoOn ? pDescuento : 0;
  const total       = subtotal + retiro + despacho - descuento;

  document.getElementById('subtotal-display').textContent   = fmtCLP(subtotal);
  document.getElementById('retiro-display').textContent     = retiroOn    ? fmtCLP(retiro)    : '—';
  document.getElementById('despacho-display').textContent   = despachoOn  ? fmtCLP(despacho)  : '—';
  document.getElementById('descuento-display').textContent  = descuentoOn ? `-${fmtCLP(descuento)}` : '—';
  document.getElementById('total-display').textContent      = fmtCLP(Math.max(0, total));

  config.precio_retiro   = pRetiro   || config.precio_retiro;
  config.precio_despacho = pDespacho || config.precio_despacho;
  saveConfig();
}

/* ═══════════════════════════════════════════════════
   Formulario ítem personalizado
═══════════════════════════════════════════════════ */
function showAdHocForm() {
  document.getElementById('adhoc-form').style.display    = 'flex';
  document.getElementById('btn-show-adhoc').style.display = 'none';
  document.getElementById('adhoc-nombre').focus();
}

function hideAdHocForm() {
  document.getElementById('adhoc-form').style.display    = 'none';
  document.getElementById('btn-show-adhoc').style.display = 'inline-flex';
  document.getElementById('adhoc-nombre').value = '';
  document.getElementById('adhoc-precio').value = '';
}

/* ═══════════════════════════════════════════════════
   Mantenedor de Ítems
═══════════════════════════════════════════════════ */
function renderItemsManager() {
  const list = document.getElementById('items-list');
  if (!items.length) {
    list.innerHTML = '<p class="empty-msg">No hay ítems registrados.</p>';
    return;
  }
  list.innerHTML = items.map(it => `
    <div class="item-row" id="row-${it.id}">
      <div class="item-info">
        <span class="item-name">${escHtml(it.nombre)}</span>
        <span class="item-price">${fmtCLP(it.precio)}</span>
      </div>
      <div class="item-actions">
        <button class="btn-icon edit" onclick="startEdit('${it.id}')" title="Editar">✏️</button>
        <button class="btn-icon del"  onclick="deleteItem('${it.id}')" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join('');
}

function addItemFromManager() {
  const nombre = document.getElementById('new-item-nombre').value.trim();
  const precio = parsePrice(document.getElementById('new-item-precio').value);

  if (!nombre) { showToast('El nombre es obligatorio.', 'error'); return; }
  if (precio === null) { showToast('Ingresa un precio válido.', 'error'); return; }

  items.push({ id: uid(), nombre, precio });
  saveItems();
  renderItemsManager();
  refreshItemSelector();

  document.getElementById('new-item-nombre').value = '';
  document.getElementById('new-item-precio').value = '';
  document.getElementById('new-item-nombre').focus();
  showToast('Ítem guardado correctamente.', 'info');
}

function startEdit(id) {
  const it  = items.find(i => i.id === id);
  const row = document.getElementById('row-' + id);
  row.innerHTML = `
    <div class="item-edit-row">
      <input type="text"   id="en-${id}" value="${escHtml(it.nombre)}" class="input input-edit-nombre">
      <input type="number" id="ep-${id}" value="${it.precio}"          class="input input-edit-precio">
      <div class="edit-actions">
        <button class="btn btn-primary btn-sm" onclick="saveEdit('${id}')">Guardar</button>
        <button class="btn btn-secondary btn-sm" onclick="renderItemsManager()">Cancelar</button>
      </div>
    </div>
  `;
  document.getElementById('en-' + id).focus();
}

function saveEdit(id) {
  const nombre = document.getElementById('en-' + id).value.trim();
  const precio = parsePrice(document.getElementById('ep-' + id).value);

  if (!nombre) { showToast('El nombre no puede estar vacío.', 'error'); return; }
  if (precio === null) { showToast('Precio inválido.', 'error'); return; }

  const it = items.find(i => i.id === id);
  it.nombre = nombre;
  it.precio = precio;
  saveItems();
  renderItemsManager();
  refreshItemSelector();

  const qi = quoteItems.find(qi => qi.id === id);
  if (qi) { qi.nombre = nombre; qi.precio = precio; renderQuoteTable(); updateTotals(); }

  showToast('Ítem actualizado.', 'info');
}

function deleteItem(id) {
  if (!confirm('¿Eliminar este ítem del mantenedor?')) return;
  items = items.filter(i => i.id !== id);
  saveItems();
  renderItemsManager();
  refreshItemSelector();

  const was = quoteItems.some(qi => qi.id === id);
  if (was) {
    quoteItems = quoteItems.filter(qi => qi.id !== id);
    renderQuoteTable();
    updateTotals();
  }
}

/* ═══════════════════════════════════════════════════
   Importar / Exportar lista de ítems
═══════════════════════════════════════════════════ */
function exportItems() {
  if (!items.length) { showToast('No hay ítems para exportar.', 'error'); return; }
  const json = JSON.stringify(items, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'items_cotizador.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast(`${items.length} ítems exportados.`, 'info');
}

function importItems(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data) || !data.length) throw new Error();
      if (!data.every(it => typeof it.nombre === 'string' && typeof it.precio === 'number'))
        throw new Error();
      const reemplazar = confirm(
        `Se encontraron ${data.length} ítems.\n\nAceptar = reemplazar la lista actual\nCancelar = agregar sin borrar los existentes`
      );
      if (reemplazar) {
        items = data.map(it => ({ id: it.id || uid(), nombre: it.nombre, precio: it.precio }));
      } else {
        data.forEach(it => {
          if (!items.find(i => i.nombre.toLowerCase() === it.nombre.toLowerCase()))
            items.push({ id: it.id || uid(), nombre: it.nombre, precio: it.precio });
        });
      }
      saveItems();
      renderItemsManager();
      refreshItemSelector();
      showToast(`Importación completada (${data.length} ítems).`, 'info');
    } catch {
      showToast('Error: el archivo no tiene el formato correcto.', 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

/* ═══════════════════════════════════════════════════
   Configuración de empresa
═══════════════════════════════════════════════════ */
function saveEmpresaConfig() {
  empresa.nombre    = document.getElementById('emp-nombre').value.trim();
  empresa.rut       = document.getElementById('emp-rut').value.trim();
  empresa.direccion = document.getElementById('emp-direccion').value.trim();
  empresa.telefono  = document.getElementById('emp-telefono').value.trim();
  empresa.email     = document.getElementById('emp-email').value.trim();
  empresa.instagram = document.getElementById('emp-instagram').value.trim();
  empresa.facebook  = document.getElementById('emp-facebook').value.trim();
  empresa.garantia  = document.getElementById('emp-garantia').value.trim();
  saveEmpresa();
  showToast('Configuración guardada.', 'info');
}

function populateEmpresaForm() {
  document.getElementById('emp-nombre').value    = empresa.nombre    || '';
  document.getElementById('emp-rut').value       = empresa.rut       || '';
  document.getElementById('emp-direccion').value = empresa.direccion || '';
  document.getElementById('emp-telefono').value  = empresa.telefono  || '';
  document.getElementById('emp-email').value     = empresa.email     || '';
  document.getElementById('emp-instagram').value = empresa.instagram || '';
  document.getElementById('emp-facebook').value  = empresa.facebook  || '';
  document.getElementById('emp-garantia').value  = empresa.garantia  || '';

  const hasLogo = !!empresa.logo;
  document.getElementById('logo-preview-wrap').style.display = hasLogo ? 'flex'        : 'none';
  document.getElementById('logo-upload-label').style.display = hasLogo ? 'none'        : 'inline-flex';
  if (hasLogo) document.getElementById('logo-preview').src   = empresa.logo;
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_W = 600, MAX_H = 300;
      let w = img.naturalWidth || 400, h = img.naturalHeight || 200;
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const data = canvas.toDataURL('image/jpeg', 0.85);
      empresa.logo      = data;
      empresa.logoRatio = w / h;
      saveEmpresa();
      document.getElementById('logo-preview').src            = data;
      document.getElementById('logo-preview-wrap').style.display = 'flex';
      document.getElementById('logo-upload-label').style.display = 'none';
      showToast('Logo cargado correctamente.', 'info');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function removeLogo() {
  empresa.logo = null; empresa.logoRatio = 1;
  saveEmpresa();
  document.getElementById('logo-preview').src            = '';
  document.getElementById('logo-preview-wrap').style.display = 'none';
  document.getElementById('logo-upload-label').style.display = 'inline-flex';
  showToast('Logo eliminado.', 'info');
}

/* ═══════════════════════════════════════════════════
   Exportar PDF
═══════════════════════════════════════════════════ */
function downloadPDF() {
  const cliente = document.getElementById('cliente-nombre').value.trim();
  if (!cliente)          { showToast('Ingresa el nombre del cliente antes de generar el PDF.', 'error'); return; }
  if (!quoteItems.length){ showToast('Agrega al menos un ítem a la cotización.', 'error'); return; }

  const { jsPDF } = window.jspdf;
  const doc    = new jsPDF();
  const PAGE_W = doc.internal.pageSize.width;
  const PAGE_H = doc.internal.pageSize.height;
  const ML = 14, MR = 14;

  const fecha       = document.getElementById('quote-date').value;
  const obs         = document.getElementById('quote-observaciones').value.trim();
  const retiroOn    = document.getElementById('check-retiro').checked;
  const despachoOn  = document.getElementById('check-despacho').checked;
  const descuentoOn = document.getElementById('check-descuento').checked;
  const pRetiro     = parseFloat(document.getElementById('precio-retiro').value)    || 0;
  const pDespacho   = parseFloat(document.getElementById('precio-despacho').value)  || 0;
  const pDescuento  = parseFloat(document.getElementById('precio-descuento').value) || 0;
  const subtotal    = quoteItems.reduce((s, qi) => s + qi.precio * qi.cantidad, 0);
  const total       = Math.max(0, subtotal + (retiroOn ? pRetiro : 0) + (despachoOn ? pDespacho : 0) - (descuentoOn ? pDescuento : 0));

  let y = 14;

  /* ── Encabezado empresa ── */
  const tieneEmpresa = empresa.nombre || empresa.logo;
  if (tieneEmpresa) {
    const LOGO_MAX_W = 45, LOGO_MAX_H = 22;
    let logoW = 0, logoH = 0;

    if (empresa.logo) {
      const ratio = empresa.logoRatio || 2;
      if (ratio >= LOGO_MAX_W / LOGO_MAX_H) { logoW = LOGO_MAX_W; logoH = LOGO_MAX_W / ratio; }
      else                                   { logoH = LOGO_MAX_H; logoW = LOGO_MAX_H * ratio; }
      try { doc.addImage(empresa.logo, 'JPEG', ML, y, logoW, logoH); } catch (_) { logoW = 0; }
    }

    const textX = logoW ? ML + logoW + 6 : ML;
    let   textY = y + 5;

    if (empresa.nombre) {
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 86, 219);
      doc.text(empresa.nombre, textX, textY); textY += 6;
    }
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(70, 70, 70);
    if (empresa.rut)       { doc.text(`RUT: ${empresa.rut}`, textX, textY); textY += 4.5; }
    if (empresa.direccion) { doc.text(empresa.direccion,      textX, textY); textY += 4.5; }
    const contact = [empresa.telefono, empresa.email].filter(Boolean).join('   ');
    if (contact)           { doc.text(contact, textX, textY); textY += 4.5; }

    y = Math.max(y + (logoH || 0) + 4, textY + 2);
    doc.setDrawColor(26, 86, 219); doc.setLineWidth(0.4);
    doc.line(ML, y, PAGE_W - MR, y); y += 8;
  }

  /* ── Título ── */
  doc.setFontSize(tieneEmpresa ? 14 : 20);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 86, 219);
  doc.text('COTIZACIÓN DE SERVICIO TÉCNICO', PAGE_W / 2, y, { align: 'center' });
  if (!tieneEmpresa) {
    doc.setDrawColor(26, 86, 219); doc.setLineWidth(0.5);
    doc.line(ML, y + 4, PAGE_W - MR, y + 4); y += 4;
  }
  y += 10;

  /* ── Fecha y cliente ── */
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
  doc.text(`Fecha: ${fmtDate(fecha)}`, ML, y);
  doc.text(`Cliente: ${cliente}`,      ML, y + 7);
  y += 18;

  /* ── Tabla de ítems ── */
  const tableBody = quoteItems.map((qi, i) => [
    i + 1, qi.nombre, qi.cantidad, fmtCLP(qi.precio), fmtCLP(qi.precio * qi.cantidad),
  ]);
  if (retiroOn)    tableBody.push(['', 'Retiro a domicilio', 1, fmtCLP(pRetiro),          fmtCLP(pRetiro)]);
  if (despachoOn)  tableBody.push(['', 'Despacho / entrega', 1, fmtCLP(pDespacho),        fmtCLP(pDespacho)]);
  if (descuentoOn) tableBody.push(['', 'Descuento',          1, `-${fmtCLP(pDescuento)}`, `-${fmtCLP(pDescuento)}`]);

  doc.autoTable({
    startY: y,
    head: [['#', 'Descripción', 'Cant.', 'P. Unitario', 'Subtotal']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 3.5 },
    headStyles: { fillColor: [26, 86, 219], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 246, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 34, halign: 'right'  },
      4: { cellWidth: 34, halign: 'right'  },
    },
    margin: { left: ML, right: MR },
  });

  y = doc.lastAutoTable.finalY + 6;

  /* ── Bloque de total ── */
  doc.setFillColor(26, 86, 219);
  doc.rect(128, y, 68, 11, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', 132, y + 7.5);
  doc.text(fmtCLP(total), PAGE_W - MR - 4, y + 7.5, { align: 'right' });

  /* ── Observaciones ── */
  if (obs) {
    y += 18;
    doc.setTextColor(40, 40, 40); doc.setFontSize(9);
    doc.setFont('helvetica', 'bold'); doc.text('Observaciones:', ML, y);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(obs, PAGE_W - ML - MR), ML, y + 6);
  }

  /* ── Pie de página ── */
  const footerY = PAGE_H - 14;
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
  doc.line(ML, footerY - 6, PAGE_W - MR, footerY - 6);

  const footerParts = [
    empresa.telefono  ? `Tel: ${empresa.telefono}` : null,
    empresa.email     || null,
    empresa.instagram ? `IG: ${empresa.instagram}` : null,
    empresa.facebook  ? `FB: ${empresa.facebook}`  : null,
  ].filter(Boolean);

  const garantia = empresa.garantia ||
    'Cotización válida por 30 días desde la fecha de emisión. Generada automáticamente.';

  doc.setFontSize(7.5); doc.setTextColor(140, 140, 140); doc.setFont('helvetica', 'normal');
  if (footerParts.length)
    doc.text(footerParts.join('  |  '), PAGE_W / 2, footerY - 2, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.text(garantia, PAGE_W / 2, footerY + 3, { align: 'center' });

  const [anio, mes, dia] = fecha.split('-');
  const fechaFmt    = `${dia}-${mes}-${anio}`;
  const clienteSafe = cliente.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_');
  doc.save(`cotizacion_${clienteSafe}_${fechaFmt}.pdf`);
  showToast('PDF descargado correctamente.', 'info');
}

/* ═══════════════════════════════════════════════════
   Enviar por WhatsApp
═══════════════════════════════════════════════════ */
function sendWhatsApp() {
  if (!quoteItems.length) { showToast('Agrega al menos un ítem a la cotización.', 'error'); return; }

  const fecha      = document.getElementById('quote-date').value;
  const cliente    = document.getElementById('cliente-nombre').value.trim() || 'Cliente';
  const rawPhone   = document.getElementById('wa-phone').value.trim();
  const phone      = rawPhone.replace(/\D/g, '');
  const retiroOn    = document.getElementById('check-retiro').checked;
  const despachoOn  = document.getElementById('check-despacho').checked;
  const descuentoOn = document.getElementById('check-descuento').checked;
  const pRetiro     = parseFloat(document.getElementById('precio-retiro').value)    || 0;
  const pDespacho   = parseFloat(document.getElementById('precio-despacho').value)  || 0;
  const pDescuento  = parseFloat(document.getElementById('precio-descuento').value) || 0;
  const obs         = document.getElementById('quote-observaciones').value.trim();
  const subtotal    = quoteItems.reduce((s, qi) => s + qi.precio * qi.cantidad, 0);
  const total       = Math.max(0, subtotal + (retiroOn ? pRetiro : 0) + (despachoOn ? pDespacho : 0) - (descuentoOn ? pDescuento : 0));

  let msg = `*COTIZACIÓN*\n`;
  msg += `Fecha: ${fmtDate(fecha)}\n`;
  msg += `Cliente: ${cliente}\n\n`;
  msg += `*Detalle de servicios:*\n`;

  quoteItems.forEach((qi, i) => {
    msg += `${i + 1}. ${qi.nombre} x${qi.cantidad} — ${fmtCLP(qi.precio * qi.cantidad)}\n`;
  });

  if (retiroOn)    msg += `Retiro a domicilio: ${fmtCLP(pRetiro)}\n`;
  if (despachoOn)  msg += `Despacho / entrega: ${fmtCLP(pDespacho)}\n`;
  if (descuentoOn) msg += `Descuento: -${fmtCLP(pDescuento)}\n`;

  msg += `\n*TOTAL: ${fmtCLP(total)}*`;
  if (obs) msg += `\n\n_Obs: ${obs}_`;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

/* ═══════════════════════════════════════════════════
   Utilidades
═══════════════════════════════════════════════════ */
function fmtCLP(n) {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parsePrice(val) {
  const n = parseFloat(val);
  return (isNaN(n) || n < 0) ? null : n;
}

/* ═══════════════════════════════════════════════════
   Sistema de notificaciones (toast)
═══════════════════════════════════════════════════ */
function showToast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
}
