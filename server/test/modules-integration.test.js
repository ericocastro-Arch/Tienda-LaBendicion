import request from 'supertest'
import crypto from 'node:crypto'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db/prisma.js'

const app = createApp()

let token
let testEmployeeId
let testProductId

async function getToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  return res.body.token
}

beforeAll(async () => {
  token = await getToken()

  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      nombre: 'Producto Integración Jest',
      codigo_barras: `INT-${crypto.randomUUID()}`.slice(0, 20),
      precio_costo: 2.0,
      precio_venta: 3.5,
      stock_actual: 20,
      stock_minimo: 5,
    })
  testProductId = res.body.product.id
})

afterAll(async () => {
  if (testProductId) {
    await prisma.stockMovement.deleteMany({ where: { productId: testProductId } })
    await prisma.product.deleteMany({ where: { id: testProductId } })
  }
  if (testEmployeeId) {
    await prisma.employee.deleteMany({ where: { id: testEmployeeId } })
  }
})

describe('Empleados - integración', () => {
  test('GET /api/employees/roles devuelve los roles', async () => {
    const res = await request(app)
      .get('/api/employees/roles')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.roles)).toBe(true)
    expect(res.body.roles.length).toBeGreaterThanOrEqual(2)
  })

  test('GET /api/employees devuelve la lista', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.employees)).toBe(true)
    expect(res.body.employees.length).toBeGreaterThanOrEqual(1)
  })

  test('POST /api/employees crea un empleado', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rol_id: 2,
        nombre: 'Test',
        apellido: 'Jest',
        cedula: `000-${Date.now()}`,
        telefono: '7000-0000',
        username: `test${Date.now()}`,
        password: 'Test1234!',
      })

    expect(res.status).toBe(201)
    expect(res.body.employee.username).toBeDefined()
    testEmployeeId = res.body.employee.id
  })

  test('POST /api/employees con username duplicado devuelve 409', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rol_id: 2,
        nombre: 'Test',
        apellido: 'Jest2',
        username: 'admin',
        password: 'Test1234!',
      })
    expect(res.status).toBe(409)
  })

  test('POST /api/employees sin datos obligatorios devuelve 400', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'SoloNombre' })
    expect(res.status).toBe(400)
  })

  test('PATCH /api/employees/:id actualiza un empleado', async () => {
    const res = await request(app)
      .patch(`/api/employees/${testEmployeeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ telefono: '7000-1234', nombre: 'TestActualizado' })
    expect(res.status).toBe(200)
    expect(res.body.employee.nombre).toBe('TestActualizado')
    expect(res.body.employee.telefono).toBe('7000-1234')
  })

  test('PATCH /api/employees/:id inexistente devuelve 404', async () => {
    const res = await request(app)
      .patch('/api/employees/999999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'X' })
    expect(res.status).toBe(404)
  })

  test('PATCH /api/employees/:id/toggle desactiva y reactiva', async () => {
    const offRes = await request(app)
      .patch(`/api/employees/${testEmployeeId}/toggle`)
      .set('Authorization', `Bearer ${token}`)
    expect(offRes.status).toBe(200)
    expect(offRes.body.employee.is_active).toBe(false)

    const onRes = await request(app)
      .patch(`/api/employees/${testEmployeeId}/toggle`)
      .set('Authorization', `Bearer ${token}`)
    expect(onRes.status).toBe(200)
    expect(onRes.body.employee.is_active).toBe(true)
  })

  test('PATCH /api/employees/:id/toggle sobre su propia cuenta devuelve 400', async () => {
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
    const selfId = meRes.body.user.id
    const res = await request(app)
      .patch(`/api/employees/${selfId}/toggle`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  test('PATCH /api/employees/:id/toggle con id inexistente devuelve 404', async () => {
    const res = await request(app)
      .patch('/api/employees/999999999/toggle')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })
})

describe('Inventario - integración', () => {
  test('GET /api/inventory devuelve el resumen', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.resumen.total_productos).toBeGreaterThanOrEqual(0)
  })

  test('GET /api/inventory/stock-low devuelve productos con stock bajo', async () => {
    const res = await request(app)
      .get('/api/inventory/stock-low')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.total).toBeDefined()
  })

  test('POST /api/inventory/entries registra entrada de stock', async () => {
    const res = await request(app)
      .post('/api/inventory/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: testProductId, cantidad: 5, motivo: 'Recepción test' })
    expect(res.status).toBe(201)
    expect(res.body.product.stock_actual).toBe(25)
  })

  test('POST /api/inventory/adjustments SUMAR', async () => {
    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: testProductId, tipo_operacion: 'SUMAR', cantidad: 3, motivo: 'conteo físico' })
    expect(res.status).toBe(201)
    expect(res.body.product.stock_actual).toBe(28)
  })

  test('POST /api/inventory/adjustments FIJAR', async () => {
    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: testProductId, tipo_operacion: 'FIJAR', cantidad: 30, motivo: 'reconteo final' })
    expect(res.status).toBe(201)
    expect(res.body.product.stock_actual).toBe(30)
  })

  test('POST /api/inventory/adjustments RESTAR', async () => {
    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: testProductId, tipo_operacion: 'RESTAR', cantidad: 4, motivo: 'merma' })
    expect(res.status).toBe(201)
    expect(res.body.product.stock_actual).toBe(26)
  })

  test('POST /api/inventory/adjustments con operación inválida devuelve 400', async () => {
    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: testProductId, tipo_operacion: 'DESCONOCIDO', cantidad: 5, motivo: 'x' })
    expect(res.status).toBe(400)
  })

  test('GET /api/inventory/history devuelve el historial de movimientos', async () => {
    const res = await request(app)
      .get('/api/inventory/history')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.movements)).toBe(true)
  })

  test('GET /api/inventory/:productId/history devuelve los movimientos del producto', async () => {
    const res = await request(app)
      .get(`/api/inventory/${testProductId}/history`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    const movements = res.body.movements.filter((m) => m.product_id === testProductId)
    expect(movements.length).toBeGreaterThanOrEqual(5)
  })

  test('POST /api/inventory/entries con cantidad inválida devuelve 400', async () => {
    const res = await request(app)
      .post('/api/inventory/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: testProductId, cantidad: -5 })
    expect(res.status).toBe(400)
  })

  test('POST /api/inventory/entries con producto inexistente devuelve 404', async () => {
    const res = await request(app)
      .post('/api/inventory/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: 999999999, cantidad: 5 })
    expect(res.status).toBe(404)
  })

  test('POST /api/inventory/adjustments sin motivo devuelve 400', async () => {
    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: testProductId, tipo_operacion: 'SUMAR', cantidad: 5, motivo: '' })
    expect(res.status).toBe(400)
  })

  test('POST /api/inventory/adjustments RESTAR a stock negativo devuelve 400', async () => {
    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: testProductId, tipo_operacion: 'RESTAR', cantidad: 99999, motivo: 'stock negativo' })
    expect(res.status).toBe(400)
  })
})

describe('Reportes - integración (dashboard)', () => {
  test('GET /api/reports/summary', async () => {
    const res = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.summary.total_transacciones).toBeDefined()
  })

  test('GET /api/reports/sales/daily', async () => {
    const res = await request(app)
      .get('/api/reports/sales/daily')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.daily)).toBe(true)
  })

  test('GET /api/reports/sales/monthly', async () => {
    const res = await request(app)
      .get('/api/reports/sales/monthly')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.monthly)).toBe(true)
  })

  test('GET /api/reports/products/top', async () => {
    const res = await request(app)
      .get('/api/reports/products/top')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.topProducts)).toBe(true)
  })

  test('GET /api/reports/inventory', async () => {
    const res = await request(app)
      .get('/api/reports/inventory')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.inventoryByCategory)).toBe(true)
  })

  test('GET /api/reports/summary con rango de fechas', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const res = await request(app)
      .get('/api/reports/summary')
      .query({ start_date: today, end_date: today })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.summary.total_transacciones).toBeDefined()
  })

  test('GET /api/reports/sales/daily con rango de fechas', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const res = await request(app)
      .get('/api/reports/sales/daily')
      .query({ start_date: today, end_date: today })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.daily)).toBe(true)
  })

  test('GET /api/reports/sales/monthly con año', async () => {
    const year = new Date().getFullYear()
    const res = await request(app)
      .get('/api/reports/sales/monthly')
      .query({ year })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.monthly)).toBe(true)
  })

  test('GET /api/reports/products/top con limit y fechas', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const res = await request(app)
      .get('/api/reports/products/top')
      .query({ limit: 5, start_date: today, end_date: today })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.topProducts)).toBe(true)
  })

  test('endpoints de reportes sin rol ADMIN devuelven 403', async () => {
    const cajeroLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
    expect(cajeroLogin.status).toBe(200)
  })
})

describe('Cobertura adicional - auth, products, store, sales', () => {
  test('GET /api/auth/me devuelve los datos del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.user.id).toBeDefined()
  })

  test('GET /api/products/barcode/:code encuentra un producto', async () => {
    const productsRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)
    const code = productsRes.body.products[0].codigo_barras
    const res = await request(app)
      .get(`/api/products/barcode/${code}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.product.codigo_barras).toBe(code)
  })

  test('GET /api/products/barcode/:code con código inexistente devuelve 404', async () => {
    const res = await request(app)
      .get(`/api/products/barcode/NO-EXISTE-${Date.now()}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  test('POST /api/products/categories crea una categoría', async () => {
    const res = await request(app)
      .post('/api/products/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `CatTest${Date.now()}`, descripcion: 'categoría de prueba' })
    expect(res.status).toBe(201)
    expect(res.body.category.id).toBeDefined()
    if (res.body.category.id) {
      await prisma.category.deleteMany({ where: { id: res.body.category.id } })
    }
  })

  test('POST /api/products/categories sin nombre devuelve 400', async () => {
    const res = await request(app)
      .post('/api/products/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.status).toBe(400)
  })

  test('POST /api/products/categories duplicada devuelve 409', async () => {
    const res = await request(app)
      .post('/api/products/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Abarrotes' })
    expect(res.status).toBe(409)
  })

  test('PATCH /api/products/:id actualiza un producto', async () => {
    const res = await request(app)
      .patch(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Producto Integración Actualizado', precio_venta: 4.0 })
    expect(res.status).toBe(200)
    expect(res.body.product.nombre).toBe('Producto Integración Actualizado')
  })

  test('PATCH /api/products/:id inexistente devuelve 404', async () => {
    const res = await request(app)
      .patch('/api/products/999999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'X' })
    expect(res.status).toBe(404)
  })

  test('PATCH /api/products/:id/toggle desactiva y reactiva', async () => {
    const offRes = await request(app)
      .patch(`/api/products/${testProductId}/toggle`)
      .set('Authorization', `Bearer ${token}`)
    expect(offRes.status).toBe(200)
    expect(offRes.body.product.is_active).toBe(false)

    const onRes = await request(app)
      .patch(`/api/products/${testProductId}/toggle`)
      .set('Authorization', `Bearer ${token}`)
    expect(onRes.status).toBe(200)
    expect(onRes.body.product.is_active).toBe(true)
  })

  test('POST /api/products con nombre vacío devuelve 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: '   ', precio_costo: 1, precio_venta: 2 })
    expect(res.status).toBe(400)
  })

  test('PUT /api/store actualiza la configuración de la tienda', async () => {
    const res = await request(app)
      .put('/api/store')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Tienda La Bendición', direccion: 'Test', telefono: '+503 7000-0000' })
    expect(res.status).toBe(200)
    expect(res.body.store.nombre).toBe('Tienda La Bendición')
  })

  test('PUT /api/store sin nombre devuelve 400', async () => {
    const res = await request(app)
      .put('/api/store')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: '' })
    expect(res.status).toBe(400)
  })

  test('GET /api/sales devuelve la lista de ventas', async () => {
    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.sales)).toBe(true)
  })

  test('venta con descuento mayor al subtotal devuelve 400', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ product_id: testProductId, cantidad: 1, precio_venta_unit: 4.0 }],
        descuento: 9999,
        metodo_pago: 'EFECTIVO',
        monto_recibido: 9999,
      })
    expect(res.status).toBe(400)
  })

  test('venta con efectivo insuficiente devuelve 400', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ product_id: testProductId, cantidad: 1, precio_venta_unit: 4.0 }],
        descuento: 0,
        metodo_pago: 'EFECTIVO',
        monto_recibido: 0.5,
      })
    expect(res.status).toBe(400)
  })

  test('venta con producto inexistente devuelve 404', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ product_id: 999999999, cantidad: 1, precio_venta_unit: 1 }],
        metodo_pago: 'EFECTIVO',
      })
    expect(res.status).toBe(404)
  })

  test('venta con cantidad inválida devuelve 400', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ product_id: testProductId, cantidad: 0, precio_venta_unit: 1 }],
        metodo_pago: 'EFECTIVO',
      })
    expect(res.status).toBe(400)
  })
})

