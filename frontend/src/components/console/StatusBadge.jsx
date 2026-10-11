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

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-bold ${getStatusClasses(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}
