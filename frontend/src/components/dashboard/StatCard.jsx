import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function StatCard({ label, shortLabel, value, href, valueClass, loading, ariaLabel }) {
  return (
    <Link
      to={href}
      aria-label={ariaLabel}
      className="group min-w-0 flex-1 rounded-3xl border border-slate-200 dark:border-none bg-white dark:bg-slate-800 shadow-sm p-3.5 sm:p-6 transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <span className="hidden sm:inline text-[13px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {label}
          </span>
          <span className="sm:hidden text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {shortLabel}
          </span>
        </div>

        <ArrowUpRight className="h-[18px] w-[18px] shrink-0 text-slate-500 dark:text-slate-400 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200" aria-hidden="true" />
      </div>

      <div
        className={`mt-4 sm:mt-5 text-[34px] md:text-[56px] font-display font-extrabold leading-none ${
          loading ? 'text-slate-400 dark:text-slate-500' : valueClass
        }`}
      >
        {loading ? '—' : value}
      </div>
    </Link>
  );
}
