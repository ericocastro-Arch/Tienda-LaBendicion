import {
  calcularDemandaDiaria,
  estimarDiasRestantes,
  sugerirReposicion,
  generarPronostico,
} from '../src/utils/forecast.js'

describe('forecast: pronóstico de reabastecimiento (funciones puras)', () => {
  describe('calcularDemandaDiaria', () => {
    test('divide unidades por días', () => {
      expect(calcularDemandaDiaria(90, 30)).toBe(3)
    })
    test('redondea a 3 decimales', () => {
      expect(calcularDemandaDiaria(10, 3)).toBe(3.333)
    })
    test('días cero o nulos devuelve 0', () => {
      expect(calcularDemandaDiaria(10, 0)).toBe(0)
      expect(calcularDemandaDiaria(10, null)).toBe(0)
    })
    test('unidades inválidas se tratan como 0', () => {
      expect(calcularDemandaDiaria(undefined, 30)).toBe(0)
    })
  })

  describe('estimarDiasRestantes', () => {
    test('divide stock entre demanda', () => {
      expect(estimarDiasRestantes(30, 3)).toBe(10)
    })
    test('stock cero con demanda da 0 días restantes', () => {
      expect(estimarDiasRestantes(0, 3)).toBe(0)
    })
    test('sin demanda devuelve null (no estimable)', () => {
      expect(estimarDiasRestantes(10, 0)).toBeNull()
      expect(estimarDiasRestantes(10, -5)).toBeNull()
    })
  })

  describe('sugerirReposicion', () => {
    test('sugiere la diferencia al stock objetivo (mínimo + demanda*días)', () => {
      // objetivo = 5 + 3*7 = 26 ; stock 10 => sugerido 16
      expect(sugerirReposicion(10, 5, 3)).toBe(16)
    })
    test('redondea hacia arriba fracciones', () => {
      // objetivo = 0 + 1*7 = 7 ; stock 0 => sugerido 7
      expect(sugerirReposicion(0, 0, 1)).toBe(7)
    })
    test('no sugiere si ya hay suficiente stock', () => {
      expect(sugerirReposicion(100, 5, 3)).toBe(0)
    })
    test('sin demanda devuelve 0', () => {
      expect(sugerirReposicion(0, 0, 0)).toBe(0)
    })
  })

  describe('generarPronostico', () => {
    const rows = [
      { id: 1, nombre: 'Arroz', codigo_barras: '123', categoria_nombre: 'Abarrotes', unidades_vendidas: 90, stock_actual: 30, stock_minimo: 10 },
      { id: 2, nombre: 'Fideo', codigo_barras: '456', categoria_nombre: 'Abarrotes', unidades_vendidas: 90, stock_actual: 0, stock_minimo: 5 },
      { id: 3, nombre: 'Especia', codigo_barras: null, categoria_nombre: null, unidades_vendidas: 0, stock_actual: 99, stock_minimo: 1 },
    ]

    test('marca OK si quedan más de 7 días', () => {
      // Arroz: demanda 3/día, stock 30 => 10 días => OK
      const [arroz] = generarPronostico(rows, 30)
      expect(arroz.estado).toBe('OK')
      expect(arroz.demandaDiaria).toBe(3)
      expect(arroz.diasRestantes).toBe(10)
    })

    test('marca AGOTADO cuando no hay stock', () => {
      const [, fideo] = generarPronostico(rows, 30)
      expect(fideo.estado).toBe('AGOTADO')
      expect(fideo.diasRestantes).toBe(0)
      expect(fideo.fechaEstimadaAgotamiento).toBeTruthy()
    })

    test('marca SIN_DEMANDA cuando no se vendió nada', () => {
      const [, , especia] = generarPronostico(rows, 30)
      expect(especia.estado).toBe('SIN_DEMANDA')
      expect(especia.diasRestantes).toBeNull()
    })

    test('sugiere reposición coherente con la demanda', () => {
      const [arroz] = generarPronostico(rows, 30)
      // objetivo = 10 + 3*7 = 31 ; stock 30 => sugerido 1
      expect(arroz.cantidadSugeridaReposicion).toBe(1)
    })

    test('respeta la ventana de días pasada', () => {
      const [arroz] = generarPronostico(rows, 10)
      expect(arroz.demandaDiaria).toBe(9)
    })
  })
})
