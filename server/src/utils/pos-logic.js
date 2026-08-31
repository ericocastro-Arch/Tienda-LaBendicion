export function redondear(value) {
  return Number(Number(value).toFixed(2));
}

export function calcularSubtotal(items) {
  return redondear(
    (Array.isArray(items) ? items : []).reduce(
      (sum, item) => sum + Number(item.cantidad) * Number(item.precio_venta_unit || 0),
      0
    )
  );
}

export function calcularTotal(subtotal, descuento) {
  const sub = redondear(subtotal);
  const desc = redondear(Number(descuento || 0));
  if (desc < 0) return sub;
  return redondear(Math.max(0, sub - desc));
}

export function calcularCambio(montoRecibido, total) {
  return redondear(Math.max(0, Number(montoRecibido || 0) - Number(total || 0)));
}

export function calcularMargenUnitario(precioVenta, precioCosto) {
  return redondear(Number(precioVenta || 0) - Number(precioCosto || 0));
}

export function calcularPorcentajeMargen(precioVenta, precioCosto) {
  const costo = Number(precioCosto || 0);
  if (costo <= 0) return 100;
  return redondear(((Number(precioVenta || 0) - costo) / costo) * 100);
}

export function calcularTotalLinea(cantidad, precioVentaUnit) {
  return redondear(Number(cantidad || 0) * Number(precioVentaUnit || 0));
}

export function validarStockDisponible(stockActual, cantidad) {
  return redondear(Number(stockActual || 0)) >= Number(cantidad || 0);
}

export function esMetodoPagoValido(metodo) {
  return ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].includes(String(metodo || '').toUpperCase());
}

export function generarNumeroComprobante(saleId) {
  return `TICK-${String(Number(saleId) || 0).padStart(6, '0')}`;
}

export function calcularResumenVenta(items, descuento, metodoPago, montoRecibido) {
  const subtotal = calcularSubtotal(items);
  const desc = redondear(Number(descuento || 0));
  const total = calcularTotal(subtotal, desc);
  const esEfectivo = String(metodoPago || '').toUpperCase() === 'EFECTIVO';
  const efectivoRecibido = esEfectivo ? redondear(Number(montoRecibido || 0)) : total;
  const cambio = calcularCambio(efectivoRecibido, total);
  return { subtotal, descuento: desc, total, monto_recibido: efectivoRecibido, cambio };
}
