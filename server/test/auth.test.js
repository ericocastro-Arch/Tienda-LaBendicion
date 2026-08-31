import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import { authRequired, requireRole } from '../src/middlewares/auth.js'
import { config } from '../src/config/env.js'
import { createApp } from '../src/app.js'

describe('Auth Middleware - authRequired', () => {
  test('rechaza petición sin header Authorization', () => {
    const req = { headers: {} }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    authRequired(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token de acceso requerido' })
    expect(next).not.toHaveBeenCalled()
  })

  test('rechaza token inválido', () => {
    const req = { headers: { authorization: 'Bearer token-invalido' } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    authRequired(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' })
    expect(next).not.toHaveBeenCalled()
  })

  test('acepta token JWT válido y adjunta req.user', () => {
    const payload = { id: 1, username: 'admin', role: 'ADMIN', nombre: 'Admin' }
    const validToken = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' })

    const req = { headers: { authorization: `Bearer ${validToken}` } }
    const res = {}
    const next = jest.fn()

    authRequired(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.user.id).toBe(1)
    expect(req.user.role).toBe('ADMIN')
  })
})

describe('RBAC Middleware - requireRole', () => {
  test('rechaza si no está autenticado', () => {
    const req = {}
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    requireRole('ADMIN')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('rechaza si el usuario tiene rol insuficiente', () => {
    const req = { user: { id: 2, role: 'CAJERO' } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    requireRole('ADMIN')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Permisos insuficientes' })
    expect(next).not.toHaveBeenCalled()
  })

  test('permite acceso si el usuario tiene el rol permitido', () => {
    const req = { user: { id: 1, role: 'ADMIN' } }
    const res = {}
    const next = jest.fn()

    requireRole('ADMIN')(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})

describe('Password Hashing - Bcrypt', () => {
  test('hash y verificación con factor de costo 12', async () => {
    const password = 'admin123'
    const hash = await bcrypt.hash(password, 12)

    const isValid = await bcrypt.compare('admin123', hash)
    const isInvalid = await bcrypt.compare('wrongpass', hash)

    expect(isValid).toBe(true)
    expect(isInvalid).toBe(false)
  })
})

describe('Integración API con Supertest', () => {
  const app = createApp()

  test('GET /api/health responde ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  test('POST /api/auth/login con credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.role).toBe('ADMIN')
  })

  test('POST /api/auth/login con credenciales incorrectas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'incorrecta' })
    expect(res.status).toBe(401)
  })

  test('POST /api/auth/login sin credenciales devuelve 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '', password: '' })
    expect(res.status).toBe(400)
  })

  test('POST /api/auth/login con usuario inexistente devuelve 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'no-existe-usuario', password: 'cualquiera' })
    expect(res.status).toBe(401)
  })

  test('GET /api/auth/me devuelve el usuario autenticado', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
    expect(res.status).toBe(200)
    expect(res.body.user.username).toBe('admin')
  })

  test('solicitar recurso protegido sin token devuelve 401', async () => {
    const res = await request(app).get('/api/products')
    expect(res.status).toBe(401)
  })
})
