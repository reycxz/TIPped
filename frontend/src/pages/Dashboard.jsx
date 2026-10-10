import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getMetrics, getMyTickets } from '../api/tickets';
import CameraFAB from '../components/CameraFAB';
import { Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

export default function Dashboard({ user }) {
  const location = useLocation();
  const isNewUser = location.state?.isNewUser;

  // KPI metrics strictly initialize at 0
  const [metrics, setMetrics] = useState({
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  const [recentTickets, setRecentTickets] = useState([]);
  const recentTicketsRef = useRef([]);
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

        const tickets = Array.isArray(ticketsData) ? ticketsData : [];
        recentTicketsRef.current = tickets;
        setRecentTickets(tickets);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || (user?.role || '').toLowerCase() !== 'user') return undefined;

    const socket = io(socketUrl, {
      auth: { token },
      withCredentials: true
    });
    const joinUserRoom = () => {
      socket.emit('join_user_room', user?._id || user?.id);
    };
    const handleTicketUpdated = (ticket) => {
      if (!ticket?._id) return;
      const previousTickets = recentTicketsRef.current;
      const existingTicket = previousTickets.find((item) => item._id === ticket._id);
      if (!existingTicket) return;

      recentTicketsRef.current = previousTickets.map((item) =>
        item._id === ticket._id ? { ...item, ...ticket } : item
      );
      setRecentTickets(recentTicketsRef.current);

      if (existingTicket.status === ticket.status) return;
      const statusKey = {
        Pending: 'pending',
        'In Progress': 'inProgress',
        Resolved: 'resolved'
      };
      const oldMetric = statusKey[existingTicket.status];
      const newMetric = statusKey[ticket.status];
      if (!oldMetric || !newMetric) return;

      setMetrics((current) => ({
        ...current,
        [oldMetric]: Math.max(0, current[oldMetric] - 1),
        [newMetric]: current[newMetric] + 1
      }));
    };

    socket.on('connect', joinUserRoom);
    socket.on('ticketUpdated', handleTicketUpdated);
    if (socket.connected) joinUserRoom();
    return () => {
      socket.off('connect', joinUserRoom);
      socket.off('ticketUpdated', handleTicketUpdated);
      socket.disconnect();
    };
  }, [user?.role]);

  const totalReports = metrics.pending + metrics.inProgress + metrics.resolved;

  const firstName = user?.firstName || '{FirstName}';
  const bannerTitle = isNewUser
    ? `Welcome, ${firstName}!`
    : `Welcome back, ${firstName}!`;

  // Filter real active reminders based on actual ticket states
  const activeReminders = recentTickets.filter(
    (t) => t.status === 'Pending' || t.status === 'In Progress'
  ).slice(0, 3);

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Banner - Strictly no subtitles */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-none rounded-xl p-6 transition-colors duration-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {bannerTitle}
        </h1>
      </div>

      {/* KPI Metrics: Strictly initialized to 0, dynamically fetched */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Card */}
        <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-none rounded-xl p-5 transition-colors duration-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pending
          </div>
          <div className="text-3xl font-extrabold text-pending mt-2">
            {metrics.pending}
          </div>
        </div>

        {/* In Progress Card */}
        <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-none rounded-xl p-5 transition-colors duration-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            In Progress
          </div>
          <div className="text-3xl font-extrabold text-inProgress mt-2">
            {metrics.inProgress}
          </div>
        </div>

        {/* Resolved Card */}
        <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-none rounded-xl p-5 transition-colors duration-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Resolved
          </div>
          <div className="text-3xl font-extrabold text-resolved mt-2">
            {metrics.resolved}
          </div>
        </div>
      </div>

      {/* Real Progress Chart Section */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-none rounded-xl p-6 transition-colors duration-200">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Report Progress
        </div>

        {totalReports === 0 ? (
          <div className="py-10 text-center text-slate-500 dark:text-slate-400 text-xs">
            No reports
          </div>
        ) : (
          <div className="space-y-4">
            {/* Multi-segment progress bar */}
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex">
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
                <span className="text-slate-500 dark:text-slate-400">Pending: {metrics.pending}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-inProgress inline-block" />
                <span className="text-slate-500 dark:text-slate-400">In Progress: {metrics.inProgress}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-resolved inline-block" />
                <span className="text-slate-500 dark:text-slate-400">Resolved: {metrics.resolved}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real Reminders / Status Visibility based on actual tickets */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-none rounded-xl p-6 transition-colors duration-200">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Active Updates
        </div>

        {activeReminders.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            No active tickets
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {activeReminders.map((ticket) => (
              <Link
                key={ticket._id}
                to="/my-reports"
                className="py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 px-2 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  {ticket.status === 'Pending' ? (
                    <Clock className="w-4 h-4 text-pending" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-inProgress" />
                  )}
                  <div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      {ticket.ticketId}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {ticket.category} - {ticket.campus} (Room {ticket.locationInfo?.room})
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
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors" />
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
