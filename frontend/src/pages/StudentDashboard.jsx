import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { coursesAPI, schedulesAPI, announcementsAPI, aiAPI } from '../api';

function StatCard({ icon, colorClass, value, label }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${colorClass}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function CoursesView({ courses }) {
  if (!courses.length) return <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">No courses found</div><p>No courses available for your department yet.</p></div>;
  return (
    <div className="card-grid">
      {courses.map(c => (
        <div key={c.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="badge badge-purple">{c.code}</span>
              <h3 className="card-title" style={{ marginTop: '0.5rem' }}>{c.name}</h3>
            </div>
            <span className="badge badge-cyan">{c.credits} cr</span>
          </div>
          {c.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{c.description}</p>}
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            👨‍🏫 {c.teacher_name || 'Not assigned'} • Semester {c.semester || '-'}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleView({ schedules }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const byDay = {};
  days.forEach(d => byDay[d] = schedules.filter(s => s.day_of_week === d).sort((a, b) => a.start_time.localeCompare(b.start_time)));

  return (
    <div className="timetable-grid">
      {days.map(day => (
        <div key={day}>
          <div className="timetable-day">{day.slice(0, 3)}</div>
          {byDay[day].length ? byDay[day].map(s => (
            <div key={s.id} className="timetable-slot">
              <div className="course-name">{s.course_name}</div>
              <div className="time-range">{s.start_time} - {s.end_time}</div>
              <div className="room">📍 {s.room || 'TBD'}</div>
            </div>
          )) : <div className="timetable-slot" style={{ opacity: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Free</div>}
        </div>
      ))}
    </div>
  );
}

function AnnouncementsView({ announcements }) {
  if (!announcements.length) return <div className="empty-state"><div className="empty-state-icon">📢</div><div className="empty-state-title">No announcements</div></div>;
  return announcements.map(a => (
    <div key={a.id} className={`announcement-item ${a.priority}`}>
      <div className="announcement-meta">
        <span className={`badge badge-${a.priority === 'urgent' ? 'red' : a.priority === 'high' ? 'amber' : 'purple'}`}>{a.priority}</span>
        <span>{a.department_name}</span>
        <span>•</span>
        <span>{new Date(a.created_at).toLocaleDateString()}</span>
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>{a.title}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.content}</p>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>By {a.author_name}</div>
    </div>
  ));
}

function FormattedMessage({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`empty-${lineIdx}`} style={{ height: '0.35rem' }} />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={lineIdx} style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.6rem 0 0.25rem', color: 'var(--text-primary)' }}>
          {renderInline(trimmed.substring(4))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={lineIdx} style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0.7rem 0 0.3rem', color: 'var(--accent-primary)' }}>
          {renderInline(trimmed.substring(3))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const content = trimmed.substring(2);
      elements.push(
        <div key={lineIdx} style={{ display: 'flex', gap: '0.5rem', margin: '0.2rem 0', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>•</span>
          <span style={{ flex: 1 }}>{renderInline(content)}</span>
        </div>
      );
      return;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={lineIdx} style={{ display: 'flex', gap: '0.5rem', margin: '0.2rem 0', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent-secondary)', fontWeight: 700, minWidth: '1.2rem' }}>{numMatch[1]}.</span>
          <span style={{ flex: 1 }}>{renderInline(numMatch[2])}</span>
        </div>
      );
      return;
    }

    elements.push(
      <p key={lineIdx} style={{ margin: '0.25rem 0', lineHeight: 1.55 }}>
        {renderInline(trimmed)}
      </p>
    );
  });

  return <div>{elements}</div>;
}

function renderInline(text) {
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    const codeMatch = remaining.match(/`(.*?)`/);

    let firstMatch = null;
    let matchType = null;

    if (boldMatch && (!codeMatch || boldMatch.index < codeMatch.index)) {
      firstMatch = boldMatch;
      matchType = 'bold';
    } else if (codeMatch) {
      firstMatch = codeMatch;
      matchType = 'code';
    }

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(remaining.substring(0, firstMatch.index));
    }

    if (matchType === 'bold') {
      parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{firstMatch[1]}</strong>);
    } else if (matchType === 'code') {
      parts.push(
        <code key={key++} style={{ background: 'rgba(37, 99, 235, 0.08)', color: 'var(--accent-primary)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.85em', fontFamily: 'monospace' }}>
          {firstMatch[1]}
        </code>
      );
    }

    remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
  }

  return parts;
}

function ChatView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const quickPrompts = [
    "📚 What courses do I have this semester?",
    "📅 What is my schedule for Monday?",
    "👨‍🏫 Who teaches Data Structures?",
    "📢 Any recent campus announcements?",
  ];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const userMsg = (textToSend || input).trim();
    if (!userMsg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const res = await aiAPI.chat(userMsg);
      setMessages(prev => [...prev, { role: 'ai', text: res.data.reply, sources: res.data.sources }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: err.response?.data?.detail || 'AI assistant is currently unavailable. Please check that Ollama is running and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="chat-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '1rem' }}>
            🤖
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>GIST AI Assistant</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="status-dot-active" style={{ width: '6px', height: '6px' }}></span> Connected • Llama 3.2
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
            🗑️ Clear Chat
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>🎓</div>
            <div className="empty-state-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>Welcome to GIST Campus AI</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
              Ask anything about your courses, faculty advisors, lecture schedules, exam dates, or college announcements.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', maxWidth: '540px', margin: '0 auto' }}>
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: '100px', fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-message ${m.role}`} style={{ position: 'relative' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem', opacity: 0.85 }}>
              {m.role === 'user' ? '🧑‍🎓 You' : '🤖 GIST Assistant'}
            </div>
            
            <div style={{ fontSize: '0.9rem', color: m.role === 'user' ? '#FFFFFF' : 'var(--text-primary)' }}>
              <FormattedMessage text={m.text} />
            </div>

            {m.sources?.length > 0 && (
              <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>Verified Sources:</span>
                {m.sources.map((src, sIdx) => (
                  <span key={sIdx} className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                    {src}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-message ai" style={{ width: 'fit-content', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
              🤖 GIST Assistant
            </div>
            <div className="chat-typing" style={{ padding: '0.2rem 0' }}>
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-area" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
        <input
          className="form-input"
          placeholder="Type your question (e.g., 'What is my schedule for Monday?')..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>
          Send ↵
        </button>
      </form>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      coursesAPI.list().then(r => setCourses(r.data)),
      schedulesAPI.list().then(r => setSchedules(r.data)),
      announcementsAPI.list().then(r => setAnnouncements(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div><p>Loading dashboard...</p></div>;

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'courses', label: '📚 Courses' },
    { id: 'schedule', label: '📅 Schedule' },
    { id: 'announcements', label: '📢 Announcements' },
    { id: 'chat', label: '🤖 AI Chat' },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Welcome, {user?.full_name} 👋</h1>
        <p className="page-subtitle">GIST • {user?.department_name} Department • Student Dashboard</p>
      </div>
      <div className="page-body">
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="fade-in">
            <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
              <StatCard icon="📚" colorClass="purple" value={courses.length} label="Enrolled Courses" />
              <StatCard icon="📅" colorClass="cyan" value={schedules.length} label="Weekly Classes" />
              <StatCard icon="📢" colorClass="amber" value={announcements.length} label="Announcements" />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Announcements</h2>
            <AnnouncementsView announcements={announcements.slice(0, 3)} />
          </div>
        )}
        {tab === 'courses' && <div className="fade-in"><CoursesView courses={courses} /></div>}
        {tab === 'schedule' && <div className="fade-in"><ScheduleView schedules={schedules} /></div>}
        {tab === 'announcements' && <div className="fade-in"><AnnouncementsView announcements={announcements} /></div>}
        {tab === 'chat' && <div className="fade-in"><ChatView /></div>}
      </div>
    </>
  );
}
