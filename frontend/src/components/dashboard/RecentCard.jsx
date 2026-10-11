import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import useDepartmentColors from '../../hooks/useDepartmentColors';

export default function RecentCard({ tickets = [], loading = false, className = '' }) {
  const { getTicketColor } = useDepartmentColors();
  const resolvedTickets = tickets
    .filter((ticket) => ticket.status === 'Resolved')
    .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt))
    .slice(0, 3);

  if (loading || resolvedTickets.length === 0) return null;

  return (
    <div className={`bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-none rounded-xl p-6 transition-colors duration-200 ${className}`}>
      <div className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Recent
      </div>

      <div className="mt-4">
        {resolvedTickets.map((ticket) => {
          const title = ticket.issueCategory ?? ticket.category;

          return (
            <div
              key={ticket._id || ticket.ticketId}
              className="flex items-center gap-3 border-t border-slate-200 py-3.5 dark:border-slate-700/60"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: getTicketColor(ticket) }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 truncate text-[16px] font-bold text-slate-900 dark:text-white">
                {title}
              </div>
              <CheckCircle2
                className="h-6 w-6 shrink-0 text-emerald-500"
                aria-label="Resolved"
              />
            </div>
          );
        })}
      </div>

      <div className="flex w-full justify-end border-t border-slate-200 pt-3.5 dark:border-slate-700/60">
        <Link
          to="/my-reports?status=Resolved"
          aria-label="View all reports"
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-slate-700 transition-colors hover:text-primary dark:text-slate-200"
        >
          <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
