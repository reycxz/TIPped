import { Layers } from 'lucide-react';
import {
  getCategoryDepartmentName,
  default as useDepartmentColors,
} from '../../hooks/useDepartmentColors';
import { DEPARTMENT_COLOR_FALLBACK } from '../../constants/departmentPalette';

export default function ConsoleHeader({
  activeTab,
  onTabChange,
  ticketCount,
  routingCount = 0,
  user,
  actionSlot = null,
}) {
  const { getDepartmentColor } = useDepartmentColors();
  const isSuperadmin = user?.role?.toLowerCase() === 'superadmin';
  const isDepartmentAccount = user?.role?.toLowerCase() === 'department';
  const categoryName = user?.departmentCategory;
  const departmentName = isDepartmentAccount
    ? getCategoryDepartmentName(categoryName)
    : null;
  const pillName = departmentName || categoryName;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white md:text-4xl">
          {activeTab === 'routing' ? 'Routing' : 'Queue'}
        </h1>
        {(activeTab === 'queue' || activeTab === 'routing') && (
          <span className="rounded-full border border-slate-300 px-3 py-1 text-[13px] font-bold text-slate-500 dark:border-slate-600 dark:text-slate-400">
            {activeTab === 'routing' ? routingCount : ticketCount}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {isSuperadmin && (
          <div
            className="flex items-center rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
            role="group"
            aria-label="Console sections"
          >
            <button
              type="button"
              onClick={() => onTabChange('queue')}
              aria-pressed={activeTab === 'queue'}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 md:h-10 ${
                activeTab === 'queue'
                  ? 'bg-primary font-bold text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
            >
              Queue
            </button>
            <button
              type="button"
              onClick={() => onTabChange('routing')}
              aria-pressed={activeTab === 'routing'}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 md:h-10 ${
                activeTab === 'routing'
                  ? 'bg-primary font-bold text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
            >
              <Layers className="h-[18px] w-[18px]" aria-hidden="true" />
              Routing
            </button>
          </div>
        )}

        {isDepartmentAccount && (
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[15px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: departmentName
                  ? getDepartmentColor(departmentName)
                  : DEPARTMENT_COLOR_FALLBACK,
              }}
              aria-hidden="true"
            />
            <span className="max-w-[min(60vw,20rem)] truncate">
              {pillName}
            </span>
          </div>
        )}
        {actionSlot}
      </div>
    </div>
  );
}
