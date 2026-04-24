import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import QueryHistory from './pages/QueryHistory';
import MyRunbooks from './pages/MyRunbooks';
import MyPlaybook from './pages/MyPlaybook';
import SharedAnswer from './pages/SharedAnswer';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/admin"       element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
      <Route path="/history"     element={<ProtectedRoute><QueryHistory /></ProtectedRoute>} />
      <Route path="/my-runbooks" element={<ProtectedRoute><MyRunbooks /></ProtectedRoute>} />
      <Route path="/playbook"    element={<ProtectedRoute><MyPlaybook /></ProtectedRoute>} />
      <Route path="/answer/:id"  element={<ProtectedRoute><SharedAnswer /></ProtectedRoute>} />

      {/* Fallback → landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
