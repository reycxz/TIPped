import {
  Filter,
  MoreHorizontal,
  Search,
  X,
} from 'lucide-react';
import useDepartmentColors from '../../hooks/useDepartmentColors';

const getCampusCode = (ticket) => {
  const campus = ticket.campus?.toLowerCase();
  if (campus === 'casal' || campus === 'cas') return 'CAS';
  if (campus === 'arlegui' || campus === 'arl') return 'ARL';

  const prefix = ticket.ticketId?.split('-')[0]?.toUpperCase();
  return prefix === 'CAS' || prefix === 'ARL' ? prefix : '—';
};

const getStatusLabel = (status) => (status === 'In Progress' ? 'In progress' : status);

const getStatusClasses = (status) => {
  switch (status) {
    case 'Pending':
      return 'border-amber-500/30 bg-amber-500/10 text-pending';
    case 'In Progress':
      return 'border-sky-500/30 bg-sky-500/10 text-inProgress';
    case 'Resolved':
      return 'border-emerald-500/30 bg-emerald-500/10 text-resolved';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-bold ${getStatusClasses(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

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
  metrics,
  searchQuery,
  setSearchQuery,
  filterOpen,
  setFilterOpen,
  campusFilter,
  setCampusFilter,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  categories,
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
  const isDepartmentAccount = user?.role === 'department' || user?.role?.toLowerCase() === 'department';
  const gridColumns = isDepartmentAccount
    ? 'grid-cols-[minmax(6rem,0.8fr)_minmax(12rem,1.8fr)_minmax(12rem,2fr)_minmax(7rem,1fr)_2.75rem]'
    : 'grid-cols-[minmax(6rem,0.8fr)_minmax(12rem,1.8fr)_minmax(11rem,1.5fr)_minmax(12rem,1.8fr)_minmax(7rem,1fr)_2.75rem]';
  const desktopMinWidth = isDepartmentAccount ? 'min-w-[820px]' : 'min-w-[1000px]';
  const metricCounts = {
    All: metrics.pending + metrics.inProgress + metrics.resolved,
    Pending: metrics.pending,
    'In Progress': metrics.inProgress,
    Resolved: metrics.resolved,
  };
  const statusChips = [
    { value: 'All', label: 'All' },
    { value: 'Pending', label: 'Pending', dotClass: 'bg-amber-500' },
    { value: 'In Progress', label: 'In progress', dotClass: 'bg-sky-400' },
    { value: 'Resolved', label: 'Resolved', dotClass: 'bg-emerald-500' },
  ];

  const selectTicket = (ticket) => setSelectedTicketId(ticket._id);
  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
  };
  const handleRowKeyDown = (event, ticket) => {
    if (event.key === 'Enter' && !event.target.closest('button')) {
      event.preventDefault();
      selectTicket(ticket);
    }
  };

  return (
    <section className="space-y-4">
      <div className="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
        <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
          {statusChips.map((chip) => {
            const isActive = statusFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatusFilter(chip.value)}
                aria-pressed={isActive}
                className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  isActive
                    ? 'bg-primary font-bold text-slate-900'
                    : 'border border-slate-300 bg-white font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {chip.dotClass && <span className={`h-2.5 w-2.5 rounded-full ${chip.dotClass}`} aria-hidden="true" />}
                <span>{chip.label}</span>
                <span className={`font-normal ${isActive ? 'text-slate-700' : 'text-slate-400 dark:text-slate-500'}`}>
                  {metricCounts[chip.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-3 rounded-t-3xl border-b border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search tickets"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search ID"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
                filterOpen || campusFilter !== 'All' || statusFilter !== 'All' || categoryFilter !== 'All'
                  ? 'bg-amber-500/10 text-primary'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="h-5 w-5" aria-hidden="true" />
            </button>

            {filterOpen && (
              <div className="absolute right-0 z-50 mt-2 w-56 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Campus
                  </label>
                  <select
                    value={campusFilter}
                    onChange={(event) => setCampusFilter(event.target.value)}
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
                    onChange={(event) => setStatusFilter(event.target.value)}
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
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="All">All</option>
                    {user?.role === 'department' || user?.role?.toLowerCase() === 'department'
                      ? (user?.categories || user?.assignedCategories || []).map((category) => {
                          const categoryName = typeof category === 'string'
                            ? category
                            : (category.issueName || category.name || category);
                          const key = (typeof category === 'object' && category._id)
                            ? category._id
                            : categoryName;
                          return (
                            <option key={key} value={categoryName}>
                              {categoryName}
                            </option>
                          );
                        })
                      : categories.map((category) => {
                          const categoryName = typeof category === 'string'
                            ? category
                            : (category.issueName || category.name || category);
                          const key = (typeof category === 'object' && category._id)
                            ? category._id
                            : categoryName;
                          return (
                            <option key={key} value={categoryName}>
                              {categoryName}
                            </option>
                          );
                        })}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden overflow-x-auto rounded-b-3xl md:block">
          <div role="table" aria-label="Ticket queue" className={desktopMinWidth}>
            <div
              role="row"
              className={`grid ${gridColumns} gap-4 border-b border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-900/60`}
            >
              <div role="columnheader"><SortHeader label="ID" sortKey="ticketId" handleSort={handleSort} renderSortIndicator={renderSortIndicator} /></div>
              <div role="columnheader"><SortHeader label="Category" sortKey="category" handleSort={handleSort} renderSortIndicator={renderSortIndicator} /></div>
              {!isDepartmentAccount && (
                <div role="columnheader"><SortHeader label="Office" sortKey="department" handleSort={handleSort} renderSortIndicator={renderSortIndicator} /></div>
              )}
              <div role="columnheader" className="flex min-h-11 items-center text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Location
              </div>
              <div role="columnheader"><SortHeader label="Status" sortKey="status" handleSort={handleSort} renderSortIndicator={renderSortIndicator} /></div>
              <div role="columnheader" className="flex min-h-11 items-center justify-end text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Actions
              </div>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No tickets match the selected criteria.</div>
            ) : (
              tickets.map((ticket) => {
                const isSelected = selectedTicketId === ticket._id;
                const campusCode = getCampusCode(ticket);
                return (
                  <div
                    key={ticket._id}
                    role="row"
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={() => selectTicket(ticket)}
                    onKeyDown={(event) => handleRowKeyDown(event, ticket)}
                    className={`grid min-h-16 ${gridColumns} gap-4 border-t border-slate-100 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-slate-700/40 ${
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
                    <div role="cell" className="flex items-center">
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
            tickets.map((ticket) => {
              const isSelected = selectedTicketId === ticket._id;
              return (
                <div
                  key={ticket._id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => selectTicket(ticket)}
                  onKeyDown={(event) => {
                    if (event.target.closest('button')) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectTicket(ticket);
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
      </div>
    </section>
  );
}
