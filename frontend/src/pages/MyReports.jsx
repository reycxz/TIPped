import React, { useState, useEffect, useRef } from 'react';
import { getMyTickets, getCategories } from '../api/tickets';
import { Search, Filter, X, ZoomIn, Clock, MapPin, Tag } from 'lucide-react';

export default function MyReports() {
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);

  // Lightbox for evidence photos
  const [zoomedImage, setZoomedImage] = useState(null);

  const filterRef = useRef(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch categories once
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const data = await getCategories();
        if (Array.isArray(data)) setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCats();
  }, []);

  // Fetch tickets based on active search & combined filters
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (categoryFilter !== 'All') params.category = categoryFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const data = await getMyTickets(params);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, debouncedSearch]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-pending border border-amber-500/30">
            Pending
          </span>
        );
      case 'In Progress':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-500/10 text-inProgress border border-sky-500/30">
            In Progress
          </span>
        );
      case 'Resolved':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-resolved border border-emerald-500/30">
            Resolved
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-700/50 text-muted">
            {status}
          </span>
        );
    }
  };

  const isFiltered = statusFilter !== 'All' || categoryFilter !== 'All' || debouncedSearch.trim() !== '';

  return (
    <div className="space-y-6 pb-20">
      {/* Header - 1-2 words only, no subtitles */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          My Reports
        </h1>
      </div>

      {/* Smart Search & Filter Controls */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Fast Smart Search Bar */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-8 py-2 bg-background border border-slate-700 rounded-lg text-xs text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Collapsible Filter Icon Menu */}
        <div className="relative w-full sm:w-auto flex justify-end" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            aria-label="Filter"
            className={`p-2.5 rounded-lg border transition-colors flex items-center space-x-2 text-xs font-semibold ${
              filterOpen || statusFilter !== 'All' || categoryFilter !== 'All'
                ? 'border-primary text-primary bg-background/80'
                : 'border-slate-700 text-muted hover:text-primary hover:border-primary bg-background/50'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 top-full w-64 bg-surface border border-slate-700 rounded-xl shadow-2xl p-4 z-50 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-slate-700 rounded-lg text-xs text-text focus:outline-none focus:border-primary"
                >
                  <option value="All">All</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-slate-700 rounded-lg text-xs text-text focus:outline-none focus:border-primary"
                >
                  <option value="All">All</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {(statusFilter !== 'All' || categoryFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('All');
                    setCategoryFilter('All');
                  }}
                  className="w-full py-1.5 text-xs text-primary hover:underline text-center"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Cards List */}
      {loading ? (
        <div className="bg-surface border border-slate-700/60 rounded-xl p-16 text-center text-muted text-sm">
          Loading...
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-surface border border-slate-700/60 rounded-xl p-16 text-center shadow-sm">
          <p className="text-muted text-sm font-medium">
            {isFiltered ? 'No results' : 'No reports'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-600 transition-all"
            >
              {/* Header row: Ticket ID, Location, Category, Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/40 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-primary text-base">
                    {ticket.ticketId}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-background border border-slate-700 text-text font-medium">
                    {ticket.issueCategory || ticket.category}
                  </span>
                  {ticket.assignedDepartment && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-primary font-mono">
                      {ticket.assignedDepartment}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-xs text-muted flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>
              </div>

              {/* Location & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center text-text">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted flex-shrink-0" />
                  <span>
                    {ticket.campus} • {ticket.locationInfo?.building} • Room {ticket.locationInfo?.room}
                    {ticket.locationInfo?.landmark ? ` (${ticket.locationInfo.landmark})` : ''}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-background/60 p-3 rounded-lg border border-slate-700/40 text-xs text-text whitespace-pre-wrap">
                {ticket.description}
              </div>

              {/* Evidence Photos Gallery */}
              {ticket.images && ticket.images.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Photos
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Remarks */}
              {ticket.adminRemarks && ticket.adminRemarks.length > 0 && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2">
                  <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                    Remarks
                  </div>
                  <div className="space-y-1.5">
                    {ticket.adminRemarks.map((remark, idx) => (
                      <div key={idx} className="text-xs text-text flex flex-col">
                        <span>{remark.note}</span>
                        <span className="text-[10px] text-muted font-mono mt-0.5">
                          {new Date(remark.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
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
