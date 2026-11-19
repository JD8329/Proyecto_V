const API = '/api/v1';

const state = {
  clients: [],
  products: [],
  salesPage: 1,
  salesPages: 1,
};

const byId = (id) => document.getElementById(id);
const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 2,
});
const integer = new Intl.NumberFormat('es-CO');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'No fue posible completar la operación.');
  }
  return payload?.data;
}

function showToast(message, type = 'success') {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.toggle('error', type === 'error');
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function showAlert(message, type = 'danger') {
  const alert = byId('global-alert');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
}

function clearAlert() {
  byId('global-alert').className = 'alert d-none';
}

function localDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDateTimeValue(date = new Date()) {
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
  return `${localDateValue(date)}T${time}`;
}

function readableDate(value) {
  if (!value) return '—';
  const parsed = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

async function checkApi() {
  const element = byId('api-status');
  try {
    await api('/health');
    element.className = 'api-status online';
    element.innerHTML = '<i class="fa fa-circle"></i> API conectada';
  } catch (_error) {
    element.className = 'api-status offline';
    element.innerHTML = '<i class="fa fa-circle"></i> API sin conexión';
  }
}

function fillSelect(select, items, placeholder) {
  const current = select.value;
  select.replaceChildren();
  if (placeholder !== null) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = placeholder;
    select.append(option);
  }
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.nombre;
    select.append(option);
  });
  select.value = current;
}

async function loadCatalogs() {
  const [clients, products] = await Promise.all([api('/clientes'), api('/productos')]);
  state.clients = clients;
  state.products = products;
  fillSelect(byId('filter-client'), clients, 'Todos');
  fillSelect(byId('sale-client'), clients, 'Seleccione un cliente');
}

function setSummaryDefaults() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 30);
  byId('summary-from').value = localDateValue(from);
  byId('summary-to').value = localDateValue(today);
}

function renderChart(days) {
  const chart = byId('daily-chart');
  chart.replaceChildren();
  if (!days.length) {
    chart.innerHTML = '<div class="chart-empty"><i class="fa fa-bar-chart"></i><strong>Sin datos consolidados</strong><span>Ejecute el procedimiento para actualizar el resumen.</span></div>';
    return;
  }
  const maximum = Math.max(...days.map((day) => Number(day.ingresos)), 1);
  days.forEach((day) => {
    const column = document.createElement('div');
    column.className = 'chart-column';
    const height = Math.max(3, (Number(day.ingresos) / maximum) * 165);
    column.innerHTML = `
      <span class="chart-value">${escapeHtml(money.format(day.ingresos))}</span>
      <div class="chart-bar" style="height:${height}px" title="${escapeHtml(day.fecha)}: ${escapeHtml(money.format(day.ingresos))}"></div>
      <span class="chart-label">${escapeHtml(day.fecha.slice(5))}</span>`;
    chart.append(column);
  });
}

async function loadSummary() {
  const from = byId('summary-from').value;
  const to = byId('summary-to').value;
  const query = new URLSearchParams({ desde: from, hasta: to });
  const [indicators, days] = await Promise.all([
    api(`/resumen/indicadores?${query}`),
    api(`/resumen/ventas-diarias?${query}`),
  ]);
  byId('kpi-sales').textContent = integer.format(indicators.totalVentas);
  byId('kpi-units').textContent = integer.format(indicators.totalUnidades);
  byId('kpi-income').textContent = money.format(indicators.ingresosTotal);
  byId('kpi-ticket').textContent = money.format(indicators.ticketPromedio);
  byId('last-update').textContent = indicators.ultimaActualizacion
    ? `Última consolidación: ${readableDate(indicators.ultimaActualizacion)}`
    : 'Sin datos consolidados en el período.';
  renderChart(days);
}

async function loadConsolidationStatus() {
  const status = await api('/resumen/estado');
  const button = byId('consolidate-summary');
  button.disabled = !status.pendiente;
  button.innerHTML = status.pendiente
    ? '<i class="fa fa-database"></i> Actualizar resumen'
    : '<i class="fa fa-check-circle"></i> Resumen actualizado';
  button.title = status.pendiente
    ? 'Existen cambios pendientes de consolidar.'
    : 'No existen cambios pendientes.';
  return status;
}

