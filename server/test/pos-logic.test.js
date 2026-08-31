import {
  redondear,
  calcularSubtotal,
  calcularTotal,
  calcularCambio,
  calcularMargenUnitario,
  calcularPorcentajeMargen,
  calcularTotalLinea,
  validarStockDisponible,
  esMetodoPagoValido,
  generarNumeroComprobante,
  calcularResumenVenta,
} from '../src/utils/pos-logic.js'

describe('pos-logic: funciones puras del punto de venta', () => {
  describe('calcularSubtotal', () => {
    test('suma cantidad x precio de cada ítem', () => {
      const items = [
        { cantidad: 2, precio_venta_unit: 1.5 },
        { cantidad: 3, precio_venta_unit: 2.25 },
      ]
      expect(calcularSubtotal(items)).toBe(9.75)
    })

    test('redondea a 2 decimales', () => {
      const items = [{ cantidad: 3, precio_venta_unit: 0.1 }]
      expect(calcularSubtotal(items)).toBe(0.3)
    })

    test('retorna 0 para carrito vacío o nulo', () => {
      expect(calcularSubtotal([])).toBe(0)
      expect(calcularSubtotal(null)).toBe(0)
      expect(calcularSubtotal(undefined)).toBe(0)
    })
  })

  describe('calcularTotal', () => {
    test('resta el descuento al subtotal', () => {
      expect(calcularTotal(9.75, 0.75)).toBe(9.0)
    })

    test('sin descuento devuelve el subtotal', () => {
      expect(calcularTotal(9.75, 0)).toBe(9.75)
    })

    test('descuento negativo no aplica (devuelve subtotal)', () => {
      expect(calcularTotal(10, -5)).toBe(10)
    })

    test('descuento mayor al subtotal se recorta a 0', () => {
      expect(calcularTotal(5, 10)).toBe(0)
    })

    test('redondea correctamente decimales', () => {
      expect(calcularTotal(10.005, 0)).toBe(10.01)
    })
  })

  describe('calcularCambio', () => {
    test('calcula cambio efectivo correcto', () => {
      expect(calcularCambio(20, 18.5)).toBe(1.5)
    })

    test('monto insuficiente devuelve 0 (no negativo)', () => {
      expect(calcularCambio(20, 25)).toBe(0)
    })

    test('cambio exacto devuelve 0', () => {
      expect(calcularCambio(10, 10)).toBe(0)
    })
  })

  describe('márgenes', () => {
    test('calcularMargenUnitario: venta - costo', () => {
      expect(calcularMargenUnitario(1.75, 1.25)).toBe(0.5)
    })

    test('calcularPorcentajeMargen sobre costo', () => {
      expect(calcularPorcentajeMargen(1.4, 1)).toBe(40)
    })

    test('calcularPorcentajeMargen con costo cero devuelve 100', () => {
      expect(calcularPorcentajeMargen(2, 0)).toBe(100)
    })
  })

  describe('calcularTotalLinea', () => {
    test('multiplica cantidad por precio unitario', () => {
      expect(calcularTotalLinea(3, 2.5)).toBe(7.5)
    })
  })

  describe('validarStockDisponible', () => {
    test('suficiente stock retorna true', () => {
      expect(validarStockDisponible(10, 8)).toBe(true)
    })

    test('stock insuficiente retorna false', () => {
      expect(validarStockDisponible(4, 5)).toBe(false)
    })
  })

  describe('esMetodoPagoValido', () => {
    test('acepta métodos válidos (case-insensitive)', () => {
      expect(esMetodoPagoValido('EFECTIVO')).toBe(true)
      expect(esMetodoPagoValido('tarjeta')).toBe(true)
      expect(esMetodoPagoValido('Transferencia')).toBe(true)
    })

    test('rechaza métodos inválidos', () => {
      expect(esMetodoPagoValido('CRIPTO')).toBe(false)
      expect(esMetodoPagoValido('')).toBe(false)
      expect(esMetodoPagoValido(null)).toBe(false)
    })
  })

  describe('generarNumeroComprobante', () => {
    test('formatea el correlativo a 6 dígitos con prefijo TICK', () => {
      expect(generarNumeroComprobante(42)).toBe('TICK-000042')
      expect(generarNumeroComprobante(1)).toBe('TICK-000001')
      expect(generarNumeroComprobante(123456)).toBe('TICK-123456')
    })
  })

  describe('calcularResumenVenta', () => {
    test('pago en efectivo calcula subtotal, total y cambio', () => {
      const items = [
        { cantidad: 2, precio_venta_unit: 1.5 },
        { cantidad: 3, precio_venta_unit: 2.25 },
      ]
      const res = calcularResumenVenta(items, 0.75, 'EFECTIVO', 20)
      expect(res.subtotal).toBe(9.75)
      expect(res.descuento).toBe(0.75)
      expect(res.total).toBe(9.0)
      expect(res.monto_recibido).toBe(20)
      expect(res.cambio).toBe(11.0)
    })

    test('pago con tarjeta ignora el monto recibido y no genera cambio', () => {
      const items = [{ cantidad: 1, precio_venta_unit: 5 }]
      const res = calcularResumenVenta(items, 0, 'TARJETA', 999)
      expect(res.monto_recibido).toBe(5)
      expect(res.cambio).toBe(0)
    })

    test('descuento se aplica al total y a la vista del montos', () => {
      const items = [{ cantidad: 1, precio_venta_unit: 10 }]
      const res = calcularResumenVenta(items, 2, 'EFECTIVO', 10)
      expect(res.total).toBe(8)
      expect(res.cambio).toBe(2)
    })
  })

  describe('redondear', () => {
    test('redondea a 2 decimales', () => {
      expect(redondear(9.994)).toBe(9.99)
      expect(redondear(9.995)).toBe(9.99)
      expect(redondear(1.004)).toBe(1.0)
      expect(redondear(1.005)).toBe(1.0)
    })
  })

  describe('casos de borde y guard clauses', () => {
    test('calcularTotal sin descuento (undefined) devuelve el subtotal', () => {
      expect(calcularTotal(10, undefined)).toBe(10)
      expect(calcularTotal(10, null)).toBe(10)
    })

    test('calcularCambio con montos indefinidos devuelve 0', () => {
      expect(calcularCambio(undefined, undefined)).toBe(0)
      expect(calcularCambio(5, undefined)).toBe(5)
      expect(calcularCambio(undefined, 5)).toBe(0)
    })

    test('calcularMargenUnitario con precios indefinidos', () => {
      expect(calcularMargenUnitario(undefined, undefined)).toBe(0)
      expect(calcularMargenUnitario(5, undefined)).toBe(5)
    })

    test('calcularTotalLinea con valores indefinidos devuelve 0', () => {
      expect(calcularTotalLinea(undefined, undefined)).toBe(0)
      expect(calcularTotalLinea(3, undefined)).toBe(0)
    })

    test('calcularSubtotal ignora ítems sin precio', () => {
      const items = [
        { cantidad: 2, precio_venta_unit: 1.5 },
        { cantidad: 3 },
        { cantidad: 2, precio_venta_unit: 2 },
      ]
      expect(calcularSubtotal(items)).toBe(7)
    })
  })
})
