import request from 'supertest'
import { createApp } from '../src/app.js'
import {
  calcularMargenUnitario,
  calcularPorcentajeMargen,
  validarStockDisponible,
} from '../src/utils/pos-logic.js'

const app = createApp()

async function getToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  return res.body.token
}

describe('Lógica de Margen de Ganancia (funciones puras reales)', () => {
  test('Margen = Precio Venta - Precio Costo', () => {
    expect(calcularMargenUnitario(1.75, 1.25)).toBe(0.5)
  })

  test('Porcentaje de margen sobre costo', () => {
    expect(calcularPorcentajeMargen(1.4, 1)).toBe(40)
  })

  test('Cálculo con costo cero', () => {
    expect(calcularPorcentajeMargen(2, 0)).toBe(100)
  })
})

describe('Lógica de Alertas de Stock Bajo (función pura)', () => {
  test('stock insuficiente no satisface la cantidad solicitada', () => {
    expect(validarStockDisponible(4, 5)).toBe(false)
  })

  test('stock suficiente satisface la cantidad solicitada', () => {
    expect(validarStockDisponible(12, 5)).toBe(true)
  })
})

describe('Integración - despliegue de productos', () => {
  test('GET /api/products devuelve la lista con el token de admin', async () => {
    const token = await getToken()
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.products)).toBe(true)
  })

  test('GET /api/products sin token devuelve 401', async () => {
    const res = await request(app).get('/api/products')
    expect(res.status).toBe(401)
  })

  test('GET /api/products/categories devuelve las categorías', async () => {
    const token = await getToken()
    const res = await request(app)
      .get('/api/products/categories')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.categories)).toBe(true)
    expect(res.body.categories.length).toBeGreaterThanOrEqual(3)
  })
})
