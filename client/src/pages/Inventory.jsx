import { useState, useEffect } from 'react';
import { api } from '../api/axiosClient.js';
import { Icon } from '../components/Icons.jsx';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'LOW_STOCK' | 'HISTORY'
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({
    total_productos: 0,
    unidades_totales: 0,
    valor_total_costo: 0,
    valor_total_venta: 0,
    alertas_stock_bajo: 0,
  });
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form states
  const [entryForm, setEntryForm] = useState({ product_id: '', cantidad: 1, motivo: 'Recepción de mercadería' });
  const [adjustForm, setAdjustForm] = useState({
    product_id: '',
    tipo_operacion: 'SUMAR',
    cantidad: 1,
    motivo: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [overviewRes, productsRes, lowStockRes, historyRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/products?active=true'),
        api.get('/inventory/stock-low'),
        api.get('/inventory/history?limit=100'),
      ]);

      setOverview(overviewRes.data.resumen || {});
      setProducts(productsRes.data.products || []);
      setLowStockProducts(lowStockRes.data.products || []);
      setMovements(historyRes.data.movements || []);
    } catch (err) {
      console.error(err);
      setMessage({
        text: err.response?.data?.error || 'Error al cargar datos de inventario',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const openEntryModal = (prod = null) => {
    setSelectedProduct(prod);
    setEntryForm({
      product_id: prod ? prod.id : (products[0]?.id || ''),
      cantidad: 1,
      motivo: 'Recepción de mercadería / Compra',
    });
    setFormError('');
    setIsEntryModalOpen(true);
  };

  const openAdjustModal = (prod = null) => {
    setSelectedProduct(prod);
    setAdjustForm({
      product_id: prod ? prod.id : (products[0]?.id || ''),
      tipo_operacion: 'SUMAR',
      cantidad: 1,
      motivo: '',
    });
    setFormError('');
    setIsAdjustModalOpen(true);
  };

  const handleEntrySubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!entryForm.product_id || Number(entryForm.cantidad) <= 0) {
      setFormError('Seleccione un producto e ingrese una cantidad válida mayor a 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/inventory/entries', entryForm);
      setMessage({ text: res.data.mensaje, type: 'success' });
      setIsEntryModalOpen(false);
      await fetchInventoryData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al registrar entrada de mercadería');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!adjustForm.product_id) {
      setFormError('Seleccione un producto');
      return;
    }

    if (!adjustForm.motivo.trim()) {
      setFormError('El motivo del ajuste es obligatorio para la auditoría (ej. merma, daño, recuento)');
      return;
    }

    if (Number(adjustForm.cantidad) <= 0) {
      setFormError('Ingrese una cantidad válida mayor a 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/inventory/adjustments', adjustForm);
      setMessage({ text: res.data.mensaje, type: 'success' });
      setIsAdjustModalOpen(false);
      await fetchInventoryData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al aplicar ajuste');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inventario / Bodega</h1>
          <p>Módulo 4 — Entradas de mercadería, ajustes manuales, kardex y control de existencias.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => openAdjustModal()} className="btn btn-secondary">
            <span>⚖️</span>
            <span>Ajustar Stock</span>
          </button>
          <button onClick={() => openEntryModal()} className="btn btn-primary">
            <span>📥</span>
            <span>Entrada de Mercadería</span>
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{message.text}</span>
          <button
            onClick={() => setMessage({ text: '', type: '' })}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tarjetas KPI de Resumen */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-blue"><Icon name="box" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">{overview.unidades_totales || 0}</span>
            <span className="stat-label">Unidades en Existencia</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-green">💰</div>
          <div className="stat-content">
            <span className="stat-value">${parseFloat(overview.valor_total_costo || 0).toFixed(2)}</span>
            <span className="stat-label">Valorización a Costo</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-yellow"><Icon name="tag" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">${parseFloat(overview.valor_total_venta || 0).toFixed(2)}</span>
            <span className="stat-label">Valor Estimado a Venta</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-red"><Icon name="alert" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">{lowStockProducts.length}</span>
            <span className="stat-label">Alertas de Stock Bajo</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación Interna */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
          onClick={() => setActiveTab('OVERVIEW')}
        >
          <span>📦 Existencias Actuales</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'LOW_STOCK' ? 'active' : ''}`}
          onClick={() => setActiveTab('LOW_STOCK')}
        >
          <span>⚠️ Alertas de Reabastecimiento</span>
          {lowStockProducts.length > 0 && (
            <span className="tab-badge">{lowStockProducts.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          <span>📜 Historial de Movimientos (Kardex)</span>
        </button>
      </div>

      {/* Contenido según Pestaña */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          Cargando datos de inventario...
        </div>
      ) : activeTab === 'OVERVIEW' ? (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Stock Mínimo</th>
                <th>Stock Actual</th>
                <th>Valor Stock (Costo)</th>
                <th style={{ textAlign: 'right' }}>Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => {
                const isLow = prod.stock_actual <= prod.stock_minimo;
                const valorCosto = (parseFloat(prod.precio_costo) * prod.stock_actual).toFixed(2);
                return (
                  <tr key={prod.id}>
                    <td>
                      {prod.codigo_barras ? (
                        <span className="barcode-badge">{prod.codigo_barras}</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td><strong>{prod.nombre}</strong></td>
                    <td>{prod.categoria_nombre || 'General'}</td>
                    <td>{prod.stock_minimo} unid.</td>
                    <td>
                      {isLow ? (
                        <span className="stock-pill-low">
                          ⚠️ {prod.stock_actual} unid.
                        </span>
                      ) : (
                        <span className="stock-pill-ok">
                          {prod.stock_actual} unid.
                        </span>
                      )}
                    </td>
                    <td>${valorCosto}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => openEntryModal(prod)}
                          className="btn btn-secondary btn-sm"
                          title="Registrar entrada de mercadería"
                        >
                          📥 Entrada
                        </button>
                        <button
                          onClick={() => openAdjustModal(prod)}
                          className="btn btn-secondary btn-sm"
                          title="Ajustar existencia"
                        >
                          ⚖️ Ajustar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'LOW_STOCK' ? (
        <div className="table-container">
          {lowStockProducts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#166534' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <strong>¡Excelente! Todos los productos cuentan con niveles de stock adecuados.</strong>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock Actual</th>
                  <th>Stock Mínimo</th>
                  <th>Déficit / Requerido</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((prod) => {
                  const faltante = Math.max(0, prod.stock_minimo - prod.stock_actual);
                  return (
                    <tr key={prod.id} style={{ backgroundColor: '#fff5f5' }}>
                      <td>
                        {prod.codigo_barras ? (
                          <span className="barcode-badge">{prod.codigo_barras}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <strong style={{ color: '#991b1b' }}>{prod.nombre}</strong>
                      </td>
                      <td>{prod.categoria_nombre || 'General'}</td>
                      <td>
                        <span className="stock-pill-low">
                          {prod.stock_actual} unid.
                        </span>
                      </td>
                      <td>{prod.stock_minimo} unid.</td>
                      <td>
                        <strong style={{ color: '#dc2626' }}>
                          +{faltante} unidades para nivel óptimo
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => openEntryModal(prod)}
                          className="btn btn-primary btn-sm"
                        >
                          📥 Reabastecer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="table-container">
          {movements.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              No hay movimientos de inventario registrados aún.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Motivo / Referencia</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mov) => {
                  const isEntrada = mov.tipo === 'ENTRADA';
                  const isSalida = mov.tipo === 'SALIDA';
                  return (
                    <tr key={mov.id}>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(mov.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: isEntrada ? '#dcfce7' : isSalida ? '#fee2e2' : '#fef3c7',
                            color: isEntrada ? '#166534' : isSalida ? '#991b1b' : '#92400e',
                          }}
                        >
                          {mov.tipo}
                        </span>
                      </td>
                      <td><strong>{mov.product_nombre}</strong></td>
                      <td>
                        <strong style={{ color: mov.cantidad > 0 ? '#166534' : '#991b1b' }}>
                          {mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad} unid.
                        </strong>
                      </td>
                      <td>{mov.motivo}</td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {mov.user_nombre || 'Sistema'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal Entrada de Mercadería */}
      {isEntryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEntryModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📥 Registrar Entrada de Mercadería</h3>
              <button onClick={() => setIsEntryModalOpen(false)} className="btn-close">✕</button>
            </div>

            <form onSubmit={handleEntrySubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error">
                    <span>⚠️</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="entry_product">
                    Producto a Ingresar *
                  </label>
                  <select
                    id="entry_product"
                    className="form-select"
                    value={entryForm.product_id}
                    onChange={(e) => setEntryForm((prev) => ({ ...prev, product_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Seleccione un producto --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (Stock actual: {p.stock_actual})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="entry_qty">
                    Cantidad Recibida (Unidades) *
                  </label>
                  <input
                    id="entry_qty"
                    type="number"
                    min="1"
                    className="form-input"
                    value={entryForm.cantidad}
                    onChange={(e) => setEntryForm((prev) => ({ ...prev, cantidad: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="entry_motivo">
                    Motivo / Referencia de Factura o Proveedor
                  </label>
                  <input
                    id="entry_motivo"
                    type="text"
                    className="form-input"
                    value={entryForm.motivo}
                    onChange={(e) => setEntryForm((prev) => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Ej. Factura #4582 - Distribuidora Central"
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsEntryModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajuste de Stock */}
      {isAdjustModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAdjustModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚖️ Registrar Ajuste Manual de Inventario</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="btn-close">✕</button>
            </div>

            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error">
                    <span>⚠️</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="adj_product">
                    Producto a Ajustar *
                  </label>
                  <select
                    id="adj_product"
                    className="form-select"
                    value={adjustForm.product_id}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, product_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Seleccione un producto --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} (Stock actual: {p.stock_actual})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adj_tipo">
                    Tipo de Operación *
                  </label>
                  <select
                    id="adj_tipo"
                    className="form-select"
                    value={adjustForm.tipo_operacion}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, tipo_operacion: e.target.value }))}
                    required
                  >
                    <option value="SUMAR">➕ Sumar unidades al stock actual</option>
                    <option value="RESTAR">➖ Restar unidades (Merma / Daño / Vencimiento)</option>
                    <option value="FIJAR">🔢 Fijar nuevo conteo físico exacto</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adj_qty">
                    {adjustForm.tipo_operacion === 'FIJAR' ? 'Nuevo Conteo Físico Total *' : 'Cantidad a Ajustar *'}
                  </label>
                  <input
                    id="adj_qty"
                    type="number"
                    min="0"
                    className="form-input"
                    value={adjustForm.cantidad}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, cantidad: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adj_motivo">
                    Justificación del Ajuste (Obligatorio) *
                  </label>
                  <input
                    id="adj_motivo"
                    type="text"
                    className="form-input"
                    value={adjustForm.motivo}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Ej. Producto quebrado en bodega, error de digitación previo, etc."
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Aplicando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
