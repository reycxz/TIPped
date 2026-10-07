import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedLayout from './components/ProtectedLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateReport from './pages/CreateReport';
import MyReports from './pages/MyReports';
import AdminQueue from './pages/AdminQueue';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import ArchivedReports from './pages/ArchivedReports';
import { getMe } from './api/auth';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate session on reload by calling /api/auth/me
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await getMe();
        setCurrentUser(userData);
      } catch (err) {
        console.error('Session validation failed:', err);
        localStorage.removeItem('token');
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted text-sm">
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes - Navigation Bar strictly hidden */}
        <Route
          path="/"
          element={
            currentUser ? (
              <Navigate
                to={currentUser.role === 'User' || currentUser.role === 'user' ? '/dashboard' : '/admin'}
                replace
              />
            ) : (
              <Landing onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />

        {/* Authenticated User Routes - ProtectedLayout enforces navbar visibility */}
        <Route element={<ProtectedLayout user={currentUser} onLogout={handleLogout} />}>
          <Route path="/dashboard" element={<Dashboard user={currentUser} />} />
          <Route path="/report/new" element={<CreateReport isGuest={false} />} />
          <Route path="/my-reports" element={<MyReports />} />
          <Route
            path="/profile"
            element={
              <Profile
                user={currentUser}
                onProfileUpdated={(updated) => setCurrentUser(updated)}
              />
            }
          />
        </Route>

        {/* Staff & Admin Routes - Protected with RBAC (Superadmin & Department) */}
        <Route
          element={
            <ProtectedLayout
              user={currentUser}
              onLogout={handleLogout}
              allowedRoles={['Department', 'Superadmin', 'department', 'superadmin']}
            />
          }
        >
          <Route path="/admin" element={<AdminQueue user={currentUser} />} />
          <Route path="/admin/archive" element={<ArchivedReports user={currentUser} />} />
          <Route path="/archive" element={<ArchivedReports user={currentUser} />} />
          <Route path="/reports/archived" element={<ArchivedReports user={currentUser} />} />
        </Route>

        {/* Superadmin Only Route */}
        <Route
          element={
            <ProtectedLayout
              user={currentUser}
              onLogout={handleLogout}
              allowedRoles={['Superadmin', 'Department', 'superadmin', 'department']}
            />
          }
        >
          <Route path="/analytics" element={<Analytics user={currentUser} />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
