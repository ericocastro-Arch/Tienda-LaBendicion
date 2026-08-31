import { useState, useEffect } from 'react';
import { api } from '../api/axiosClient.js';
import { Icon } from '../components/Icons.jsx';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('DAILY'); // 'DAILY' | 'TOP_PRODUCTS' | 'MONTHLY' | 'INVENTORY'
  const [dateRange, setDateRange] = useState('MONTH'); // 'TODAY' | '7DAYS' | 'MONTH' | 'ALL'
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState({
    total_ingresos: 0,
    ganancia_bruta_total: 0,
    total_transacciones: 0,
    ticket_promedio: 0,
    total_articulos_vendidos: 0,
  });
  const [dailyReport, setDailyReport] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [inventoryReport, setInventoryReport] = useState([]);

  const getDateParams = () => {
    const today = new Date();
    let start_date = null;
    let end_date = today.toISOString().split('T')[0];

    if (dateRange === 'TODAY') {
      start_date = end_date;
    } else if (dateRange === '7DAYS') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      start_date = past.toISOString().split('T')[0];
    } else if (dateRange === 'MONTH') {
      const past = new Date(today.getFullYear(), today.getMonth(), 1);
      start_date = past.toISOString().split('T')[0];
    }

    return { start_date, end_date: dateRange === 'ALL' ? null : end_date };
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = getDateParams();
      const queryParams = new URLSearchParams();
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const [sumRes, dailyRes, topRes, monthlyRes, invRes] = await Promise.all([
        api.get(`/reports/summary${queryString}`),
        api.get(`/reports/sales/daily${queryString}`),
        api.get(`/reports/products/top${queryString}`),
        api.get('/reports/sales/monthly'),
        api.get('/reports/inventory'),
      ]);

      setSummary(sumRes.data.summary || {});
      setDailyReport(dailyRes.data.daily || []);
      setTopProducts(topRes.data.topProducts || []);
      setMonthlyReport(monthlyRes.data.monthly || []);
      setInventoryReport(invRes.data.inventoryByCategory || []);
    } catch (err) {
      console.error('Error al cargar reportes analíticos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  // Cálculo del margen porcentual promedio
  const totalIngresos = parseFloat(summary.total_ingresos) || 0;
  const gananciaBruta = parseFloat(summary.ganancia_bruta_total) || 0;
  const margenPorcentaje = totalIngresos > 0 ? ((gananciaBruta / totalIngresos) * 100).toFixed(1) : '0.0';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inteligencia de Negocios y Reportes</h1>
          <p>Módulo 7 — Análisis de rendimiento comercial, rotación de productos y margen de ganancia.</p>
        </div>

        {/* Selector de Rango de Fechas */}
        <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#e2e8f0', padding: '0.25rem', borderRadius: '8px' }}>
          <button
            className={`btn btn-sm ${dateRange === 'TODAY' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDateRange('TODAY')}
          >
            Hoy
          </button>
          <button
            className={`btn btn-sm ${dateRange === '7DAYS' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDateRange('7DAYS')}
          >
            Últimos 7 Días
          </button>
          <button
            className={`btn btn-sm ${dateRange === 'MONTH' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDateRange('MONTH')}
          >
            Este Mes
          </button>
          <button
            className={`btn btn-sm ${dateRange === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDateRange('ALL')}
          >
            Histórico Total
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen Analítico */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-green"><Icon name="money" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">${totalIngresos.toFixed(2)}</span>
            <span className="stat-label">Facturación / Ingresos Totales</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-blue"><Icon name="chart" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">${gananciaBruta.toFixed(2)}</span>
            <span className="stat-label">Ganancia Bruta ({margenPorcentaje}%)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-yellow"><Icon name="receipt" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">{summary.total_transacciones || 0}</span>
            <span className="stat-label">Ventas Realizadas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-blue"><Icon name="dashboard" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">${parseFloat(summary.ticket_promedio || 0).toFixed(2)}</span>
            <span className="stat-label">Ticket Promedio por Cliente</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Reportes */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'DAILY' ? 'active' : ''}`}
          onClick={() => setActiveTab('DAILY')}
        >
          <span>📅 Ventas Diarias</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'TOP_PRODUCTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('TOP_PRODUCTS')}
        >
          <span>🏆 Productos Más Vendidos (Rotación)</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'MONTHLY' ? 'active' : ''}`}
          onClick={() => setActiveTab('MONTHLY')}
        >
          <span>📊 Comparativo Mensual</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'INVENTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('INVENTORY')}
        >
          <span>📦 Valorización de Inventario</span>
        </button>
      </div>

      {/* Contenido según Pestaña */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          Procesando consultas analíticas...
        </div>
      ) : activeTab === 'DAILY' ? (
        <div className="table-container">
          <div className="table-toolbar">
            <strong>Evolución y Acumulado Diario de Ventas</strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Cálculo con Window Functions (Running Total)
            </span>
          </div>
          {dailyReport.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              No hay ventas en el período seleccionado.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Transacciones</th>
                  <th>Total Facturado</th>
                  <th>Ganancia Bruta</th>
                  <th>Total Acumulado (Progresivo)</th>
                  <th>Ganancia Acumulada</th>
                </tr>
              </thead>
              <tbody>
                {dailyReport.map((day, idx) => (
                  <tr key={idx}>
                    <td><strong>{new Date(day.fecha).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</strong></td>
                    <td>{day.total_transacciones} ventas</td>
                    <td>
                      <strong style={{ color: '#1e40af' }}>${parseFloat(day.total_ventas).toFixed(2)}</strong>
                    </td>
                    <td>
                      <span className="margin-pill">
                        +${parseFloat(day.ganancia_bruta).toFixed(2)}
                      </span>
                    </td>
                    <td>${parseFloat(day.total_acumulado).toFixed(2)}</td>
                    <td style={{ color: '#059669', fontWeight: '700' }}>
                      ${parseFloat(day.ganancia_acumulada).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'TOP_PRODUCTS' ? (
        <div className="table-container">
          <div className="table-toolbar">
            <strong>🏆 Ranking de Productos por Rotación de Ventas</strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Ordenado por volumen de unidades vendidas
            </span>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              No hay datos de rotación en este rango de fechas.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Puesto</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Unidades Vendidas</th>
                  <th>Total Recaudado</th>
                  <th>Ganancia Generada</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((prod, idx) => (
                  <tr key={prod.id}>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#ffedd5' : '#ffffff',
                          color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#c2410c' : '#64748b',
                          fontSize: '0.85rem',
                          fontWeight: '800',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        #{prod.ranking || idx + 1}
                      </span>
                    </td>
                    <td>
                      <strong>{prod.nombre}</strong>
                      {prod.codigo_barras && (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          <code>{prod.codigo_barras}</code>
                        </div>
                      )}
                    </td>
                    <td>{prod.categoria_nombre || 'General'}</td>
                    <td>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                        {prod.unidades_vendidas} unid.
                      </strong>
                    </td>
                    <td>${parseFloat(prod.total_recaudado).toFixed(2)}</td>
                    <td>
                      <span className="margin-pill">
                        +${parseFloat(prod.ganancia_generada).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'MONTHLY' ? (
        <div className="table-container">
          <div className="table-toolbar">
            <strong>Histórico de Ventas por Mes</strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Ranking de facturación mensual</span>
          </div>
          {monthlyReport.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              No hay ventas registradas en el historial.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Transacciones</th>
                  <th>Total Facturado</th>
                  <th>Ganancia Bruta</th>
                  <th>Puesto de Volumen</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReport.map((m, idx) => (
                  <tr key={idx}>
                    <td><strong>{m.mes}</strong></td>
                    <td>{m.total_transacciones} ventas</td>
                    <td>
                      <strong style={{ color: '#1e40af', fontSize: '1rem' }}>
                        ${parseFloat(m.total_ventas).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span className="margin-pill">
                        +${parseFloat(m.ganancia_bruta).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-admin">
                        Top #{m.ranking_volumen}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="table-container">
          <div className="table-toolbar">
            <strong>Valorización del Inventario por Categoría</strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Inversión vs. Rentabilidad proyectada</span>
          </div>
          {inventoryReport.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              No hay productos registrados en el inventario.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Productos</th>
                  <th>Stock Total</th>
                  <th>Inversión (Costo)</th>
                  <th>Venta Estimada</th>
                  <th>Ganancia Potencial</th>
                  <th>Alertas Stock Bajo</th>
                </tr>
              </thead>
              <tbody>
                {inventoryReport.map((cat, idx) => (
                  <tr key={idx}>
                    <td><strong>{cat.categoria}</strong></td>
                    <td>{cat.cantidad_productos} items</td>
                    <td>{cat.unidades_en_stock} unid.</td>
                    <td>${parseFloat(cat.inversion_costo_total).toFixed(2)}</td>
                    <td>${parseFloat(cat.valor_venta_estimado).toFixed(2)}</td>
                    <td>
                      <strong style={{ color: '#059669' }}>
                        +${parseFloat(cat.ganancia_potencial).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      {cat.productos_stock_bajo > 0 ? (
                        <span className="stock-pill-low">
                          ⚠️ {cat.productos_stock_bajo}
                        </span>
                      ) : (
                        <span className="stock-pill-ok">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
