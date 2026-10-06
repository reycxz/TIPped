import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import { getMe } from './api/auth';

function DashboardPlaceholder({ user }) {
  const isFirstTime = !user || !user.createdAt || (new Date() - new Date(user.createdAt) < 60000);
  const firstName = user?.firstName || 'User';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-surface p-6 rounded-xl border border-surface/80">
        <h1 className="text-xl font-bold text-text">
          {isFirstTime ? `Welcome, {${firstName}}!` : `Welcome back, {${firstName}}!`}
        </h1>
      </div>

      {/* KPI Metrics strictly initialized to 0 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-surface/80">
          <div className="text-xs font-medium text-muted uppercase">Pending</div>
          <div className="text-3xl font-bold text-pending mt-2">0</div>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-surface/80">
          <div className="text-xs font-medium text-muted uppercase">In Progress</div>
          <div className="text-3xl font-bold text-inProgress mt-2">0</div>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-surface/80">
          <div className="text-xs font-medium text-muted uppercase">Resolved</div>
          <div className="text-3xl font-bold text-resolved mt-2">0</div>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-surface p-12 rounded-xl border border-surface/80 text-center">
        <p className="text-muted text-sm">No tickets</p>
      </div>
    </div>
  );
}

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
          <Route path="/dashboard" element={<DashboardPlaceholder user={currentUser} />} />
          <Route path="/report/new" element={<div className="bg-surface p-6 rounded-xl text-center text-muted">Create Report</div>} />
          <Route path="/my-reports" element={<div className="bg-surface p-6 rounded-xl text-center text-muted">My Reports</div>} />
          <Route path="/admin" element={<div className="bg-surface p-6 rounded-xl text-center text-muted">Console</div>} />
          <Route path="/analytics" element={<div className="bg-surface p-6 rounded-xl text-center text-muted">Analytics</div>} />
          <Route path="/profile" element={<div className="bg-surface p-6 rounded-xl text-center text-muted">Profile</div>} />
        </Route>
      </Routes>
    </Router>
  );
}
