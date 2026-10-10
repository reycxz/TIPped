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
import CampusPage from './pages/CampusPage';
import { getMe } from './api/auth';
import PrivacyConsentModal from './components/PrivacyConsentModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingConsent, setPendingConsent] = useState(null);
  const [statusToast, setStatusToast] = useState('');
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

  const handleConsentRequired = (consentData) => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setPendingConsent(consentData);
  };

  const handleConsentAccepted = (user) => {
    setPendingConsent(null);
    setCurrentUser(user);
  };

  const handleConsentDeclined = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setCurrentUser(null);
    setPendingConsent(null);
    setStatusToast(
      'Authentication aborted. Unconsented accounts will be automatically deleted in 30 days. You may still report incidents using the Guest Report feature.'
    );
  };

  useEffect(() => {
    if (!statusToast) return undefined;
    const timeoutId = window.setTimeout(() => setStatusToast(''), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [statusToast]);

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
              <Landing
                onLoginSuccess={handleLoginSuccess}
                onConsentRequired={handleConsentRequired}
              />
            )
          }
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route
          path="/campus"
          element={<CampusPage currentUser={currentUser} onLogout={handleLogout} />}
        />

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
              allowedRoles={['Admin', 'admin', 'Department', 'department', 'Superadmin', 'superadmin']}
            />
          }
        >
          <Route path="/admin" element={<AdminQueue user={currentUser} />} />
        </Route>

        {/* Superadmin Only Routes - Strictly locked to superadmin */}
        <Route
          element={
            <ProtectedLayout
              user={currentUser}
              onLogout={handleLogout}
              allowedRoles={['Superadmin', 'superadmin']}
            />
          }
        >
          <Route path="/analytics" element={<Analytics user={currentUser} />} />
          <Route path="/admin/archive" element={<ArchivedReports user={currentUser} />} />
          <Route path="/archive" element={<ArchivedReports user={currentUser} />} />
          <Route path="/reports/archived" element={<ArchivedReports user={currentUser} />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {pendingConsent && (
        <PrivacyConsentModal
          consentToken={pendingConsent.consentToken}
          onAccepted={handleConsentAccepted}
          onDecline={handleConsentDeclined}
        />
      )}
      {statusToast && (
        <div
          className="fixed bottom-5 left-1/2 z-[10001] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"
          role="status"
          aria-live="polite"
        >
          {statusToast}
        </div>
      )}
    </Router>
  );
}
