import { useState, useEffect, useRef } from 'react';
import { api } from '../api/axiosClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  cacheCatalog, enqueueSale, isNetworkError, isNetworkUnavailable,
  loadCachedCatalog, loadPendingSales, removePendingSale,
} from '../services/offlineQueue.js';
import { setAuthToken } from '../api/axiosClient.js';

export default function POS() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Shopping Cart in memory (reactive SPA state)
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO'); // 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'
  const [receivedAmount, setReceivedAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Post-sale / Receipt modal
  const [completedSale, setCompletedSale] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Help overlay
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(() => loadPendingSales(
    typeof window !== 'undefined' ? window.localStorage : null
  ).length);

  const searchInputRef = useRef(null);

  const storage = typeof window !== 'undefined' ? window.localStorage : null;

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get('/products?active=true'),
        api.get('/products/categories'),
      ]);
      const prods = prodRes.data.products || [];
      const cats = catRes.data.categories || [];
      setProducts(prods);
      setCategories(cats);
      cacheCatalog(storage, prods, cats);
      setIsOffline(false);
    } catch (err) {
      console.error(err);
      // Modo offline: servir desde la caché local si existe
      const cached = loadCachedCatalog(storage);
      if (cached) {
        setProducts(cached.products || []);
        setCategories(cached.categories || []);
        setIsOffline(true);
      } else {
        setErrorMessage('Error al cargar el catálogo de productos');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Keyboard Wedge barcode scanner support & focus management
  // Refs para acceder a los valores actuales dentro del listener de teclado
  const stateRef = useRef({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      const s = stateRef.current;

      // F1: Mostrar / ocultar ayuda de atajos
      if (e.key === 'F1') {
        e.preventDefault();
        setIsHelpOpen((open) => !open);
        return;
      }

      // F2: Cobrar venta
      if (e.key === 'F2' && !s.isProcessing) {
        e.preventDefault();
        s.handleCheckout();
        return;
      }

      // F3: Foco en monto recibido (efectivo)
      if (e.key === 'F3') {
        e.preventDefault();
        if (s.paymentMethod !== 'EFECTIVO') s.setPaymentMethod('EFECTIVO');
        const cashInput = document.getElementById('received-amount-input');
        if (cashInput) cashInput.focus();
        return;
      }

      // F4: Cambiar método de pago (ciclo)
      if (e.key === 'F4') {
        e.preventDefault();
        const order = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];
        const idx = order.indexOf(s.paymentMethod);
        const next = order[(idx + 1) % order.length];
        s.setPaymentMethod(next);
        if (next === 'EFECTIVO') s.setReceivedAmount('');
        else s.setReceivedAmount(s.cartTotal.toString());
        return;
      }

      // F5 / Ctrl+K: Foco en búsqueda
      if (e.key === 'F5' || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
        return;
      }

      // Escape: Cerrar ayuda, cerrar modal o limpiar búsqueda
      if (e.key === 'Escape') {
        if (s.isHelpOpen) {
          setIsHelpOpen(false);
          return;
        }
        if (s.isReceiptModalOpen) {
          s.handleNewSale();
          return;
        }
        setSearchTerm('');
        if (searchInputRef.current) searchInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cart operations
  const addToCart = (product) => {
    if (product.stock_actual <= 0) {
      setErrorMessage(`El producto "${product.nombre}" está agotado`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.cantidad + 1 > product.stock_actual) {
          setErrorMessage(`No hay más existencias disponibles de "${product.nombre}" (Stock: ${product.stock_actual})`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product_id === product.id
            ? { ...item, cantidad: item.cantidad + 1, subtotal: Number(((item.cantidad + 1) * item.precio_venta_unit).toFixed(2)) }
            : item
        );
      } else {
        const unitPrice = parseFloat(product.precio_venta);
        return [
          ...prevCart,
          {
            product_id: product.id,
            nombre: product.nombre,
            codigo_barras: product.codigo_barras,
            precio_venta_unit: unitPrice,
            stock_actual: product.stock_actual,
            cantidad: 1,
            subtotal: unitPrice,
          },
        ];
      }
    });
    setErrorMessage('');
  };

  const updateQuantity = (productId, newQty) => {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product_id === productId) {
          const finalQty = Math.min(qty, item.stock_actual);
          if (qty > item.stock_actual) {
            setErrorMessage(`Stock máximo alcanzado para "${item.nombre}" (${item.stock_actual} unid.)`);
          }
          return {
            ...item,
            cantidad: finalQty,
            subtotal: Number((finalQty * item.precio_venta_unit).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setReceivedAmount('');
    setErrorMessage('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // Barcode / Search submit handler (Keyboard Wedge scanner enter trigger)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const term = searchTerm.trim().toLowerCase();

    // 1. Intentar coincidencia exacta con código de barras
    const exactBarcodeMatch = products.find(
      (p) => p.codigo_barras && p.codigo_barras.toLowerCase() === term
    );

    if (exactBarcodeMatch) {
      addToCart(exactBarcodeMatch);
      setSearchTerm('');
      return;
    }

    // 2. Si coincide con un único producto por nombre
    const nameMatches = products.filter((p) => p.nombre.toLowerCase().includes(term));
    if (nameMatches.length === 1) {
      addToCart(nameMatches[0]);
      setSearchTerm('');
    }
  };

  // Calculations
  const cartSubtotal = Number(
    cart.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
  );
  const discountAmount = Math.min(cartSubtotal, Math.max(0, parseFloat(discount) || 0));
  const cartTotal = Number(Math.max(0, cartSubtotal - discountAmount).toFixed(2));
  const cashGiven = paymentMethod === 'EFECTIVO' ? (parseFloat(receivedAmount) || 0) : cartTotal;
  const changeToReturn = Number(Math.max(0, cashGiven - cartTotal).toFixed(2));
  const isCashSufficient = paymentMethod !== 'EFECTIVO' || cashGiven >= cartTotal;

  // Finalize Sale
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage('El carrito está vacío');
      return;
    }

    if (paymentMethod === 'EFECTIVO' && cashGiven < cartTotal) {
      setErrorMessage(`El monto recibido ($${cashGiven.toFixed(2)}) es menor que el total a pagar ($${cartTotal.toFixed(2)})`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.product_id,
          cantidad: item.cantidad,
          precio_venta_unit: item.precio_venta_unit,
        })),
        descuento: discountAmount,
        metodo_pago: paymentMethod,
        monto_recibido: paymentMethod === 'EFECTIVO' ? cashGiven : cartTotal,
      };

      const res = await api.post('/sales', payload);
      setCompletedSale({ ...res.data.sale, pending: false });
      setIsReceiptModalOpen(true);
      clearCart();
      await fetchCatalog(); // Actualizar inventario
    } catch (err) {
      if (isNetworkError(err)) {
        // Venta offline: encolar para sincronizar al reconectar
        const localSale = {
          ...payload,
          subtotal: cartSubtotal,
          total: cartTotal,
          monto_recibido: payload.monto_recibido,
          cambio: changeToReturn,
          created_at: new Date().toISOString(),
        };
        enqueueSale(storage, localSale);
        setPendingCount(loadPendingSales(storage).length);
        setCompletedSale({
          ...localSale,
          pending: true,
          items: cart.map((item) => ({
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio_venta_unit: item.precio_venta_unit,
            subtotal: item.subtotal,
          })),
        });
        setIsReceiptModalOpen(true);
        clearCart();
        setIsOffline(true);
      } else {
        setErrorMessage(err.response?.data?.error || 'Error al procesar la venta');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = async (saleId) => {
    try {
      const response = await api.get(`/receipts/${saleId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-venta-${saleId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error al descargar ticket PDF:', err);
      alert('Error al descargar comprobante PDF');
    }
  };

  const handlePrintThermal = async (saleId) => {
    try {
      if (!window.desktop?.printBuffer) {
        alert('Impresión térmica solo disponible en la aplicación de escritorio');
        return;
      }
      const response = await api.get(`/receipts/${saleId}/escpos`, { responseType: 'arraybuffer' });
      const bytes = new Uint8Array(response.data);
      await window.desktop.printBuffer(bytes);
    } catch (err) {
      console.error('Error al imprimir ticket térmico:', err);
      alert(err.response?.data?.error || err.message || 'Error al imprimir en la impresora térmica');
    }
  };

  const handleNewSale = () => {
    setIsReceiptModalOpen(false);
    setCompletedSale(null);
    clearCart();
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // Sync automática de ventas pendientes (offline-first)
  const syncPendingSales = async () => {
    const pending = loadPendingSales(storage);
    if (pending.length === 0) return;
    let synced = 0;
    let failed = false;
    for (const entry of pending) {
      try {
        await api.post('/sales', entry.payload);
        removePendingSale(storage, entry.localId);
        synced += 1;
      } catch (err) {
        if (isNetworkError(err)) {
          failed = true;
          break;
        }
        // Error de validación del servidor: descartar la venta corrupta
        removePendingSale(storage, entry.localId);
      }
    }
    if (synced > 0) {
      setPendingCount(loadPendingSales(storage).length);
      await fetchCatalog();
      setIsOffline(false);
    }
    if (failed) {
      setIsOffline(true);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncPendingSales();
    };
    const handleOffline = () => setIsOffline(true);
    setIsOffline(isNetworkUnavailable());
    setPendingCount(loadPendingSales(storage).length);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick cash buttons helper
  const setCashQuick = (amount) => {
    setReceivedAmount(amount.toString());
  };

  // Actualiza el ref con los valores actuales para el listener de teclado
  stateRef.current = {
    cart, paymentMethod, cashGiven, cartTotal, isReceiptModalOpen, isHelpOpen,
    isProcessing, handleCheckout, setPaymentMethod, setReceivedAmount,
    setSearchTerm, setErrorMessage, setIsReceiptModalOpen, handleNewSale,
  };

  const filteredProducts = products.filter((prod) => {
    const matchesCategory =
      selectedCategory === 'ALL' || String(prod.categoria_id) === String(selectedCategory);

    const matchesSearch =
      prod.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prod.codigo_barras && prod.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      <div className="pos-container">
        {/* Sección Izquierda: Catálogo y Búsqueda */}
        <section className="pos-catalog-section">
          <div className="pos-search-header">
            <div className="pos-header-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsHelpOpen(true)}
                title="Ver atajos de teclado (F1)"
              >
                ⌨️ Atajos (F1)
              </button>
              {isOffline && (
                <span className="pos-conn-badge offline" title="Sin conexión: operando en modo offline">
                  📡 Sin conexión
                </span>
              )}
              {!isOffline && pendingCount > 0 && (
                <span className="pos-conn-badge pending" title={`${pendingCount} venta(s) pendiente(s) de sincronizar`}>
                  ⏳ {pendingCount} pendiente(s)
                </span>
              )}
            </div>
            <form onSubmit={handleSearchSubmit}>
              <div className="pos-scanner-input-wrapper">
                <span className="pos-scanner-icon">⚡</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="pos-scanner-input"
                  placeholder="Escanear código de barras con lector o escribir nombre de producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </form>

            <div className="pos-categories-pills">
              <button
                className={`pos-cat-pill ${selectedCategory === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('ALL')}
              >
                Todas las categorías
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`pos-cat-pill ${String(selectedCategory) === String(c.id) ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(c.id)}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              Cargando productos...
            </div>
          ) : (
            <div className="pos-products-grid">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.stock_actual <= 0;
                return (
                  <div
                    key={prod.id}
                    className={`pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                    onClick={() => !isOutOfStock && addToCart(prod)}
                    title={isOutOfStock ? 'Producto Agotado' : `Clic para agregar: ${prod.nombre}`}
                  >
                    <div>
                      <div className="pos-card-title">{prod.nombre}</div>
                      {prod.codigo_barras && (
                        <span className="pos-card-barcode">{prod.codigo_barras}</span>
                      )}
                    </div>
                    <div className="pos-card-footer">
                      <span className="pos-card-price">${parseFloat(prod.precio_venta).toFixed(2)}</span>
                      <span className="pos-card-stock" style={{ color: isOutOfStock ? '#dc2626' : '#64748b' }}>
                        {isOutOfStock ? 'Agotado' : `${prod.stock_actual} disp.`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sección Derecha: Carrito y Panel de Cobro */}
        <section className="pos-cart-section">
          <div className="pos-cart-header">
            <h2>
              <span>🛒</span> Carrito de Venta
            </h2>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="btn btn-secondary btn-sm"
                title="Limpiar todos los productos del carrito"
              >
                Vaciar
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="alert alert-error" style={{ margin: '0.5rem', fontSize: '0.8rem' }}>
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Lista de productos en el carrito */}
          <div className="pos-cart-items-list">
            {cart.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛍️</div>
                <p>El carrito está vacío</p>
                <span style={{ fontSize: '0.75rem' }}>
                  Escanee un código de barras o haga clic en un producto para comenzar.
                </span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="pos-cart-item">
                  <div className="pos-item-info">
                    <div className="pos-item-name">{item.nombre}</div>
                    <div className="pos-item-price">${item.precio_venta_unit.toFixed(2)} c/u</div>
                  </div>

                  <div className="pos-qty-controls">
                    <button
                      className="pos-btn-qty"
                      onClick={() => updateQuantity(item.product_id, item.cantidad - 1)}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.stock_actual}
                      className="pos-qty-input"
                      value={item.cantidad}
                      onChange={(e) => updateQuantity(item.product_id, e.target.value)}
                    />
                    <button
                      className="pos-btn-qty"
                      onClick={() => updateQuantity(item.product_id, item.cantidad + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="pos-item-subtotal">${item.subtotal.toFixed(2)}</div>

                  <button
                    className="pos-btn-remove"
                    onClick={() => removeFromCart(item.product_id)}
                    title="Eliminar producto"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Panel de Cobro y Totales */}
          <div className="pos-checkout-box">
            <div className="pos-summary-row">
              <span>Subtotal:</span>
              <strong>${cartSubtotal.toFixed(2)}</strong>
            </div>

            <div className="pos-summary-row" style={{ alignItems: 'center' }}>
              <span>Descuento ($):</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={cartSubtotal}
                style={{ width: '80px', textAlign: 'right', padding: '0.2rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>

            <div className="pos-total-row">
              <span>TOTAL:</span>
              <span className="pos-total-amount">${cartTotal.toFixed(2)}</span>
            </div>

            {/* Selector de Método de Pago */}
            <div className="pos-payment-methods">
              <button
                type="button"
                className={`pos-method-btn ${paymentMethod === 'EFECTIVO' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('EFECTIVO');
                  setReceivedAmount('');
                }}
              >
                💵 Efectivo
              </button>
              <button
                type="button"
                className={`pos-method-btn ${paymentMethod === 'TARJETA' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('TARJETA');
                  setReceivedAmount(cartTotal.toString());
                }}
              >
                💳 Tarjeta
              </button>
              <button
                type="button"
                className={`pos-method-btn ${paymentMethod === 'TRANSFERENCIA' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('TRANSFERENCIA');
                  setReceivedAmount(cartTotal.toString());
                }}
              >
                📲 Transfer.
              </button>
            </div>

            {/* Opciones de pago en Efectivo */}
            {paymentMethod === 'EFECTIVO' && (
              <>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '2px' }}>
                    Efectivo Recibido ($):
                  </label>
                  <input
                    id="received-amount-input"
                    type="number"
                    step="0.01"
                    min={cartTotal}
                    className="form-input"
                    style={{ fontSize: '1.1rem', fontWeight: '700', textAlign: 'right', color: '#1e40af' }}
                    placeholder={`$${cartTotal.toFixed(2)}`}
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                  />
                </div>

                <div className="pos-cash-denominations">
                  <button type="button" className="pos-denom-btn" onClick={() => setCashQuick(cartTotal)}>
                    Exacto
                  </button>
                  <button type="button" className="pos-denom-btn" onClick={() => setCashQuick(5)}>$5</button>
                  <button type="button" className="pos-denom-btn" onClick={() => setCashQuick(10)}>$10</button>
                  <button type="button" className="pos-denom-btn" onClick={() => setCashQuick(20)}>$20</button>
                  <button type="button" className="pos-denom-btn" onClick={() => setCashQuick(50)}>$50</button>
                  <button type="button" className="pos-denom-btn" onClick={() => setCashQuick(100)}>$100</button>
                </div>

                <div className={`pos-change-box ${!isCashSufficient ? 'insufficient' : ''}`}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                    {isCashSufficient ? 'Cambio / Vuelto:' : 'Falta dinero:'}
                  </span>
                  <strong style={{ fontSize: '1.2rem', color: isCashSufficient ? '#059669' : '#dc2626' }}>
                    ${Math.abs(changeToReturn).toFixed(2)}
                  </strong>
                </div>
              </>
            )}

            <button
              onClick={handleCheckout}
              className="pos-btn-checkout"
              disabled={cart.length === 0 || !isCashSufficient || isProcessing}
            >
              {isProcessing ? 'Procesando Venta...' : '⚡ COBRAR VENTA (F2)'}
            </button>
          </div>
        </section>
      </div>

      {/* Overlay de Ayuda de Atajos */}
      {isHelpOpen && (
        <div className="modal-overlay" onClick={() => setIsHelpOpen(false)}>
          <div className="modal-dialog help-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⌨️ Atajos de Teclado (Caja)</h3>
              <button onClick={() => setIsHelpOpen(false)} className="btn-close">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: '0.85rem', lineHeight: '1.9' }}>
                <div><kbd>F1</kbd> <span>Mostrar / ocultar ayuda de atajos</span></div>
                <div><kbd>F2</kbd> <span>Cobrar la venta actual</span></div>
                <div><kbd>F3</kbd> <span>Enfocar monto recibido (efectivo)</span></div>
                <div><kbd>F4</kbd> <span>Cambiar método de pago (efectivo → tarjeta → transferencia)</span></div>
                <div><kbd>F5</kbd> / <kbd>Ctrl+K</kbd> <span>Enfocar buscador / escáner</span></div>
                <div><kbd>Enter</kbd> <span>En buscador: agregar producto por código o nombre</span></div>
                <div><kbd>Enter</kbd> <span>En modal de venta: iniciar nueva venta</span></div>
                <div><kbd>Esc</kbd> <span>Cerrar modal / limpiar búsqueda</span></div>
                <div><kbd>Tab</kbd> <span>Navegar entre controles del carrito y cobro</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsHelpOpen(false)} className="btn btn-primary">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comprobante / Venta Finalizada */}
      {isReceiptModalOpen && completedSale && (
        <div className="modal-overlay" onClick={handleNewSale}>
          <div className="modal-dialog" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: completedSale.pending ? '#92400e' : '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{completedSale.pending ? '📥' : '✅'}</span>
                {completedSale.pending ? 'Venta Guardada en Cola' : '¡Venta Registrada con Éxito!'}
              </h3>
              <button onClick={handleNewSale} className="btn-close">✕</button>
            </div>

            {completedSale.pending && (
              <div
                style={{
                  margin: '0.5rem 1rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#92400e',
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                }}
              >
                Sin conexión: la venta quedó en la cola local y se sincronizará automáticamente al reconectar.
              </div>
            )}

            <div className="modal-body" style={{ background: '#f8fafc' }}>
              {/* Resumen destacado del cambio */}
              {completedSale.metodo_pago === 'EFECTIVO' && (
                <div
                  style={{
                    backgroundColor: '#dcfce7',
                    border: '2px solid #86efac',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: '600' }}>
                    CAMBIO A ENTREGAR AL CLIENTE
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: '#15803d' }}>
                    ${parseFloat(completedSale.cambio).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Vista previa del ticket térmico */}
              <div className="ticket-preview">
                <div className="ticket-header">
                  <strong>TIENDA LA BENDICIÓN</strong>
                  <div>Barrio El Centro, calle principal #12</div>
                  <div>Tel: +503 7000-0000</div>
                  <div className="ticket-divider"></div>
                  <div><strong>COMPROBANTE: {completedSale.numero_comprobante || `PENDIENTE-${completedSale.created_at || ''}`}</strong></div>
                  <div>Fecha: {new Date(completedSale.created_at).toLocaleString()}</div>
                  <div>Cajero: {user?.nombre || 'Cajero'}</div>
                </div>

                <div className="ticket-divider"></div>

                <div style={{ fontSize: '0.75rem', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                  <span>PRODUCTO</span>
                  <span>CANT x PRECIO = TOTAL</span>
                </div>

                <div className="ticket-divider"></div>

                {completedSale.items?.map((item, idx) => (
                  <div key={idx} className="ticket-item-row">
                    <span>{item.nombre}</span>
                    <span>
                      {item.cantidad} x ${item.precio_venta_unit.toFixed(2)} = ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}

                <div className="ticket-divider"></div>

                <div className="ticket-item-row">
                  <span>Subtotal:</span>
                  <span>${parseFloat(completedSale.subtotal).toFixed(2)}</span>
                </div>

                {parseFloat(completedSale.descuento) > 0 && (
                  <div className="ticket-item-row">
                    <span>Descuento:</span>
                    <span>-${parseFloat(completedSale.descuento).toFixed(2)}</span>
                  </div>
                )}

                <div className="ticket-item-row" style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                  <span>TOTAL:</span>
                  <span>${parseFloat(completedSale.total).toFixed(2)}</span>
                </div>

                <div className="ticket-item-row">
                  <span>Método de Pago:</span>
                  <span>{completedSale.metodo_pago}</span>
                </div>

                {completedSale.metodo_pago === 'EFECTIVO' && (
                  <>
                    <div className="ticket-item-row">
                      <span>Recibido:</span>
                      <span>${parseFloat(completedSale.monto_recibido).toFixed(2)}</span>
                    </div>
                    <div className="ticket-item-row" style={{ fontWeight: '700' }}>
                      <span>Cambio:</span>
                      <span>${parseFloat(completedSale.cambio).toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="ticket-divider"></div>
                <div style={{ textAlign: 'center', fontSize: '0.7rem' }}>
                  ¡Gracias por su compra!<br />
                  Conserve este ticket para cualquier reclamo.
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleDownloadPdf(completedSale.id)}
                  className="btn btn-secondary btn-sm"
                  disabled={!completedSale.id}
                  title={!completedSale.id ? 'Disponible tras sincronizar la venta' : ''}
                >
                  📄 Descargar PDF
                </button>
                <button
                  onClick={() => handlePrintThermal(completedSale.id)}
                  className="btn btn-secondary btn-sm"
                  disabled={!completedSale.id}
                  title={!completedSale.id ? 'Disponible tras sincronizar la venta' : ''}
                >
                  🖨️ Ticket Térmico
                </button>
              </div>

              <button onClick={handleNewSale} className="btn btn-success">
                🛒 Nueva Venta (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}