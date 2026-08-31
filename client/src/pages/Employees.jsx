import { useState, useEffect } from 'react';
import { api } from '../api/axiosClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Employees() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    rol_id: '',
    nombre: '',
    apellido: '',
    cedula: '',
    telefono: '',
    username: '',
    password: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const [empRes, rolesRes] = await Promise.all([
        api.get('/employees'),
        api.get('/employees/roles'),
      ]);
      setEmployees(empRes.data.employees);
      setRoles(rolesRes.data.roles);
      if (!formData.rol_id && rolesRes.data.roles.length > 0) {
        setFormData((prev) => ({ ...prev, rol_id: rolesRes.data.roles[0].id }));
      }
    } catch (err) {
      console.error(err);
      setMessage({
        text: err.response?.data?.error || 'Error al cargar empleados',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      rol_id: roles[0]?.id || 1,
      nombre: '',
      apellido: '',
      cedula: '',
      telefono: '',
      username: '',
      password: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      rol_id: emp.rol_id,
      nombre: emp.nombre,
      apellido: emp.apellido,
      cedula: emp.cedula || '',
      telefono: emp.telefono || '',
      username: emp.username,
      password: '', // Dejar vacío a menos que se desee cambiar
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.username.trim()) {
      setFormError('Los campos Nombre, Apellido y Usuario son obligatorios.');
      return;
    }

    if (!editingEmployee && !formData.password) {
      setFormError('La contraseña es requerida para un nuevo empleado.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingEmployee) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        await api.patch(`/employees/${editingEmployee.id}`, payload);
        setMessage({ text: 'Empleado actualizado con éxito', type: 'success' });
      } else {
        await api.post('/employees', formData);
        setMessage({ text: 'Empleado registrado con éxito', type: 'success' });
      }
      closeModal();
      await fetchEmployees();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Ocurrió un error al guardar el empleado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    const actionText = emp.is_active ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Está seguro de que desea ${actionText} a ${emp.nombre} ${emp.apellido}?`)) {
      return;
    }

    try {
      const res = await api.patch(`/employees/${emp.id}/toggle`);
      setMessage({ text: res.data.mensaje, type: 'success' });
      await fetchEmployees();
    } catch (err) {
      setMessage({
        text: err.response?.data?.error || `Error al ${actionText} empleado`,
        type: 'error',
      });
    }
  };

  // Filtrado reactivo de empleados
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.cedula && emp.cedula.includes(searchTerm));

    const matchesRole = filterRole === 'ALL' || emp.rol_nombre === filterRole;

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && emp.is_active) ||
      (filterStatus === 'INACTIVE' && !emp.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gestión de Empleados</h1>
          <p>Administración de usuarios, roles del sistema y control de acceso.</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <span>➕</span>
          <span>Nuevo Empleado</span>
        </button>
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
              placeholder="Buscar por nombre, usuario o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ width: '160px' }}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="ALL">Todos los roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="CAJERO">Cajero</option>
            </select>

            <select
              className="form-select"
              style={{ width: '160px' }}
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
            Cargando empleados...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            No se encontraron empleados que coincidan con la búsqueda.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre Completo</th>
                <th>Usuario</th>
                <th>Cédula</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const isCurrent = currentUser?.id === emp.id;
                return (
                  <tr key={emp.id} style={{ opacity: emp.is_active ? 1 : 0.65 }}>
                    <td>#{emp.id}</td>
                    <td>
                      <strong>{emp.nombre} {emp.apellido}</strong>
                      {isCurrent && (
                        <span style={{ fontSize: '0.7rem', marginLeft: '6px', color: '#2563eb' }}>
                          (Tú)
                        </span>
                      )}
                    </td>
                    <td><code>{emp.username}</code></td>
                    <td>{emp.cedula || '—'}</td>
                    <td>{emp.telefono || '—'}</td>
                    <td>
                      <span className={`user-role-badge badge-${emp.rol_nombre.toLowerCase()}`}>
                        {emp.rol_nombre}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${emp.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {emp.is_active ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="btn btn-secondary btn-sm"
                          title="Editar empleado"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`btn ${emp.is_active ? 'btn-danger' : 'btn-success'} btn-sm`}
                          disabled={isCurrent && emp.is_active}
                          title={
                            isCurrent && emp.is_active
                              ? 'No puede desactivar su propia cuenta'
                              : emp.is_active
                              ? 'Desactivar empleado (Soft Delete)'
                              : 'Reactivar empleado'
                          }
                        >
                          {emp.is_active ? '🚫 Desactivar' : '✅ Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Crear / Editar Empleado */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEmployee ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</h3>
              <button onClick={closeModal} className="btn-close">✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error">
                    <span>⚠️</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="nombre">Nombres *</label>
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      className="form-input"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      placeholder="Ej. Juan Carlos"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="apellido">Apellidos *</label>
                    <input
                      id="apellido"
                      name="apellido"
                      type="text"
                      className="form-input"
                      value={formData.apellido}
                      onChange={handleInputChange}
                      placeholder="Ej. Pérez Gómez"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cedula">Cédula / Documento</label>
                    <input
                      id="cedula"
                      name="cedula"
                      type="text"
                      className="form-input"
                      value={formData.cedula}
                      onChange={handleInputChange}
                      placeholder="00000000-0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="telefono">Teléfono</label>
                    <input
                      id="telefono"
                      name="telefono"
                      type="text"
                      className="form-input"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      placeholder="+503 7000-0000"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="username">Nombre de Usuario *</label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      className="form-input"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Ej. jperez"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="rol_id">Rol Asignado *</label>
                    <select
                      id="rol_id"
                      name="rol_id"
                      className="form-select"
                      value={formData.rol_id}
                      onChange={handleInputChange}
                      required
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} - {r.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">
                    {editingEmployee ? 'Nueva Contraseña (dejar en blanco para conservar la actual)' : 'Contraseña de Acceso *'}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={editingEmployee ? '••••••••' : 'Mínimo 6 caracteres'}
                    required={!editingEmployee}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : editingEmployee ? 'Guardar Cambios' : 'Registrar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}