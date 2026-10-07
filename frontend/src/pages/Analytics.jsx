import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCategories } from '../api/tickets';
import { getDepartmentAccounts, createDepartmentAccount, updateDepartmentAccount } from '../api/auth';
import { Plus, Trash2, Edit2, X, AlertCircle, CheckCircle2, Shield, Users, Building } from 'lucide-react';

export default function Analytics({ user }) {
  const [timeframe, setTimeframe] = useState('All Time');
  const [campus, setCampus] = useState('All');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Administrative Department accounts state
  const [accounts, setAccounts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Department Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    assignedCategories: [],
    departmentCategory: '',
  });

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

  const loadAdminAccounts = async () => {
    if (user?.role === 'Superadmin' || user?.role?.toLowerCase() === 'superadmin') {
      try {
        const [deptsData, catsData] = await Promise.all([
          getDepartmentAccounts(),
          getCategories(),
        ]);
        setAccounts(Array.isArray(deptsData) ? deptsData : []);
        setAllCategories(Array.isArray(catsData) ? catsData : []);
      } catch (err) {
        console.error('Failed to load department accounts:', err);
      }
    }
  };

  useEffect(() => {
    loadAdminAccounts();
  }, [user]);

  const openCreateModal = () => {
    setEditingDept(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      assignedCategories: allCategories.length > 0 ? [allCategories[0]] : [],
      departmentCategory: allCategories[0] || 'ITSO',
    });
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    const existingCats = Array.isArray(dept.assignedCategories) && dept.assignedCategories.length > 0
      ? dept.assignedCategories
      : (dept.departmentCategory ? [dept.departmentCategory] : (allCategories.length > 0 ? [allCategories[0]] : []));

    setFormData({
      firstName: dept.firstName || '',
      lastName: dept.lastName || '',
      email: dept.email || '',
      password: '',
      assignedCategories: existingCats,
      departmentCategory: existingCats[0] || allCategories[0] || 'ITSO',
    });
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.assignedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        assignedCategories: formData.assignedCategories,
        departmentCategory: formData.assignedCategories[0] || '',
        password: formData.password || undefined,
      };

      if (editingDept) {
        await updateDepartmentAccount(editingDept._id, payload);
        setSuccess('Account updated');
      } else {
        await createDepartmentAccount({
          ...payload,
          email: formData.email,
        });
        setSuccess('Account created');
      }
      setModalOpen(false);
      loadAdminAccounts();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Permanently delete this account from the database?')) {
      return;
    }
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.delete(`/api/admin/users/${accountId}`, config);

      if (response.status === 200) {
        setAccounts((prev) => prev.filter((acc) => acc._id !== accountId));
        setSuccess('Account deleted');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const totalCount = stats?.total ?? 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header with Campus and Timeframe Select Dropdowns at Top Right */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors duration-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Analytics
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Campus Select Dropdown */}
          <select
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="All">All</option>
            <option value="Arlegui">Arlegui</option>
            <option value="Casal">Casal</option>
          </select>

          {/* Timeframe Select Dropdown */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs rounded-lg flex items-center space-x-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Loading Spinner */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-16 text-center shadow-sm flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading analytics...</span>
        </div>
      ) : (
        <>
          {/* Stat Cards (Total, Pending, In Progress, Resolved) without subtext lines */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Tickets Card */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Tickets
                </span>
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3">
                {stats?.total ?? 0}
              </div>
            </div>

            {/* Pending Card */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pending
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-amber-500 mt-3">
                {stats?.pending ?? 0}
              </div>
            </div>

            {/* In Progress Card */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  In Progress
                </span>
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-sky-500 mt-3">
                {stats?.inProgress ?? 0}
              </div>
            </div>

            {/* Resolved Card */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Resolved
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-500 mt-3">
                {stats?.resolved ?? 0}
              </div>
            </div>
          </div>

          {/* Account Directory */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Account Directory
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">User Accounts</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {stats?.userAccounts ?? stats?.accountDirectory?.user ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Department Accounts</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {stats?.departmentAccounts ?? stats?.accountDirectory?.department ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Building className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Guest Accounts</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {stats?.guestAccounts ?? stats?.accountDirectory?.guest ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-500/10 text-slate-400">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Categories Breakdown Section - Sleek & Compact */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Categories Breakdown
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {stats?.categories?.length || 0} categories
              </span>
            </div>

            {(!stats?.categories || stats.categories.length === 0) ? (
              <div className="text-xs text-slate-500 dark:text-slate-400 italic py-4 text-center">
                No category data recorded
              </div>
            ) : (
              <div className="space-y-2">
                {stats.categories.map((category) => {
                  const percentage = totalCount > 0
                    ? Math.round((category.count / totalCount) * 100)
                    : 0;
                  const barWidth = totalCount > 0
                    ? `${(category.count / totalCount) * 100}%`
                    : '0%';

                  return (
                    <div key={category.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {category.name}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                            ({percentage}%)
                          </span>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white font-mono shrink-0">
                          {category.count}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: barWidth }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Superadmin Department Accounts Management */}
      {(user?.role === 'Superadmin' || user?.role?.toLowerCase() === 'superadmin') && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Department Accounts
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              No active accounts
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700/60">
              {accounts.map((dept) => (
                <div
                  key={dept._id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {dept.firstName} {dept.lastName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span>{dept.email}</span>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <span>Categories:</span>
                      {(Array.isArray(dept.assignedCategories) && dept.assignedCategories.length > 0
                        ? dept.assignedCategories
                        : [dept.departmentCategory || 'General']
                      ).map((c) => (
                        <span key={c} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-semibold">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(dept)}
                      aria-label="Edit"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(dept._id)}
                      aria-label="Delete"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Department Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingDept ? 'Edit Account' : 'Create Account'}
            </h2>

            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First Name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last Name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {!editingDept && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Categories
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formData.assignedCategories.length} selected
                  </span>
                </div>
                <div className="w-full max-h-36 overflow-y-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1.5">
                  {allCategories.map((cat) => {
                    const isChecked = formData.assignedCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded cursor-pointer transition-colors text-xs ${
                          isChecked ? 'bg-amber-500/10 text-amber-500 font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={cat}
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData((prev) => {
                              const current = prev.assignedCategories || [];
                              const updated = checked
                                ? [...current, cat]
                                : current.filter((c) => c !== cat);
                              return {
                                ...prev,
                                assignedCategories: updated,
                                departmentCategory: updated[0] || '',
                              };
                            });
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-400 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-white dark:bg-slate-900"
                        />
                        <span>{cat}</span>
                      </label>
                    );
                  })}
                  {allCategories.length === 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                      No categories available
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {editingDept ? 'New Password' : 'Password'}
                </label>
                <input
                  type="password"
                  required={!editingDept}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg text-xs transition-colors mt-2"
              >
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
