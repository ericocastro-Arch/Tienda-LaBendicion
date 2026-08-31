import { prisma } from '../db/prisma.js';
import { buildTicket } from '../utils/escpos.js';

async function loadSaleWithDetails(saleId) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      user: true,
      receipt: true,
      saleItems: { include: { product: true }, orderBy: { id: 'asc' } },
    },
  });
  if (!sale) return null;

  const store = await prisma.storeSettings.findFirst();

  return {
    sale: {
      id: sale.id,
      numero_comprobante: sale.receipt?.numero || null,
      subtotal: sale.subtotal,
      descuento: sale.descuento,
      total: sale.total,
      metodo_pago: sale.metodoPago,
      monto_recibido: sale.montoRecibido,
      cambio: sale.cambio,
      cajero_nombre: sale.user ? `${sale.user.nombre} ${sale.user.apellido}` : null,
      user: { nombre: sale.user?.nombre || 'Cajero' },
      created_at: sale.createdAt,
      items: sale.saleItems.map((si) => ({
        nombre: si.product.nombre,
        cantidad: si.cantidad,
        precio_venta_unit: si.precioVentaUnit,
        subtotal: si.subtotal,
      })),
    },
    store: store
      ? { nombre: store.nombre, direccion: store.direccion, telefono: store.telefono }
      : { nombre: 'Tienda La Bendición', direccion: 'Barrio El Centro', telefono: '+503 7000-0000' },
  };
}

