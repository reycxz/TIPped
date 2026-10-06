import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

function DashboardPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-surface/80">
          <div className="text-sm font-medium text-muted">Pending</div>
          <div className="text-3xl font-bold text-pending mt-2">0</div>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-surface/80">
          <div className="text-sm font-medium text-muted">In Progress</div>
          <div className="text-3xl font-bold text-inProgress mt-2">0</div>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-surface/80">
          <div className="text-sm font-medium text-muted">Resolved</div>
          <div className="text-3xl font-bold text-resolved mt-2">0</div>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-xl border border-surface/80 text-center py-16">
        <p className="text-muted text-sm">No tickets</p>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState('User');

  const handleLogout = () => {
    localStorage.removeItem('token');
  };

  return (
    <Router>
      <Routes>
        <Route element={<Layout userRole={role} onLogout={handleLogout} />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPlaceholder />} />
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
