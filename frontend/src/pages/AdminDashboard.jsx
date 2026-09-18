import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { usersAPI, departmentsAPI, coursesAPI, announcementsAPI, analyticsAPI } from '../api';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Role separation & filter state
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const reload = () => {
    setLoading(true);
    Promise.all([
      usersAPI.list().then(r => setUsers(r.data)),
      departmentsAPI.list().then(r => setDepartments(r.data)),
      coursesAPI.list().then(r => setCourses(r.data)),
      announcementsAPI.list().then(r => setAnnouncements(r.data)),
      analyticsAPI.get().then(r => setAnalytics(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const openCreateUser = (presetRole = 'student') => {
    setForm({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: presetRole,
      department_id: departments[0]?.id || ''
    });
    setShowModal('user');
  };

  const openCreateDept = () => {
    setForm({ name: '', code: '', description: '', hod_id: '' });
    setShowModal('department');
  };

  const openCreateAnnouncement = () => {
    setForm({ title: '', content: '', priority: 'normal', department_id: null });
    setShowModal('announcement');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (showModal === 'user') {
        await usersAPI.create({
          ...form,
          department_id: form.department_id ? parseInt(form.department_id) : null
        });
      } else if (showModal === 'department') {
        await departmentsAPI.create({
          ...form,
          hod_id: form.hod_id ? parseInt(form.hod_id) : null
        });
      } else if (showModal === 'announcement') {
        await announcementsAPI.create(form);
      }
      setShowModal(null);
      reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await usersAPI.delete(id);
      reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    }
  };

  const handleDeleteDept = async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentsAPI.delete(id);
      reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementsAPI.delete(id);
      reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    }
  };

  const handleToggleUser = async (u) => {
    try {
      await usersAPI.update(u.id, { is_active: !u.is_active });
      reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'departments', label: '🏛️ Departments' },
    { id: 'users', label: '👥 Users by Role' },
    { id: 'courses', label: '📚 Courses' },
    { id: 'announcements', label: '📢 Announcements' },
    { id: 'analytics', label: '📈 Analytics' },
  ];

  const roleColors = {
    student: 'badge-cyan',
    teacher: 'badge-green',
    hod: 'badge-amber',
    creator_admin: 'badge-purple'
  };

  const roleLabels = {
    student: 'Student',
    teacher: 'Teacher',
    hod: 'HOD',
    creator_admin: 'Admin'
  };

  // Filter out system admin from standard user tables
  const campusUsers = users.filter(u => u.role !== 'creator_admin' && u.username !== 'admin');
  const hodUsers = campusUsers.filter(u => u.role === 'hod');
  const teacherUsers = campusUsers.filter(u => u.role === 'teacher');
  const studentUsers = campusUsers.filter(u => u.role === 'student');

  // Filtered list according to current tab sub-filter, search, and department
  const getFilteredUsers = (userList) => {
    return userList.filter(u => {
      const matchSearch =
        u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase());

      const matchDept =
        deptFilter === 'all' ||
        u.department_id === parseInt(deptFilter);

      return matchSearch && matchDept;
    });
  };

  const renderUserTable = (list, roleTitle, roleIcon, emptyText) => {
    const filtered = getFilteredUsers(list);

    return (
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{roleIcon}</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {roleTitle} ({filtered.length} of {list.length})
            </h3>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => openCreateUser(list[0]?.role || 'student')}
            style={{ fontSize: '0.78rem' }}
          >
            + Add {roleTitle.slice(0, -1)}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>{emptyText}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Username</th>
                  <th>Email Address</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          className="user-avatar"
                          style={{
                            width: '32px',
                            height: '32px',
                            fontSize: '0.75rem',
                            background: u.role === 'hod'
                              ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                              : u.role === 'teacher'
                              ? 'linear-gradient(135deg, #16A34A 0%, #059669 100%)'
                              : 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)'
                          }}
                        >
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                          <span className={`badge ${roleColors[u.role]}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                            {roleLabels[u.role]}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td><code>@{u.username}</code></td>
                    <td>{u.email}</td>
                    <td>
                      <span className="dept-badge">{u.department_name || 'Unassigned'}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                        {u.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleUser(u)}
                          title={u.is_active ? 'Deactivate user' : 'Activate user'}
                        >
                          {u.is_active ? '🔒 Deactivate' : '🔓 Activate'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteUser(u.id)}
                          title="Delete user account"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-purple" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', letterSpacing: '0.05em' }}>GIST CAMPUS</span>
            <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              <span className="status-dot-active"></span> Admin Status: Active
            </span>
          </div>
        </div>
        <h1 className="page-title">Admin Dashboard ⚙️</h1>
        <p className="page-subtitle">Geethanjali Institute of Science & Technology • Full Campus Management</p>
      </div>

      <div className="page-body">
        <div className="tabs" style={{ overflowX: 'auto' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="fade-in">
            <div style={{ background: 'var(--gradient-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '52px', height: '52px', background: '#FFFFFF', borderRadius: '12px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                  <img src="/gist-logo-transparent.png" alt="GIST College Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Geethanjali Institute of Science and Technology (GIST)</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>Campus Management & Smart AI Academic Portal</p>
                </div>
              </div>
              <span className="badge badge-green" style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}>● GIST System Active</span>
            </div>

            {/* Quick Role Breakdown Cards */}
            <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => { setTab('users'); setUserRoleFilter('hod'); }}
                title="View Heads of Department"
              >
                <div className="stat-icon amber">🎓</div>
                <div>
                  <div className="stat-value">{hodUsers.length}</div>
                  <div className="stat-label">HODs (Dept Heads) ↗</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => { setTab('users'); setUserRoleFilter('teacher'); }}
                title="View Faculty Teachers"
              >
                <div className="stat-icon green">👨‍🏫</div>
                <div>
                  <div className="stat-value">{teacherUsers.length}</div>
                  <div className="stat-label">Faculty Teachers ↗</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => { setTab('users'); setUserRoleFilter('student'); }}
                title="View Enrolled Students"
              >
                <div className="stat-icon cyan">👨‍🎓</div>
                <div>
                  <div className="stat-value">{studentUsers.length}</div>
                  <div className="stat-label">Enrolled Students ↗</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setTab('departments')}
                title="View Departments"
              >
                <div className="stat-icon purple">🏛️</div>
                <div>
                  <div className="stat-value">{departments.length}</div>
                  <div className="stat-label">Departments ↗</div>
                </div>
              </div>
            </div>

            {analytics?.departments && (
              <div style={{ marginTop: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Department Distribution</h2>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Students</th>
                        <th>Teachers</th>
                        <th>Courses</th>
                        <th>Announcements</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.departments.map(d => (
                        <tr key={d.department_id}>
                          <td style={{ fontWeight: 600 }}>{d.department_name}</td>
                          <td><span className="badge badge-cyan">{d.student_count}</span></td>
                          <td><span className="badge badge-green">{d.teacher_count}</span></td>
                          <td><span className="badge badge-purple">{d.course_count}</span></td>
                          <td><span className="badge badge-amber">{d.announcement_count}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Departments Tab */}
        {tab === 'departments' && (
          <div className="fade-in">
            <div className="action-bar">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Campus Departments ({departments.length})</h2>
              <button className="btn btn-primary" onClick={openCreateDept}>+ New Department</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Head of Department (HOD)</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(d => (
                    <tr key={d.id}>
                      <td><span className="badge badge-purple">{d.code}</span></td>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td>
                        {d.hod_name ? (
                          <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>🎓 {d.hod_name}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Not assigned</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{d.description || '-'}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDept(d.id)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users by Role Tab */}
        {tab === 'users' && (
          <div className="fade-in">
            <div className="action-bar" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>👥 User Management by Role</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Organized separation of campus users into HODs, Teachers, and Students
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => openCreateUser()}>
                + New User
              </button>
            </div>

            {/* Role Filter Buttons & Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: '#FFFFFF', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  className={`btn btn-sm ${userRoleFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUserRoleFilter('all')}
                >
                  📋 All Roles ({campusUsers.length})
                </button>
                <button
                  className={`btn btn-sm ${userRoleFilter === 'hod' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUserRoleFilter('hod')}
                >
                  🎓 HODs ({hodUsers.length})
                </button>
                <button
                  className={`btn btn-sm ${userRoleFilter === 'teacher' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUserRoleFilter('teacher')}
                >
                  👨‍🏫 Teachers ({teacherUsers.length})
                </button>
                <button
                  className={`btn btn-sm ${userRoleFilter === 'student' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUserRoleFilter('student')}
                >
                  👨‍🎓 Students ({studentUsers.length})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="form-select"
                  style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                >
                  <option value="all">🏢 All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                <div className="search-input">
                  <input
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem 0.4rem 2.2rem', minWidth: '200px', fontSize: '0.85rem' }}
                    placeholder="Search by name, email..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Separate Role Sections */}
            {(userRoleFilter === 'all' || userRoleFilter === 'hod') && (
              renderUserTable(
                hodUsers,
                'Heads of Department (HODs)',
                '🎓',
                'No HOD accounts found matching criteria.'
              )
            )}

            {(userRoleFilter === 'all' || userRoleFilter === 'teacher') && (
              renderUserTable(
                teacherUsers,
                'Faculty Members (Teachers)',
                '👨‍🏫',
                'No Faculty accounts found matching criteria.'
              )
            )}

            {(userRoleFilter === 'all' || userRoleFilter === 'student') && (
              renderUserTable(
                studentUsers,
                'Enrolled Students',
                '👨‍🎓',
                'No Student accounts found matching criteria.'
              )
            )}
          </div>
        )}

        {/* Courses Tab */}
        {tab === 'courses' && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>All Campus Courses ({courses.length})</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Teacher</th>
                    <th>Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c.id}>
                      <td><span className="badge badge-purple">{c.code}</span></td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td><span className="dept-badge">{c.department_name}</span></td>
                      <td>{c.teacher_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                      <td>{c.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {tab === 'announcements' && (
          <div className="fade-in">
            <div className="action-bar">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>System Announcements</h2>
              <button className="btn btn-primary" onClick={openCreateAnnouncement}>+ System Announcement</button>
            </div>
            {announcements.map(a => (
              <div key={a.id} className={`announcement-item ${a.priority}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="announcement-meta">
                      <span className={`badge badge-${a.priority === 'urgent' ? 'red' : a.priority === 'high' ? 'amber' : 'purple'}`}>
                        {a.priority}
                      </span>
                      <span className="dept-badge">{a.department_name || 'College-Wide'}</span>
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{a.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.content}</p>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAnnouncement(a.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>System Analytics</h2>
            {analytics ? (
              <>
                <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
                  <div className="stat-card">
                    <div className="stat-icon purple">👥</div>
                    <div>
                      <div className="stat-value">{analytics.total_users}</div>
                      <div className="stat-label">Total Users</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon cyan">🏛️</div>
                    <div>
                      <div className="stat-value">{analytics.total_departments}</div>
                      <div className="stat-label">Departments</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon green">📚</div>
                    <div>
                      <div className="stat-value">{analytics.total_courses}</div>
                      <div className="stat-label">Courses</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon amber">📢</div>
                    <div>
                      <div className="stat-value">{analytics.total_announcements}</div>
                      <div className="stat-label">Announcements</div>
                    </div>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Students</th>
                        <th>Teachers</th>
                        <th>Courses</th>
                        <th>Announcements</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.departments.map(d => (
                        <tr key={d.department_id}>
                          <td style={{ fontWeight: 600 }}>{d.department_name}</td>
                          <td><span className="badge badge-cyan">{d.student_count}</span></td>
                          <td><span className="badge badge-green">{d.teacher_count}</span></td>
                          <td><span className="badge badge-purple">{d.course_count}</span></td>
                          <td><span className="badge badge-amber">{d.announcement_count}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📈</div>
                <div className="empty-state-title">Analytics unavailable</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal === 'user' && (
        <Modal title={`Create ${form.role ? form.role.toUpperCase() : 'User'}`} onClose={() => setShowModal(null)}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="e.g. john_doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="e.g. user@gist.edu.in" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="e.g. Dr. John Doe" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Temporary password" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="hod">HOD (Department Head)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-select" value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})}>
                <option value="">None / General</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'department' && (
        <Modal title="Create Department" onClose={() => setShowModal(null)}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Computer Science and Engineering" />
            </div>
            <div className="form-group">
              <label className="form-label">Code</label>
              <input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="e.g. CSE" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Assign HOD</label>
            <select className="form-select" value={form.hod_id} onChange={e => setForm({...form, hod_id: e.target.value})}>
              <option value="">None</option>
              {hodUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} (@{u.username})</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'announcement' && (
        <Modal title="System Announcement" onClose={() => setShowModal(null)}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Announcement headline" />
          </div>
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea className="form-textarea" value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Details..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target Department</label>
              <select className="form-select" value={form.department_id || ''} onChange={e => setForm({...form, department_id: e.target.value ? parseInt(e.target.value) : null})}>
                <option value="">College-Wide (All Departments)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
