import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon, StoreLogo } from './Icons.jsx';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Sidebar de Navegación */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-logo"><StoreLogo /></div>
          <div className="brand-info">
            <h2>La Bendición</h2>
            <span className="brand-tag">Sistema POS & Gestión</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-title">Operaciones</div>
          
          <NavLink
            to="/pos"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon"><Icon name="cart" /></span>
            <span>Punto de Venta</span>
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon"><Icon name="box" /></span>
            <span>Productos</span>
          </NavLink>

          <NavLink
            to="/inventory"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon"><Icon name="chart" /></span>
            <span>Inventario / Bodega</span>
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-group-title">Administración</div>
              
              <NavLink
                to="/"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon"><Icon name="dashboard" /></span>
                <span>Panel de Control</span>
              </NavLink>

              <NavLink
                to="/reports"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon"><Icon name="report" /></span>
                <span>Reportes</span>
              </NavLink>

              <NavLink
                to="/employees"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon"><Icon name="users" /></span>
                <span>Empleados</span>
              </NavLink>

              <NavLink
                to="/settings"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon"><Icon name="settings" /></span>
                <span>Configuración</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Perfil de Usuario en el pie del Sidebar */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.nombre?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.nombre} {user?.apellido}</span>
              <span className={`user-role-badge badge-${user?.role?.toLowerCase()}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-logout"
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