export async function getReceiptEscPos(req, res, next) {
  try {
    const saleId = Number(req.params.saleId);
    const data = await loadSaleWithDetails(saleId);

    if (!data) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    const buffer = buildTicket(data);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="ticket-${data.sale.numero_comprobante || data.sale.id}.bin"`);
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
}

export async function getReceiptDetails(req, res, next) {
  try {
    const saleId = Number(req.params.saleId);

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        user: true,
        receipt: true,
        saleItems: { include: { product: true }, orderBy: { id: 'asc' } },
      },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Comprobante no encontrado para la venta especificada' });
    }

    const store = await prisma.storeSettings.findFirst();

    return res.json({
      receipt: {
        id: sale.id,
        numero_comprobante: sale.receipt?.numero || null,
        subtotal: sale.subtotal,
        descuento: sale.descuento,
        total: sale.total,
        metodo_pago: sale.metodoPago,
        monto_recibido: sale.montoRecibido,
        cambio: sale.cambio,
        cajero_nombre: sale.user ? `${sale.user.nombre} ${sale.user.apellido}` : null,
        created_at: sale.createdAt,
        items: sale.saleItems.map((si) => ({
          id: si.id,
          product_id: si.productId,
          nombre: si.product.nombre,
          codigo_barras: si.product.codigoBarras,
          cantidad: si.cantidad,
          precio_venta_unit: si.precioVentaUnit,
          subtotal: si.subtotal,
        })),
        tienda: store
          ? { nombre: store.nombre, direccion: store.direccion, telefono: store.telefono, logo_url: store.logoUrl }
          : { nombre: 'Tienda La Bendición', direccion: 'Barrio El Centro', telefono: '+503 7000-0000' },
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getReceiptPdf(req, res, next) {
  try {
    const PDFDocument = (await import('pdfkit')).default;
    const saleId = Number(req.params.saleId);

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        user: true,
        receipt: true,
        saleItems: { include: { product: true }, orderBy: { id: 'asc' } },
      },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    const store = await prisma.storeSettings.findFirst();
    const storeData = store
      ? { nombre: store.nombre, direccion: store.direccion, telefono: store.telefono }
      : { nombre: 'Tienda La Bendición', direccion: 'Barrio El Centro, Calle Principal #12', telefono: '+503 7000-0000' };

    const items = sale.saleItems.map((si) => ({
      nombre: si.product.nombre,
      cantidad: si.cantidad,
      precio_venta_unit: si.precioVentaUnit,
      subtotal: si.subtotal,
    }));

    const baseHeight = 280;
    const dynamicHeight = Math.max(380, baseHeight + items.length * 24);

    const doc = new PDFDocument({
      size: [226, dynamicHeight],
      margins: { top: 12, bottom: 12, left: 12, right: 12 },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="comprobante-${sale.receipt?.numero || sale.id}.pdf"`
    );

    doc.pipe(res);

    doc.fontSize(12).font('Helvetica-Bold').text(storeData.nombre.toUpperCase(), { align: 'center' });
    doc.fontSize(7).font('Helvetica').text(storeData.direccion, { align: 'center' });
    doc.text(`Tel: ${storeData.telefono}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.text('----------------------------------------------------', { align: 'center' });
    doc.moveDown(0.2);

    doc.fontSize(8).font('Helvetica-Bold').text(`TICKET: ${sale.receipt?.numero || '#' + sale.id}`, { align: 'center' });
    doc.fontSize(7).font('Helvetica');
    doc.text(`Fecha: ${new Date(sale.createdAt).toLocaleString()}`);
    doc.text(`Atendido por: ${sale.user ? `${sale.user.nombre} ${sale.user.apellido}` : 'Cajero'}`);
    doc.moveDown(0.3);
    doc.text('----------------------------------------------------', { align: 'center' });
    doc.moveDown(0.2);

    doc.font('Helvetica-Bold').fontSize(7);
    doc.text('DESCRIPCION', 12, doc.y, { width: 100 });
    const yHeader = doc.y - 8;
    doc.text('CANT', 115, yHeader, { width: 25, align: 'right' });
    doc.text('P.UNIT', 145, yHeader, { width: 30, align: 'right' });
    doc.text('TOTAL', 180, yHeader, { width: 34, align: 'right' });
    doc.moveDown(0.2);
    doc.text('----------------------------------------------------', 12, doc.y, { align: 'center' });
    doc.moveDown(0.2);

    doc.font('Helvetica').fontSize(7);
    items.forEach((item) => {
      const yRow = doc.y;
      doc.text(item.nombre.length > 20 ? item.nombre.substring(0, 19) + '...' : item.nombre, 12, yRow, { width: 100 });
      doc.text(`${item.cantidad}`, 115, yRow, { width: 25, align: 'right' });
      doc.text(`$${parseFloat(item.precio_venta_unit).toFixed(2)}`, 145, yRow, { width: 30, align: 'right' });
      doc.text(`$${parseFloat(item.subtotal).toFixed(2)}`, 180, yRow, { width: 34, align: 'right' });
      doc.moveDown(0.2);
    });

    doc.text('----------------------------------------------------', 12, doc.y, { align: 'center' });
    doc.moveDown(0.3);

    const yTotals = doc.y;
    doc.font('Helvetica').fontSize(7.5);
    doc.text('Subtotal:', 90, yTotals, { width: 60, align: 'right' });
    doc.text(`$${parseFloat(sale.subtotal).toFixed(2)}`, 155, yTotals, { width: 59, align: 'right' });
    doc.moveDown(0.2);

    if (parseFloat(sale.descuento) > 0) {
      const yDesc = doc.y;
      doc.text('Descuento:', 90, yDesc, { width: 60, align: 'right' });
      doc.text(`-$${parseFloat(sale.descuento).toFixed(2)}`, 155, yDesc, { width: 59, align: 'right' });
      doc.moveDown(0.2);
    }

    const yTotal = doc.y;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('TOTAL:', 90, yTotal, { width: 60, align: 'right' });
    doc.text(`$${parseFloat(sale.total).toFixed(2)}`, 155, yTotal, { width: 59, align: 'right' });
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(7);
    const yMetodo = doc.y;
    doc.text('Método de Pago:', 60, yMetodo, { width: 90, align: 'right' });
    doc.text(`${sale.metodoPago}`, 155, yMetodo, { width: 59, align: 'right' });
    doc.moveDown(0.2);

    if (sale.metodoPago === 'EFECTIVO') {
      const yRec = doc.y;
      doc.text('Efectivo Recibido:', 60, yRec, { width: 90, align: 'right' });
      doc.text(`$${parseFloat(sale.montoRecibido).toFixed(2)}`, 155, yRec, { width: 59, align: 'right' });
      doc.moveDown(0.2);

      const yCambio = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('Cambio / Vuelto:', 60, yCambio, { width: 90, align: 'right' });
      doc.text(`$${parseFloat(sale.cambio).toFixed(2)}`, 155, yCambio, { width: 59, align: 'right' });
      doc.moveDown(0.3);
    }

    doc.text('----------------------------------------------------', 12, doc.y, { align: 'center' });
    doc.moveDown(0.4);

    doc.font('Helvetica-Oblique').fontSize(7.5).text('¡Gracias por su preferencia!', { align: 'center' });
    doc.fontSize(6.5).font('Helvetica').text('Conserve este comprobante para cualquier reclamo.', { align: 'center' });
    doc.text('La Bendición — Siempre a su servicio', { align: 'center' });

    doc.end();
  } catch (err) {
    return next(err);
  }
}
