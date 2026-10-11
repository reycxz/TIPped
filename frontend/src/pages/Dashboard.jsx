import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getMetrics, getMyTickets } from '../api/tickets';
import CameraFAB from '../components/CameraFAB';
import WelcomeCard from '../components/dashboard/WelcomeCard';
import StatCard from '../components/dashboard/StatCard';
import ActiveCard from '../components/dashboard/ActiveCard';
import RecentCard from '../components/dashboard/RecentCard';
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
      <WelcomeCard title={bannerTitle} />

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-5">
        <StatCard
          label="Pending"
          shortLabel="Pending"
          value={loading ? '—' : metrics.pending}
          href="/my-reports?status=Pending"
          valueClass="text-amber-600 dark:text-amber-500"
          loading={loading}
          ariaLabel={`Pending reports: ${metrics.pending}`}
        />
        <StatCard
          label="In progress"
          shortLabel="Active"
          value={loading ? '—' : metrics.inProgress}
          href="/my-reports?status=In%20Progress"
          valueClass="text-sky-600 dark:text-sky-400"
          loading={loading}
          ariaLabel={`In progress reports: ${metrics.inProgress}`}
        />
        <StatCard
          label="Resolved"
          shortLabel="Done"
          value={loading ? '—' : metrics.resolved}
          href="/my-reports?status=Resolved"
          valueClass="text-emerald-600 dark:text-emerald-500"
          loading={loading}
          ariaLabel={`Resolved reports: ${metrics.resolved}`}
        />
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        <ActiveCard
          tickets={activeReminders}
          loading={loading}
          className="flex-[1.15] min-w-0"
        />
        <RecentCard tickets={recentTickets} loading={loading} className="flex-1 min-w-0" />
      </div>

      {/* Camera FAB */}
      <CameraFAB />
    </div>
  );
}
