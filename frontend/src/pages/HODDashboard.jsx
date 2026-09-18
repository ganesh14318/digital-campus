import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { usersAPI, coursesAPI, schedulesAPI, announcementsAPI, analyticsAPI } from '../api';

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

export default function HODDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const reload = () => {
    setLoading(true);
    Promise.all([
      usersAPI.list({ department_id: user.department_id })
        .then(r => {
          const allDeptUsers = r.data || [];
          setTeachers(allDeptUsers.filter(u => u.role === 'teacher'));
          setStudents(allDeptUsers.filter(u => u.role === 'student'));
        })
        .catch(() => {
          setTeachers([]);
          setStudents([]);
        }),
      coursesAPI.list().then(r => setCourses(r.data)),
      schedulesAPI.list().then(r => setSchedules(r.data)),
      announcementsAPI.list().then(r => setAnnouncements(r.data)),
      analyticsAPI.get().then(r => setAnalytics(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const openCreate = (type) => {
    setEditItem(null);
    if (type === 'course') setForm({ name: '', code: '', description: '', credits: 3, semester: 1, department_id: user.department_id, teacher_id: '' });
    if (type === 'announcement') setForm({ title: '', content: '', priority: 'normal', department_id: user.department_id });
    if (type === 'schedule') setForm({ course_id: '', day_of_week: 'Monday', start_time: '09:00', end_time: '10:30', room: '', department_id: user.department_id });
    setShowModal(type);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (showModal === 'course') {
        if (editItem) await coursesAPI.update(editItem.id, form);
        else await coursesAPI.create(form);
      } else if (showModal === 'announcement') {
        if (editItem) await announcementsAPI.update(editItem.id, form);
        else await announcementsAPI.create(form);
      } else if (showModal === 'schedule') {
        if (editItem) await schedulesAPI.update(editItem.id, form);
        else await schedulesAPI.create(form);
      }
      setShowModal(null);
      reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      if (type === 'course') await coursesAPI.delete(id);
      else if (type === 'schedule') await schedulesAPI.delete(id);
      else await announcementsAPI.delete(id);
      reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading HOD dashboard...</p>
      </div>
    );
  }

  const deptAnalytics = analytics?.departments?.find(d => d.department_id === user.department_id);

  const filteredTeachers = teachers.filter(t =>
    t.full_name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.username.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.username.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'teachers', label: `👨‍🏫 Faculty (${teachers.length})` },
    { id: 'students', label: `👨‍🎓 Students (${students.length})` },
    { id: 'courses', label: '📚 Courses' },
    { id: 'schedule', label: '📅 Schedule' },
    { id: 'announcements', label: '📢 Announcements' },
  ];

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">HOD Dashboard 🎓</h1>
            <p className="page-subtitle">GIST • {user?.full_name} • Head of {user?.department_name || 'Department'}</p>
          </div>
          <div className="dept-badge" style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
            🏛️ {user?.department_name || 'Department'} Division
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
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
            <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setTab('teachers')}
                title="Click to view Faculty roster"
              >
                <div className="stat-icon purple">👨‍🏫</div>
                <div>
                  <div className="stat-value">{teachers.length}</div>
                  <div className="stat-label">Department Faculty ↗</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setTab('students')}
                title="Click to view Students roster"
              >
                <div className="stat-icon cyan">👨‍🎓</div>
                <div>
                  <div className="stat-value">{students.length}</div>
                  <div className="stat-label">Enrolled Students ↗</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setTab('courses')}
                title="Click to view Courses"
              >
                <div className="stat-icon green">📚</div>
                <div>
                  <div className="stat-value">{courses.length}</div>
                  <div className="stat-label">Active Courses ↗</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setTab('announcements')}
                title="Click to view Announcements"
              >
                <div className="stat-icon amber">📢</div>
                <div>
                  <div className="stat-value">{announcements.length}</div>
                  <div className="stat-label">Announcements ↗</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* Quick Faculty Preview */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">👨‍🏫 Faculty Overview ({teachers.length})</h3>
                  <button className="btn btn-secondary btn-sm" onClick={() => setTab('teachers')}>View All</button>
                </div>
                {teachers.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No teachers in this department.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {teachers.slice(0, 4).map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#F8FAFC', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.email}</div>
                        </div>
                        <span className="badge badge-purple">Teacher</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Student Preview */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">👨‍🎓 Student Overview ({students.length})</h3>
                  <button className="btn btn-secondary btn-sm" onClick={() => setTab('students')}>View All</button>
                </div>
                {students.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No students enrolled in this department.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {students.slice(0, 4).map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#F8FAFC', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{s.username} • {s.email}</div>
                        </div>
                        <span className="badge badge-cyan">Student</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              📢 Recent Department Announcements
            </h2>
            {announcements.slice(0, 3).map(a => (
              <div key={a.id} className={`announcement-item ${a.priority}`}>
                <div className="announcement-meta">
                  <span className={`badge badge-${a.priority === 'urgent' ? 'red' : a.priority === 'high' ? 'amber' : 'purple'}`}>
                    {a.priority}
                  </span>
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{a.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Teachers Tab */}
        {tab === 'teachers' && (
          <div className="fade-in">
            <div className="action-bar">
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>👨‍🏫 Department Faculty Members</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Showing all professors and lecturers in the {user?.department_name} Department ({filteredTeachers.length} of {teachers.length})
                </p>
              </div>
              <div className="search-input">
                <input
                  className="form-input"
                  placeholder="Search faculty by name, username..."
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredTeachers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🏫</div>
                <div className="empty-state-title">No Faculty Found</div>
                <p>No teachers matched your search in this department.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Faculty Member</th>
                      <th>Username</th>
                      <th>Email Address</th>
                      <th>Department</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map(t => (
                      <tr key={t.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                              {t.full_name?.charAt(0) || 'T'}
                            </div>
                            <span style={{ fontWeight: 600 }}>{t.full_name}</span>
                          </div>
                        </td>
                        <td><code>@{t.username}</code></td>
                        <td>{t.email}</td>
                        <td><span className="dept-badge">{t.department_name || user?.department_name}</span></td>
                        <td>
                          <span className={`badge ${t.is_active ? 'badge-green' : 'badge-red'}`}>
                            {t.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {tab === 'students' && (
          <div className="fade-in">
            <div className="action-bar">
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>👨‍🎓 Enrolled Department Students</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Roster of students registered in the {user?.department_name} Department ({filteredStudents.length} of {students.length})
                </p>
              </div>
              <div className="search-input">
                <input
                  className="form-input"
                  placeholder="Search students by name, email..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🎓</div>
                <div className="empty-state-title">No Students Found</div>
                <p>No student accounts found matching your query in this department.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Username / Roll</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(s => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', background: 'linear-gradient(135deg, #06B6D4 0%, #2563EB 100%)' }}>
                              {s.full_name?.charAt(0) || 'S'}
                            </div>
                            <span style={{ fontWeight: 600 }}>{s.full_name}</span>
                          </div>
                        </td>
                        <td><code>@{s.username}</code></td>
                        <td>{s.email}</td>
                        <td><span className="dept-badge">{s.department_name || user?.department_name}</span></td>
                        <td>
                          <span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>
                            {s.is_active ? '● Enrolled' : '○ Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Courses Tab */}
        {tab === 'courses' && (
          <div className="fade-in">
            <div className="action-bar">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Department Courses</h2>
              <button className="btn btn-primary" onClick={() => openCreate('course')}>+ Add Course</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Teacher</th>
                    <th>Credits</th>
                    <th>Semester</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c.id}>
                      <td><span className="badge badge-purple">{c.code}</span></td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.teacher_name || 'Unassigned'}</td>
                      <td>{c.credits}</td>
                      <td>{c.semester || '-'}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete('course', c.id)}>
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

        {/* Schedule Tab */}
        {tab === 'schedule' && (
          <div className="fade-in">
            <div className="action-bar">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Schedule</h2>
              <button className="btn btn-primary" onClick={() => openCreate('schedule')}>+ Add Slot</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Course</th>
                    <th>Room</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(s => (
                    <tr key={s.id}>
                      <td><span className="badge badge-cyan">{s.day_of_week}</span></td>
                      <td>{s.start_time} - {s.end_time}</td>
                      <td style={{ fontWeight: 600 }}>{s.course_name}</td>
                      <td>{s.room || 'TBD'}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete('schedule', s.id)}>
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

        {/* Announcements Tab */}
        {tab === 'announcements' && (
          <div className="fade-in">
            <div className="action-bar">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Announcements</h2>
              <button className="btn btn-primary" onClick={() => openCreate('announcement')}>+ New</button>
            </div>
            {announcements.map(a => (
              <div key={a.id} className={`announcement-item ${a.priority}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="announcement-meta">
                      <span className={`badge badge-${a.priority === 'urgent' ? 'red' : a.priority === 'high' ? 'amber' : 'purple'}`}>
                        {a.priority}
                      </span>
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{a.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.content}</p>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete('announcement', a.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal === 'course' && (
        <Modal title="New Course" onClose={() => setShowModal(null)}>
          <div className="form-group">
            <label className="form-label">Code</label>
            <input className="form-input" value={form.code || ''} onChange={e => setForm({...form, code: e.target.value})} placeholder="e.g. CS301" />
          </div>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Database Systems" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Credits</label>
              <input className="form-input" type="number" value={form.credits} onChange={e => setForm({...form, credits: parseInt(e.target.value) || 3})} />
            </div>
            <div className="form-group">
              <label className="form-label">Semester</label>
              <input className="form-input" type="number" value={form.semester} onChange={e => setForm({...form, semester: parseInt(e.target.value) || 1})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Assign Faculty Member</label>
            <select className="form-select" value={form.teacher_id || ''} onChange={e => setForm({...form, teacher_id: e.target.value ? parseInt(e.target.value) : null})}>
              <option value="">Unassigned</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
          </div>
        </Modal>
      )}

      {showModal === 'schedule' && (
        <Modal title="New Schedule Slot" onClose={() => setShowModal(null)}>
          <div className="form-group">
            <label className="form-label">Course</label>
            <select className="form-select" value={form.course_id || ''} onChange={e => setForm({...form, course_id: parseInt(e.target.value)})}>
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Day</label>
            <select className="form-select" value={form.day_of_week} onChange={e => setForm({...form, day_of_week: e.target.value})}>
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input className="form-input" type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input className="form-input" type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Room</label>
            <input className="form-input" value={form.room || ''} onChange={e => setForm({...form, room: e.target.value})} placeholder="e.g. Lab 3 / Room 204" />
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
          </div>
        </Modal>
      )}

      {showModal === 'announcement' && (
        <Modal title="New Announcement" onClose={() => setShowModal(null)}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} placeholder="Announcement headline" />
          </div>
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea className="form-textarea" value={form.content || ''} onChange={e => setForm({...form, content: e.target.value})} placeholder="Details..." />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
