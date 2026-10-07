import React, { useState, useEffect } from 'react';
import { getAnalytics, getCategories } from '../api/tickets';
import { getDepartmentAccounts, createDepartmentAccount, updateDepartmentAccount, deleteDepartmentAccount } from '../api/auth';
import { Plus, Trash2, Edit2, X, AlertCircle, CheckCircle2, Shield, Users, BarChart3, Building } from 'lucide-react';

export default function Analytics({ user }) {
  const [analytics, setAnalytics] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Department Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    departmentCategory: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsData, deptsData, catsData] = await Promise.all([
        getAnalytics(),
        getDepartmentAccounts(),
        getCategories(),
      ]);

      setAnalytics(analyticsData);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      if (Array.isArray(catsData) && catsData.length > 0 && !formData.departmentCategory) {
        setFormData((prev) => ({ ...prev, departmentCategory: catsData[0] }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      departmentCategory: categories[0] || 'ITSO',
    });
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      firstName: dept.firstName || '',
      lastName: dept.lastName || '',
      email: dept.email || '',
      password: '',
      departmentCategory: dept.departmentCategory || categories[0] || 'ITSO',
    });
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingDept) {
        await updateDepartmentAccount(editingDept._id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          departmentCategory: formData.departmentCategory,
          password: formData.password || undefined,
        });
        setSuccess('Account updated');
      } else {
        await createDepartmentAccount({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          departmentCategory: formData.departmentCategory,
        });
        setSuccess('Account created');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('Delete department account?')) return;
    try {
      await deleteDepartmentAccount(id);
      setSuccess('Account deleted');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="bg-surface border border-slate-700/60 rounded-xl p-16 text-center text-muted text-sm">
        Loading...
      </div>
    );
  }

  const categoryCounts = analytics?.categoryCounts || {};

  return (
    <div className="space-y-6 pb-20">
      {/* Header - 1-2 words only, no subtitles */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          Analytics
        </h1>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-400 text-xs rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs rounded-lg flex items-center space-x-2 font-mono">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Total Tickets
          </div>
          <div className="text-3xl font-extrabold text-text mt-2">
            {analytics?.totalTickets || 0}
          </div>
        </div>

        <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Pending
          </div>
          <div className="text-3xl font-extrabold text-pending mt-2">
            {analytics?.pendingCount || 0}
          </div>
        </div>

        <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            In Progress
          </div>
          <div className="text-3xl font-extrabold text-inProgress mt-2">
            {analytics?.inProgressCount || 0}
          </div>
        </div>

        <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Resolved
          </div>
          <div className="text-3xl font-extrabold text-resolved mt-2">
            {analytics?.resolvedCount || 0}
          </div>
        </div>
      </div>

      {/* Campus & Users Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Campus Distribution */}
        <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Campus Volume
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-background rounded-lg border border-slate-700/60">
              <div className="text-xs text-muted">Arlegui</div>
              <div className="text-xl font-bold text-text mt-1">
                {analytics?.arleguiCount || 0}
              </div>
            </div>
            <div className="p-3 bg-background rounded-lg border border-slate-700/60">
              <div className="text-xs text-muted">Casal</div>
              <div className="text-xl font-bold text-text mt-1">
                {analytics?.casalCount || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Users & Staff Counts */}
        <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Account Directory
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-background rounded-lg border border-slate-700/60">
              <div className="text-xs text-muted">Students / Users</div>
              <div className="text-xl font-bold text-text mt-1">
                {analytics?.totalUsers || 0}
              </div>
            </div>
            <div className="p-3 bg-background rounded-lg border border-slate-700/60">
              <div className="text-xs text-muted">Department Accounts</div>
              <div className="text-xl font-bold text-text mt-1">
                {analytics?.totalDeptStaff || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Breakdown */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          Categories Breakdown
        </div>
        {Object.keys(categoryCounts).length === 0 ? (
          <div className="text-xs text-muted italic py-4">No data</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <div
                key={cat}
                className="p-3 bg-background rounded-lg border border-slate-700/60 flex items-center justify-between"
              >
                <span className="text-xs text-text font-medium">{cat}</span>
                <span className="text-sm font-bold text-primary font-mono">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Superadmin Department Accounts Management */}
      <div className="bg-surface border border-slate-700/60 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-text">Department Accounts</div>
          <button
            type="button"
            onClick={openCreateModal}
            className="py-1.5 px-3 bg-primary hover:bg-amber-500 text-background rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {departments.length === 0 ? (
          <div className="p-8 text-center text-muted text-xs">
            No active accounts
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {departments.map((dept) => (
              <div
                key={dept._id}
                className="py-3 flex items-center justify-between hover:bg-background/40 px-2 rounded-lg transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-text">
                    {dept.firstName} {dept.lastName}
                  </div>
                  <div className="text-[11px] text-muted font-mono">
                    {dept.email} • Category: <span className="text-primary">{dept.departmentCategory}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(dept)}
                    aria-label="Edit"
                    className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-background transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDepartment(dept._id)}
                    aria-label="Delete"
                    className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-background transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Department Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-slate-700 rounded-xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 text-muted hover:text-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-text mb-4">
              {editingDept ? 'Edit Account' : 'New Account'}
            </h2>

            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First Name"
                    className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-xs text-text placeholder-slate-500 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last Name"
                    className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-xs text-text placeholder-slate-500 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {!editingDept && (
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email"
                    className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-xs text-text placeholder-slate-500 focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={formData.departmentCategory}
                  onChange={(e) => setFormData({ ...formData, departmentCategory: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-xs text-text focus:outline-none focus:border-primary"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  {editingDept ? 'New Password' : 'Password'}
                </label>
                <input
                  type="password"
                  required={!editingDept}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password"
                  className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-xs text-text placeholder-slate-500 focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary hover:bg-amber-500 text-background font-semibold rounded-lg text-xs transition-colors mt-2"
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
