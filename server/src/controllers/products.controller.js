import { prisma } from '../db/prisma.js';

export async function getCategories(_req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: { where: { isActive: true } } } } },
      orderBy: { nombre: 'asc' },
    });

    const result = categories.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion,
      total_productos: c._count.products,
    }));

    return res.json({ categories: result });
  } catch (err) {
    return next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }

    const existing = await prisma.category.findFirst({
      where: { nombre: { equals: nombre.trim(), mode: 'insensitive' } },
    });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
    }

    const category = await prisma.category.create({
      data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || '' },
    });

    return res.status(201).json({ mensaje: 'Categoría creada con éxito', category });
  } catch (err) {
    return next(err);
  }
}

export async function getProducts(req, res, next) {
  try {
    const { search, categoria_id, active } = req.query;

    const where = { isActive: true };
    if (active === 'true') where.isActive = true;
    else if (active === 'false') where.isActive = false;
    else if (active && active !== 'ALL') where.isActive = true;

    if (search && search.trim()) {
      where.OR = [
        { nombre: { contains: search.trim(), mode: 'insensitive' } },
        { codigoBarras: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (categoria_id) {
      where.categoriaId = Number(categoria_id);
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { nombre: 'asc' },
    });

    const result = products.map((p) => ({
      id: p.id,
      categoria_id: p.categoriaId,
      categoria_nombre: p.category?.nombre || null,
      codigo_barras: p.codigoBarras,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio_costo: p.precioCosto,
      precio_venta: p.precioVenta,
      margen_ganancia: Number(p.precioVenta) - Number(p.precioCosto),
      porcentaje_margen:
        Number(p.precioCosto) > 0
          ? Math.round((((Number(p.precioVenta) - Number(p.precioCosto)) / Number(p.precioCosto)) * 100) * 100) / 100
          : 100.0,
      stock_minimo: p.stockMinimo,
      stock_actual: p.stockActual,
      is_stock_low: p.stockActual <= p.stockMinimo,
      is_active: p.isActive,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }));

    return res.json({ products: result });
  } catch (err) {
    return next(err);
  }
}

export async function getProductByBarcode(req, res, next) {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ error: 'Código de barras no proporcionado' });
    }

    const product = await prisma.product.findFirst({
      where: { codigoBarras: code.trim(), isActive: true },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado con ese código de barras' });
    }

    return res.json({
      product: {
        id: product.id,
        categoria_id: product.categoriaId,
        categoria_nombre: product.category?.nombre || null,
        codigo_barras: product.codigoBarras,
        nombre: product.nombre,
        descripcion: product.descripcion,
        precio_costo: product.precioCosto,
        precio_venta: product.precioVenta,
        margen_ganancia: Number(product.precioVenta) - Number(product.precioCosto),
        stock_minimo: product.stockMinimo,
        stock_actual: product.stockActual,
        is_active: product.isActive,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const {
      categoria_id,
      codigo_barras,
      nombre,
      descripcion,
      precio_costo,
      precio_venta,
      stock_minimo = 0,
      stock_actual = 0,
    } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }

    const costo = Number(precio_costo);
    const venta = Number(precio_venta);

    if (isNaN(costo) || costo < 0 || isNaN(venta) || venta < 0) {
      return res.status(400).json({ error: 'El precio de costo y venta deben ser valores numéricos válidos mayores o iguales a 0' });
    }

    if (codigo_barras && codigo_barras.trim()) {
      const existing = await prisma.product.findFirst({
        where: { codigoBarras: codigo_barras.trim() },
      });
      if (existing) {
        return res.status(409).json({ error: 'El código de barras ya está registrado en otro producto' });
      }
    }

    const initStock = Number(stock_actual);

    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          categoriaId: categoria_id ? Number(categoria_id) : null,
          codigoBarras: codigo_barras?.trim() || null,
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          precioCosto: costo,
          precioVenta: venta,
          stockMinimo: Number(stock_minimo),
          stockActual: initStock,
        },
      });

      if (initStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            tipo: 'ENTRADA',
            cantidad: initStock,
            motivo: 'Inventario inicial al registrar producto',
            userId: req.user?.id || null,
          },
        });
      }

      return product;
    });

    return res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      product: newProduct,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const {
      categoria_id,
      codigo_barras,
      nombre,
      descripcion,
      precio_costo,
      precio_venta,
      stock_minimo,
    } = req.body;

    const current = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!current) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (codigo_barras && codigo_barras.trim()) {
      const existing = await prisma.product.findFirst({
        where: { codigoBarras: codigo_barras.trim(), id: { not: Number(id) } },
      });
      if (existing) {
        return res.status(409).json({ error: 'El código de barras ya está registrado en otro producto' });
      }
    }

    const data = {};
    if (categoria_id !== undefined) data.categoriaId = categoria_id ? Number(categoria_id) : null;
    if (codigo_barras !== undefined) data.codigoBarras = codigo_barras?.trim() || null;
    if (nombre) data.nombre = nombre.trim();
    if (descripcion !== undefined) data.descripcion = descripcion?.trim() || null;
    if (precio_costo !== undefined) data.precioCosto = Number(precio_costo);
    if (precio_venta !== undefined) data.precioVenta = Number(precio_venta);
    if (stock_minimo !== undefined) data.stockMinimo = Number(stock_minimo);

    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data,
    });

    return res.json({ mensaje: 'Producto actualizado con éxito', product: updated });
  } catch (err) {
    return next(err);
  }
}

export async function toggleProductStatus(req, res, next) {
  try {
    const { id } = req.params;

    const current = await prisma.product.findUnique({
      where: { id: Number(id) },
      select: { id: true, nombre: true, isActive: true },
    });
    if (!current) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data: { isActive: !current.isActive },
    });

    return res.json({
      mensaje: updated.isActive ? 'Producto reactivado con éxito' : 'Producto desactivado con éxito (Soft Delete)',
      product: { id: updated.id, nombre: updated.nombre, is_active: updated.isActive },
    });
  } catch (err) {
    return next(err);
  }
}