async function consolidateSummary() {
  const confirmed = window.confirm(
    '¿Desea ejecutar el procedimiento y recalcular ahora toda la tabla de resumen?',
  );
  if (!confirmed) return;

  const button = byId('consolidate-summary');
  const originalContent = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Consolidando';
  try {
    const result = await api('/resumen/actualizar', { method: 'POST' });
    await loadSummary();
    showToast(`Resumen actualizado: ${result.diasConsolidados} días consolidados.`);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    await loadConsolidationStatus().catch(() => {
      button.disabled = false;
      button.innerHTML = originalContent;
    });
  }
}

function saleQuery() {
  const query = new URLSearchParams({
    page: String(state.salesPage),
    limit: byId('filter-limit').value,
  });
  const optional = {
    clienteId: byId('filter-client').value,
    estado: byId('filter-status').value,
    fechaDesde: byId('filter-from').value,
    fechaHasta: byId('filter-to').value,
  };
  Object.entries(optional).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return query;
}

function renderSales(sales) {
  const body = byId('sales-body');
  body.replaceChildren();
  if (!sales.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty-row"><i class="fa fa-inbox"></i> No se encontraron ventas con los filtros seleccionados.</td></tr>';
    return;
  }
  sales.forEach((sale) => {
    const row = document.createElement('tr');
    const stateClass = sale.estado === 'CONFIRMADA' ? 'state-confirmed' : 'state-cancelled';
    row.innerHTML = `
      <td><strong>#${sale.id}</strong></td>
      <td>${escapeHtml(readableDate(sale.fechaVenta))}</td>
      <td>${escapeHtml(sale.cliente.nombre)}</td>
      <td><span class="state-badge ${stateClass}">${escapeHtml(sale.estado)}</span></td>
      <td class="text-right"><strong>${escapeHtml(money.format(sale.total))}</strong></td>
      <td><div class="action-buttons">
        <button class="btn btn-outline-info btn-sm" data-action="view" data-id="${sale.id}" title="Ver detalle"><i class="fa fa-eye"></i></button>
        <button class="btn btn-outline-primary btn-sm" data-action="edit" data-id="${sale.id}" title="Editar"><i class="fa fa-pencil"></i></button>
        <button class="btn btn-outline-danger btn-sm" data-action="annul" data-id="${sale.id}" title="Anular" ${sale.estado === 'ANULADA' ? 'disabled' : ''}><i class="fa fa-ban"></i></button>
      </div></td>`;
    body.append(row);
  });
}

function renderPagination(meta) {
  state.salesPages = Math.max(meta.pages, 1);
  const pagination = byId('sales-pagination');
  pagination.replaceChildren();
  const addPage = (label, page, disabled = false, active = false) => {
    const item = document.createElement('li');
    item.className = `page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'page-link';
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener('click', () => {
      state.salesPage = page;
      void loadSales();
    });
    item.append(button);
    pagination.append(item);
  };

  addPage('Anterior', state.salesPage - 1, state.salesPage <= 1);
  const start = Math.max(1, state.salesPage - 2);
  const end = Math.min(state.salesPages, start + 4);
  for (let page = Math.max(1, end - 4); page <= end; page += 1) {
    addPage(String(page), page, false, page === state.salesPage);
  }
  addPage('Siguiente', state.salesPage + 1, state.salesPage >= state.salesPages);
}

async function loadSales() {
  clearAlert();
  try {
    const response = await fetch(`${API}/ventas?${saleQuery()}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || 'No fue posible consultar las ventas.');
    renderSales(payload.data);
    renderPagination(payload.meta);
    const first = payload.meta.total ? (payload.meta.page - 1) * payload.meta.limit + 1 : 0;
    const last = Math.min(payload.meta.page * payload.meta.limit, payload.meta.total);
    byId('sales-count').textContent = `Mostrando ${first} a ${last} de ${payload.meta.total} ventas`;
  } catch (error) {
    showAlert(error.message);
  }
}

function productOptions(selectedId) {
  return `<option value="">Seleccione un producto</option>${state.products.map((product) =>
    `<option value="${product.id}" ${Number(selectedId) === product.id ? 'selected' : ''}>${escapeHtml(product.nombre)}</option>`,
  ).join('')}`;
}

