import { useState, useEffect } from 'react';
import { api } from '../api/axiosClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [storeForm, setStoreForm] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    logo_url: '',
  });
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [storeRes, infoRes] = await Promise.all([
        api.get('/store'),
        api.get('/store/info'),
      ]);
      setStoreForm(storeRes.data.store || {});
      setSystemInfo(infoRes.data.system || {});
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error al cargar la configuración de la tienda', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStoreForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    if (!storeForm.nombre.trim()) {
      setMessage({ text: 'El nombre comercial de la tienda es obligatorio', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.put('/store', storeForm);
      setMessage({ text: res.data.mensaje, type: 'success' });
      setStoreForm(res.data.store);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Error al guardar configuración', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      const response = await api.get('/store/backup', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute('download', `backup-labendicion-${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage({ text: 'Copia de seguridad generada y descargada con éxito', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error al exportar la base de datos', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Configuración del Sistema</h1>
          <p>Módulo 8 — Parámetros comerciales de la tienda, respaldo de base de datos y estado general.</p>
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

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          Cargando configuración...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {/* Formulario de Datos Comerciales */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏪</span> Datos de la Tienda de Barrio
            </h3>

            <form onSubmit={handleSaveStore}>
              <div className="form-group">
                <label className="form-label" htmlFor="nombre">
                  Nombre Comercial *
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  className="form-input"
                  value={storeForm.nombre}
                  onChange={handleInputChange}
                  placeholder="Tienda de Barrio La Bendición"
                  disabled={!isAdmin}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="direccion">
                  Dirección Física
                </label>
                <input
                  id="direccion"
                  name="direccion"
                  type="text"
                  className="form-input"
                  value={storeForm.direccion}
                  onChange={handleInputChange}
                  placeholder="Barrio El Centro, Calle Principal #12"
                  disabled={!isAdmin}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="telefono">
                  Teléfono de Contacto
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="text"
                  className="form-input"
                  value={storeForm.telefono}
                  onChange={handleInputChange}
                  placeholder="+503 7000-0000"
                  disabled={!isAdmin}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="logo_url">
                  URL del Logo (Opcional)
                </label>
                <input
                  id="logo_url"
                  name="logo_url"
                  type="text"
                  className="form-input"
                  value={storeForm.logo_url || ''}
                  onChange={handleInputChange}
                  placeholder="https://ejemplo.com/logo.png"
                  disabled={!isAdmin}
                />
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando...' : '💾 Guardar Datos Comerciales'}
                </button>
              )}
            </form>
          </div>

          {/* Panel de Respaldo y Diagnóstico Técnico */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Respaldo de Base de Datos */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>💾</span> Respaldo de Base de Datos
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                Genere una copia de seguridad completa de todos los catálogos, existencias, ventas y comprobantes en formato estructurado para salvaguardar la información del negocio.
              </p>

              {isAdmin ? (
                <button
                  onClick={handleDownloadBackup}
                  className="btn btn-success"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
                  disabled={isExporting}
                >
                  {isExporting ? 'Generando Respaldo...' : '📥 Descargar Copia de Seguridad'}
                </button>
              ) : (
                <div className="alert alert-error" style={{ fontSize: '0.8rem' }}>
                  Solo los administradores pueden descargar copias de seguridad.
                </div>
              )}
            </div>

            {/* Diagnóstico del Sistema */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚙️</span> Estado del Sistema
              </h3>

              {systemInfo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                    <span style={{ color: '#64748b' }}>Motor de Base de Datos:</span>
                    <strong>{systemInfo.estado_bd}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                    <span style={{ color: '#64748b' }}>Backend Server:</span>
                    <strong>{systemInfo.servidor}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                    <span style={{ color: '#64748b' }}>Productos Activos:</span>
                    <strong>{systemInfo.productos_activos} items</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                    <span style={{ color: '#64748b' }}>Personal Registrado:</span>
                    <strong>{systemInfo.empleados_activos} usuarios</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem' }}>
                    <span style={{ color: '#64748b' }}>Total Ventas Registradas:</span>
                    <strong style={{ color: '#2563eb' }}>{systemInfo.ventas_totales_historicas} transacciones</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}