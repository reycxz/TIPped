import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { getMetrics, getAdminTickets, getCategories } from '../api/tickets';
import {
  getDepartments,
  createDepartment,
  deleteDepartment,
  getCategories as getAdminCategories,
  createCategory,
  deleteCategory,
} from '../api/adminData';
import TicketDrawer from '../components/TicketDrawer';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Eye,
  X,
  Plus,
  Trash2,
  Building,
  Layers,
  AlertCircle,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export default function AdminQueue({ user }) {
  // Navigation tab state for Superadmin
  const [activeTab, setActiveTab] = useState('queue');

  // KPI metrics strictly initialize at 0
  const [metrics, setMetrics] = useState({
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });

  // Tickets state
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Controls
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [campusFilter, setCampusFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  // Manage Routing states (Superadmin only) - Constraint 2
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const routingDepts = departments;
  const setRoutingDepts = setDepartments;
  const routingCats = categories;
  const setRoutingCats = setCategories;
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState('');
  const [routingSuccess, setRoutingSuccess] = useState('');

  // Department form state
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptPrefix, setNewDeptPrefix] = useState('');
  const [addingDept, setAddingDept] = useState(false);

  // Category form state
  const [newCatIssueName, setNewCatIssueName] = useState('');
  const [newCatDeptName, setNewCatDeptName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

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

  // Fetch metrics dynamically
  const fetchMetricsData = async () => {
    try {
      const data = await getMetrics();
      setMetrics({
        pending: Number(data.pending) || 0,
        inProgress: Number(data.inProgress) || 0,
        resolved: Number(data.resolved) || 0,
      });
    } catch (err) {
      console.error('Failed to fetch admin metrics:', err);
    }
  };

  // Fetch categories for filtering
  useEffect(() => {
    getCategories()
      .then((cats) => {
        if (Array.isArray(cats)) setCategories(cats);
      })
      .catch(() => {});
  }, []);

  // Fetch tickets with RBAC & active filters
  const fetchTicketsData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (campusFilter !== 'All') params.campus = campusFilter;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (categoryFilter !== 'All') params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await getAdminTickets(params);
      const mappedTickets = (Array.isArray(data) ? data : []).map((ticket) => ({
        ...ticket,
        issueCategory: ticket.issueCategory || ticket.category || '',
        assignedDepartment: ticket.assignedDepartment || '',
      }));
      setTickets(mappedTickets);
    } catch (err) {
      console.error('Failed to fetch admin tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsData();
  }, []);

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchTicketsData();
    }
  }, [campusFilter, statusFilter, categoryFilter, searchQuery, activeTab]);

  // Fetch routing data for Superadmin
  const fetchRoutingData = async () => {
    try {
      setRoutingLoading(true);
      const [depts, cats] = await Promise.all([
        getDepartments(),
        getAdminCategories(),
      ]);
      setRoutingDepts(Array.isArray(depts) ? depts : []);
      setRoutingCats(Array.isArray(cats) ? cats : []);
      if (Array.isArray(depts) && depts.length > 0 && !newCatDeptName) {
        setNewCatDeptName(depts[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch routing data:', err);
      setRoutingError(err.response?.data?.error || 'Failed to load routing data');
    } finally {
      setRoutingLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Superadmin' && activeTab === 'routing') {
      fetchRoutingData();
    }
  }, [user, activeTab]);

  // Manage Routing: Add Department
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setRoutingError('');
    setRoutingSuccess('');

    if (!newDeptName.trim() || !newDeptPrefix.trim()) {
      setRoutingError('Department name and prefix are required.');
      return;
    }

    const cleanPrefix = newDeptPrefix.trim().toUpperCase();
    if (cleanPrefix.length > 3) {
      setRoutingError('Prefix must be at most 3 characters.');
      return;
    }

    try {
      setAddingDept(true);
      await createDepartment({
        name: newDeptName.trim(),
        prefix: cleanPrefix,
      });
      setNewDeptName('');
      setNewDeptPrefix('');
      setRoutingSuccess(`Department "${newDeptName.trim()}" created successfully.`);
      fetchRoutingData();
    } catch (err) {
      setRoutingError(err.response?.data?.error || 'Failed to create department');
    } finally {
      setAddingDept(false);
    }
  };

  // Manage Routing: Delete Department (Constraint 2)
  const handleDeleteDepartment = async (id) => {
    if (!window.confirm("Permanently delete this from the database?")) {
      return;
    }
    setRoutingError('');
    setRoutingSuccess('');

    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.delete(`/api/admin/departments/${id}`, config);

      if (response.status === 200) {
        setDepartments((prev) => prev.filter((dept) => dept._id !== id));
        setRoutingSuccess('Department deleted.');
      }
    } catch (err) {
      setRoutingError(err.response?.data?.error || 'Failed to delete department');
    }
  };

  // Manage Routing: Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setRoutingError('');
    setRoutingSuccess('');

    if (!newCatIssueName.trim() || !newCatDeptName.trim()) {
      setRoutingError('Issue name and assigned department are required.');
      return;
    }

    try {
      setAddingCat(true);
      await createCategory({
        issueName: newCatIssueName.trim(),
        departmentName: newCatDeptName.trim(),
      });
      setNewCatIssueName('');
      setRoutingSuccess(`Category "${newCatIssueName.trim()}" created successfully.`);
      fetchRoutingData();
    } catch (err) {
      setRoutingError(err.response?.data?.error || 'Failed to create category');
    } finally {
      setAddingCat(false);
    }
  };

  // Manage Routing: Delete Category (Constraint 2)
  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Permanently delete this from the database?")) {
      return;
    }
    setRoutingError('');
    setRoutingSuccess('');

    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.delete(`/api/admin/categories/${id}`, config);

      if (response.status === 200) {
        setCategories((prev) => prev.filter((cat) => cat._id !== id));
        setRoutingSuccess('Category deleted.');
      }
    } catch (err) {
      setRoutingError(err.response?.data?.error || 'Failed to delete category');
    }
  };

  const adminName = user?.firstName || '{AdminName}';

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

  // Constraint 6: Priority Color Mapping
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500';
      case 'High':
        return 'bg-orange-500';
      case 'Medium':
        return 'bg-yellow-500';
      case 'Low':
        return 'bg-slate-400';
      default:
        return 'bg-slate-700';
    }
  };

  // Constraint 2 & 5: Toggle Sorting Handler
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Constraint 3: Render Visual Sort Indicator
  const renderSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? (
        <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary inline-block flex-shrink-0" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary inline-block flex-shrink-0" />
      );
    }
    return (
      <ArrowUpDown className="w-3 h-3 ml-1 text-slate-500 opacity-40 group-hover:opacity-100 inline-block flex-shrink-0 transition-opacity" />
    );
  };

  // Constraint 4: Dynamic Sorting Logic with localeCompare
  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.key) {
        case 'ticketId':
        case 'id': {
          const idA = a.ticketId || '';
          const idB = b.ticketId || '';
          comparison = idA.localeCompare(idB, undefined, { numeric: true });
          break;
        }
        case 'category': {
          const catA = a.issueCategory || a.category || '';
          const catB = b.issueCategory || b.category || '';
          comparison = catA.localeCompare(catB);
          break;
        }
        case 'department': {
          const deptA = a.assignedDepartment || '';
          const deptB = b.assignedDepartment || '';
          comparison = deptA.localeCompare(deptB);
          break;
        }
        case 'status': {
          const statusA = a.status || '';
          const statusB = b.status || '';
          comparison = statusA.localeCompare(statusB);
          break;
        }
        case 'createdAt':
        default: {
          const dateA = new Date(a.createdAt || a.date || a.timestamp || 0).getTime();
          const dateB = new Date(b.createdAt || b.date || b.timestamp || 0).getTime();
          comparison = dateA - dateB;
          break;
        }
      }

      // Tiebreaker: fallback to newest date first
      if (comparison === 0) {
        const dateA = new Date(a.createdAt || a.date || a.timestamp || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || b.timestamp || 0).getTime();
        return dateB - dateA;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [tickets, sortConfig]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner with Role-Aware Tab Switcher */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Welcome, {adminName}!
          </h1>
        </div>

        {/* Tab Switcher visible ONLY to Superadmins */}
        {user?.role === 'Superadmin' && (
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 ${
                activeTab === 'queue'
                  ? 'bg-primary text-slate-900 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/50'
              }`}
            >
              <span>Queue</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('routing')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 ${
                activeTab === 'routing'
                  ? 'bg-primary text-slate-900 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Manage Routing</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: QUEUE TAB */}
      {/* ========================================================= */}
      {activeTab === 'queue' && (
        <>
          {/* KPI Metrics strictly initialized at 0 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm transition-colors duration-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending
              </div>
              <div className="text-3xl font-extrabold text-pending mt-2">
                {metrics.pending}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm transition-colors duration-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                In Progress
              </div>
              <div className="text-3xl font-extrabold text-inProgress mt-2">
                {metrics.inProgress}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm transition-colors duration-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Resolved
              </div>
              <div className="text-3xl font-extrabold text-resolved mt-2">
                {metrics.resolved}
              </div>
            </div>
          </div>

          {/* Controls: Expandable Search Icon & Filter Icon Dropdown */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center justify-between transition-colors duration-200">
            <div className="text-sm font-bold text-slate-900 dark:text-white">Queue</div>

            <div className="flex items-center space-x-2">
              {/* Expandable Search Control */}
              <div className="relative flex items-center">
                {searchOpen ? (
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-primary rounded-lg px-2.5 py-1.5 transition-all animate-in fade-in">
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ID"
                      className="bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none w-32 sm:w-44"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchOpen(false);
                      }}
                      aria-label="Clear"
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Search"
                    className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Filter Dropdown Menu */}
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  aria-label="Filter"
                  className={`p-2 rounded-lg transition-colors ${
                    filterOpen || campusFilter !== 'All' || statusFilter !== 'All' || categoryFilter !== 'All'
                      ? 'text-primary bg-amber-500/10'
                      : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Filter className="w-5 h-5" />
                </button>

                {filterOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 z-50 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Campus
                      </label>
                      <select
                        value={campusFilter}
                        onChange={(e) => setCampusFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                      >
                        <option value="All">All</option>
                        <option value="Arlegui">Arlegui</option>
                        <option value="Casal">Casal</option>
                      </select>
                    </div>

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
                        {categories.map((c) => {
                          const catName = typeof c === 'string' ? c : c.issueName;
                          const key = c._id || catName;
                          return (
                            <option key={key} value={catName}>
                              {catName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Queue Table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm transition-colors duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold select-none">
                  <tr>
                    <th className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSort('ticketId')}
                        className="flex items-center space-x-1 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group focus:outline-none"
                      >
                        <span>ID</span>
                        {renderSortIndicator('ticketId')}
                      </button>
                    </th>
                    <th className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSort('category')}
                        className="flex items-center space-x-1 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group focus:outline-none"
                      >
                        <span>Category</span>
                        {renderSortIndicator('category')}
                      </button>
                    </th>
                    <th className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSort('department')}
                        className="flex items-center space-x-1 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group focus:outline-none"
                      >
                        <span>Department</span>
                        {renderSortIndicator('department')}
                      </button>
                    </th>
                    <th className="px-4 py-3.5">
                      <span>Location</span>
                    </th>
                    <th className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSort('status')}
                        className="flex items-center space-x-1 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group focus:outline-none"
                      >
                        <span>Status</span>
                        {renderSortIndicator('status')}
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-right">
                      <span>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                        Loading tickets...
                      </td>
                    </tr>
                  ) : sortedTickets.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                        No tickets match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedTickets.map((ticket) => (
                      <tr key={ticket._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-primary whitespace-nowrap">
                          <div className="flex items-center">
                            <span
                              className={`w-3 h-3 rounded-full inline-block mr-2 flex-shrink-0 ${getPriorityColor(ticket.priority)}`}
                              title={`Priority: ${ticket.priority || 'Unassigned'}`}
                            />
                            <span>{ticket.ticketId || <span className="text-gray-400 italic">No ID</span>}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white">
                          {ticket.issueCategory || ticket.category || (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 text-xs">
                          {ticket.assignedDepartment ? (
                            ticket.assignedDepartment
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 text-xs">
                          {ticket.campus ? (
                            <span>
                              {ticket.campus}
                              {ticket.locationInfo?.building ? ` - ${ticket.locationInfo.building}` : ''}
                              {(ticket.locationInfo?.floor !== undefined || ticket.locationInfo?.room) ? (
                                ` (Flr ${ticket.locationInfo?.floor ?? '?'}, Rm ${ticket.locationInfo?.room ?? '?'})`
                              ) : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {getStatusBadge(ticket.status)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setDrawerOpen(true);
                            }}
                            aria-label="Manage"
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: MANAGE ROUTING TAB (Superadmin Only) */}
      {/* ========================================================= */}
      {activeTab === 'routing' && user?.role === 'Superadmin' && (
        <div className="space-y-6">
          {/* Notifications */}
          {routingError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{routingError}</span>
              </div>
              <button
                type="button"
                onClick={() => setRoutingError('')}
                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {routingSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{routingSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setRoutingSuccess('')}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ---------------------------------------------------- */}
            {/* DEPARTMENTS MANAGEMENT CARD */}
            {/* ---------------------------------------------------- */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4 transition-colors duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Departments</h2>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 font-mono">
                  {routingDepts.length} total
                </span>
              </div>

              {/* Add Department Form */}
              <form onSubmit={handleAddDepartment} className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/40">
                <div className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                  Add Department
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Name (e.g. Maintenance)"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      maxLength={3}
                      placeholder="Prefix (MNT)"
                      value={newDeptPrefix}
                      onChange={(e) => setNewDeptPrefix(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={addingDept}
                  className="w-full py-2 bg-primary hover:bg-amber-500 text-slate-900 text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addingDept ? 'Adding...' : 'Add Department'}</span>
                </button>
              </form>

              {/* Departments Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/80 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Name</th>
                      <th className="px-3.5 py-2.5">Prefix</th>
                      <th className="px-3.5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                    {routingLoading ? (
                      <tr>
                        <td colSpan="3" className="px-3.5 py-4 text-center text-slate-500 dark:text-slate-400">
                          Loading departments...
                        </td>
                      </tr>
                    ) : routingDepts.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-3.5 py-4 text-center text-slate-500 dark:text-slate-400">
                          No departments configured yet.
                        </td>
                      </tr>
                    ) : (
                      routingDepts.map((dept) => (
                        <tr key={dept._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-3.5 py-2.5 font-medium text-slate-900 dark:text-white">
                            {dept.name}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-primary border border-amber-500/30 text-[11px]">
                              {dept.prefix}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteDepartment(dept._id)}
                              title="Delete Department"
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* CATEGORIES MANAGEMENT CARD */}
            {/* ---------------------------------------------------- */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4 transition-colors duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Categories</h2>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 font-mono">
                  {routingCats.length} total
                </span>
              </div>

              {/* Add Category Form */}
              <form onSubmit={handleAddCategory} className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/40">
                <div className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                  Add Category
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Issue Name (e.g. Water & Plumbing)"
                      value={newCatIssueName}
                      onChange={(e) => setNewCatIssueName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <select
                      required
                      value={newCatDeptName}
                      onChange={(e) => setNewCatDeptName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="" disabled>
                        Assign Department
                      </option>
                      {routingDepts.map((d) => (
                        <option key={d._id} value={d.name}>
                          {d.name} ({d.prefix})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={addingCat || routingDepts.length === 0}
                  className="w-full py-2 bg-primary hover:bg-amber-500 text-slate-900 text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {routingDepts.length === 0
                      ? 'Create Department First'
                      : addingCat
                      ? 'Adding...'
                      : 'Add Category'}
                  </span>
                </button>
              </form>

              {/* Categories Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/60 max-h-[350px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/80 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="px-3.5 py-2.5">Issue Name</th>
                      <th className="px-3.5 py-2.5">Assigned Department</th>
                      <th className="px-3.5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                    {routingLoading ? (
                      <tr>
                        <td colSpan="3" className="px-3.5 py-4 text-center text-slate-500 dark:text-slate-400">
                          Loading categories...
                        </td>
                      </tr>
                    ) : routingCats.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-3.5 py-4 text-center text-slate-500 dark:text-slate-400">
                          No categories configured yet.
                        </td>
                      </tr>
                    ) : (
                      routingCats.map((cat) => (
                        <tr key={cat._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-3.5 py-2.5 font-medium text-slate-900 dark:text-white">
                            {cat.issueName}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600/50 text-[11px]">
                              {cat.departmentName}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat._id)}
                              title="Delete Category"
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Management Drawer */}
      <TicketDrawer
        user={user}
        ticket={selectedTicket}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdateSuccess={() => {
          fetchTicketsData();
          fetchMetricsData();
        }}
      />
    </div>
  );
}