function updateSaleTotal() {
  let total = 0;
  byId('details-body').querySelectorAll('tr').forEach((row) => {
    const quantity = Number(row.querySelector('[data-field="quantity"]').value || 0);
    const price = Number(row.querySelector('[data-field="price"]').value || 0);
    const subtotal = quantity * price;
    row.querySelector('[data-field="subtotal"]').textContent = money.format(subtotal);
    total += subtotal;
  });
  byId('sale-total').textContent = money.format(total);
}

function addDetailRow(detail = {}) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><select class="form-control" data-field="product" required>${productOptions(detail.productoId)}</select></td>
    <td><input type="number" class="form-control" data-field="quantity" min="1" step="1" value="${detail.cantidad ?? 1}" required></td>
    <td><input type="number" class="form-control" data-field="price" min="0" step="0.01" value="${detail.precioUnitario ?? ''}" required></td>
    <td class="text-right"><strong data-field="subtotal">${money.format(0)}</strong></td>
    <td class="text-center"><button type="button" class="btn btn-outline-danger btn-sm" data-action="remove-detail" title="Eliminar línea"><i class="fa fa-trash"></i></button></td>`;
  const productSelect = row.querySelector('[data-field="product"]');
  productSelect.addEventListener('change', () => {
    const product = state.products.find((item) => item.id === Number(productSelect.value));
    if (product) row.querySelector('[data-field="price"]').value = product.precioCatalogo.toFixed(2);
    updateSaleTotal();
  });
  row.querySelectorAll('input').forEach((input) => input.addEventListener('input', updateSaleTotal));
  row.querySelector('[data-action="remove-detail"]').addEventListener('click', () => {
    row.remove();
    updateSaleTotal();
  });
  byId('details-body').append(row);
  updateSaleTotal();
}

function openNewSale() {
  byId('sale-form').reset();
  byId('sale-id').value = '';
  byId('sale-modal-title').textContent = 'Registrar venta';
  byId('sale-modal-subtitle').textContent = 'Complete la cabecera y agregue productos.';
  byId('sale-date').value = localDateTimeValue();
  byId('sale-status').value = 'CONFIRMADA';
  byId('details-body').replaceChildren();
  byId('form-error').className = 'alert alert-danger d-none';
  addDetailRow();
  window.jQuery('#sale-modal').modal('show');
}

async function openEditSale(id) {
  try {
    const sale = await api(`/ventas/${id}`);
    byId('sale-id').value = sale.id;
    byId('sale-modal-title').textContent = `Editar venta #${sale.id}`;
    byId('sale-modal-subtitle').textContent = 'Los cambios se guardarán en la cabecera y el detalle.';
    byId('sale-client').value = sale.clienteId;
    byId('sale-date').value = sale.fechaVenta.replace(' ', 'T');
    byId('sale-status').value = sale.estado;
    byId('details-body').replaceChildren();
    sale.detalles.forEach(addDetailRow);
    byId('form-error').className = 'alert alert-danger d-none';
    window.jQuery('#sale-modal').modal('show');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function viewSale(id) {
  try {
    const sale = await api(`/ventas/${id}`);
    byId('detail-title').textContent = `Venta #${sale.id}`;
    const rows = sale.detalles.map((detail) => `
      <tr><td>${escapeHtml(detail.producto)}</td><td class="text-right">${integer.format(detail.cantidad)}</td><td class="text-right">${money.format(detail.precioUnitario)}</td><td class="text-right"><strong>${money.format(detail.subtotal)}</strong></td></tr>`).join('');
    byId('detail-content').innerHTML = `
      <div class="detail-summary">
        <div><span>Cliente</span><strong>${escapeHtml(sale.cliente.nombre)}</strong></div>
        <div><span>Fecha</span><strong>${escapeHtml(readableDate(sale.fechaVenta))}</strong></div>
        <div><span>Estado</span><strong>${escapeHtml(sale.estado)}</strong></div>
      </div>
      <div class="table-responsive"><table class="table table-bordered">
        <thead><tr><th>Producto</th><th class="text-right">Cantidad</th><th class="text-right">Precio</th><th class="text-right">Subtotal</th></tr></thead>
        <tbody>${rows}</tbody><tfoot><tr><th colspan="3" class="text-right">Total</th><th class="text-right">${money.format(sale.total)}</th></tr></tfoot>
      </table></div>`;
    window.jQuery('#detail-modal').modal('show');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function salePayload() {
  const rows = [...byId('details-body').querySelectorAll('tr')];
  return {
    clienteId: Number(byId('sale-client').value),
    fechaVenta: byId('sale-date').value.replace('T', ' '),
    estado: byId('sale-status').value,
    detalles: rows.map((row) => ({
      productoId: Number(row.querySelector('[data-field="product"]').value),
      cantidad: Number(row.querySelector('[data-field="quantity"]').value),
      precioUnitario: Number(row.querySelector('[data-field="price"]').value),
    })),
  };
}

async function saveSale(event) {
  event.preventDefault();
  const id = byId('sale-id').value;
  const errorBox = byId('form-error');
  const saveButton = byId('save-sale');
  if (byId('details-body').children.length === 0) {
    errorBox.textContent = 'Agregue al menos un producto a la venta.';
    errorBox.className = 'alert alert-danger';
    return;
  }
  saveButton.disabled = true;
  saveButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Guardando';
  try {
    await api(id ? `/ventas/${id}` : '/ventas', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(salePayload()),
    });
    window.jQuery('#sale-modal').modal('hide');
    showToast(id ? 'Venta actualizada correctamente.' : 'Venta registrada correctamente.');
    state.salesPage = 1;
    await Promise.all([loadSales(), loadConsolidationStatus()]);
    showSection('ventas');
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.className = 'alert alert-danger';
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = '<i class="fa fa-save"></i> Guardar venta';
  }
}

async function annulSale(id) {
  if (!window.confirm(`¿Desea anular la venta #${id}? El resumen cambiará en la siguiente consolidación.`)) return;
  try {
    await api(`/ventas/${id}/anular`, { method: 'PATCH' });
    showToast('La venta fue anulada.');
    await Promise.all([loadSales(), loadConsolidationStatus()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function showSection(section) {
  const isDashboard = section === 'dashboard';
  byId('section-dashboard').classList.toggle('d-none', !isDashboard);
  byId('section-ventas').classList.toggle('d-none', isDashboard);
  byId('page-title').textContent = isDashboard ? 'Resumen de ventas' : 'Gestión de ventas';
  byId('breadcrumb-current').textContent = isDashboard ? 'Resumen' : 'Ventas';
  document.querySelectorAll('[data-section-link]').forEach((item) => item.classList.remove('active'));
  document.querySelector(`[data-section-link="${isDashboard ? 'dashboard' : 'ventas'}"]`)?.classList.add('active');
}

function handleHash() {
  const route = window.location.hash.slice(1) || 'dashboard';
  if (route === 'nueva') {
    showSection('ventas');
    openNewSale();
    return;
  }
  showSection(route === 'ventas' ? 'ventas' : 'dashboard');
}

function bindEvents() {
  window.addEventListener('hashchange', handleHash);
  byId('summary-filter').addEventListener('submit', (event) => {
    event.preventDefault();
    Promise.all([loadSummary(), loadConsolidationStatus()])
      .catch((error) => showAlert(error.message));
  });
  byId('consolidate-summary').addEventListener('click', () => void consolidateSummary());
  byId('sales-filter').addEventListener('submit', (event) => {
    event.preventDefault();
    state.salesPage = 1;
    void loadSales();
  });
  byId('clear-filters').addEventListener('click', () => {
    byId('sales-filter').reset();
    state.salesPage = 1;
    void loadSales();
  });
  byId('new-sale-button').addEventListener('click', openNewSale);
  byId('add-detail').addEventListener('click', () => addDetailRow());
  byId('sale-form').addEventListener('submit', saveSale);
  byId('sales-body').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = Number(button.dataset.id);
    if (button.dataset.action === 'view') void viewSale(id);
    if (button.dataset.action === 'edit') void openEditSale(id);
    if (button.dataset.action === 'annul') void annulSale(id);
  });
  byId('menu-confirmadas').addEventListener('click', () => {
    byId('filter-status').value = 'CONFIRMADA';
    state.salesPage = 1;
    showSection('ventas');
    void loadSales();
  });
  byId('menu-anuladas').addEventListener('click', () => {
    byId('filter-status').value = 'ANULADA';
    state.salesPage = 1;
    showSection('ventas');
    void loadSales();
  });
}

async function initialize() {
  setSummaryDefaults();
  bindEvents();
  handleHash();
  await checkApi();
  try {
    await loadCatalogs();
    await Promise.all([loadSummary(), loadConsolidationStatus(), loadSales()]);
  } catch (error) {
    showAlert(error.message);
  }
}

void initialize();
