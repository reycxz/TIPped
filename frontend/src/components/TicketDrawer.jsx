import React, { useState, useEffect } from 'react';
import { updateTicket, getCategories } from '../api/tickets';
import { X, Clock, MapPin, Tag, ZoomIn } from 'lucide-react';

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

export default function TicketDrawer({ ticket, isOpen, onClose, onUpdateSuccess }) {
  const [status, setStatus] = useState('Pending');
  const [priority, setPriority] = useState('Medium');
  const [assignedDepartment, setAssignedDepartment] = useState('General');
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [zoomedImage, setZoomedImage] = useState(null);

  useEffect(() => {
    getCategories().then((cats) => {
      if (Array.isArray(cats) && cats.length > 0) setDepartments(cats);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status || 'Pending');
      setPriority(ticket.priority || 'Medium');
      setAssignedDepartment(ticket.assignedDepartment || ticket.category || 'General');
      setAdminNote('');
      setError('');
      setSaving(false);
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Constraint 1: Strict validation when status is 'Resolved'
    if (status === 'Resolved' && !adminNote.trim()) {
      setError('Admin note required');
      return;
    }

    // Constraint 2: Action Debouncing - disable instantly and show 'Saving...'
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-surface border-l border-slate-700 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-700/60 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="text-lg font-mono font-bold text-primary">
                {ticket.ticketId}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-700 text-text">
                {priority}
              </span>
            </div>
            <div className="flex items-center text-xs text-muted space-x-4">
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                {ticket.campus} - {ticket.locationInfo?.room}
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
            className="p-2 text-muted hover:text-text rounded-lg hover:bg-background/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-400 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Description
            </div>
            <p className="text-sm text-text bg-background p-3.5 rounded-lg border border-slate-700/60 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {/* Evidence Gallery: Zoomable Photo Thumbnails */}
          {ticket.images && ticket.images.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Evidence Gallery
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {ticket.images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setZoomedImage(img)}
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-background cursor-pointer group"
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
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <select
                  value={assignedDepartment}
                  onChange={(e) => setAssignedDepartment(e.target.value)}
                  className="w-full px-2.5 py-2 bg-background border border-slate-700 rounded-lg text-xs text-text focus:outline-none focus:border-primary"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-2.5 py-2 bg-background border border-slate-700 rounded-lg text-xs text-text focus:outline-none focus:border-primary"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-2.5 py-2 bg-background border border-slate-700 rounded-lg text-xs text-text focus:outline-none focus:border-primary"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resolution Input / Admin Note */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                  Admin Note
                </label>
                {status === 'Resolved' && (
                  <span className="text-[10px] text-amber-400 font-semibold uppercase">
                    Required
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                // Constraint 1: HTML required when status is 'Resolved'
                required={status === 'Resolved'}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Admin Note"
                className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-xs text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </form>

          {/* Audit Trail Timeline */}
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Audit Trail
            </div>
            {ticket.auditTrail && ticket.auditTrail.length > 0 ? (
              <div className="space-y-2 border-l-2 border-slate-700 ml-2 pl-3">
                {ticket.auditTrail.map((log, i) => (
                  <div key={i} className="text-xs space-y-0.5">
                    <div className="text-text font-semibold">{log.action}</div>
                    <div className="text-muted">{log.details}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted italic">No activity</div>
            )}
          </div>
        </div>

        {/* Footer with Action Debounced Button */}
        <div className="p-6 border-t border-slate-700/60 bg-background/50 flex justify-end">
          <button
            type="submit"
            form="drawer-form"
            // Constraint 2: Action Debouncing
            disabled={saving || (status === 'Resolved' && !adminNote.trim())}
            className="py-2.5 px-6 bg-primary hover:bg-amber-500 disabled:opacity-50 text-background font-semibold rounded-lg text-sm transition-colors"
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
    </div>
  );
}
