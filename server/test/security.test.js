import request from 'supertest'
import { createApp } from '../src/app.js'
import {
  sanitizeString,
  sanitizeObject,
  stripHtmlTags,
  isValidUsername,
  isValidPassword,
  isValidPaymentMethod,
  isValidId,
} from '../src/utils/sanitize.js'
import { sanitizeRequest } from '../src/middlewares/xss.js'
import { handleValidationErrors } from '../src/middlewares/validate.js'

describe('sanitize.js - funciones puras de sanitización', () => {
  test('sanitizeString escapa caracteres peligrosos', () => {
    expect(sanitizeString('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;&#x2F;script&gt;'
    )
    expect(sanitizeString("it's")).toBe("it&#x27;s")
    expect(sanitizeString('a&b')).toBe('a&amp;b')
    expect(sanitizeString('texto & normal')).toBe('texto &amp; normal')
  })

  test('sanitizeString aparte de escapar, recorta espacios', () => {
    expect(sanitizeString('  hola  ')).toBe('hola')
  })

  test('sanitizeString devuelve no-strings tal cual', () => {
    expect(sanitizeString(42)).toBe(42)
    expect(sanitizeString(null)).toBe(null)
    expect(sanitizeString(undefined)).toBe(undefined)
  })

  test('sanitizeObject sanitiza recursivamente strings y arrays', () => {
    const input = {
      nombre: '<b>Juan</b>',
      cantidad: 5,
      tags: ['<i>a</i>', 'b'],
      anidado: { valor: 'x<y' },
    }
    const out = sanitizeObject(input)
    expect(out.nombre).toBe('&lt;b&gt;Juan&lt;&#x2F;b&gt;')
    expect(out.cantidad).toBe(5)
    expect(out.tags[0]).toBe('&lt;i&gt;a&lt;&#x2F;i&gt;')
    expect(out.anidado.valor).toBe('x&lt;y')
  })

  test('sanitizeObject con entradas no-objeto', () => {
    expect(sanitizeObject(null)).toBe(null)
    expect(sanitizeObject('str')).toBe('str')
    expect(sanitizeObject(undefined)).toBe(undefined)
  })

  test('stripHtmlTags elimina scripts y etiquetas', () => {
    expect(stripHtmlTags('<script>alert(1)</script>hola')).toBe('hola')
    expect(stripHtmlTags('<p>texto</p> normal')).toBe('texto normal')
    expect(stripHtmlTags('<img src="javascript:alert(1)">x</img>')).toBe('x')
  })

  test('isValidUsername acepta formatos válidos y rechaza inválidos', () => {
    expect(isValidUsername('admin1')).toBe(true)
    expect(isValidUsername('user_name-2')).toBe(true)
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('<script>')).toBe(false)
    expect(isValidUsername(123)).toBe(false)
  })

  test('isValidPassword valida longitud', () => {
    expect(isValidPassword('abc123')).toBe(true)
    expect(isValidPassword('12345')).toBe(false)
    expect(isValidPassword(123456)).toBe(false)
  })

  test('isValidPaymentMethod', () => {
    expect(isValidPaymentMethod('EFECTIVO')).toBe(true)
    expect(isValidPaymentMethod('tarjeta')).toBe(true)
    expect(isValidPaymentMethod('CRIPTO')).toBe(false)
  })

  test('isValidId', () => {
    expect(isValidId(5)).toBe(true)
    expect(isValidId('7')).toBe(true)
    expect(isValidId(0)).toBe(false)
    expect(isValidId(-1)).toBe(false)
  })
})

describe('xss.js - middleware de sanitización', () => {
  test('sanitiza body, query y params', () => {
    const req = {
      body: { nombre: '<b>x</b>' },
      query: { search: '<i>q</i>' },
      params: { id: '5' },
    }
    const next = jest.fn()
    sanitizeRequest(req, {}, next)
    expect(req.body.nombre).toBe('&lt;b&gt;x&lt;&#x2F;b&gt;')
    expect(req.query.search).toBe('&lt;i&gt;q&lt;&#x2F;i&gt;')
    expect(req.params.id).toBe('5')
    expect(next).toHaveBeenCalled()
  })

  test('no rompe si body no existe', () => {
    const req = { query: { a: '1' }, params: {} }
    const next = jest.fn()
    sanitizeRequest(req, {}, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('validate.js - handleValidationErrors', () => {
  test('pasa al siguiente si no hay errores', () => {
    const req = {}
    const res = {}
    const next = jest.fn()
    handleValidationErrors(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('Seguridad - integración con helmet y rate limit', () => {
  const app = createApp()

  test('la respuesta incluye encabezados de seguridad de helmet', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBeDefined()
    expect(res.headers['strict-transport-security']).toBeDefined()
  })
})
