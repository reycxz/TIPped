import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function ProtectedLayout({ user, onLogout, allowedRoles }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (user.role || '').toLowerCase();
  const allowed = allowedRoles ? allowedRoles.map(r => r.toLowerCase()) : null;

  if (allowed && !allowed.includes(userRole) && !allowedRoles.includes(user.role)) {
    return <Navigate to={userRole === 'user' ? '/dashboard' : '/admin'} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar userRole={user.role} onLogout={onLogout} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
