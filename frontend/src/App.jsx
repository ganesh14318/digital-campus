import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import HODDashboard from './pages/HODDashboard';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const routes = { student: '/student', teacher: '/teacher', hod: '/hod', creator_admin: '/admin' };
    return <Navigate to={routes[user.role] || '/login'} replace />;
  }
  return children;
}

function RedirectByRole() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  const routes = { student: '/student', teacher: '/teacher', hod: '/hod', creator_admin: '/admin' };
  return <Navigate to={routes[user.role] || '/login'} replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <RedirectByRole /> : <LoginPage />} />
      <Route path="/" element={<RedirectByRole />} />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><Layout /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="courses" element={<StudentDashboard />} />
        <Route path="schedule" element={<StudentDashboard />} />
        <Route path="announcements" element={<StudentDashboard />} />
        <Route path="chat" element={<StudentDashboard />} />
      </Route>

      {/* Teacher Routes */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><Layout /></ProtectedRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="courses" element={<TeacherDashboard />} />
        <Route path="schedule" element={<TeacherDashboard />} />
        <Route path="announcements" element={<TeacherDashboard />} />
      </Route>

      {/* HOD Routes */}
      <Route path="/hod" element={<ProtectedRoute allowedRoles={['hod']}><Layout /></ProtectedRoute>}>
        <Route index element={<HODDashboard />} />
        <Route path="teachers" element={<HODDashboard />} />
        <Route path="courses" element={<HODDashboard />} />
        <Route path="schedule" element={<HODDashboard />} />
        <Route path="announcements" element={<HODDashboard />} />
        <Route path="analytics" element={<HODDashboard />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['creator_admin']}><Layout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="departments" element={<AdminDashboard />} />
        <Route path="users" element={<AdminDashboard />} />
        <Route path="courses" element={<AdminDashboard />} />
        <Route path="announcements" element={<AdminDashboard />} />
        <Route path="analytics" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
