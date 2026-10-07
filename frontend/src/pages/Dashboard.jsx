import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMetrics, getMyTickets } from '../api/tickets';
import CameraFAB from '../components/CameraFAB';
import { PlusCircle, FileText, Clock, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

export default function Dashboard({ user }) {
  // KPI metrics strictly initialize at 0
  const [metrics, setMetrics] = useState({
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [metricsData, ticketsData] = await Promise.all([
          getMetrics(),
          getMyTickets(),
        ]);

        setMetrics({
          pending: Number(metricsData.pending) || 0,
          inProgress: Number(metricsData.inProgress) || 0,
          resolved: Number(metricsData.resolved) || 0,
        });

        setRecentTickets(Array.isArray(ticketsData) ? ticketsData : []);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalReports = metrics.pending + metrics.inProgress + metrics.resolved;

  const firstName = user?.firstName || '{FirstName}';
  const isFirstTime =
    user?.createdAt &&
    Date.now() - new Date(user.createdAt).getTime() < 5 * 60 * 1000;
  const bannerTitle = isFirstTime
    ? `Welcome, ${firstName}!`
    : `Welcome back, ${firstName}!`;

  // Filter real active reminders based on actual ticket states
  const activeReminders = recentTickets.filter(
    (t) => t.status === 'Pending' || t.status === 'In Progress'
  ).slice(0, 3);

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Banner - Strictly no subtitles */}
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

      {/* Real Progress Chart Section */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">
          Report Progress
        </div>

        {totalReports === 0 ? (
          <div className="py-10 text-center text-muted text-xs">
            No reports
          </div>
        ) : (
          <div className="space-y-4">
            {/* Multi-segment progress bar */}
            <div className="h-4 w-full bg-background rounded-full overflow-hidden flex">
              {metrics.pending > 0 && (
                <div
                  style={{ width: `${(metrics.pending / totalReports) * 100}%` }}
                  className="bg-pending h-full transition-all duration-500"
                  title={`Pending: ${metrics.pending}`}
                />
              )}
              {metrics.inProgress > 0 && (
                <div
                  style={{ width: `${(metrics.inProgress / totalReports) * 100}%` }}
                  className="bg-inProgress h-full transition-all duration-500"
                  title={`In Progress: ${metrics.inProgress}`}
                />
              )}
              {metrics.resolved > 0 && (
                <div
                  style={{ width: `${(metrics.resolved / totalReports) * 100}%` }}
                  className="bg-resolved h-full transition-all duration-500"
                  title={`Resolved: ${metrics.resolved}`}
                />
              )}
            </div>

            {/* Legend with percentages */}
            <div className="grid grid-cols-3 gap-2 text-xs pt-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pending inline-block" />
                <span className="text-muted">Pending: {metrics.pending}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-inProgress inline-block" />
                <span className="text-muted">In Progress: {metrics.inProgress}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-resolved inline-block" />
                <span className="text-muted">Resolved: {metrics.resolved}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real Reminders / Status Visibility based on actual tickets */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">
          Active Updates
        </div>

        {activeReminders.length === 0 ? (
          <div className="py-8 text-center text-muted text-xs">
            No active tickets
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {activeReminders.map((ticket) => (
              <Link
                key={ticket._id}
                to="/my-reports"
                className="py-3.5 flex items-center justify-between hover:bg-background/40 px-2 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  {ticket.status === 'Pending' ? (
                    <Clock className="w-4 h-4 text-pending" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-inProgress" />
                  )}
                  <div>
                    <div className="text-xs font-mono font-bold text-text group-hover:text-primary transition-colors">
                      {ticket.ticketId}
                    </div>
                    <div className="text-[11px] text-muted">
                      {ticket.category} • {ticket.campus} - {ticket.locationInfo?.room}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      ticket.status === 'Pending'
                        ? 'bg-amber-500/10 text-pending'
                        : 'bg-sky-500/10 text-inProgress'
                    }`}
                  >
                    {ticket.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Camera FAB */}
      <CameraFAB />
    </div>
  );
}
