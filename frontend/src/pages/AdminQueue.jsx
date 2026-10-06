import React, { useState, useEffect, useRef } from 'react';
import { getMetrics, getAdminTickets } from '../api/tickets';
import { Search, Filter, SlidersHorizontal, Eye, X } from 'lucide-react';

export default function AdminQueue({ user }) {
  // Constraint 1: Zero mock data. KPI metrics strictly initialize at 0.
  const [metrics, setMetrics] = useState({
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  // Tickets initialized as empty array (true empty state)
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Constraint 2: Icon-driven controls
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [campusFilter, setCampusFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const filterRef = useRef(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch metrics dynamically
  const fetchMetricsData = async () => {
    try {
      const data = await getMetrics();
      setMetrics({
        pending: Number(data.pending) || 0,
        inProgress: Number(data.inProgress) || 0,
        resolved: Number(data.resolved) || 0,
      });
    } catch (err) {
      console.error('Failed to fetch admin metrics:', err);
    }
  };

  // Fetch tickets with RBAC & active filters
  const fetchTicketsData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (campusFilter !== 'All') params.campus = campusFilter;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await getAdminTickets(params);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch admin tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsData();
  }, []);

  useEffect(() => {
    fetchTicketsData();
  }, [campusFilter, statusFilter, searchQuery]);

  // Standard bracket syntax {AdminName} without subtitles
  const adminName = user?.firstName ? `{${user.firstName}}` : '{AdminName}';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-pending border border-amber-500/30">
            Pending
          </span>
        );
      case 'In Progress':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-500/10 text-inProgress border border-sky-500/30">
            In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-resolved border border-emerald-500/30">
            Resolved
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-700/50 text-muted">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Banner - No Subtitles */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          Welcome, {adminName}!
        </h1>
      </div>

      {/* KPI Metrics strictly initialized at 0 */}
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

      {/* Controls: Expandable Search Icon & Filter Icon Dropdown */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="text-sm font-bold text-text">Queue</div>

        <div className="flex items-center space-x-2">
          {/* Expandable Search Control */}
          <div className="relative flex items-center">
            {searchOpen ? (
              <div className="flex items-center bg-background border border-primary rounded-lg px-2.5 py-1.5 transition-all animate-in fade-in">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID"
                  className="bg-transparent text-xs text-text placeholder-slate-500 focus:outline-none w-32 sm:w-44"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  aria-label="Clear"
                  className="text-muted hover:text-text ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="p-2 rounded-lg text-muted hover:text-primary hover:bg-background/80 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filter Dropdown Menu */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              aria-label="Filter"
              className={`p-2 rounded-lg transition-colors ${
                filterOpen || campusFilter !== 'All' || statusFilter !== 'All'
                  ? 'text-primary bg-background/80'
                  : 'text-muted hover:text-primary hover:bg-background/80'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>

            {filterOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface border border-slate-700 rounded-xl shadow-2xl p-4 z-50 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Campus
                  </label>
                  <select
                    value={campusFilter}
                    onChange={(e) => setCampusFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-slate-700 rounded-lg text-xs text-text focus:outline-none focus:border-primary"
                  >
                    <option value="All">All</option>
                    <option value="Arlegui">Arlegui</option>
                    <option value="Casal">Casal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-slate-700 rounded-lg text-xs text-text focus:outline-none focus:border-primary"
                  >
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-surface border border-slate-700/60 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-700/60 bg-background/40 text-muted uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5">Ticket ID</th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted">
                    Loading...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                // Constraint 1: True empty state showing exactly "No active tickets"
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-20 text-center text-muted font-medium text-sm"
                  >
                    No active tickets
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-background/40 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-primary">
                      {ticket.ticketId}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-text">
                      {ticket.campus} - {ticket.locationInfo?.room}
                    </td>
                    <td className="px-4 py-3.5 text-text">
                      {ticket.category}
                    </td>
                    <td className="px-4 py-3.5">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        aria-label="Manage"
                        className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-background transition-colors"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
