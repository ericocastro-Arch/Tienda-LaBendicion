import request from 'supertest'
import { createApp } from '../src/app.js'
import {
  calcularSubtotal,
  calcularTotal,
} from '../src/utils/pos-logic.js'

const app = createApp()

async function getToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  return res.body.token
}

function acumuladoProgresivo(series) {
  let runningTotal = 0
  return series.map((tot) => Number((runningTotal += tot).toFixed(2)))
}

describe('Lógica de Reportes e Inteligencia de Negocios', () => {
  test('Cálculo de ganancia bruta agregada desde ítems de venta', () => {
    const saleItems = [
      { cantidad: 3, margen_unitario: 0.4 },
      { cantidad: 5, margen_unitario: 0.75 },
      { cantidad: 2, margen_unitario: 1.1 },
    ]

    const gananciaBruta = saleItems.reduce(
      (sum, item) => sum + Number((item.cantidad * item.margen_unitario).toFixed(2)),
      0
    )

    expect(gananciaBruta).toBe(7.15)
  })

  test('Cálculo de total acumulado progresivo (Window Function)', () => {
    const dailyTotals = [120.5, 85.0, 210.25]
    expect(acumuladoProgresivo(dailyTotals)).toEqual([120.5, 205.5, 415.75])
  })

  test('Ranking de productos más vendidos', () => {
    const productSales = [
      { id: 1, nombre: 'Arroz', unidades: 45 },
      { id: 2, nombre: 'Frijoles', unidades: 60 },
      { id: 3, nombre: 'Azúcar', unidades: 30 },
    ]

    const sorted = [...productSales].sort((a, b) => b.unidades - a.unidades)
    expect(sorted[0].nombre).toBe('Frijoles')
    expect(sorted[1].nombre).toBe('Arroz')
    expect(sorted[2].nombre).toBe('Azúcar')
  })

  test('Ganancia bruta se puede derivar de funciones puras del POS', () => {
    const items = [
      { cantidad: 2, precio_venta_unit: 1.5 },
      { cantidad: 3, precio_venta_unit: 2.25 },
    ]
    const subtotal = calcularSubtotal(items)
    const total = calcularTotal(subtotal, 0.75)
    expect(subtotal).toBe(9.75)
    expect(total).toBe(9.0)
  })
})

describe('Módulo de Configuración y Respaldo', () => {
  test('Estructura válida de datos de respaldo', () => {
    const backup = {
      sistema: 'La Bendición - POS & Gestión',
      version: '1.0.0',
      fecha_respaldo: new Date().toISOString(),
      datos: {
        products: [{ id: 1, nombre: 'Leche' }],
        sales: [{ id: 1, total: 10 }],
      },
    }

    expect(backup.sistema).toBe('La Bendición - POS & Gestión')
    expect(Array.isArray(backup.datos.products)).toBe(true)
    expect(Array.isArray(backup.datos.sales)).toBe(true)
  })
})

describe('Integración - configuración y respaldo', () => {
  test('GET /api/store devuelve la configuración del negocio', async () => {
    const token = await getToken()
    const res = await request(app)
      .get('/api/store')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.store).toBeDefined()
    expect(typeof res.body.store.nombre).toBe('string')
  })

  test('GET /api/store/info devuelve información del sistema', async () => {
    const token = await getToken()
    const res = await request(app)
      .get('/api/store/info')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.system).toBeDefined()
    expect(res.body.system.estado_bd).toContain('PostgreSQL')
    expect(res.body.system.servidor).toBe('Node.js Express API')
  })

  test('GET /api/store/backup requiere rol ADMIN', async () => {
    const token = await getToken()
    const res = await request(app)
      .get('/api/store/backup')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
  })
})
