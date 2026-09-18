import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { coursesAPI, schedulesAPI, announcementsAPI, usersAPI } from '../api';

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

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null); // 'course' | 'schedule' | 'announcement'
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const reload = () => {
    setLoading(true);
    Promise.all([
      coursesAPI.list().then(r => setCourses(r.data)),
      schedulesAPI.list().then(r => setSchedules(r.data)),
      announcementsAPI.list().then(r => setAnnouncements(r.data)),
      usersAPI.list({ role: 'student' }).then(r => setStudents(r.data)).catch(() => setStudents([])),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const openCreate = (type) => {
    setEditItem(null);
    if (type === 'course') setForm({ name: '', code: '', description: '', credits: 3, semester: 1, department_id: user.department_id });
    if (type === 'schedule') setForm({ course_id: '', day_of_week: 'Monday', start_time: '09:00', end_time: '10:30', room: '', department_id: user.department_id });
    if (type === 'announcement') setForm({ title: '', content: '', priority: 'normal', department_id: user.department_id });
    setShowModal(type);
  };

  const openEdit = (type, item) => {
    setEditItem(item);
    setForm({ ...item });
    setShowModal(type);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (showModal === 'course') {
        if (editItem) await coursesAPI.update(editItem.id, form);
        else await coursesAPI.create(form);
      } else if (showModal === 'schedule') {
        if (editItem) await schedulesAPI.update(editItem.id, form);
        else await schedulesAPI.create(form);
      } else if (showModal === 'announcement') {
        if (editItem) await announcementsAPI.update(editItem.id, form);
        else await announcementsAPI.create(form);
      }
      setShowModal(null);
      reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure?')) return;
    try {
      if (type === 'course') await coursesAPI.delete(id);
      else if (type === 'schedule') await schedulesAPI.delete(id);
      else await announcementsAPI.delete(id);
      reload();
    } catch (err) { alert(err.response?.data?.detail || 'Delete failed'); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div><p>Loading...</p></div>;

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'students', label: '👨‍🎓 Department Students' },
    { id: 'courses', label: '📚 Courses' },
    { id: 'schedule', label: '📅 Schedule' },
    { id: 'announcements', label: '📢 Announcements' },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Teacher Dashboard 👨‍🏫</h1>
        <p className="page-subtitle">GIST • {user?.full_name} • {user?.department_name} Department</p>
      </div>
      <div className="page-body">
        <div className="tabs">
          {tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>

        {tab === 'overview' && (
          <div className="fade-in">
            <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card"><div className="stat-icon green">👨‍🎓</div><div><div className="stat-value">{students.length}</div><div className="stat-label">Dept Students</div></div></div>
              <div className="stat-card"><div className="stat-icon purple">📚</div><div><div className="stat-value">{courses.length}</div><div className="stat-label">My Courses</div></div></div>
              <div className="stat-card"><div className="stat-icon cyan">📅</div><div><div className="stat-value">{schedules.length}</div><div className="stat-label">Scheduled Classes</div></div></div>
              <div className="stat-card"><div className="stat-icon amber">📢</div><div><div className="stat-value">{announcements.length}</div><div className="stat-label">Announcements</div></div></div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Students in {user?.department_name || 'Department'}</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => setTab('students')}>View All Students →</button>
              </div>
              {students.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">👨‍🎓</div><div className="empty-state-title">No students found</div><p>No students enrolled in this department yet.</p></div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Username / Roll No</th>
                        <th>Email Address</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 5).map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                          <td><code>{s.username}</code></td>
                          <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                          <td>
                            <span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>
                              {s.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'students' && (
          <div className="fade-in">
            <div className="action-bar">
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Department Students ({students.length})</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Registered students enrolled in {user?.department_name || 'your'} department
                </p>
              </div>
            </div>
            {students.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🎓</div>
                <div className="empty-state-title">No students registered yet</div>
                <p>No student accounts currently exist in {user?.department_name || 'this department'}.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th>Username / Roll No</th>
                      <th>Email Address</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Enrolled Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>
                              {s.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'S'}
                            </span>
                            {s.full_name}
                          </span>
                        </td>
                        <td><code>{s.username}</code></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                        <td><span className="badge badge-purple">{s.department_name || user?.department_name || 'N/A'}</span></td>
                        <td>
                          <span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'courses' && (
          <div className="fade-in">
            <div className="action-bar">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>My Courses</h2>
              <button className="btn btn-primary" onClick={() => openCreate('course')}>+ Add Course</button>
            </div>
            {courses.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">No courses yet</div><p>Create your first course to get started.</p></div> :
            <div className="table-container"><table><thead><tr><th>Code</th><th>Name</th><th>Credits</th><th>Semester</th><th>Actions</th></tr></thead><tbody>
              {courses.map(c => <tr key={c.id}><td><span className="badge badge-purple">{c.code}</span></td><td>{c.name}</td><td>{c.credits}</td><td>{c.semester || '-'}</td><td><button className="btn btn-secondary btn-sm" onClick={() => openEdit('course', c)} style={{ marginRight: '0.5rem' }}>✏️</button><button className="btn btn-danger btn-sm" onClick={() => handleDelete('course', c.id)}>🗑️</button></td></tr>)}
            </tbody></table></div>}
          </div>
        )}

        {tab === 'schedule' && (
          <div className="fade-in">
            <div className="action-bar">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Schedule</h2>
              <button className="btn btn-primary" onClick={() => openCreate('schedule')}>+ Add Slot</button>
            </div>
            {schedules.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-title">No schedule entries</div></div> :
            <div className="table-container"><table><thead><tr><th>Day</th><th>Time</th><th>Course</th><th>Room</th><th>Actions</th></tr></thead><tbody>
              {schedules.map(s => <tr key={s.id}><td><span className="badge badge-cyan">{s.day_of_week}</span></td><td>{s.start_time} - {s.end_time}</td><td>{s.course_name}</td><td>{s.room || 'TBD'}</td><td><button className="btn btn-secondary btn-sm" onClick={() => openEdit('schedule', s)} style={{ marginRight: '0.5rem' }}>✏️</button><button className="btn btn-danger btn-sm" onClick={() => handleDelete('schedule', s.id)}>🗑️</button></td></tr>)}
            </tbody></table></div>}
          </div>
        )}

        {tab === 'announcements' && (
          <div className="fade-in">
            <div className="action-bar">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Announcements</h2>
              <button className="btn btn-primary" onClick={() => openCreate('announcement')}>+ New Announcement</button>
            </div>
            {announcements.map(a => (
              <div key={a.id} className={`announcement-item ${a.priority}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div className="announcement-meta"><span className={`badge badge-${a.priority === 'urgent' ? 'red' : a.priority === 'high' ? 'amber' : 'purple'}`}>{a.priority}</span><span>{new Date(a.created_at).toLocaleDateString()}</span></div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{a.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{a.content}</p>
                  </div>
                  {a.author_id === user.id && <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit('announcement', a)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete('announcement', a.id)}>🗑️</button>
                  </div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal === 'course' && (
        <Modal title={editItem ? 'Edit Course' : 'New Course'} onClose={() => setShowModal(null)}>
          <div className="form-group"><label className="form-label">Course Code</label><input className="form-input" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. CS201" /></div>
          <div className="form-group"><label className="form-label">Course Name</label><input className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Data Structures" /></div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Credits</label><input className="form-input" type="number" value={form.credits || 3} onChange={e => setForm({ ...form, credits: parseInt(e.target.value) })} /></div>
            <div className="form-group"><label className="form-label">Semester</label><input className="form-input" type="number" value={form.semester || 1} onChange={e => setForm({ ...form, semester: parseInt(e.target.value) })} /></div>
          </div>
          <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button></div>
        </Modal>
      )}

      {showModal === 'schedule' && (
        <Modal title={editItem ? 'Edit Schedule' : 'New Schedule'} onClose={() => setShowModal(null)}>
          <div className="form-group"><label className="form-label">Course</label><select className="form-select" value={form.course_id || ''} onChange={e => setForm({ ...form, course_id: parseInt(e.target.value) })}><option value="">Select course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Day</label><select className="form-select" value={form.day_of_week || 'Monday'} onChange={e => setForm({ ...form, day_of_week: e.target.value })}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Start Time</label><input className="form-input" type="time" value={form.start_time || '09:00'} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">End Time</label><input className="form-input" type="time" value={form.end_time || '10:30'} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>
          <div className="form-group"><label className="form-label">Room</label><input className="form-input" value={form.room || ''} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="e.g. CS-101" /></div>
          <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button></div>
        </Modal>
      )}

      {showModal === 'announcement' && (
        <Modal title={editItem ? 'Edit Announcement' : 'New Announcement'} onClose={() => setShowModal(null)}>
          <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" /></div>
          <div className="form-group"><label className="form-label">Content</label><textarea className="form-textarea" value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write your announcement..." /></div>
          <div className="form-group"><label className="form-label">Priority</label><select className="form-select" value={form.priority || 'normal'} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
          <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button></div>
        </Modal>
      )}
    </>
  );
}
