import { prisma } from '../db/prisma.js';
import { generarPronostico } from '../utils/forecast.js';

export async function getSummaryReport(req, res, next) {
  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date ? new Date(start_date) : null;
    let endDate = end_date ? new Date(end_date) : null;
    if (endDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lt = endDate;
    }

    const sql = `
      SELECT
        COUNT(DISTINCT s.id)::int AS total_transacciones,
        COALESCE(SUM(s.total), 0)::numeric(12,2) AS total_ingresos,
        COALESCE(SUM(s.descuento), 0)::numeric(12,2) AS total_descuentos,
        COALESCE(SUM(si.cantidad), 0)::int AS total_articulos_vendidos,
        COALESCE(SUM(si.margen_unitario * si.cantidad), 0)::numeric(12,2) AS ganancia_bruta_total,
        CASE
          WHEN COUNT(DISTINCT s.id) > 0 THEN
            ROUND((SUM(s.total) / COUNT(DISTINCT s.id))::numeric, 2)
          ELSE 0.00
        END AS ticket_promedio
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      ${startDate || endDate ? `WHERE ${[
        startDate ? `s.created_at >= '${startDate.toISOString()}'` : null,
        endDate ? `s.created_at < '${endDate.toISOString()}'` : null,
      ].filter(Boolean).join(' AND ')}` : ''}
    `;

    const result = await prisma.$queryRawUnsafe(sql);
    return res.json({ summary: result[0] || {} });
  } catch (err) {
    return next(err);
  }
}

export async function getDailySalesReport(req, res, next) {
  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date ? new Date(start_date) : null;
    let endDate = end_date ? new Date(end_date) : null;
    if (endDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const dateFilter = [];
    if (startDate) dateFilter.push(`s.created_at >= '${startDate.toISOString()}'`);
    if (endDate) dateFilter.push(`s.created_at < '${endDate.toISOString()}'`);
    const whereClause = dateFilter.length > 0 ? `WHERE ${dateFilter.join(' AND ')}` : '';

    const sql = `
      WITH daily_sales AS (
        SELECT
          DATE(s.created_at) AS fecha,
          COUNT(DISTINCT s.id)::int AS total_transacciones,
          SUM(s.total)::numeric(12,2) AS total_ventas,
          COALESCE(SUM(si.margen_unitario * si.cantidad), 0)::numeric(12,2) AS ganancia_bruta
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${whereClause}
        GROUP BY DATE(s.created_at)
      )
      SELECT
        fecha,
        total_transacciones,
        total_ventas,
        ganancia_bruta,
        SUM(total_ventas) OVER (ORDER BY fecha ASC) AS total_acumulado,
        SUM(ganancia_bruta) OVER (ORDER BY fecha ASC) AS ganancia_acumulada
      FROM daily_sales
      ORDER BY fecha DESC
    `;

    const result = await prisma.$queryRawUnsafe(sql);
    return res.json({ daily: result });
  } catch (err) {
    return next(err);
  }
}

export async function getMonthlySalesReport(req, res, next) {
  try {
    const { year } = req.query;

    const yearFilter = year ? `WHERE EXTRACT(YEAR FROM s.created_at) = ${Number(year)}` : '';

    const sql = `
      WITH monthly_sales AS (
        SELECT
          TO_CHAR(s.created_at, 'YYYY-MM') AS mes,
          COUNT(DISTINCT s.id)::int AS total_transacciones,
          SUM(s.total)::numeric(12,2) AS total_ventas,
          COALESCE(SUM(si.margen_unitario * si.cantidad), 0)::numeric(12,2) AS ganancia_bruta
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${yearFilter}
        GROUP BY TO_CHAR(s.created_at, 'YYYY-MM')
      )
      SELECT
        mes,
        total_transacciones,
        total_ventas,
        ganancia_bruta,
        DENSE_RANK() OVER (ORDER BY total_ventas DESC) AS ranking_volumen
      FROM monthly_sales
      ORDER BY mes DESC
    `;

    const result = await prisma.$queryRawUnsafe(sql);
    return res.json({ monthly: result });
  } catch (err) {
    return next(err);
  }
}

