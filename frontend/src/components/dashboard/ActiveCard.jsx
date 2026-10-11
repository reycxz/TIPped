import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import useDepartmentColors from '../../hooks/useDepartmentColors';

const statusConfig = {
  Pending: {
    label: 'Pending',
    tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    bar: 'bg-amber-500',
    aria: 'Status: Pending',
  },
  'In Progress': {
    label: 'In progress',
    tone: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    bar: 'bg-sky-500',
    aria: 'Status: In progress',
  },
};

export default function ActiveCard({ tickets = [], loading = false, className = '' }) {
  const visibleTickets = tickets.slice(0, 5);
  const { getTicketColor } = useDepartmentColors();

  return (
    <div className={`bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-none rounded-xl p-6 transition-colors duration-200 ${className}`}>
      <div className="text-[13px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Active
      </div>

      {!loading && (
        <div className="mt-4">
          {visibleTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[1.5px] border-amber-500 text-amber-500 bg-amber-500/5">
                <CheckCircle2 className="h-[34px] w-[34px]" aria-hidden="true" />
              </div>
              <div className="mt-4 font-display text-[22px] font-bold leading-tight text-slate-900 dark:text-white">
                All clear
              </div>
            </div>
          ) : (
            <div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700/60">
                {visibleTickets.map((ticket) => {
                  const status = ticket.status;
                  const config = statusConfig[status] || null;
                  if (!config) return null;

                  const deptColor = getTicketColor(ticket);
                  const title = ticket.issueCategory ?? ticket.category ?? 'General Issue';

                  return (
                    <div key={ticket._id || ticket.ticketId} className="py-[18px] first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: deptColor }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1 text-[17px] font-bold truncate text-slate-900 dark:text-white">
                          {title}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold ${config.tone}`}>
                          {config.label}
                        </span>
                      </div>

                      <div
                        className="mt-3 ml-[26px] flex h-1.5 gap-1.5 rounded-full bg-slate-200 dark:bg-slate-700"
                        role="img"
                        aria-label={config.aria}
                      >
                        <span className={`h-full flex-1 rounded-full ${status === 'Pending' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                        <span className={`h-full flex-1 rounded-full ${status === 'In Progress' ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                        <span className="h-full flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {tickets.length > 5 && (
                <div className="mt-4 flex justify-end border-t border-slate-200 pt-4 dark:border-slate-700/60">
                  <Link
                    to="/my-reports"
                    aria-label="View all reports"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors hover:text-primary dark:text-slate-200"
                  >
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
