import { prisma } from '../db/prisma.js';

export async function getInventoryOverview(_req, res, next) {
  try {
    const result = await prisma.product.aggregate({
      where: { isActive: true },
      _count: { id: true },
      _sum: { stockActual: true, precioCosto: true, precioVenta: true },
    });

    const lowStockCount = await prisma.product.count({
      where: { isActive: true, stockActual: { lte: prisma.product.fields?.stockMinimo } },
    });

    let alertas_stock_bajo;
    try {
      const raw = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM products
        WHERE is_active = TRUE AND stock_actual <= stock_minimo
      `;
      alertas_stock_bajo = raw[0]?.count || 0;
    } catch {
      alertas_stock_bajo = 0;
    }

    const totalProductos = result._count.id || 0;
    const unidadesTotales = Number(result._sum.stockActual) || 0;
    const valorTotalCosto = Number(result._sum.precioCosto) || 0;
    const valorTotalVenta = Number(result._sum.precioVenta) || 0;

    return res.json({
      resumen: {
        total_productos: totalProductos,
        unidades_totales: unidadesTotales,
        valor_total_costo: valorTotalCosto,
        valor_total_venta: valorTotalVenta,
        alertas_stock_bajo: alertas_stock_bajo,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getLowStockProducts(_req, res, next) {
  try {
    const products = await prisma.$queryRaw`
      SELECT
        p.id, p.categoria_id, c.nombre AS categoria_nombre,
        p.codigo_barras, p.nombre,
        p.precio_costo::numeric,
        p.precio_venta::numeric,
        p.stock_minimo, p.stock_actual,
        (p.stock_minimo - p.stock_actual) AS unidades_faltantes
      FROM products p
      LEFT JOIN categories c ON p.categoria_id = c.id
      WHERE p.stock_actual <= p.stock_minimo AND p.is_active = TRUE
      ORDER BY (p.stock_actual - p.stock_minimo) ASC, p.nombre ASC
    `;

    return res.json({ total: products.length, products });
  } catch (err) {
    return next(err);
  }
}

export async function registerStockEntry(req, res, next) {
  try {
    const { product_id, cantidad, motivo = 'Recepción de mercadería' } = req.body;

    const qty = Number(cantidad);
    if (!product_id || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Producto y cantidad válida mayor a 0 son obligatorios' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw`
        SELECT id, nombre, stock_actual, is_active
        FROM products WHERE id = ${Number(product_id)} FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      const product = locked[0];
      if (!product.is_active) {
        throw new Error('PRODUCT_INACTIVE');
      }

      const updated = await tx.product.update({
        where: { id: Number(product_id) },
        data: { stockActual: { increment: qty } },
      });

      await tx.stockMovement.create({
        data: {
          productId: Number(product_id),
          tipo: 'ENTRADA',
          cantidad: qty,
          motivo: motivo.trim(),
          userId: req.user?.id || null,
        },
      });

      return { id: updated.id, nombre: updated.nombre, stock_actual: updated.stockActual };
    });

    return res.status(201).json({
      mensaje: `Se registraron ${qty} unidades en "${result.nombre}" con éxito`,
      product: result,
    });
  } catch (err) {
    if (err.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    if (err.message === 'PRODUCT_INACTIVE') {
      return res.status(400).json({ error: 'No se pueden registrar movimientos en un producto inactivo' });
    }
    return next(err);
  }
}

export async function registerStockAdjustment(req, res, next) {
  try {
    const { product_id, tipo_operacion = 'SUMAR', cantidad, motivo } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'El ID del producto es obligatorio' });
    }

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ error: 'El motivo del ajuste es obligatorio (ej. merma, conteo físico, daño, etc.)' });
    }

    const qty = Number(cantidad);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'La cantidad del ajuste debe ser un número positivo' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw`
        SELECT id, nombre, stock_actual, is_active
        FROM products WHERE id = ${Number(product_id)} FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      const product = locked[0];
      let delta = 0;

      if (tipo_operacion === 'SUMAR') {
        delta = qty;
      } else if (tipo_operacion === 'RESTAR') {
        delta = -qty;
      } else if (tipo_operacion === 'FIJAR') {
        delta = qty - product.stock_actual;
      } else {
        throw new Error('INVALID_OPERATION');
      }

      if (product.stock_actual + delta < 0) {
        throw new Error('NEGATIVE_STOCK');
      }

      const updated = await tx.product.update({
        where: { id: Number(product_id) },
        data: { stockActual: { increment: delta } },
      });

      await tx.stockMovement.create({
        data: {
          productId: Number(product_id),
          tipo: 'AJUSTE',
          cantidad: delta,
          motivo: motivo.trim(),
          userId: req.user?.id || null,
        },
      });

      return { id: updated.id, nombre: updated.nombre, stock_actual: updated.stockActual };
    });

    return res.status(201).json({
      mensaje: `Ajuste de inventario aplicado a "${result.nombre}". Nuevo stock: ${result.stock_actual}`,
      product: result,
    });
  } catch (err) {
    if (err.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    if (err.message === 'INVALID_OPERATION') {
      return res.status(400).json({ error: 'Tipo de operación inválido (SUMAR, RESTAR o FIJAR)' });
    }
    if (err.message === 'NEGATIVE_STOCK') {
      return res.status(400).json({ error: `El ajuste resultaría en stock negativo.` });
    }
    return next(err);
  }
}

export async function getProductStockHistory(req, res, next) {
  try {
    const { productId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const where = {};
    if (productId) where.productId = Number(productId);

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, nombre: true, codigoBarras: true } },
        user: { select: { id: true, nombre: true, apellido: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const result = movements.map((m) => ({
      id: m.id,
      product_id: m.productId,
      product_nombre: m.product.nombre,
      codigo_barras: m.product.codigoBarras,
      tipo: m.tipo,
      cantidad: m.cantidad,
      motivo: m.motivo,
      user_id: m.userId,
      user_nombre: m.user ? `${m.user.nombre} ${m.user.apellido}` : null,
      username: m.user?.username || null,
      created_at: m.createdAt,
    }));

    return res.json({ movements: result });
  } catch (err) {
    return next(err);
  }
}
