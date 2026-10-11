import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { getMetrics, getAdminTickets, getCategories } from '../api/tickets';
import {
  getDepartments,
  createDepartment,
  getCategories as getAdminCategories,
  createCategory,
} from '../api/adminData';
import { getDepartmentAccounts } from '../api/auth';
import { refreshDepartmentColors } from '../hooks/useDepartmentColors';
import TicketDrawer from '../components/TicketDrawer';
import ConsoleHeader from '../components/console/ConsoleHeader';
import QueueList from '../components/console/QueueList';
import RoutingPanel from '../components/routing/RoutingPanel';
import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);
import {
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
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Controls
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
  const [routingAccounts, setRoutingAccounts] = useState([]);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState('');
  const [routingSuccess, setRoutingSuccess] = useState('');
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptPrefix, setNewDeptPrefix] = useState('');
  const [addingDept, setAddingDept] = useState(false);
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const socket = io(socketUrl, {
      auth: { token }
    });
    const handleNewTicket = (ticket) => {
      const incomingTicket = {
        ...ticket,
        issueCategory: ticket.issueCategory || ticket.category || '',
        assignedDepartment: ticket.assignedDepartment || ''
      };
      setTickets((previous) => [
        incomingTicket,
        ...previous.filter((existing) => existing._id !== incomingTicket._id)
      ]);
      fetchMetricsData();
    };

    socket.on('newTicket', handleNewTicket);
    return () => {
      socket.off('newTicket', handleNewTicket);
      socket.disconnect();
    };
  }, []);

  // Fetch routing data for Superadmin
  const fetchRoutingData = async () => {
    try {
      setRoutingLoading(true);
      setRoutingError('');
      const [depts, cats, accounts] = await Promise.all([
        getDepartments(),
        getAdminCategories(),
        getDepartmentAccounts(),
      ]);
      setRoutingDepts(Array.isArray(depts) ? depts : []);
      setRoutingCats(Array.isArray(cats) ? cats : []);
      setRoutingAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (err) {
      console.error('Failed to fetch routing data:', err);
      setRoutingError(err.response?.data?.error || 'Failed to load routing data');
    } finally {
      setRoutingLoading(false);
    }
  };

  const reloadRoutingData = async () => {
    await fetchRoutingData();
    await refreshDepartmentColors();
  };

  useEffect(() => {
    if (user?.role?.toLowerCase() === 'superadmin' && activeTab === 'routing') {
      fetchRoutingData();
    }
  }, [user, activeTab]);

  const handleAddDepartment = async ({ name, prefix, color }) => {
    if (!name.trim() || !prefix.trim()) {
      throw new Error('Department name and prefix are required.');
    }
    const cleanPrefix = prefix.trim().toUpperCase();
    if (cleanPrefix.length > 3) {
      throw new Error('Prefix must be at most 3 characters.');
    }
    setAddingDept(true);
    try {
      await createDepartment({ name: name.trim(), prefix: cleanPrefix, color });
      await reloadRoutingData();
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

  const handleAddCategory = async ({ issueName, departmentName }) => {
    if (!issueName.trim() || !departmentName.trim()) {
      throw new Error('Issue name and assigned department are required.');
    }
    setAddingCat(true);
    try {
      await createCategory({
        issueName: issueName.trim(),
        departmentName: departmentName.trim(),
      });
      await reloadRoutingData();
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
      <ConsoleHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ticketCount={tickets.length}
        routingCount={departments.length}
        user={user}
        actionSlot={activeTab === 'routing' ? (
          <button
            type="button"
            onClick={() => setDepartmentModalOpen(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Department
          </button>
        ) : null}
      />

      {/* ========================================================= */}
      {/* SECTION 1: QUEUE TAB */}
      {/* ========================================================= */}
      {activeTab === 'queue' && (
        <QueueList
          tickets={sortedTickets}
          loading={loading}
          metrics={metrics}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          campusFilter={campusFilter}
          setCampusFilter={setCampusFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categories={categories}
          user={user}
          handleSort={handleSort}
          renderSortIndicator={renderSortIndicator}
          selectedTicketId={selectedTicketId}
          setSelectedTicketId={setSelectedTicketId}
          setSelectedTicket={setSelectedTicket}
          setDrawerOpen={setDrawerOpen}
          filterRef={filterRef}
        />
      )}

      {/* ========================================================= */}
      {/* SECTION 2: MANAGE ROUTING TAB (Superadmin Only) */}
      {/* ========================================================= */}
      {activeTab === 'routing' && user?.role?.toLowerCase() === 'superadmin' && (
        <RoutingPanel
          departments={departments}
          categories={categories}
          accounts={routingAccounts}
          loading={routingLoading}
          loadError={routingError}
          onDismissLoadError={() => setRoutingError('')}
          departmentModalOpen={departmentModalOpen}
          onDepartmentModalClose={() => setDepartmentModalOpen(false)}
          onAddDepartment={handleAddDepartment}
          onAddCategory={handleAddCategory}
          onReload={reloadRoutingData}
        />
      )}
      {activeTab === 'routing-legacy' && user?.role?.toLowerCase() === 'superadmin' && (
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
