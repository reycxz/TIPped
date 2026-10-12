import { useState } from 'react';
import { Camera, Copy, MapPin, X } from 'lucide-react';
import { getTicketColor } from '../../hooks/useDepartmentColors';
import StatusBadge from './StatusBadge';
import { formatTicketLocation } from '../../utils/ticketLocation';

export default function TicketDetailPanel({ ticket, onClose, onUpdate }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = Array.isArray(ticket.images) ? ticket.images[0] : null;
  const category = ticket.issueCategory || ticket.category || 'Unassigned';
  const location = formatTicketLocation(ticket, 'full');

  const handleCopyTicketId = async () => {
    try {
      await navigator.clipboard.writeText(ticket.ticketId || '');
    } catch (error) {
      console.error('Failed to copy ticket ID:', error);
    }
  };

  return (
    <section
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      className="flex flex-col gap-[18px] rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm transition-colors duration-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
    >
      <div className="relative h-[170px] w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
        {image && !imageFailed ? (
          <img
            src={image}
            alt="Ticket photo"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-500">
            <Camera className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold leading-tight text-slate-900 dark:text-white">
            {category}
          </h2>
          <div className="mt-2 flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate" title={location.title}>
              {location.primary}
              {location.secondary && (
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {location.secondary}
                </span>
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getTicketColor(ticket) }}
              aria-hidden="true"
            />
            <span>{ticket.assignedDepartment || 'Unassigned'}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <StatusBadge status={ticket.status} />

      <div className="flex items-center gap-2 font-mono text-sm text-slate-700 dark:text-slate-200">
        <span className="min-w-0 flex-1 break-all">{ticket.ticketId}</span>
        <button
          type="button"
          onClick={handleCopyTicketId}
          aria-label="Copy ticket ID"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-700">
        <button
          type="button"
          onClick={onUpdate}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
        >
          Update
        </button>
      </div>
    </section>
  );
}
