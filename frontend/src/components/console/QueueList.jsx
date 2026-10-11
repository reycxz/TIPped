import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Search,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import useDepartmentColors from '../../hooks/useDepartmentColors';
import StatusBadge from './StatusBadge';
import TicketDetailPanel from './TicketDetailPanel';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const getCampusCode = (ticket) => {
  const campus = ticket.campus?.toLowerCase();
  if (campus === 'casal' || campus === 'cas') return 'CAS';
  if (campus === 'arlegui' || campus === 'arl') return 'ARL';

  const prefix = ticket.ticketId?.split('-')[0]?.toUpperCase();
  return prefix === 'CAS' || prefix === 'ARL' ? prefix : '—';
};

function CampusTag({ ticket }) {
  const campusCode = getCampusCode(ticket);
  const code = ticket.ticketId ? ticket.ticketId.slice(-5) : '—';

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-xs">
      <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300">
        {campusCode}
      </span>
      <span title={ticket.ticketId || ''}>{code}</span>
    </span>
  );
}

function LocationText({ ticket, clamp = false }) {
  const location = ticket.locationInfo?.landmark || ticket.locationInfo?.building || 'Unassigned';
  const floor = ticket.locationInfo?.floor;
  const hasFloorReference = /\b(floor|flr)\.?\s*\d+/i.test(location);
  const text = floor !== undefined && floor !== null && floor !== '' && !hasFloorReference
    ? `${location} · Flr ${floor}`
    : location;

  return (
    <span className={`${clamp ? 'line-clamp-2' : 'truncate'} block`} title={text}>
      {text}
    </span>
  );
}

function SortHeader({ label, sortKey, handleSort, renderSortIndicator }) {
  return (
    <button
      type="button"
      onClick={() => handleSort(sortKey)}
      className="group inline-flex min-h-11 items-center text-left text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:text-white"
    >
      {label}
      <span aria-hidden="true">{renderSortIndicator(sortKey)}</span>
    </button>
  );
}

