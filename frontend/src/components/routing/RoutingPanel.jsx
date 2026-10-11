import { useEffect, useId, useRef, useState } from 'react';
import {
  Building2,
  Check,
  MoreHorizontal,
  Pencil,
  Plus,
  User,
  X,
} from 'lucide-react';
import {
  deleteCategory,
  deleteDepartment,
  updateDepartment,
} from '../../api/adminData';
import { DEPARTMENT_COLOR_FALLBACK, DEPARTMENT_PALETTE } from '../../constants/departmentPalette';
import DepartmentAccountForm from '../DepartmentAccountForm';
import RoutingDialog from './RoutingDialog';

const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const getFirstUnusedColor = (departments) => {
  const usedColors = new Set(departments.map((department) => normalize(department.color)));
  return DEPARTMENT_PALETTE.find((color) => !usedColors.has(normalize(color))) || DEPARTMENT_PALETTE[0];
};

function AccessiblePopover({
  label,
  triggerClassName,
  triggerContent,
  panelClassName = '',
  panelRole = 'dialog',
  children,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.querySelector('button:not([disabled])')?.focus();

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      panelRef.current?.querySelectorAll('button:not([disabled]), [href], input:not([disabled])') || []
    );
    if (focusable.length === 0) {
      event.preventDefault();
      triggerRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup={panelRole === 'menu' ? 'menu' : 'dialog'}
        onClick={() => setOpen((previous) => !previous)}
        className={triggerClassName}
      >
        {triggerContent}
      </button>
      {open && (
        <div
          ref={panelRef}
          role={panelRole}
          aria-label={`${label} options`}
          onKeyDown={handleKeyDown}
          onClick={(event) => {
            if (event.target.closest('button')) {
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
          className={`absolute right-0 top-full z-30 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800 ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DepartmentModal({ departments, onClose, onSubmit }) {
  const id = useId();
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [color, setColor] = useState(() => getFirstUnusedColor(departments));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const titleId = `${id}-title`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const cleanName = name.trim();
    const cleanPrefix = prefix.trim().toUpperCase();
    if (!cleanName || !cleanPrefix) {
      setError('Department name and prefix are required.');
      return;
    }
    if (cleanPrefix.length > 3) {
      setError('Prefix must be at most 3 characters.');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({ name: cleanName, prefix: cleanPrefix, color });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create department');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoutingDialog titleId={titleId} onClose={onClose}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={titleId} className="font-display text-xl font-extrabold">Create Department</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Name
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Prefix
          <input
            type="text"
            required
            maxLength={3}
            value={prefix}
            onChange={(event) => setPrefix(event.target.value.toUpperCase())}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Department color</legend>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENT_PALETTE.map((paletteColor) => {
              const usedBy = departments.find(
                (department) => normalize(department.color) === normalize(paletteColor)
              );
              return (
                <button
                  key={paletteColor}
                  type="button"
                  aria-label={usedBy ? `In use by ${usedBy.name}` : `Select color ${paletteColor}`}
                  title={usedBy ? `In use by ${usedBy.name}` : undefined}
                  aria-pressed={color === paletteColor}
                  onClick={() => setColor(paletteColor)}
                  className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 ${
                    color === paletteColor ? 'border-2 border-slate-900 dark:border-white' : 'border border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <span className="h-6 w-6 rounded-full" style={{ backgroundColor: paletteColor }} aria-hidden="true" />
                  {usedBy && (
                    <Check className="absolute right-1 top-1 h-3 w-3 text-slate-900 dark:text-white" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-600 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 dark:focus-visible:ring-offset-slate-800"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </RoutingDialog>
  );
}

function CategoryModal({ department, onClose, onSubmit }) {
  const id = useId();
  const [issueName, setIssueName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const titleId = `${id}-title`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const cleanIssueName = issueName.trim();
    if (!cleanIssueName) {
      setError('Issue name is required.');
      return;
    }
    try {
      setSaving(true);
      await onSubmit({ issueName: cleanIssueName, departmentName: department.name });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoutingDialog titleId={titleId} onClose={onClose}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={titleId} className="font-display text-xl font-extrabold">Add Category</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Department: <span className="font-semibold text-slate-700 dark:text-slate-200">{department.name}</span>
      </p>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Issue name
          <input
            type="text"
            required
            value={issueName}
            onChange={(event) => setIssueName(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-600 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 dark:focus-visible:ring-offset-slate-800"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </RoutingDialog>
  );
}

function DeleteDialog({ item, error, counts, saving, onClose, onConfirm }) {
  const id = useId();
  const titleId = `${id}-title`;
  const isDepartment = item.type === 'department';

  return (
    <RoutingDialog titleId={titleId} onClose={onClose}>
      <h2 id={titleId} className="font-display text-xl font-extrabold">
        Delete {isDepartment ? 'Department' : 'Category'}?
      </h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Permanently delete <span className="font-semibold text-slate-900 dark:text-white">{item.name}</span>?
      </p>
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
          <p>{error}</p>
          {counts && (
            <dl className="mt-3 space-y-1 font-mono text-xs">
              {isDepartment ? (
                <>
                  <div className="flex justify-between gap-3"><dt>Categories</dt><dd>{counts.categories ?? 0}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Accounts</dt><dd>{counts.accounts ?? 0}</dd></div>
                </>
              ) : (
                <div className="flex justify-between gap-3"><dt>Accounts</dt><dd>{counts.accounts ?? 0}</dd></div>
              )}
            </dl>
          )}
        </div>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-600 dark:text-slate-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
        >
          {saving ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </RoutingDialog>
  );
}

export default function RoutingPanel({
  departments,
  categories,
  accounts,
  loading,
  loadError,
  onDismissLoadError,
  departmentModalOpen,
  onDepartmentModalClose,
  onAddDepartment,
  onAddCategory,
  onReload,
}) {
  const [categoryDepartment, setCategoryDepartment] = useState(null);
  const [accountForm, setAccountForm] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteCounts, setDeleteCounts] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [panelError, setPanelError] = useState('');

  const handleColorChange = async (department, color) => {
    setPanelError('');
    try {
      await updateDepartment(department._id, { color });
      await onReload();
    } catch (err) {
      setPanelError(err.response?.data?.error || 'Failed to update department color');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError('');
    setDeleteCounts(null);
    try {
      if (pendingDelete.type === 'department') {
        await deleteDepartment(pendingDelete.item._id);
      } else {
        await deleteCategory(pendingDelete.item._id);
      }
      setPendingDelete(null);
      await onReload();
    } catch (err) {
      setDeleteError(err.response?.data?.error || `Failed to delete ${pendingDelete.type}`);
      setDeleteCounts(err.response?.data?.counts || null);
    } finally {
      setDeleting(false);
    }
  };

  const beginDelete = (type, item) => {
    setDeleteError('');
    setDeleteCounts(null);
    setPendingDelete({ type, item, name: item.name || item.issueName });
  };

  const closeDeleteDialog = () => {
    setPendingDelete(null);
    setDeleteError('');
    setDeleteCounts(null);
  };

  const openAccountForm = (mode, account, department, departmentCategories) => {
    setAccountForm({
      mode,
      account,
      categories: mode === 'create' ? departmentCategories : categories.map((category) => category.issueName),
      categoryDetails: categories,
      showContext: true,
      groupByDepartment: mode === 'edit',
      lockedDepartmentName: mode === 'create' ? department.name : undefined,
    });
  };

  const handleAccountSaved = async () => {
    await onReload();
    setAccountForm(null);
  };

  const getDepartmentAccounts = (department) => {
    const departmentCategoryNames = new Set(
      categories
        .filter((category) => normalize(category.departmentName) === normalize(department.name))
        .map((category) => normalize(category.issueName))
    );
    return accounts.filter((account) => departmentCategoryNames.has(normalize(account.departmentCategory)));
  };

  return (
    <>
      <div className="space-y-5">
        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={onDismissLoadError}
              aria-label="Dismiss routing error"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {panelError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
            {panelError}
          </p>
        )}

        {loading && departments.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400" role="status">
            Loading routing data...
          </p>
        ) : departments.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[1.5px] border-amber-500 text-amber-500">
              <Building2 className="h-8 w-8" aria-hidden="true" />
            </div>
          </div>
        ) : (
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))' }}
          >
            {departments.map((department) => {
              const color = department.color || DEPARTMENT_COLOR_FALLBACK;
              const departmentCategories = categories.filter(
                (category) => normalize(category.departmentName) === normalize(department.name)
              );
              const departmentAccounts = getDepartmentAccounts(department);

              return (
                <article
                  key={department._id}
                  className="flex min-w-0 flex-col gap-[18px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AccessiblePopover
                      label="Change color"
                      triggerClassName="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      triggerContent={<span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />}
                      panelClassName="grid grid-cols-5 gap-1.5"
                    >
                      {DEPARTMENT_PALETTE.map((paletteColor) => {
                        const usedBy = normalize(paletteColor) === normalize(department.color)
                          ? null
                          : departments.find(
                            (otherDepartment) => otherDepartment._id !== department._id
                              && normalize(otherDepartment.color) === normalize(paletteColor)
                          );
                        return (
                          <button
                            key={paletteColor}
                            type="button"
                            aria-label={usedBy ? `In use by ${usedBy.name}` : `Set color ${paletteColor}`}
                            title={usedBy ? `In use by ${usedBy.name}` : undefined}
                            aria-pressed={color === paletteColor}
                            onClick={async () => {
                              await handleColorChange(department, paletteColor);
                            }}
                            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              color === paletteColor ? 'border-2 border-slate-900 dark:border-white' : 'border border-transparent'
                            }`}
                          >
                            <span className="h-5 w-5 rounded-full" style={{ backgroundColor: paletteColor }} aria-hidden="true" />
                            {usedBy && (
                              <Check className="absolute right-1 top-1 h-3 w-3 text-slate-900 dark:text-white" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </AccessiblePopover>

                    <h2 className="min-w-0 flex-1 truncate font-display text-[22px] font-extrabold leading-tight text-slate-900 dark:text-white" title={department.name}>
                      {department.name}
                    </h2>
                    <span className="shrink-0 rounded-md border border-amber-500 px-2 py-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                      {department.prefix}
                    </span>
                    <AccessiblePopover
                      label={`More options for ${department.name}`}
                      panelRole="menu"
                      triggerClassName="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-700"
                      triggerContent={<MoreHorizontal className="h-5 w-5" aria-hidden="true" />}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => beginDelete('department', department)}
                        className="inline-flex h-11 min-w-24 items-center rounded-lg px-3 text-left text-sm font-semibold text-red-600 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </AccessiblePopover>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {departmentCategories.map((category) => (
                      <span
                        key={category._id}
                        className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border py-1.5 pl-3.5 pr-1.5 text-sm"
                        style={{
                          backgroundColor: `${color}24`,
                          borderColor: `${color}66`,
                          color,
                        }}
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                        <span className="min-w-0 truncate">{category.issueName}</span>
                        <button
                          type="button"
                          aria-label="Delete category"
                          title={`Delete ${category.issueName}`}
                          onClick={() => beginDelete('category', category)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/10"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCategoryDepartment(department)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-dashed px-3.5 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      style={{ borderColor: color, color }}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Category
                    </button>
                  </div>

                  <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-700">
                    <div className="space-y-2">
                      {departmentAccounts.map((account) => (
                        <div key={account._id} className="flex min-w-0 items-center gap-2">
                          <User className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-600 dark:text-slate-300" title={account.email}>
                            {account.email}
                          </span>
                          <button
                            type="button"
                            aria-label="Edit account"
                            onClick={() => openAccountForm('edit', account, department, departmentCategories)}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={departmentCategories.length === 0}
                      aria-disabled={departmentCategories.length === 0}
                      title={departmentCategories.length === 0 ? 'Add a category first' : undefined}
                      onClick={() => openAccountForm(
                        'create',
                        null,
                        department,
                        departmentCategories.map((category) => category.issueName)
                      )}
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-300 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      {departmentAccounts.length > 0 ? 'Add another account' : 'Account'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {departmentModalOpen && (
        <DepartmentModal
          departments={departments}
          onClose={onDepartmentModalClose}
          onSubmit={onAddDepartment}
        />
      )}
      {categoryDepartment && (
        <CategoryModal
          department={categoryDepartment}
          onClose={() => setCategoryDepartment(null)}
          onSubmit={onAddCategory}
        />
      )}
      {accountForm && (
        <DepartmentAccountForm
          key={`${accountForm.mode}-${accountForm.account?._id || accountForm.lockedDepartmentName}`}
          mode={accountForm.mode}
          account={accountForm.account}
          categories={accountForm.categories}
          categoryDetails={accountForm.categoryDetails}
          showContext={accountForm.showContext}
          groupByDepartment={accountForm.groupByDepartment}
          lockedDepartmentName={accountForm.lockedDepartmentName}
          onSaved={handleAccountSaved}
          onClose={() => setAccountForm(null)}
        />
      )}
      {pendingDelete && (
        <DeleteDialog
          item={pendingDelete}
          error={deleteError}
          counts={deleteCounts}
          saving={deleting}
          onClose={closeDeleteDialog}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
