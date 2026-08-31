import { prisma } from '../db/prisma.js';

export async function getStoreSettings(_req, res, next) {
  try {
    let store = await prisma.storeSettings.findFirst();
    if (!store) {
      store = await prisma.storeSettings.create({
        data: {
          nombre: 'Tienda La Bendición',
          direccion: 'Barrio El Centro, calle principal #12',
          telefono: '+503 7000-0000',
        },
      });
    }
    return res.json({
      store: {
        id: store.id,
        nombre: store.nombre,
        direccion: store.direccion,
        telefono: store.telefono,
        logo_url: store.logoUrl,
        updated_at: store.updatedAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateStoreSettings(req, res, next) {
  try {
    const { nombre, direccion, telefono, logo_url } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la tienda es obligatorio' });
    }

    const existing = await prisma.storeSettings.findFirst();
    let store;

    if (!existing) {
      store = await prisma.storeSettings.create({
        data: {
          nombre: nombre.trim(),
          direccion: direccion?.trim() || '',
          telefono: telefono?.trim() || '',
          logoUrl: logo_url?.trim() || null,
        },
      });
    } else {
      store = await prisma.storeSettings.update({
        where: { id: existing.id },
        data: {
          nombre: nombre.trim(),
          direccion: direccion?.trim() || '',
          telefono: telefono?.trim() || '',
          logoUrl: logo_url?.trim() || null,
        },
      });
    }

    return res.json({
      mensaje: 'Datos de la tienda actualizados exitosamente',
      store: {
        id: store.id,
        nombre: store.nombre,
        direccion: store.direccion,
        telefono: store.telefono,
        logo_url: store.logoUrl,
        updated_at: store.updatedAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function exportDatabaseBackup(_req, res, next) {
  try {
    const [storeRes, rolesRes, empRes, catRes, prodRes, movRes, salesRes, itemsRes, receiptsRes] =
      await Promise.all([
        prisma.storeSettings.findMany({ select: { id: true, nombre: true, direccion: true, telefono: true, logoUrl: true } }),
        prisma.role.findMany({ select: { id: true, nombre: true, descripcion: true } }),
        prisma.employee.findMany({ select: { id: true, rolId: true, nombre: true, apellido: true, cedula: true, telefono: true, username: true, isActive: true, createdAt: true } }),
        prisma.category.findMany({ select: { id: true, nombre: true, descripcion: true } }),
        prisma.product.findMany({ select: { id: true, categoriaId: true, codigoBarras: true, nombre: true, descripcion: true, precioCosto: true, precioVenta: true, stockMinimo: true, stockActual: true, isActive: true, createdAt: true } }),
        prisma.stockMovement.findMany({ select: { id: true, productId: true, tipo: true, cantidad: true, motivo: true, userId: true, createdAt: true } }),
        prisma.sale.findMany({ select: { id: true, userId: true, subtotal: true, descuento: true, total: true, metodoPago: true, montoRecibido: true, cambio: true, createdAt: true } }),
        prisma.saleItem.findMany({ select: { id: true, saleId: true, productId: true, cantidad: true, precioVentaUnit: true, subtotal: true, margenUnitario: true } }),
        prisma.receipt.findMany({ select: { id: true, saleId: true, numero: true, createdAt: true } }),
      ]);

    const backupData = {
      sistema: 'La Bendición - POS & Gestión',
      version: '1.0.0',
      fecha_respaldo: new Date().toISOString(),
      datos: {
        store_settings: storeRes,
        roles: rolesRes,
        employees: empRes,
        categories: catRes,
        products: prodRes,
        stock_movements: movRes,
        sales: salesRes,
        sale_items: itemsRes,
        receipts: receiptsRes,
      },
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-labendicion-${timestamp}.json"`);

    return res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    return next(err);
  }
}

export async function getSystemInfo(_req, res, next) {
  try {
    const [productsCount, employeesCount, salesCount] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.employee.count({ where: { isActive: true } }),
      prisma.sale.count(),
    ]);

    return res.json({
      system: {
        estado_bd: 'Conectado (PostgreSQL)',
        servidor: 'Node.js Express API',
        uptime_segundos: Math.floor(process.uptime()),
        productos_activos: productsCount,
        empleados_activos: employeesCount,
        ventas_totales_historicas: salesCount,
      },
    });
  } catch (err) {
    return next(err);
  }
}
