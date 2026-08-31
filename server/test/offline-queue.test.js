import {
  generateLocalId,
  isNetworkError,
  loadPendingSales,
  savePendingSales,
  enqueueSale,
  removePendingSale,
  cacheCatalog,
  loadCachedCatalog,
  clearCachedCatalog,
} from '../../client/src/services/offlineQueue.js'

function createMemoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    removeItem: (k) => { delete data[k] },
    _data: data,
  }
}

describe('offline-queue: FIFO lógica de cola y caché (offline-first)', () => {
  describe('generateLocalId', () => {
    test('genera ids únicos con prefijo offline-', () => {
      const a = generateLocalId()
      const b = generateLocalId()
      expect(a.startsWith('offline-')).toBe(true)
      expect(a).not.toBe(b)
    })
  })

  describe('isNetworkError', () => {
    test('error sin response (no se alcanzó servidor) es error de red', () => {
      expect(isNetworkError({})).toBe(true)
      expect(isNetworkError({ response: undefined })).toBe(true)
    })
    test('error con código de red es error de red', () => {
      expect(isNetworkError({ code: 'ECONNABORTED' })).toBe(true)
      expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true)
    })
    test('errores 5xx gateway se tratan como transitorios (red)', () => {
      expect(isNetworkError({ response: { status: 502 } })).toBe(true)
      expect(isNetworkError({ response: { status: 504 } })).toBe(true)
    })
    test('errores HTTP normales NO son de red', () => {
      expect(isNetworkError({ response: { status: 400 } })).toBe(false)
      expect(isNetworkError({ response: { status: 500 } })).toBe(false)
      expect(isNetworkError(null)).toBe(false)
      expect(isNetworkError(undefined)).toBe(false)
    })
  })

  describe('loadPendingSales / savePendingSales', () => {
    test('devuelve [] si no hay ventas guardadas', () => {
      expect(loadPendingSales(createMemoryStorage())).toEqual([])
    })
    test('devuelve [] si storage es nulo', () => {
      expect(loadPendingSales(null)).toEqual([])
    })
    test('devuelve [] si el JSON está corrupto', () => {
      const st = createMemoryStorage({ labendicion_pending_sales: '{not json' })
      expect(loadPendingSales(st)).toEqual([])
    })
    test('persiste y recupera la lista', () => {
      const st = createMemoryStorage()
      savePendingSales(st, [{ localId: 'x' }])
      expect(loadPendingSales(st)).toEqual([{ localId: 'x' }])
    })
  })

  describe('enqueueSale', () => {
    test('encola una venta al final (FIFO) con id local y timestamp', () => {
      const st = createMemoryStorage()
      const idGen = (() => { let n = 0; return () => `id-${++n}` })()
      const e1 = enqueueSale(st, { total: 5 }, idGen)
      const e2 = enqueueSale(st, { total: 8 }, idGen)
      expect(e1.localId).toBe('id-1')
      expect(e2.localId).toBe('id-2')
      expect(e1.createdAt).toBeTruthy()
      expect(loadPendingSales(st).map((e) => e.localId)).toEqual(['id-1', 'id-2'])
    })
    test('no falla con storage nulo (modo navegador sin localStorage)', () => {
      expect(enqueueSale(null, { total: 1 })).toBeTruthy()
    })
  })

  describe('removePendingSale', () => {
    test('elimina la venta por localId y conserva el orden', () => {
      const st = createMemoryStorage()
      const idGen = (() => { let n = 0; return () => `id-${++n}` })()
      enqueueSale(st, { total: 1 }, idGen)
      enqueueSale(st, { total: 2 }, idGen)
      enqueueSale(st, { total: 3 }, idGen)
      const remaining = removePendingSale(st, 'id-2')
      expect(remaining.map((e) => e.localId)).toEqual(['id-1', 'id-3'])
    })
    test('remover inexistente no altera la cola', () => {
      const st = createMemoryStorage()
      enqueueSale(st, { total: 1 }, () => 'id-1')
      const remaining = removePendingSale(st, 'no-existe')
      expect(remaining).toHaveLength(1)
    })
  })

  describe('cacheCatalog / loadCachedCatalog', () => {
    test('guarda y recupera catálogo con timestamp', () => {
      const st = createMemoryStorage()
      const products = [{ id: 1, nombre: 'Leche' }]
      const categories = [{ id: 1, nombre: 'Lácteos' }]
      cacheCatalog(st, products, categories)
      const cached = loadCachedCatalog(st)
      expect(cached.products).toEqual(products)
      expect(cached.categories).toEqual(categories)
      expect(cached.cachedAt).toBeGreaterThan(0)
    })
    test('devuelve null al leer cache inexistente o corrupta', () => {
      expect(loadCachedCatalog(createMemoryStorage())).toBeNull()
      const bad = createMemoryStorage({ labendicion_catalog_cache: '{"products":"no array"}' })
      expect(loadCachedCatalog(bad)).toBeNull()
      expect(loadCachedCatalog(createMemoryStorage({ labendicion_catalog_cache: '{bad' }))).toBeNull()
      expect(loadCachedCatalog(null)).toBeNull()
    })
    test('clearCachedCatalog elimina el catálogo cacheado', () => {
      const st = createMemoryStorage()
      cacheCatalog(st, [{ id: 1 }], [])
      expect(loadCachedCatalog(st)).toBeTruthy()
      clearCachedCatalog(st)
      expect(loadCachedCatalog(st)).toBeNull()
    })
    test('cacheCatalog no arroja si storage es nulo', () => {
      expect(() => cacheCatalog(null, [], [])).not.toThrow()
    })
  })
})
