import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';

export default function WelcomeCard({ title }) {
  return (
    <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-none rounded-xl p-6 transition-colors duration-200 flex flex-row justify-between items-center gap-4 flex-wrap">
      <h1 className="text-[26px] md:text-[36px] font-display font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
        {title}
      </h1>

      <Link
        to="/report/new"
        className="hidden lg:inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-7 h-[54px] text-[17px] font-bold text-slate-900 shadow-sm transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
      >
        <Camera className="h-[22px] w-[22px]" aria-hidden="true" />
        <span>Submit a tip</span>
      </Link>
    </div>
  );
}
