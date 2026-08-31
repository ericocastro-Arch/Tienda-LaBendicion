import { useState, useEffect } from 'react';
import { api } from '../api/axiosClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Products() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modal states: Product
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    categoria_id: '',
    codigo_barras: '',
    nombre: '',
    descripcion: '',
    precio_costo: '',
    precio_venta: '',
    stock_minimo: 5,
    stock_actual: 0,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state: Category
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ nombre: '', descripcion: '' });
  const [categoryError, setCategoryError] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/categories'),
      ]);
      setProducts(prodRes.data.products);
      setCategories(catRes.data.categories);
    } catch (err) {
      console.error(err);
      setMessage({
        text: err.response?.data?.error || 'Error al cargar catálogo de productos',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      categoria_id: categories[0]?.id || '',
      codigo_barras: '',
      nombre: '',
      descripcion: '',
      precio_costo: '',
      precio_venta: '',
      stock_minimo: 5,
      stock_actual: 0,
    });
    setFormError('');
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      categoria_id: prod.categoria_id || '',
      codigo_barras: prod.codigo_barras || '',
      nombre: prod.nombre,
      descripcion: prod.descripcion || '',
      precio_costo: prod.precio_costo,
      precio_venta: prod.precio_venta,
      stock_minimo: prod.stock_minimo,
      stock_actual: prod.stock_actual,
    });
    setFormError('');
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setFormError('');
  };

  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({ ...prev, [name]: value }));
  };

  // Cálculo en tiempo real del margen y rentabilidad
  const costoNum = parseFloat(productForm.precio_costo) || 0;
  const ventaNum = parseFloat(productForm.precio_venta) || 0;
  const margenCalculado = (ventaNum - costoNum).toFixed(2);
  const porcentajeCalculado =
    costoNum > 0 ? (((ventaNum - costoNum) / costoNum) * 100).toFixed(1) : '100.0';

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!productForm.nombre.trim()) {
      setFormError('El nombre del producto es obligatorio');
      return;
    }

    if (isNaN(costoNum) || costoNum < 0 || isNaN(ventaNum) || ventaNum < 0) {
      setFormError('Los precios deben ser valores numéricos válidos y no negativos');
      return;
    }

    if (ventaNum < costoNum) {
      if (!window.confirm('El precio de venta es menor que el costo (margen negativo). ¿Desea continuar?')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, productForm);
        setMessage({ text: 'Producto actualizado con éxito', type: 'success' });
      } else {
        await api.post('/products', productForm);
        setMessage({ text: 'Producto registrado con éxito', type: 'success' });
      }
      closeProductModal();
      await fetchData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleProductStatus = async (prod) => {
    const actionText = prod.is_active ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Está seguro de que desea ${actionText} "${prod.nombre}"?`)) {
      return;
    }

    try {
      const res = await api.patch(`/products/${prod.id}/toggle`);
      setMessage({ text: res.data.mensaje, type: 'success' });
      await fetchData();
    } catch (err) {
      setMessage({
        text: err.response?.data?.error || `Error al ${actionText} producto`,
        type: 'error',
      });
    }
  };

  const handleCreateCategorySubmit = async (e) => {
    e.preventDefault();
    setCategoryError('');
    if (!categoryForm.nombre.trim()) {
      setCategoryError('El nombre de la categoría es obligatorio');
      return;
    }

    setIsSubmittingCategory(true);
    try {
      const res = await api.post('/products/categories', categoryForm);
      setCategories((prev) => [...prev, res.data.category]);
      setProductForm((prev) => ({ ...prev, categoria_id: res.data.category.id }));
      setIsCategoryModalOpen(false);
      setCategoryForm({ nombre: '', descripcion: '' });
      setMessage({ text: 'Categoría agregada exitosamente', type: 'success' });
    } catch (err) {
      setCategoryError(err.response?.data?.error || 'Error al crear la categoría');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      prod.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prod.codigo_barras && prod.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (prod.categoria_nombre && prod.categoria_nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      filterCategory === 'ALL' || String(prod.categoria_id) === String(filterCategory);

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && prod.is_active) ||
      (filterStatus === 'INACTIVE' && !prod.is_active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Catálogo de Productos</h1>
          <p>Módulo 3 — Administración de inventario, códigos de barras, precios y márgenes.</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setIsCategoryModalOpen(true)} className="btn btn-secondary">
              <span>🏷️</span>
              <span>Nueva Categoría</span>
            </button>
            <button onClick={openCreateProductModal} className="btn btn-primary">
              <span>➕</span>
              <span>Nuevo Producto</span>
            </button>
          </div>
        )}
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

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-search">
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Buscar por nombre, código de barra o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ width: '170px' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="ALL">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: '150px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Solo Activos</option>
              <option value="INACTIVE">Solo Inactivos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            Cargando catálogo...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            No se encontraron productos registrados.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Costo</th>
                <th>Precio Venta</th>
                <th>Margen Ganancia</th>
                <th>Existencia</th>
                <th>Estado</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((prod) => {
                const isLow = prod.is_stock_low || prod.stock_actual <= prod.stock_minimo;
                return (
                  <tr key={prod.id} style={{ opacity: prod.is_active ? 1 : 0.65 }}>
                    <td>
                      {prod.codigo_barras ? (
                        <span className="barcode-badge">{prod.codigo_barras}</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Sin código</span>
                      )}
                    </td>
                    <td>
                      <strong>{prod.nombre}</strong>
                      {prod.descripcion && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {prod.descripcion}
                        </div>
                      )}
                    </td>
                    <td>{prod.categoria_nombre || 'General'}</td>
                    <td>${parseFloat(prod.precio_costo).toFixed(2)}</td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>
                        ${parseFloat(prod.precio_venta).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span className="margin-pill">
                        +${(parseFloat(prod.precio_venta) - parseFloat(prod.precio_costo)).toFixed(2)}
                        <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>
                          ({prod.porcentaje_margen || 0}%)
                        </span>
                      </span>
                    </td>
                    <td>
                      {isLow ? (
                        <span className="stock-pill-low" title={`Stock mínimo: ${prod.stock_minimo}`}>
                          ⚠️ {prod.stock_actual} unid.
                        </span>
                      ) : (
                        <span className="stock-pill-ok">
                          {prod.stock_actual} unid.
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${prod.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {prod.is_active ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => openEditProductModal(prod)}
                            className="btn btn-secondary btn-sm"
                            title="Editar producto"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleToggleProductStatus(prod)}
                            className={`btn ${prod.is_active ? 'btn-danger' : 'btn-success'} btn-sm`}
                            title={prod.is_active ? 'Desactivar producto' : 'Reactivar producto'}
                          >
                            {prod.is_active ? '🚫' : '✅'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear / Editar Producto */}
      {isProductModalOpen && (
        <div className="modal-overlay" onClick={closeProductModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}</h3>
              <button onClick={closeProductModal} className="btn-close">✕</button>
            </div>

            <form onSubmit={handleProductSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error">
                    <span>⚠️</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="nombre">
                    Nombre del Producto *
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    className="form-input"
                    value={productForm.nombre}
                    onChange={handleProductInputChange}
                    placeholder="Ej. Arroz Blanco San Pedro 1lb"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="codigo_barras">
                      Código de Barras (EAN-13, UPC-A, etc.)
                    </label>
                    <input
                      id="codigo_barras"
                      name="codigo_barras"
                      type="text"
                      className="form-input"
                      value={productForm.codigo_barras}
                      onChange={handleProductInputChange}
                      placeholder="Escanee o escriba el código..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="categoria_id">
                      Categoría
                    </label>
                    <select
                      id="categoria_id"
                      name="categoria_id"
                      className="form-select"
                      value={productForm.categoria_id}
                      onChange={handleProductInputChange}
                    >
                      <option value="">-- Seleccionar categoría --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="descripcion">
                    Descripción corta
                  </label>
                  <input
                    id="descripcion"
                    name="descripcion"
                    type="text"
                    className="form-input"
                    value={productForm.descripcion}
                    onChange={handleProductInputChange}
                    placeholder="Detalles del empaque, presentación o marca"
                  />
                </div>

                {/* Precios y Cálculo de Margen */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="precio_costo">
                        Precio Costo ($) *
                      </label>
                      <input
                        id="precio_costo"
                        name="precio_costo"
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={productForm.precio_costo}
                        onChange={handleProductInputChange}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="precio_venta">
                        Precio Venta ($) *
                      </label>
                      <input
                        id="precio_venta"
                        name="precio_venta"
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={productForm.precio_venta}
                        onChange={handleProductInputChange}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Panel interactivo de margen de ganancia */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Margen de Ganancia:</span>
                    <div>
                      <strong style={{ color: Number(margenCalculado) >= 0 ? '#15803d' : '#b91c1c', fontSize: '1rem' }}>
                        ${margenCalculado}
                      </strong>
                      <span style={{ marginLeft: '6px', color: '#64748b', fontSize: '0.8rem' }}>
                        ({porcentajeCalculado}% utilidad)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="stock_minimo">
                      Stock Mínimo (Alerta) *
                    </label>
                    <input
                      id="stock_minimo"
                      name="stock_minimo"
                      type="number"
                      min="0"
                      className="form-input"
                      value={productForm.stock_minimo}
                      onChange={handleProductInputChange}
                      required
                    />
                  </div>

                  {!editingProduct && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="stock_actual">
                        Stock Inicial
                      </label>
                      <input
                        id="stock_actual"
                        name="stock_actual"
                        type="number"
                        min="0"
                        className="form-input"
                        value={productForm.stock_actual}
                        onChange={handleProductInputChange}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeProductModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Categoría */}
      {isCategoryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="modal-dialog" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nueva Categoría</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="btn-close">✕</button>
            </div>

            <form onSubmit={handleCreateCategorySubmit}>
              <div className="modal-body">
                {categoryError && (
                  <div className="alert alert-error">
                    <span>⚠️</span>
                    <span>{categoryError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="cat_nombre">Nombre de la Categoría *</label>
                  <input
                    id="cat_nombre"
                    type="text"
                    className="form-input"
                    value={categoryForm.nombre}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Lácteos, Carnes, Enlatados..."
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cat_desc">Descripción (opcional)</label>
                  <input
                    id="cat_desc"
                    type="text"
                    className="form-input"
                    value={categoryForm.descripcion}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Breve descripción"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingCategory}>
                  {isSubmittingCategory ? 'Guardando...' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}