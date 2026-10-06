import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMetrics } from '../api/tickets';
import CameraFAB from '../components/CameraFAB';
import { PlusCircle, FileText } from 'lucide-react';

export default function Dashboard({ user }) {
  // Constraint 1: Zero mock data. KPI metrics strictly initialize at 0.
  const [metrics, setMetrics] = useState({
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  // Fetch KPI metrics dynamically via Axios
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getMetrics();
        setMetrics({
          pending: Number(data.pending) || 0,
          inProgress: Number(data.inProgress) || 0,
          resolved: Number(data.resolved) || 0,
        });
      } catch (err) {
        console.error('Metrics fetch error:', err);
      }
    };

    fetchMetrics();
  }, []);

  // Constraint 2: Use standard bracket syntax {FirstName} to map backend data. No subtitles under Welcome Banner.
  const firstName = user?.firstName ? `{${user.firstName}}` : '{FirstName}';
  const isFirstTime =
    user?.createdAt &&
    Date.now() - new Date(user.createdAt).getTime() < 5 * 60 * 1000;
  const bannerTitle = isFirstTime
    ? `Welcome, ${firstName}!`
    : `Welcome back, ${firstName}!`;

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Banner - Constraint 2: No subtitles */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          {bannerTitle}
        </h1>
      </div>

      {/* KPI Metrics: Strictly initialized to 0, dynamically fetched */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Pending
          </div>
          <div className="text-3xl font-extrabold text-pending mt-2">
            {metrics.pending}
          </div>
        </div>

        <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            In Progress
          </div>
          <div className="text-3xl font-extrabold text-inProgress mt-2">
            {metrics.inProgress}
          </div>
        </div>

        <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Resolved
          </div>
          <div className="text-3xl font-extrabold text-resolved mt-2">
            {metrics.resolved}
          </div>
        </div>
      </div>

      {/* Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/report/new"
          className="bg-surface border border-slate-700/60 hover:border-primary/60 rounded-xl p-5 transition-all flex items-center justify-between group shadow-sm"
        >
          <div className="flex items-center space-x-3">
            <PlusCircle className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
              Submit Report
            </span>
          </div>
        </Link>

        <Link
          to="/my-reports"
          className="bg-surface border border-slate-700/60 hover:border-primary/60 rounded-xl p-5 transition-all flex items-center justify-between group shadow-sm"
        >
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
              My Reports
            </span>
          </div>
        </Link>
      </div>

      {/* Empty State */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-12 text-center shadow-sm">
        <p className="text-muted text-sm">No tickets</p>
      </div>

      {/* Constraint 3: Camera FAB */}
      <CameraFAB />
    </div>
  );
}
