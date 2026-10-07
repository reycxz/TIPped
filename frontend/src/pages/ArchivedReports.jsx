import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Trash2,
  RotateCcw,
  Clock,
  MapPin,
  Tag,
  Search,
  RefreshCw,
  Archive,
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function ArchivedReports({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);

  const fetchArchivedReports = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/reports/archived', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setReports(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch archived reports:', err);
      setError(err.response?.data?.error || 'Failed to load archived reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedReports();
  }, []);

  const getDaysRemaining = (archivedAt) => {
    if (!archivedAt) return 30;
    const archivedDate = new Date(archivedAt).getTime();
    const expiryDate = archivedDate + 30 * 24 * 60 * 60 * 1000;
    const diffMs = expiryDate - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const handleRestore = async (reportId) => {
    try {
      setActionLoading(reportId);
      setError('');
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/reports/${reportId}/restore`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      setReports((prev) => prev.filter((r) => (r._id || r.id) !== reportId));
      setSuccess('Report restored successfully');
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      console.error('Failed to restore report:', err);
      setError(err.response?.data?.error || 'Failed to restore report');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteForever = async (reportId) => {
    try {
      setActionLoading(reportId);
      setError('');
      const token = localStorage.getItem('token');
      await axios.delete(`/api/reports/${reportId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setReports((prev) => prev.filter((r) => (r._id || r.id) !== reportId));
      setDeleteConfirmTarget(null);
      setSuccess('Report permanently deleted');
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      console.error('Failed to permanently delete report:', err);
      setError(err.response?.data?.error || 'Failed to permanently delete report');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (campusFilter !== 'All' && report.campus !== campusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const idMatch = report.ticketId?.toLowerCase().includes(query);
        const roomMatch = report.locationInfo?.room?.toLowerCase().includes(query);
        const bldgMatch = report.locationInfo?.building?.toLowerCase().includes(query);
        const catMatch = (report.issueCategory || report.assignedDepartment || '')
          .toLowerCase()
          .includes(query);
        const descMatch = report.description?.toLowerCase().includes(query);
        return idMatch || roomMatch || bldgMatch || catMatch || descMatch;
      }
      return true;
    });
  }, [reports, campusFilter, searchQuery]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Console"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-800/60">
            <Archive className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Archived Reports
            <span className="text-xs px-2.5 py-0.5 font-semibold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-full">
              {reports.length}
            </span>
          </h1>
        </div>

        {/* Constraint 2: Purely icon-based Refresh button */}
        <button
          type="button"
          onClick={fetchArchivedReports}
          disabled={loading}
          title="Refresh"
          aria-label="Refresh"
          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search & Compact Select Dropdown */}
      <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archived tickets..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            aria-label="Filter by Campus"
            className="w-full sm:w-44 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
          >
            <option value="All">All Campuses</option>
            <option value="Arlegui">Arlegui Campus</option>
            <option value="Casal">Casal Campus</option>
          </select>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-7 h-7 mx-auto text-amber-500 animate-spin mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading archived reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        /* Constraint 1: Clean empty state containing only the bin icon and the text "No archived reports" */
        <div className="bg-white dark:bg-slate-800/80 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col items-center justify-center">
          <Archive className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-2" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            No archived reports
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => {
            const reportId = report._id || report.id;
            const daysRemaining = getDaysRemaining(report.archivedAt);
            const isUrgentExpiry = daysRemaining <= 3;
            const isWarningExpiry = daysRemaining <= 10;
            const categoryName =
              report.issueCategory || report.assignedDepartment || report.category || 'General';

            return (
              <div
                key={reportId}
                className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/70 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                        {report.ticketId}
                      </span>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {report.archivedAt
                            ? new Date(report.archivedAt).toLocaleDateString()
                            : 'Recently'}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 shrink-0 ${
                        isUrgentExpiry
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : isWarningExpiry
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{daysRemaining}d left</span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {report.campus} • {report.locationInfo?.building} - Room {report.locationInfo?.room}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                        {categoryName}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                    {report.description || 'No description provided.'}
                  </p>
                </div>

                {/* Minimalist SVG Actions */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRestore(reportId)}
                    disabled={actionLoading === reportId}
                    title="Restore Report"
                    aria-label="Restore Report"
                    className="p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 ${actionLoading === reportId ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(report)}
                    disabled={actionLoading === reportId}
                    title="Delete Forever"
                    aria-label="Delete Forever"
                    className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Permanently Delete?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Ticket <strong className="font-mono text-rose-600">{deleteConfirmTarget.ticketId}</strong> will be permanently removed. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteForever(deleteConfirmTarget._id || deleteConfirmTarget.id)}
                disabled={actionLoading === (deleteConfirmTarget._id || deleteConfirmTarget.id)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {actionLoading === (deleteConfirmTarget._id || deleteConfirmTarget.id)
                  ? 'Deleting...'
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
