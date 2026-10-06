import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout({ userRole = 'User', onLogout }) {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      <Navbar userRole={userRole} onLogout={onLogout} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
