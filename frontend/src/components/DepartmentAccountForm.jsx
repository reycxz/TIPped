import { useId, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import {
  createDepartmentAccount,
  deleteDepartmentAccount,
  updateDepartmentAccount,
} from '../api/auth';
import RoutingDialog from './routing/RoutingDialog';

const getInitialFormData = (mode, account) => {
  if (mode === 'edit') {
    return {
      firstName: account?.firstName || '',
      lastName: account?.lastName || '',
      password: '',
    };
  }

  return {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  };
};

const inputClassName = 'h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-visible:ring-offset-slate-800';

export default function DepartmentAccountForm({
  mode,
  account = null,
  categories,
  departmentName,
  onSaved,
  onClose,
}) {
  const id = useId();
  const [formData, setFormData] = useState(() => getInitialFormData(mode, account));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = mode === 'edit';
  const titleId = `${id}-title`;

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');

    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password || undefined,
    };

    try {
      setSaving(true);
      if (isEditing) {
        await updateDepartmentAccount(account._id, payload);
        await onSaved('updated');
      } else {
        await createDepartmentAccount({
          ...payload,
          email: formData.email,
          departmentName,
        });
        await onSaved('created');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Permanently delete this account from the database?')) return;
    setError('');

    try {
      setSaving(true);
      await deleteDepartmentAccount(account._id);
      await onSaved('deleted');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoutingDialog titleId={titleId} onClose={onClose}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="font-display text-xl font-extrabold">
            {isEditing ? 'Edit Account' : 'Create Account'}
          </h2>
          {departmentName && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Department: <span className="font-semibold text-slate-700 dark:text-slate-200">{departmentName}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          Close
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            First Name
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
              placeholder="First Name"
              className={`${inputClassName} mt-1.5 normal-case tracking-normal`}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Last Name
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
              placeholder="Last Name"
              className={`${inputClassName} mt-1.5 normal-case tracking-normal`}
            />
          </label>
        </div>

        {!isEditing && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Email
            <input
              type="email"
              required
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              placeholder="Email"
              className={`${inputClassName} mt-1.5 normal-case tracking-normal`}
            />
          </label>
        )}

        <div className="space-y-2">
          <p className="text-sm">Covers all categories of this department</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span
                key={category}
                className="max-w-full break-words rounded-full border border-slate-300 px-3 py-1 text-sm dark:border-slate-600"
              >
                {category}
              </span>
            ))}
          </div>
          {categories.length === 0 && (
            <p className="text-sm">No categories available</p>
          )}
        </div>

        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isEditing ? 'New Password' : 'Password'}
          <input
            type="password"
            required={!isEditing}
            minLength={6}
            value={formData.password}
            onChange={(event) => setFormData({ ...formData, password: event.target.value })}
            placeholder="Password"
            className={`${inputClassName} mt-1.5 normal-case tracking-normal`}
          />
        </label>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-red-500/50 px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 dark:text-red-400"
            >
              Delete Account
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 dark:focus-visible:ring-offset-slate-800"
          >
            {saving ? 'Processing...' : 'Save'}
          </button>
        </div>
      </form>
    </RoutingDialog>
  );
}
