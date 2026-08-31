import { prisma } from '../db/prisma.js';
import {
  redondear,
  calcularSubtotal,
  calcularResumenVenta,
  calcularMargenUnitario,
  generarNumeroComprobante,
} from '../utils/pos-logic.js';

export async function createSale(req, res, next) {
  try {
    const { items, descuento = 0, metodo_pago = 'EFECTIVO', monto_recibido = 0 } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El carrito de compras no contiene productos' });
    }

    const validPaymentMethods = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];
    const paymentMethod = metodo_pago.toUpperCase();
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Método de pago no válido (EFECTIVO, TARJETA, TRANSFERENCIA)' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let subtotalCalculado = 0;
      const processedItems = [];

      for (const item of items) {
        const qty = Number(item.cantidad);
        if (isNaN(qty) || qty <= 0) {
          throw new Error('INVALID_QTY');
        }

        const locked = await tx.$queryRaw`
          SELECT id, nombre, codigo_barras, precio_costo, precio_venta, stock_actual, is_active
          FROM products WHERE id = ${Number(item.product_id)} FOR UPDATE
        `;

        if (locked.length === 0) {
          throw new Error(`PRODUCT_NOT_FOUND:${item.product_id}`);
        }

        const prod = locked[0];

        if (!prod.is_active) {
          throw new Error(`PRODUCT_INACTIVE:${prod.nombre}`);
        }

        if (prod.stock_actual < qty) {
          throw new Error(`INSUFFICIENT_STOCK:${prod.nombre}:${prod.stock_actual}:${qty}`);
        }

        const precioVentaUnit = item.precio_venta_unit !== undefined ? Number(item.precio_venta_unit) : Number(prod.precio_venta);
        const precioCostoUnit = Number(prod.precio_costo);
        const lineSubtotal = redondear(precioVentaUnit * qty);
        const margenUnitario = calcularMargenUnitario(precioVentaUnit, precioCostoUnit);

        subtotalCalculado += lineSubtotal;

        processedItems.push({
          product_id: prod.id,
          nombre: prod.nombre,
          codigo_barras: prod.codigo_barras,
          cantidad: qty,
          precio_venta_unit: precioVentaUnit,
          subtotal: lineSubtotal,
          margen_unitario: margenUnitario,
        });
      }

      subtotalCalculado = calcularSubtotal(processedItems);
      const desc = redondear(Number(descuento || 0));

      if (desc < 0 || desc > subtotalCalculado) {
        throw new Error('INVALID_DISCOUNT');
      }

      const { total: totalVenta, monto_recibido: montoRec, cambio } = calcularResumenVenta(
        processedItems,
        desc,
        paymentMethod,
        monto_recibido
      );

      if (paymentMethod === 'EFECTIVO' && montoRec < totalVenta) {
        throw new Error(`INSUFFICIENT_CASH:${montoRec}:${totalVenta}`);
      }

      const sale = await tx.sale.create({
        data: {
          userId: req.user.id,
          subtotal: subtotalCalculado,
          descuento: desc,
          total: totalVenta,
          metodoPago: paymentMethod,
          montoRecibido: montoRec,
          cambio,
        },
      });

      for (const item of processedItems) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.product_id,
            cantidad: item.cantidad,
            precioVentaUnit: item.precio_venta_unit,
            subtotal: item.subtotal,
            margenUnitario: item.margen_unitario,
          },
        });

        await tx.product.update({
          where: { id: item.product_id },
          data: { stockActual: { decrement: item.cantidad } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.product_id,
            tipo: 'SALIDA',
            cantidad: -item.cantidad,
            motivo: `Venta #${sale.id}`,
            userId: req.user.id,
          },
        });
      }

      const receiptNumber = generarNumeroComprobante(sale.id);
      const receipt = await tx.receipt.create({
        data: { saleId: sale.id, numero: receiptNumber },
      });

      return {
        id: sale.id,
        numero_comprobante: receipt.numero,
        subtotal: calcularSubtotal(processedItems),
        descuento: desc,
        total: totalVenta,
        metodo_pago: paymentMethod,
        monto_recibido: montoRec,
        cambio,
        items: processedItems,
        created_at: sale.createdAt,
      };
    });

    return res.status(201).json({ mensaje: 'Venta registrada con éxito', sale: result });
  } catch (err) {
    if (typeof err.message === 'string') {
      if (err.message === 'INVALID_QTY') {
        return res.status(400).json({ error: 'Cantidad inválida para uno de los productos' });
      }
      if (err.message.startsWith('PRODUCT_NOT_FOUND:')) {
        const id = err.message.split(':')[1];
        return res.status(404).json({ error: `Producto ID ${id} no encontrado` });
      }
      if (err.message.startsWith('PRODUCT_INACTIVE:')) {
        const name = err.message.split(':')[1];
        return res.status(400).json({ error: `El producto "${name}" no está activo para venta` });
      }
      if (err.message.startsWith('INSUFFICIENT_STOCK:')) {
        const [, name, stock, qty] = err.message.split(':');
        return res.status(400).json({
          error: `Stock insuficiente para "${name}". Existencia actual: ${stock} unid., Solicitadas: ${qty} unid.`,
        });
      }
      if (err.message === 'INVALID_DISCOUNT') {
        return res.status(400).json({ error: 'El descuento no puede ser negativo ni mayor al subtotal de la venta' });
      }
      if (err.message.startsWith('INSUFFICIENT_CASH:')) {
        const [, monto, total] = err.message.split(':');
        return res.status(400).json({
          error: `Monto recibido ($${Number(monto).toFixed(2)}) es insuficiente para cubrir el total ($${Number(total).toFixed(2)})`,
        });
      }
    }
    return next(err);
  }
}

export async function getSales(req, res, next) {
  try {
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt.gte = new Date(start_date);
      if (end_date) {
        const endDate = new Date(end_date);
        endDate.setDate(endDate.getDate() + 1);
        where.createdAt.lt = endDate;
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        user: { select: { id: true, nombre: true, apellido: true, username: true } },
        receipt: { select: { numero: true } },
        _count: { select: { saleItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const result = sales.map((s) => ({
      id: s.id,
      numero_comprobante: s.receipt?.numero || null,
      subtotal: s.subtotal,
      descuento: s.descuento,
      total: s.total,
      metodo_pago: s.metodoPago,
      monto_recibido: s.montoRecibido,
      cambio: s.cambio,
      cajero_nombre: `${s.user.nombre} ${s.user.apellido}`,
      cajero_username: s.user.username,
      created_at: s.createdAt,
      total_items: s._count.saleItems,
    }));

    return res.json({ sales: result });
  } catch (err) {
    return next(err);
  }
}

export async function getSaleById(req, res, next) {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { id: true, nombre: true, apellido: true } },
        receipt: { select: { numero: true } },
        saleItems: {
          include: { product: { select: { id: true, nombre: true, codigoBarras: true } } },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const store = await prisma.storeSettings.findFirst();

    return res.json({
      sale: {
        id: sale.id,
        numero_comprobante: sale.receipt?.numero || null,
        subtotal: sale.subtotal,
        descuento: sale.descuento,
        total: sale.total,
        metodo_pago: sale.metodoPago,
        monto_recibido: sale.montoRecibido,
        cambio: sale.cambio,
        cajero_nombre: `${sale.user.nombre} ${sale.user.apellido}`,
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