export async function getTopSellingProducts(req, res, next) {
  try {
    const { limit = 10, start_date, end_date } = req.query;

    const startDate = start_date ? new Date(start_date) : null;
    let endDate = end_date ? new Date(end_date) : null;
    if (endDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const dateFilter = [];
    if (startDate) dateFilter.push(`s.created_at >= '${startDate.toISOString()}'`);
    if (endDate) dateFilter.push(`s.created_at < '${endDate.toISOString()}'`);
    const whereClause = dateFilter.length > 0 ? `WHERE ${dateFilter.join(' AND ')}` : '';

    const sql = `
      WITH top_products AS (
        SELECT
          p.id,
          p.nombre,
          p.codigo_barras,
          c.nombre AS categoria_nombre,
          SUM(si.cantidad)::int AS unidades_vendidas,
          SUM(si.subtotal)::numeric(12,2) AS total_recaudado,
          SUM(si.margen_unitario * si.cantidad)::numeric(12,2) AS ganancia_generada
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        LEFT JOIN categories c ON p.categoria_id = c.id
        ${whereClause}
        GROUP BY p.id, p.nombre, p.codigo_barras, c.nombre
      )
      SELECT
        id,
        nombre,
        codigo_barras,
        categoria_nombre,
        unidades_vendidas,
        total_recaudado,
        ganancia_generada,
        DENSE_RANK() OVER (ORDER BY unidades_vendidas DESC) AS ranking
      FROM top_products
      ORDER BY unidades_vendidas DESC, total_recaudado DESC
      LIMIT ${Number(limit)}
    `;

    const result = await prisma.$queryRawUnsafe(sql);
    return res.json({ topProducts: result });
  } catch (err) {
    return next(err);
  }
}

export async function getInventoryReport(_req, res, next) {
  try {
    const sql = `
      SELECT
        COALESCE(c.nombre, 'Sin Categoría') AS categoria,
        COUNT(p.id)::int AS cantidad_productos,
        COALESCE(SUM(p.stock_actual), 0)::int AS unidades_en_stock,
        COALESCE(SUM(p.stock_actual * p.precio_costo), 0)::numeric(12,2) AS inversion_costo_total,
        COALESCE(SUM(p.stock_actual * p.precio_venta), 0)::numeric(12,2) AS valor_venta_estimado,
        COALESCE(SUM(p.stock_actual * (p.precio_venta - p.precio_costo)), 0)::numeric(12,2) AS ganancia_potencial,
        COUNT(CASE WHEN p.stock_actual <= p.stock_minimo THEN 1 END)::int AS productos_stock_bajo
      FROM products p
      LEFT JOIN categories c ON p.categoria_id = c.id
      WHERE p.is_active = TRUE
      GROUP BY c.nombre
      ORDER BY inversion_costo_total DESC
    `;

    const result = await prisma.$queryRawUnsafe(sql);
    return res.json({ inventoryByCategory: result });
  } catch (err) {
    return next(err);
  }
}

// Pronóstico de reabastecimiento: demanda estimada y agotamiento por producto
export async function getForecastReport(req, res, next) {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);

    const sql = `
      SELECT
        p.id,
        p.nombre,
        p.codigo_barras,
        c.nombre AS categoria_nombre,
        COALESCE(SUM(si.cantidad), 0)::numeric AS unidades_vendidas,
        p.stock_actual,
        p.stock_minimo
      FROM products p
      LEFT JOIN sale_items si
        ON si.product_id = p.id
        AND si.sale_id IN (
          SELECT id FROM sales
          WHERE created_at >= now() - interval '${days} days'
        )
      LEFT JOIN categories c ON p.categoria_id = c.id
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.nombre, p.codigo_barras, c.nombre, p.stock_actual, p.stock_minimo
      ORDER BY p.nombre ASC
    `;

    const rows = await prisma.$queryRawUnsafe(sql);
    const forecast = generarPronostico(rows, days);
    const urgencia = {
      SIN_DEMANDA: forecast.filter((f) => f.estado === 'SIN_DEMANDA').length,
      AGOTADO: forecast.filter((f) => f.estado === 'AGOTADO').length,
      URGENTE: forecast.filter((f) => f.estado === 'URGENTE').length,
      PRONTO: forecast.filter((f) => f.estado === 'PRONTO').length,
      OK: forecast.filter((f) => f.estado === 'OK').length,
    };
    return res.json({ days, forecast, urgencia });
  } catch (err) {
    return next(err);
  }
}
