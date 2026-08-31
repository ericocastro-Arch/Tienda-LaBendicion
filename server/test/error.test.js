import { notFound, errorHandler } from '../src/middlewares/error.js'

describe('Middleware de errores', () => {
  test('notFound responde 404 con mensaje de recurso no encontrado', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    notFound({}, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Recurso no encontrado' })
  })

  test('errorHandler responde con el status y mensaje del error', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    const next = jest.fn()

    errorHandler({ status: 403, message: 'Prohibido' }, {}, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Prohibido' })
  })

  test('errorHandler sin status ni mensaje responde 500 genérico', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    const jsonError = new Error('boom')
    jsonError.status = undefined

    errorHandler(jsonError, {}, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'boom' })
  })

  test('errorHandler ante error sin mensaje responde mensaje interno', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    errorHandler({}, {}, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' })
  })

  test('ruta inexistente en la app devuelve 404 (integración)', async () => {
    const request = (await import('supertest')).default
    const app = (await import('../src/app.js')).createApp()
    const res = await request(app).get('/api/ruta-inexistente')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Recurso no encontrado')
  })
})
