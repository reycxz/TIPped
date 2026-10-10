import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { updateTicket, archiveReport } from '../api/tickets';
import { getDepartments } from '../api/adminData';
import { getMe } from '../api/auth';
import { X, Clock, MapPin, Tag, ZoomIn } from 'lucide-react';
import CampusMap from './CampusMap/CampusMap';

const DEFAULT_DEPARTMENTS = [
  'Maintenance',
  'ITSO',
  'SOHAS',
  'Canteen',
  'OSA',
  'Guidance',
  'General',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Pending', 'In Progress', 'Resolved'];

export default function TicketDrawer({
  user: propUser,
  ticket,
  isOpen,
  onClose,
  onUpdateSuccess,
}) {
  const [internalUser, setInternalUser] = useState(propUser || null);
  const [status, setStatus] = useState('Pending');
  const [priority, setPriority] = useState('Medium');
  const [assignedDepartment, setAssignedDepartment] = useState('General');
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const [zoomedImage, setZoomedImage] = useState(null);
  const [showMapReadOnly, setShowMapReadOnly] = useState(false);

  // Resolve user from props, or fallback to session
  useEffect(() => {
    if (propUser) {
      setInternalUser(propUser);
      return;
    }

    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setInternalUser(JSON.parse(stored));
      }
    } catch {
      // ignore JSON parse error
    }

    getMe()
      .then((data) => {
        if (data) setInternalUser(data);
      })
      .catch(() => {});
  }, [propUser]);

  const rawUser = propUser || internalUser || {};
  const userRole = (rawUser.role || '').toLowerCase();
  const user = {
    ...rawUser,
    role: userRole
  };

  // Fetch actual departments (Constraint 3)
  useEffect(() => {
    getDepartments()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data
            .map((d) => (typeof d === 'string' ? d : d.name))
            .filter(Boolean);
          if (names.length > 0) {
            setDepartments(Array.from(new Set(names)));
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status || 'Pending');
      setPriority(ticket.priority || 'Medium');
      const dept = ticket.assignedDepartment || ticket.category || 'General';
      setAssignedDepartment(dept);
      setAdminNote('');
      setError('');
      setSaving(false);
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const noteLabel = (user.role === 'superadmin' || rawUser.role === 'Superadmin') ? 'ADMIN NOTE' : 'STAFF NOTE';

  // Constraint 3: Call archive endpoint and close the detailed view without immediate execution
  const handleArchive = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!ticket) return;
    const ticketId = ticket._id || ticket.id;
    try {
      setArchiving(true);
      await archiveReport(ticketId);
      if (onUpdateSuccess) {
        onUpdateSuccess({ ...ticket, isArchived: true });
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to move to bin:', err);
      setError(err.response?.data?.error || 'Failed to move ticket to bin');
    } finally {
      setArchiving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Strict validation when status is 'Resolved'
    if (status === 'Resolved' && !adminNote.trim()) {
      setError('Admin note required');
      return;
    }

    // Action Debouncing - disable instantly and show 'Saving...'
    setSaving(true);
    setError('');

    try {
      const payload = {
        status,
        priority,
        assignedDepartment,
        category: assignedDepartment,
        adminNote: adminNote.trim(),
      };

      const res = await updateTicket(ticket._id, payload);

      if (onUpdateSuccess) {
        onUpdateSuccess(res.ticket);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-900/80 backdrop-blur-sm flex justify-center items-center">
      <div className="w-full max-w-xl bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 transition-colors">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="text-lg font-mono font-bold text-primary">
                {ticket.ticketId}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                {priority}
              </span>
            </div>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-4">
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                {ticket.campus} - {ticket.locationInfo?.room}
                <button
                  type="button"
                  onClick={() => setShowMapReadOnly(true)}
                  aria-label="View location on campus map"
                  className="ml-1.5 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 underline decoration-amber-500/50 cursor-pointer font-medium"
                >
                  Map
                </button>
              </span>
              <span className="flex items-center text-primary font-medium">
                <Tag className="w-3.5 h-3.5 mr-1" />
                {ticket.issueCategory || ticket.category}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-500 dark:text-red-400 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Description
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {/* Evidence Gallery: Zoomable Photo Thumbnails */}
          {ticket.images && ticket.images.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Evidence Gallery
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {ticket.images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setZoomedImage(img)}
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer group"
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls Form */}
          <form id="drawer-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Department Dropdown (Constraints 1 & 3) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <select
                  value={assignedDepartment}
                  onChange={(e) => setAssignedDepartment(e.target.value)}
                  disabled={user?.role !== 'superadmin'}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                >
                  {departments.map((dept) => {
                    const deptName = typeof dept === 'string' ? dept : dept.name;
                    return (
                      <option key={deptName} value={deptName}>
                        {deptName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Priority Dropdown (Constraint 1) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={user?.role !== 'superadmin'}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown (Constraint 2: Enabled for both Superadmin and Department) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={false}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resolution Note Text Area (Constraint 4) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {noteLabel}
                </label>
                {status === 'Resolved' && (
                  <span className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold uppercase">
                    Required
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                required={status === 'Resolved'}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={noteLabel}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </form>

          {/* Audit Trail Timeline */}
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Audit Trail
            </div>
            {ticket.auditTrail && ticket.auditTrail.length > 0 ? (
              <div className="space-y-2 border-l-2 border-slate-200 dark:border-slate-700 ml-2 pl-3">
                {ticket.auditTrail.map((log, i) => (
                  <div key={i} className="text-xs space-y-0.5">
                    <div className="text-slate-900 dark:text-white font-semibold">{log.action}</div>
                    <div className="text-slate-600 dark:text-slate-400">{log.details}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 dark:text-slate-500 italic">No activity</div>
            )}
          </div>
        </div>

        {/* Footer with Action Debounced Button & Move to Bin Button */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div>
            {user?.role === 'superadmin' && (
              <button
                onClick={handleArchive}
                type="button"
                disabled={archiving || saving}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                Move to Bin
              </button>
            )}
          </div>
          <button
            type="submit"
            form="drawer-form"
            // Constraint 2: Action Debouncing
            disabled={saving || (status === 'Resolved' && !adminNote.trim())}
            className="py-2.5 px-6 bg-primary hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Update'}
          </button>
        </div>
      </div>

      {/* Zoomable Image Lightbox */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={zoomedImage}
            alt=""
            className="max-w-full max-h-full rounded-lg object-contain"
          />
        </div>
      )}

      {/* Read-Only Campus Map Modal */}
      {showMapReadOnly && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-6xl h-[85vh] flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span>Campus Map — {ticket.campus} {ticket.locationInfo?.room || ''}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMapReadOnly(false)}
                aria-label="Close campus map"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 w-full relative h-full min-h-0 overflow-hidden">
              <CampusMap
                mode="readonly"
                defaultLocation={
                  ticket.locationInfo?.building
                    ? `${ticket.campus || ''} - ${ticket.locationInfo.building} - Floor ${ticket.locationInfo.floor ?? ''} - ${ticket.locationInfo.room ?? ''} - ${ticket.locationInfo.landmark || ''}`
                    : ticket.location
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
