import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMyTickets, getCategories } from '../api/tickets';
import { Search, Filter, X, ZoomIn, Clock, MapPin, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatTicketLocation } from '../utils/ticketLocation';

export default function MyReports() {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const statusParam = searchParams.get('status');
    const decodedStatus = statusParam ? decodeURIComponent(statusParam) : null;
    return ['Pending', 'In Progress', 'Resolved'].includes(decodedStatus) ? decodedStatus : 'All';
  });
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);

  // Lightbox for evidence photos
  const [zoomedImages, setZoomedImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  const filterRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (selectedImageIndex === null || zoomedImages.length === 0) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedImageIndex(null);
      } else if (event.key === 'ArrowLeft') {
        setSelectedImageIndex((index) => (index - 1 + zoomedImages.length) % zoomedImages.length);
      } else if (event.key === 'ArrowRight') {
        setSelectedImageIndex((index) => (index + 1) % zoomedImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, zoomedImages]);

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
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm transition-colors duration-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          My Reports
        </h1>
      </div>

      {/* Smart Search & Filter Controls */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between transition-colors duration-200">
        {/* Fast Smart Search Bar */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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
                ? 'border-primary text-primary bg-amber-500/10'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-primary hover:border-primary bg-slate-50 dark:bg-slate-900'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-2 top-full w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 z-50 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="All">All</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
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

      {/* Ticket Cards Responsive Grid */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-16 text-center text-slate-500 dark:text-slate-400 text-sm">
          Loading reports...
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-16 text-center shadow-sm">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {isFiltered ? 'No reports match your filters.' : 'No reports submitted yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 flex flex-col justify-between space-y-3.5 group"
            >
              {/* Upper Section: Header, Details, Description, Photos */}
              <div className="space-y-3">
                {/* Header: Ticket ID, Date, and Status Badge */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-primary text-sm tracking-wide">
                        {ticket.ticketId}
                      </span>
                      {ticket.assignedDepartment && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-primary font-mono truncate">
                          {ticket.assignedDepartment}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span>{new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>

                {/* Category & Location Info */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-900 dark:text-white">
                    <Tag className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="font-medium truncate">
                      {ticket.issueCategory || ticket.category || 'General Issue'}
                    </span>
                  </div>
                  <div className="flex items-center text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <span
                      className="block min-w-0 truncate"
                      title={formatTicketLocation(ticket, 'compact').title || 'Main'}
                    >
                      {formatTicketLocation(ticket, 'compact').text || 'Main'}
                    </span>
                  </div>
                </div>

                {/* Compact Description (Line Clamp 2) */}
                <p
                  className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/40 line-clamp-2 leading-relaxed"
                  title={ticket.description}
                >
                  {ticket.description}
                </p>

                {/* Evidence Photos (Small, Uniform Thumbnails: w-full h-32 object-cover rounded-md) */}
                {ticket.images && ticket.images.length > 0 && (
                  <div className="space-y-1">
                    <div className={`grid gap-2 ${ticket.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {ticket.images.slice(0, 2).map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setZoomedImages(ticket.images);
                            setSelectedImageIndex(idx);
                          }}
                          className="relative h-32 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer group/img"
                        >
                          <img
                            src={img}
                            alt="Report evidence"
                            className="w-full h-32 object-cover rounded-md group-hover/img:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                            <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                          {idx === 1 && ticket.images.length > 2 && (
                            <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/20">
                              +{ticket.images.length - 2}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks Section Restyled (Compact, max-h-24, scrollable) */}
              {ticket.adminRemarks && ticket.adminRemarks.length > 0 && (
                <div className="p-2.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
                    <span>Remarks ({ticket.adminRemarks.length})</span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal lowercase font-mono">
                      {new Date(ticket.adminRemarks[ticket.adminRemarks.length - 1].timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 divide-y divide-amber-500/10">
                    {[...ticket.adminRemarks].reverse().map((remark, idx) => (
                      <div key={idx} className={`text-xs text-slate-800 dark:text-slate-200 flex flex-col ${idx > 0 ? 'pt-1.5' : ''}`}>
                        <span className="leading-snug">{remark.note}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {new Date(remark.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      {selectedImageIndex !== null && zoomedImages[selectedImageIndex] && (
        <div
          onClick={() => setSelectedImageIndex(null)}
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0].clientX;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null || zoomedImages.length < 2) return;
            const delta = event.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) < 50) return;
            setSelectedImageIndex((index) => (
              delta < 0
                ? (index + 1) % zoomedImages.length
                : (index - 1 + zoomedImages.length) % zoomedImages.length
            ));
          }}
          className="fixed inset-0 z-[100000] flex cursor-pointer items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setSelectedImageIndex(null)}
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative flex max-h-[85dvh] max-w-full items-center justify-center px-14"
          >
            {zoomedImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((index) => (index - 1 + zoomedImages.length) % zoomedImages.length)}
                  aria-label="Previous image"
                  className="absolute left-1 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((index) => (index + 1) % zoomedImages.length)}
                  aria-label="Next image"
                  className="absolute right-1 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white">
              {selectedImageIndex + 1} / {zoomedImages.length}
            </div>
          <img
            src={zoomedImages[selectedImageIndex]}
            alt=""
            className="max-h-[85dvh] max-w-full rounded-lg object-contain"
          />
          </div>
        </div>
      )}
    </div>
  );
}
