import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      const routes = {
        student: '/student',
        teacher: '/teacher',
        hod: '/hod',
        creator_admin: '/admin',
      };
      navigate(routes[user.role] || '/');
    } catch (err) {
      if (!err.response) {
        setError('⚠️ Cannot connect to backend server. Please verify the FastAPI server is running on http://localhost:8000');
      } else {
        setError(err.response?.data?.detail || 'Invalid username or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left Info Panel: Overview, Accreditations & Courses */}
        <div className="login-info-card">
          <div className="login-info-header">
            <div className="login-info-badges">
              <span className="info-pill pill-gold">⭐ NAAC 'A' Grade</span>
              <span className="info-pill pill-blue">🏛️ UGC Autonomous</span>
              <span className="info-pill pill-cyan">🏆 NBA Accredited</span>
              <span className="info-pill pill-indigo">Est. 2008</span>
            </div>
            <h2 className="login-info-title">Geethanjali Institute of Science & Technology</h2>
            <p className="login-info-subtitle">
              Premier Autonomous Engineering & Technology Institution in Andhra Pradesh
            </p>
          </div>

          <div className="login-info-section">
            <h3 className="section-label">📍 Overview & Affiliation</h3>
            <div className="info-details-list">
              <div className="info-detail-item">
                <span className="info-detail-icon">🏛️</span>
                <div>
                  <strong>Status & Recognition:</strong> Autonomous institution recognized by UGC; accredited by <strong>NAAC with 'A' Grade</strong> and select programs accredited by <strong>NBA</strong>.
                </div>
              </div>
              <div className="info-detail-item">
                <span className="info-detail-icon">🎓</span>
                <div>
                  <strong>Affiliation:</strong> Affiliated with{' '}
                  <a
                    href="https://www.jntua.ac.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="info-link"
                  >
                    Jawaharlal Nehru Technological University Anantapur (JNTUA) ↗
                  </a>
                </div>
              </div>
              <div className="info-detail-item">
                <span className="info-detail-icon">📍</span>
                <div>
                  <strong>Campus Location:</strong> 3rd Mile, Bombay Highway, Gangavaram (V), Kovur (M), SPSR Nellore, Andhra Pradesh - 524137.
                </div>
              </div>
            </div>
          </div>

          <div className="login-info-section">
            <h3 className="section-label">📚 Academic Programs & Courses Offered</h3>
            <div className="courses-grid">
              <div className="course-category-card">
                <div className="course-cat-title">🎓 Undergraduate (B.Tech)</div>
                <div className="course-chips">
                  <span className="course-chip">CSE</span>
                  <span className="course-chip">AI / ML</span>
                  <span className="course-chip">Data Science</span>
                  <span className="course-chip">Cyber Security</span>
                  <span className="course-chip">ECE</span>
                  <span className="course-chip">EEE</span>
                  <span className="course-chip">Mechanical</span>
                  <span className="course-chip">Civil</span>
                </div>
              </div>

              <div className="course-category-row">
                <div className="course-category-card">
                  <div className="course-cat-title">🔬 Postgraduate (M.Tech)</div>
                  <p className="course-cat-desc">Computer Science and Engineering (CSE)</p>
                </div>

                <div className="course-category-card">
                  <div className="course-cat-title">📜 Diploma Programs</div>
                  <p className="course-cat-desc">3-Year Polytechnic Diplomas in Core Technical Fields</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sign In Panel */}
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo-container">
              <div className="login-logo-card">
                <img src="/gist-logo-transparent.png" alt="GIST College Logo" className="login-logo-image" />
              </div>
            </div>
            <h1 className="login-title">GIST Digital Campus</h1>
            <p className="login-subtitle">Sign in to access your portal</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="form-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '⏳ Signing in...' : '🔐 Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            Digital Campus Platform • GIST Nellore
          </div>
        </div>
      </div>
    </div>
  );
}
