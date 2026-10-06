import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateReport from './pages/CreateReport';
import AdminQueue from './pages/AdminQueue';
import Profile from './pages/Profile';
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

  const role = currentUser?.role || 'User';

  return (
    <Router>
      <Routes>
        <Route element={<Layout userRole={role} onLogout={handleLogout} />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/register" element={<Register onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/dashboard" element={<Dashboard user={currentUser} />} />
          <Route path="/report/new" element={<CreateReport />} />
          <Route path="/my-reports" element={<div className="bg-surface p-6 rounded-xl text-center text-muted">My Reports</div>} />
          <Route path="/admin" element={<AdminQueue user={currentUser} />} />
          <Route path="/analytics" element={<div className="bg-surface p-6 rounded-xl text-center text-muted">Analytics</div>} />
          <Route path="/profile" element={<Profile user={currentUser} onProfileUpdated={(updated) => setCurrentUser(updated)} />} />
        </Route>
      </Routes>
    </Router>
  );
}
