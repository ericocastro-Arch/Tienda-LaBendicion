export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;
export const NUL = 0x00;

const PIXEL_BEFORE_CUT = 3;

export function normalizarAscii(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

export function txt(str) {
  return Buffer.from(normalizarAscii(str), 'latin1');
}

export function line(str) {
  return Buffer.concat([txt(str), Buffer.from([LF])]);
}

export function esc(...bytes) {
  return Buffer.from(bytes);
}

export function feed(n) {
  return Buffer.concat(Array.from({ length: n }, () => Buffer.from([LF])));
}

export function init() {
  return esc(ESC, 0x40);
}

export function alignLeft() {
  return esc(ESC, 0x61, 0x00);
}

export function alignCenter() {
  return esc(ESC, 0x61, 0x01);
}

export function alignRight() {
  return esc(ESC, 0x61, 0x02);
}

export function boldOn() {
  return esc(ESC, 0x45, 0x01);
}

export function boldOff() {
  return esc(ESC, 0x45, 0x00);
}

export function doubleSizeOn() {
  return esc(GS, 0x21, 0x11);
}

export function doubleSizeOff() {
  return esc(GS, 0x21, 0x00);
}

export function cut() {
  return esc(GS, 0x56, 0x00);
}

export function cutPartial() {
  return esc(GS, 0x56, 0x01);
}

export function openDrawer() {
  return esc(ESC, 0x70, 0x00, 0x19, 0xfa);
}

export function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function padLeft(value, width) {
  const s = normalizarAscii(value);
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

export function padRight(value, width) {
  const s = normalizarAscii(value);
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

export function padTicketRow(desc, qty, price) {
  const name = padRight(desc, 17);
  const num = `${padLeft(qty, 4)} ${padLeft(price, 7)}`;
  return `${name}${num}`;
}

export function padAmountRow(label, amount) {
  const left = padRight(label + ':', 18);
  return `${left}${padLeft(formatMoney(amount), 12)}`;
}

export function buildTicket({ store, sale }) {
  const parts = [];
  const divider = '-'.repeat(32);

  parts.push(init());
  parts.push(feed(1));
  parts.push(alignCenter());
  parts.push(doubleSizeOn());
  parts.push(boldOn());
  parts.push(line((store.nombre || 'LA BENDICION').toUpperCase()));
  parts.push(boldOff());
  parts.push(doubleSizeOff());

  parts.push(alignCenter());
  if (store.direccion) parts.push(line(store.direccion));
  if (store.telefono) parts.push(line(`Tel: ${store.telefono}`));
  parts.push(feed(1));

  parts.push(alignCenter());
  parts.push(line(divider));

  parts.push(alignCenter());
  parts.push(boldOn());
  parts.push(line(`TICKET: ${sale.numero_comprobante || `#${sale.id}`}`));
  parts.push(boldOff());
  parts.push(alignLeft());
  parts.push(line(`Fecha: ${formatDate(sale.created_at)}`));
  parts.push(line(`Atendido por: ${sale.cajero_nombre || sale.user?.nombre || 'Cajero'}`));
  parts.push(alignCenter());
  parts.push(line(divider));

  parts.push(alignLeft());
  parts.push(boldOn());
  parts.push(line(padTicketRow('DESCRIPCION', 'CANT', 'P.UNIT')));
  parts.push(boldOff());

  for (const item of sale.items || []) {
    const nombre = String(item.nombre || '').length > 17
      ? String(item.nombre).slice(0, 16) + '.'
      : String(item.nombre || '');
    const precio = Number(item.precio_venta_unit || 0).toFixed(2);
    const subtotal = Number(item.subtotal || 0).toFixed(2);
    parts.push(line(padTicketRow(nombre, String(item.cantidad || 0), precio)));
    parts.push(line(`    ${formatMoney(subtotal)}`));
  }

  parts.push(alignCenter());
  parts.push(line(divider));
  parts.push(alignLeft());

  parts.push(line(padAmountRow('SUBTOTAL', sale.subtotal)));
  if (Number(sale.descuento) > 0) {
    parts.push(line(padAmountRow('DESCUENTO', `-${Number(sale.descuento).toFixed(2)}`)));
  }
  parts.push(boldOn());
  parts.push(line(padAmountRow('TOTAL', sale.total)));
  parts.push(boldOff());
  parts.push(line(`Metodo: ${sale.metodo_pago || 'EFECTIVO'}`));

  if (sale.metodo_pago === 'EFECTIVO' || sale.metodoPago === 'EFECTIVO') {
    parts.push(line(padAmountRow('EFECTIVO', sale.monto_recibido)));
    parts.push(boldOn());
    parts.push(line(padAmountRow('CAMBIO', sale.cambio)));
    parts.push(boldOff());
  }

  parts.push(alignCenter());
  parts.push(line(divider));
  parts.push(feed(1));
  parts.push(line('Gracias por su preferencia!'));
  parts.push(line('Conserve su comprobante'));
  parts.push(line('La Bendicion - Siempre a su servicio'));
  parts.push(feed(PIXEL_BEFORE_CUT));
  parts.push(openDrawer());
  parts.push(alignLeft());
  parts.push(cut());

  return Buffer.concat(parts);
}
