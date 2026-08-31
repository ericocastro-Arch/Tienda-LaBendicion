import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axiosClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icons.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    total_ingresos: 0,
    ganancia_bruta_total: 0,
    total_transacciones: 0,
    ticket_promedio: 0,
  });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, salesRes, stockRes] = await Promise.all([
        api.get('/reports/summary'),
        api.get('/sales?limit=6'),
        api.get('/inventory/stock-low'),
      ]);

      setSummary(sumRes.data.summary || {});
      setRecentSales(salesRes.data.sales || []);
      setLowStockList(stockRes.data.products || []);
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Panel de Control</h1>
          <p>Bienvenido, <strong>{user?.nombre} {user?.apellido}</strong> ({user?.role}). Resumen operativo del negocio.</p>
        </div>
        <Link to="/pos" className="btn btn-primary" style={{ padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}>
          <Icon name="bolt" size={18} />
          <span>Abrir Punto de Venta</span>
        </Link>
      </div>

      {/* 4 KPIs Principales */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-green"><Icon name="money" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">${parseFloat(summary.total_ingresos || 0).toFixed(2)}</span>
            <span className="stat-label">Ingresos Totales por Ventas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-blue"><Icon name="chart" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">${parseFloat(summary.ganancia_bruta_total || 0).toFixed(2)}</span>
            <span className="stat-label">Ganancia Bruta Acumulada</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-yellow"><Icon name="receipt" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">{summary.total_transacciones || 0}</span>
            <span className="stat-label">Tickets Emitidos (Ventas)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-red"><Icon name="alert" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">{lowStockList.length}</span>
            <span className="stat-label">Productos con Stock Bajo</span>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1e293b' }}>
          <span className="section-title-icon"><Icon name="bolt" size={18} /></span> Accesos rápidos a módulos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <Link to="/pos" className="btn btn-secondary" style={{ justifyContent: 'center', padding: '0.75rem' }}>
            <Icon name="cart" size={17} /> Nueva Venta (POS)
          </Link>
          <Link to="/products" className="btn btn-secondary" style={{ justifyContent: 'center', padding: '0.75rem' }}>
            <Icon name="box" size={17} /> Catálogo de Productos
          </Link>
          <Link to="/inventory" className="btn btn-secondary" style={{ justifyContent: 'center', padding: '0.75rem' }}>
            <Icon name="box" size={17} /> Entrada de Mercadería
          </Link>
          <Link to="/reports" className="btn btn-secondary" style={{ justifyContent: 'center', padding: '0.75rem' }}>
            <Icon name="chart" size={17} /> Reportes Analíticos
          </Link>
        </div>
      </div>

      {/* Grid: Últimas Ventas y Alertas de Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Últimas Ventas */}
        <div className="table-container">
          <div className="table-toolbar">
            <strong className="table-title"><Icon name="receipt" size={17} /> Últimas ventas registradas</strong>
            <Link to="/reports" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' }}>
              Ver todas →
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando ventas...</div>
          ) : recentSales.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              No se han realizado ventas aún.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td><code>{sale.numero_comprobante || '#' + sale.id}</code></td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                        {sale.metodo_pago}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <strong style={{ color: '#166534' }}>${parseFloat(sale.total).toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Alertas de Stock Crítico */}
        <div className="table-container">
          <div className="table-toolbar">
            <strong className="table-title table-title-alert"><Icon name="alert" size={17} /> Alertas de reabastecimiento</strong>
            <Link to="/inventory" style={{ fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none' }}>
              Ir a Bodega →
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Verificando stock...</div>
          ) : lowStockList.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#166534' }}>
              ✅ Todo el inventario se encuentra en niveles óptimos.
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Stock Actual</th>
                  <th>Mínimo</th>
                  <th style={{ textAlign: 'right' }}>Déficit</th>
                </tr>
              </thead>
              <tbody>
                {lowStockList.slice(0, 5).map((prod) => (
                  <tr key={prod.id} style={{ backgroundColor: '#fff5f5' }}>
                    <td><strong>{prod.nombre}</strong></td>
                    <td>
                      <span className="stock-pill-low">{prod.stock_actual} unid.</span>
                    </td>
                    <td>{prod.stock_minimo} unid.</td>
                    <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: '700' }}>
                      +{Math.max(0, prod.stock_minimo - prod.stock_actual)} req.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
