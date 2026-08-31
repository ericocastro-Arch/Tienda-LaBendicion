import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon, StoreLogo } from '../components/Icons.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Por favor ingrese usuario y contraseña');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      // Redirigir según el rol o la ruta previa
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'CAJERO') {
        navigate('/pos', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al conectar con el servidor';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-icon"><StoreLogo /></div>
          <h1>La Bendición</h1>
          <p>Sistema de Gestión y Punto de Venta (POS)</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <Icon name="alert" size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Nombre de Usuario
            </label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej. admin o cajero1"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem', padding: '0.75rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="auth-hint">
          <strong>Acceso predeterminado del sistema:</strong>
          <div>Usuario: <code>admin</code> | Contraseña: <code>admin123</code></div>
        </div>
      </div>
    </div>
  );
}
