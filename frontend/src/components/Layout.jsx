import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="top-navbar">
        <div className="top-navbar-brand">
          <div className="sidebar-logo-badge">
            <img src="/gist-logo-transparent.png" alt="GIST College Logo" className="sidebar-logo-img" />
          </div>
          <div className="sidebar-logo-text-group">
            <span className="sidebar-logo-title">GIST</span>
            <span className="sidebar-logo-subtitle">Digital Campus</span>
          </div>
        </div>

        <div className="top-navbar-right">
          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: 600 }}>
            <span className="status-dot-active"></span> Active
          </span>
          <button className="logout-btn" onClick={handleLogout} style={{ width: 'auto', padding: '0.45rem 0.9rem' }}>
            🚪 Sign Out
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
