import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function ProtectedLayout({ user, onLogout, allowedRoles }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'User' ? '/dashboard' : '/admin'} replace />;
  }

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      <Navbar userRole={user.role} onLogout={onLogout} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
