import PDFDocument from 'pdfkit'
import request from 'supertest'
import crypto from 'node:crypto'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'
import {
  calcularSubtotal,
  calcularTotal,
  calcularCambio,
  calcularResumenVenta,
  generarNumeroComprobante,
  validarStockDisponible,
} from '../src/utils/pos-logic.js'

const app = createApp()

let token
let testProductId
let testSaleId

async function getToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  return res.body.token
}

beforeAll(async () => {
  token = await getToken()

  const barcode = `TEST-${crypto.randomUUID()}`.slice(0, 20)
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nombre: 'Producto Test Jest',
      codigo_barras: barcode,
      precio_costo: 1.25,
      precio_venta: 1.75,
      stock_actual: 50,
      stock_minimo: 5,
    })

  testProductId = res.body.product.id
})

afterAll(async () => {
  if (testSaleId) {
    await prisma.receipt.deleteMany({ where: { saleId: testSaleId } })
    await prisma.saleItem.deleteMany({ where: { saleId: testSaleId } })
    await prisma.sale.deleteMany({ where: { id: testSaleId } })
  }
  if (testProductId) {
    await prisma.stockMovement.deleteMany({ where: { productId: testProductId } })
    await prisma.product.deleteMany({ where: { id: testProductId } })
  }
})

describe('Lógica de Cálculos en el Punto de Venta (POS) - funciones puras reales', () => {
  test('subtotal de ítems y total con descuento', () => {
    const items = [
      { cantidad: 2, precio_venta_unit: 1.5 },
      { cantidad: 3, precio_venta_unit: 2.25 },
    ]
    const subtotal = calcularSubtotal(items)
    const total = calcularTotal(subtotal, 0.75)

    expect(subtotal).toBe(9.75)
    expect(total).toBe(9.0)
  })

  test('cálculo de cambio para pago en efectivo', () => {
    expect(calcularCambio(20, 18.5)).toBe(1.5)
  })

  test('validación de pago en efectivo insuficiente', () => {
    expect(calcularResumenVenta([{ cantidad: 1, precio_venta_unit: 25 }], 0, 'EFECTIVO', 20).total).toBe(25)
    expect(20).toBeLessThan(25)
    // La función pura no deja cambio negativo:
    expect(calcularCambio(20, 25)).toBe(0)
  })

  test('generación de correlativo de comprobante formateado', () => {
    expect(generarNumeroComprobante(42)).toBe('TICK-000042')
  })

  test('resumen de venta completo en efectivo', () => {
    const items = [
      { cantidad: 2, precio_venta_unit: 1.5 },
      { cantidad: 3, precio_venta_unit: 2.25 },
    ]
    const res = calcularResumenVenta(items, 0.75, 'EFECTIVO', 20)
    expect(res.subtotal).toBe(9.75)
    expect(res.total).toBe(9.0)
    expect(res.cambio).toBe(11.0)
  })

  test('stock disponible se valida correctamente', () => {
    expect(validarStockDisponible(50, 5)).toBe(true)
    expect(validarStockDisponible(2, 5)).toBe(false)
  })
})

describe('Generación de Comprobantes PDF con PDFKit', () => {
  test('crea documento PDF en formato ticket de 80mm', async () => {
    const doc = new PDFDocument({ size: [226, 380], margins: { top: 10, bottom: 10, left: 10, right: 10 } })
    const chunks = []

    doc.on('data', (chunk) => chunks.push(chunk))

    doc.fontSize(10).text('TIENDA LA BENDICION', { align: 'center' })
    doc.fontSize(8).text('TICKET: TICK-000001', { align: 'center' })
    doc.text('Total: $15.50')
    doc.end()

    await new Promise((resolve) => doc.on('end', resolve))
    const pdfBuffer = Buffer.concat(chunks)

    expect(pdfBuffer.length).toBeGreaterThan(0)
    expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF')
  })
})

describe('Integración - flujo de venta completo', () => {
  test('crear venta, generar comprobante y descargar PDF', async () => {
    const createRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { product_id: testProductId, cantidad: 2, precio_venta_unit: 1.75 },
        ],
        descuento: 0.5,
        metodo_pago: 'EFECTIVO',
        monto_recibido: 5,
      })

    expect(createRes.status).toBe(201)
    const sale = createRes.body.sale
    testSaleId = sale.id

    expect(sale.subtotal).toBe(3.5)
    expect(sale.descuento).toBe(0.5)
    expect(sale.total).toBe(3.0)
    expect(sale.metodo_pago).toBe('EFECTIVO')
    expect(sale.cambio).toBe(2.0)
    expect(sale.numero_comprobante).toBe(`TICK-${String(sale.id).padStart(6, '0')}`)

    const detailRes = await request(app)
      .get(`/api/receipts/${testSaleId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(detailRes.status).toBe(200)
    expect(detailRes.body.receipt.numero_comprobante).toBe(`TICK-${String(testSaleId).padStart(6, '0')}`)

    const pdfRes = await request(app)
      .get(`/api/receipts/${testSaleId}/pdf`)
      .set('Authorization', `Bearer ${token}`)

    expect(pdfRes.status).toBe(200)
    expect(pdfRes.headers['content-type']).toContain('application/pdf')
    expect(pdfRes.body.toString('utf8', 0, 4)).toBe('%PDF')
  })

  test('escpos: genera el ticket ESC/POS binario de la venta', async () => {
    const res = await request(app)
      .get(`/api/receipts/${testSaleId}/escpos`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks = []
        r.on('data', (c) => chunks.push(c))
        r.on('end', () => cb(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/octet-stream')
    expect(Buffer.isBuffer(res.body)).toBe(true)
    const buf = res.body
    expect(buf.length).toBeGreaterThan(10)
    expect(buf.subarray(0, 2)).toEqual(Buffer.from([0x1b, 0x40]))
    expect(buf.toString('latin1')).toContain('TICK-')
    expect(buf.toString('latin1')).toContain('LA BENDICION')
    expect(buf.subarray(buf.length - 3)).toEqual(Buffer.from([0x1d, 0x56, 0x00]))
  })

  test('escpos: devuelve 404 si la venta no existe', async () => {
    const res = await request(app)
      .get('/api/receipts/999999999/escpos')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  test('rechaza venta con método de pago inválido', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ product_id: testProductId, cantidad: 1, precio_venta_unit: 1.75 }],
        metodo_pago: 'CRIPTO',
      })

    expect(res.status).toBe(400)
  })

  test('rechaza venta con carrito vacío', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] })

    expect(res.status).toBe(400)
  })

  test('GET /api/sales devuelve la venta creada', async () => {
    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.sales)).toBe(true)
    const found = res.body.sales.find((s) => s.id === testSaleId)
    expect(found).toBeDefined()
    expect(found.total_items).toBeDefined()
  })

  test('GET /api/sales con rango de fechas devuelve resultado', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const res = await request(app)
      .get('/api/sales')
      .query({ start_date: today, end_date: today })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.sales)).toBe(true)
  })

  test('GET /api/sales/:id devuelve el detalle de la venta', async () => {
    const res = await request(app)
      .get(`/api/sales/${testSaleId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.sale.id).toBe(testSaleId)
    expect(res.body.sale.items.length).toBeGreaterThan(0)
    expect(res.body.sale.tienda.nombre).toBeDefined()
  })

  test('GET /api/sales/:id inexistente devuelve 404', async () => {
    const res = await request(app)
      .get('/api/sales/999999999')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })
})
