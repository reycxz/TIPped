import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useDepartmentColors from '../hooks/useDepartmentColors';
import {
  AlertCircle,
  CheckCircle2,
  UserRound,
  Users,
  Building2,
  BarChart3,
  Clock,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

export default function Analytics() {
  const { getCategoryColor } = useDepartmentColors();
  const [timeframe, setTimeframe] = useState('All Time');
  const [campus, setCampus] = useState('All');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const response = await axios.get(
          `/api/reports/analytics?campus=${campus}&timeframe=${timeframe}`,
          config
        );
        const data = response.data;
        console.log('Analytics API Data:', data);
        if (isMounted) {
          setStats(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.error || 'Failed to fetch analytics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [campus, timeframe]);

  const categoryCounts = stats?.categories || [];
  const maxCategoryCount = Math.max(0, ...categoryCounts.map((category) => category.count || 0));
  const accountRows = [
    {
      label: 'Users',
      count: stats?.userAccounts ?? stats?.accountDirectory?.user,
      Icon: Users,
      iconClass: 'bg-indigo-500/10 text-indigo-500',
    },
    {
      label: 'Department accounts',
      count: stats?.departmentAccounts ?? stats?.accountDirectory?.department,
      Icon: Building2,
      iconClass: 'bg-amber-500/10 text-amber-500',
    },
    {
      label: 'Guests',
      count: stats?.guestAccounts ?? stats?.accountDirectory?.guest,
      Icon: UserRound,
      iconClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
    },
  ].filter((account) => account.count !== undefined && account.count !== null);

  return (
    <div className="space-y-4 pb-20 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white md:text-4xl">
          Analytics
        </h1>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <label htmlFor="analytics-campus" className="sr-only">Campus</label>
            <select
              id="analytics-campus"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="h-11 appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="All">All</option>
              <option value="Arlegui">Arlegui</option>
              <option value="Casal">Casal</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          </div>
          <div className="relative">
            <label htmlFor="analytics-timeframe" className="sr-only">Timeframe</label>
            <select
              id="analytics-timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="h-11 appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="All Time">All Time</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading analytics...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-5">
            {[
              { label: 'Total', value: stats?.total ?? 0, Icon: BarChart3, tileClass: 'bg-indigo-500/10 text-indigo-500', valueClass: 'text-slate-900 dark:text-white' },
              { label: 'Pending', value: stats?.pending ?? 0, Icon: Clock, tileClass: 'bg-amber-500/10 text-amber-500', valueClass: 'text-amber-600 dark:text-pending' },
              { label: 'In progress', value: stats?.inProgress ?? 0, Icon: RefreshCw, tileClass: 'bg-sky-500/10 text-sky-500', valueClass: 'text-sky-600 dark:text-inProgress' },
              { label: 'Resolved', value: stats?.resolved ?? 0, Icon: CheckCircle2, tileClass: 'bg-emerald-500/10 text-emerald-500', valueClass: 'text-emerald-600 dark:text-resolved' },
            ].map(({ label, value, Icon, tileClass, valueClass }) => (
              <div key={label} className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:min-w-[200px] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-[13px] sm:tracking-widest">
                    {label}
                  </span>
                  <span className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:flex ${tileClass}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <div className={`mt-2 font-display text-4xl font-extrabold leading-none sm:mt-3 sm:text-[52px] ${valueClass}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-start gap-5">
            <section className="min-w-[min(100%,320px)] flex-[2_1_320px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Categories
              </h2>
              {categoryCounts.length === 0 ? (
                <p className="py-4 text-center text-xs italic text-slate-500 dark:text-slate-400">
                  No category data recorded
                </p>
              ) : (
                <div className="mt-4 space-y-3 sm:space-y-4">
                  {categoryCounts.map((category) => {
                    const count = category.count || 0;
                    const barWidth = maxCategoryCount > 0 ? `${(count / maxCategoryCount) * 100}%` : '0%';
                    return (
                      <div key={category.name} className="space-y-2">
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <span className="min-w-0 break-words text-sm text-slate-800 dark:text-slate-200 sm:text-base">
                            {category.name}
                          </span>
                          <span className="shrink-0 text-base font-bold text-slate-900 dark:text-white">
                            {count}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700/60 sm:h-2.5">
                          <div
                            className="h-2 rounded-full transition-all duration-500 sm:h-2.5"
                            style={{ width: barWidth, backgroundColor: getCategoryColor(category.name) || '#94A3B8' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {accountRows.length > 0 && (
              <section className="min-w-[min(100%,260px)] flex-[1_1_260px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
                <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Accounts
                </h2>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-col sm:space-y-4">
                  {accountRows.map(({ label, count, Icon, iconClass }) => (
                    <div key={label} className="flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row sm:gap-3 sm:text-left">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${iconClass}`}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                      </span>
                      <span className="order-3 min-w-0 break-words text-center text-xs text-slate-600 dark:text-slate-300 sm:order-none sm:flex-1 sm:text-left sm:text-sm">{label}</span>
                      <span className="order-2 font-display text-2xl font-extrabold leading-none text-slate-900 dark:text-white sm:order-none sm:text-[28px]">{count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}

    </div>
  );
}