export default function QueueList({
  tickets,
  loading,
  statusCounts,
  searchQuery,
  setSearchQuery,
  filterOpen,
  setFilterOpen,
  campusFilter,
  setCampusFilter,
  statusFilter,
  setStatusFilter,
  departmentFilter,
  setDepartmentFilter,
  departmentOptions,
  user,
  handleSort,
  renderSortIndicator,
  selectedTicketId,
  setSelectedTicketId,
  setSelectedTicket,
  setDrawerOpen,
  filterRef,
}) {
  const { getTicketColor } = useDepartmentColors();
  const [pageSize, setPageSize] = useState(() => {
    try {
      const savedPageSize = Number(localStorage.getItem('queuePageSize'));
      return PAGE_SIZE_OPTIONS.includes(savedPageSize) ? savedPageSize : 10;
    } catch {
      return 10;
    }
  });
  const [page, setPage] = useState(1);
  const [isLargeViewport, setIsLargeViewport] = useState(false);
  const cardRef = useRef(null);
  const shouldScrollAfterPageChangeRef = useRef(false);
  const sheetRef = useRef(null);
  const openerRef = useRef(null);
  const skipSheetFocusRestoreRef = useRef(false);
  const isDepartmentAccount = user?.role === 'department' || user?.role?.toLowerCase() === 'department';
  const selectedRow = tickets.find((ticket) => ticket._id === selectedTicketId);
  const isSheetOpen = Boolean(selectedRow) && !isLargeViewport;
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageTickets = tickets.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageNumbers = totalPages <= 7
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [...new Set([1, safePage - 1, safePage, safePage + 1, totalPages])]
      .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
      .sort((left, right) => left - right)
      .reduce((numbers, pageNumber) => {
        if (numbers.length > 0 && pageNumber - numbers[numbers.length - 1] > 1) {
          numbers.push('ellipsis');
        }
        numbers.push(pageNumber);
        return numbers;
      }, []);
  const gridColumns = isDepartmentAccount
    ? 'grid-cols-[minmax(5.5rem,0.7fr)_minmax(9rem,1.6fr)_minmax(9rem,1.8fr)_7.5rem_2.75rem]'
    : 'grid-cols-[minmax(5.5rem,0.7fr)_minmax(8rem,1.5fr)_minmax(8rem,1.2fr)_minmax(8rem,1.5fr)_7.5rem_2.75rem]';
  const desktopMinWidth = isDepartmentAccount ? 'min-w-[600px]' : 'min-w-[720px]';
  const statusChips = [
    { value: 'All', label: 'All' },
    { value: 'Pending', label: 'Pending', dotClass: 'bg-amber-500' },
    { value: 'In Progress', label: 'In progress', dotClass: 'bg-sky-400' },
    { value: 'Resolved', label: 'Resolved', dotClass: 'bg-emerald-500' },
  ];

  useEffect(() => {
    if (!shouldScrollAfterPageChangeRef.current) return;
    shouldScrollAfterPageChangeRef.current = false;
    if (cardRef.current?.getBoundingClientRect().top < 0) {
      cardRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [page]);

  useEffect(() => {
    setPage(1);
  }, [departmentFilter]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateViewport = () => setIsLargeViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!isSheetOpen) return undefined;

    const dialog = sheetRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () => Array.from(dialog?.querySelectorAll(focusableSelector) || []);
    (focusableElements()[0] || dialog)?.focus();

    const handleSheetKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedTicketId(null);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = focusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleSheetKeyDown);
    return () => {
      document.removeEventListener('keydown', handleSheetKeyDown);
      if (!skipSheetFocusRestoreRef.current && openerRef.current?.isConnected) {
        openerRef.current.focus();
      }
      skipSheetFocusRestoreRef.current = false;
    };
  }, [isSheetOpen, setSelectedTicketId]);

  const selectTicket = (ticket, event) => {
    openerRef.current = event.currentTarget;
    setSelectedTicketId(ticket._id);
  };
  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
  };
  const handleRowKeyDown = (event, ticket) => {
    if (event.key === 'Enter' && !event.target.closest('button')) {
      event.preventDefault();
      selectTicket(ticket, event);
    }
  };
  const closeSheet = () => setSelectedTicketId(null);
  const handlePageChange = (nextPage) => {
    shouldScrollAfterPageChangeRef.current = true;
    setPage(nextPage);
  };
  const handleSortAndResetPage = (sortKey) => {
    setPage(1);
    handleSort(sortKey);
  };
  const handlePageSizeChange = (event) => {
    const nextPageSize = Number(event.target.value);
    try {
      localStorage.setItem('queuePageSize', String(nextPageSize));
    } catch {
      console.error('Failed to save queue page size.');
    }
    setPageSize(nextPageSize);
    setPage(1);
  };
  const updateSelectedRow = () => {
    if (!selectedRow) return;
    if (!isLargeViewport) {
      skipSheetFocusRestoreRef.current = true;
      setSelectedTicketId(null);
    }
    openTicket(selectedRow);
  };

  return (
    <section className="space-y-4">
      <div className="px-1 sm:-mx-1 sm:overflow-x-auto md:mx-0 md:overflow-visible md:px-0">
        <div className="flex flex-wrap gap-2 sm:w-max sm:flex-nowrap md:w-auto md:flex-wrap">
          {statusChips.map((chip) => {
            const isActive = statusFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => {
                  setPage(1);
                  setStatusFilter(chip.value);
                }}
                aria-pressed={isActive}
                className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:shrink-0 ${
                  isActive
                    ? 'bg-primary font-bold text-slate-900'
                    : 'border border-slate-300 bg-white font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {chip.dotClass && <span className={`h-2.5 w-2.5 rounded-full ${chip.dotClass}`} aria-hidden="true" />}
                <span>{chip.label}</span>
                <span className={`font-normal ${isActive ? 'text-slate-700' : 'text-slate-400 dark:text-slate-500'}`}>
                  {statusCounts[chip.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
      <div ref={cardRef} className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-3 rounded-t-3xl border-b border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search tickets"
              value={searchQuery}
              onChange={(event) => {
                setPage(1);
                setSearchQuery(event.target.value);
              }}
              placeholder="Search ID"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSearchQuery('');
                }}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((previous) => !previous)}
              aria-label="Filters"
              aria-expanded={filterOpen}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                filterOpen || campusFilter !== 'All' || statusFilter !== 'All' || departmentFilter !== 'All'
                  ? 'bg-amber-500/10 text-primary'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="h-5 w-5" aria-hidden="true" />
            </button>

            {filterOpen && (
              <div className="static mt-2 w-full space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:absolute sm:right-0 sm:z-50 sm:mt-2 sm:w-56">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Campus
                  </label>
                  <select
                    value={campusFilter}
                    onChange={(event) => {
                      setPage(1);
                      setCampusFilter(event.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="All">All</option>
                    <option value="Arlegui">Arlegui</option>
                    <option value="Casal">Casal</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setPage(1);
                      setStatusFilter(event.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Department
                  </label>
                  <select
                    value={departmentFilter}
                    onChange={(event) => {
                      setPage(1);
                      setDepartmentFilter(event.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="All">All</option>
                    {departmentOptions.map((departmentName) => (
                      <option key={departmentName} value={departmentName}>
                        {departmentName}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:text-slate-200 sm:hidden"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="hidden overflow-x-auto rounded-b-3xl md:block">
          <div role="table" aria-label="Ticket queue" className={desktopMinWidth}>
            <div
              role="row"
              className={`grid ${gridColumns} gap-3 border-b border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-900/60`}
            >
              <div role="columnheader"><SortHeader label="ID" sortKey="ticketId" handleSort={handleSortAndResetPage} renderSortIndicator={renderSortIndicator} /></div>
              <div role="columnheader"><SortHeader label="Category" sortKey="category" handleSort={handleSortAndResetPage} renderSortIndicator={renderSortIndicator} /></div>
              {!isDepartmentAccount && (
                <div role="columnheader"><SortHeader label="Office" sortKey="department" handleSort={handleSortAndResetPage} renderSortIndicator={renderSortIndicator} /></div>
              )}
              <div role="columnheader" className="flex min-h-11 items-center text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Location
              </div>
              <div role="columnheader"><SortHeader label="Status" sortKey="status" handleSort={handleSortAndResetPage} renderSortIndicator={renderSortIndicator} /></div>
              <div role="columnheader" className="flex min-h-11 items-center justify-end text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Actions
              </div>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No tickets match the selected criteria.</div>
            ) : (
              pageTickets.map((ticket) => {
                const isSelected = selectedTicketId === ticket._id;
                const campusCode = getCampusCode(ticket);
                return (
                  <div
                    key={ticket._id}
                    role="row"
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={(event) => selectTicket(ticket, event)}
                    onKeyDown={(event) => handleRowKeyDown(event, ticket)}
                    className={`grid min-h-16 ${gridColumns} gap-3 border-t border-slate-100 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-slate-700/40 ${
                      isSelected
                        ? 'bg-amber-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <div role="cell" className={`flex min-w-0 items-center font-mono text-xs font-semibold ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      <span className="truncate" title={ticket.ticketId || ''}>
                        <span className="mr-2 inline-flex rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300">
                          {campusCode}
                        </span>
                        {ticket.ticketId ? ticket.ticketId.slice(-5) : '—'}
                      </span>
                    </div>
                    <div role="cell" className="flex min-w-0 items-center text-base font-semibold text-slate-900 dark:text-white" title={ticket.issueCategory || ticket.category || 'Unassigned'}>
                      <span className="line-clamp-2">
                        {ticket.issueCategory || ticket.category || 'Unassigned'}
                      </span>
                    </div>
                    {!isDepartmentAccount && (
                      <div role="cell" className="flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-300" title={ticket.assignedDepartment || 'Unassigned'}>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getTicketColor(ticket) }} aria-hidden="true" />
                        <span className="line-clamp-2 min-w-0">{ticket.assignedDepartment || 'Unassigned'}</span>
                      </div>
                    )}
                    <div role="cell" className="flex min-w-0 items-center text-sm text-slate-600 dark:text-slate-300">
                      <LocationText ticket={ticket} clamp />
                    </div>
                    <div role="cell" className="flex items-center whitespace-nowrap">
                      <StatusBadge status={ticket.status} />
                    </div>
                    <div role="cell" className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openTicket(ticket);
                        }}
                        aria-label="Actions"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-3 overflow-hidden rounded-b-3xl p-3 md:hidden">
          {loading ? (
            <div className="px-2 py-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No tickets match the selected criteria.</div>
          ) : (
            pageTickets.map((ticket) => {
              const isSelected = selectedTicketId === ticket._id;
              return (
                <div
                  key={ticket._id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={(event) => selectTicket(ticket, event)}
                  onKeyDown={(event) => {
                    if (event.target.closest('button')) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectTicket(ticket, event);
                    }
                  }}
                  className={`space-y-2.5 rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getTicketColor(ticket) }} aria-hidden="true" />
                      <div className="min-w-0">
                        <span className="block truncate font-bold text-slate-900 dark:text-white">
                          {ticket.issueCategory || ticket.category || 'Unassigned'}
                        </span>
                        {!isDepartmentAccount && (
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                            {ticket.assignedDepartment || 'Unassigned'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openTicket(ticket);
                      }}
                      aria-label="Actions"
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                      <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="truncate text-sm text-slate-500 dark:text-slate-400">
                    <LocationText ticket={ticket} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={ticket.status} />
                    <CampusTag ticket={ticket} />
                  </div>
                </div>
              );
            })
          )}
        </div>
        {tickets.length > PAGE_SIZE_OPTIONS[0] && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Showing {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, tickets.length)} of {tickets.length}
              </span>
              <label htmlFor="queue-page-size" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                Rows per page
                <select
                  id="queue-page-size"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <nav aria-label="Pagination" className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage === 1}
                aria-label="Previous page"
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="px-2 text-sm text-slate-600 dark:text-slate-300 sm:hidden">
                Page {safePage} of {totalPages}
              </span>
              {totalPages > 1 && (
                <div className="hidden items-center gap-1 sm:flex">
                  {pageNumbers.map((pageNumber, index) => (
                    pageNumber === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-slate-500 dark:text-slate-400">...</span>
                    ) : (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => handlePageChange(pageNumber)}
                        aria-current={safePage === pageNumber ? 'page' : undefined}
                        className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          safePage === pageNumber
                            ? 'border-primary bg-primary font-bold text-slate-900'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage === totalPages}
                aria-label="Next page"
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        )}
      </div>
      {selectedRow && isLargeViewport && (
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] w-[340px] shrink-0 self-start overflow-y-auto">
          <TicketDetailPanel
            key={selectedRow._id}
            ticket={selectedRow}
            onClose={() => setSelectedTicketId(null)}
            onUpdate={updateSelectedRow}
          />
        </div>
      )}
      </div>
      {selectedRow && !isLargeViewport && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end bg-black/60"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSheet();
          }}
        >
          <section
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Ticket details"
            tabIndex={-1}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] outline-none dark:bg-slate-800"
          >
            <TicketDetailPanel
              key={selectedRow._id}
              ticket={selectedRow}
              onClose={closeSheet}
              onUpdate={updateSelectedRow}
            />
          </section>
        </div>,
        document.body
      )}
    </section>
  );
}
