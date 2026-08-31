const STORAGE_KEY = 'labendicion_pending_sales';
const CATALOG_KEY = 'labendicion_catalog_cache';

export function generateLocalId() {
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function isNetworkError(err) {
  if (!err) return false;
  // Axios: error sin response (no se alcanzó el servidor) => error de red
  if (err.response === undefined) return true;
  if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') return true;
  // HTTP 5xx / gateway pueden representar fallos transitorios de conectividad
  if (err.response && err.response.status >= 502 && err.response.status <= 504) return true;
  return false;
}

export function loadPendingSales(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingSales(storage, sales) {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

export function enqueueSale(storage, sale, idGenerator = generateLocalId) {
  const pending = loadPendingSales(storage);
  const entry = {
    localId: idGenerator(),
    createdAt: new Date().toISOString(),
    payload: sale,
  };
  const next = [...pending, entry];
  savePendingSales(storage, next);
  return entry;
}

export function removePendingSale(storage, localId) {
  const pending = loadPendingSales(storage);
  const next = pending.filter((entry) => entry.localId !== localId);
  savePendingSales(storage, next);
  return next;
}

export function buildOfflinePayload(items, descuento, metodoPago, montoRecibido) {
  return {
    items: items.map((item) => ({
      product_id: item.product_id,
      cantidad: Number(item.cantidad) || 0,
      precio_venta_unit: Number(item.precio_venta_unit) || 0,
    })),
    descuento: Number(descuento) || 0,
    metodo_pago: metodoPago,
    monto_recibido: Number(montoRecibido) || 0,
  };
}

export function cacheCatalog(storage, products, categories) {
  if (!storage) return;
  try {
    storage.setItem(CATALOG_KEY, JSON.stringify({ products, categories, cachedAt: Date.now() }));
  } catch {
    // almacenamiento lleno o no disponible: ignorar silenciosamente
  }
}

export function loadCachedCatalog(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CATALOG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.products)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCachedCatalog(storage) {
  if (!storage) return;
  try {
    storage.removeItem(CATALOG_KEY);
  } catch {
    // ignorar
  }
}

export function isNetworkUnavailable() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
