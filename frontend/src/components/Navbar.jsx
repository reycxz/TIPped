import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import TippedLogo from './TippedLogo';
import { Settings, User, Moon, Sun, LogOut, Archive } from 'lucide-react';

export default function Navbar({ userRole = 'User', onLogout, isLanding = false }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync theme with localStorage and root class (defaults to clean light mode)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newThemeState = !isDarkMode;
    setIsDarkMode(newThemeState);
    if (newThemeState) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive
        ? 'text-amber-500 font-semibold'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
    }`;

  return (
    <header className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center space-x-8">
          <Link
            to={isLanding ? '/' : userRole === 'User' ? '/dashboard' : '/admin'}
            className="landing-brand tipped-brand flex items-center focus:outline-none"
            aria-label="TIPped"
          >
            <TippedLogo />
          </Link>

          {!isLanding && (
            <nav className="hidden md:flex items-center space-x-6">
              {/* User Navigation */}
              {userRole === 'User' && (
                <>
                  <NavLink to="/dashboard" className={navLinkClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/report/new" className={navLinkClass}>
                    Submit Report
                  </NavLink>
                  <NavLink to="/my-reports" className={navLinkClass}>
                    My Reports
                  </NavLink>
                </>
              )}

              {/* Department Staff Navigation */}
              {(userRole === 'Department' || userRole?.toLowerCase() === 'department') && (
                <>
                  <NavLink to="/admin" className={navLinkClass}>
                    Console
                  </NavLink>
                  <NavLink to="/analytics" className={navLinkClass}>
                    Analytics
                  </NavLink>
                </>
              )}

              {/* Superadmin Navigation */}
              {(userRole === 'Superadmin' || userRole?.toLowerCase() === 'superadmin') && (
                <>
                  <NavLink to="/admin" className={navLinkClass}>
                    Console
                  </NavLink>
                  <NavLink to="/analytics" className={navLinkClass}>
                    Analytics
                  </NavLink>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right Section: Toggle for Landing or Settings Dropdown for Authenticated */}
        {isLanding ? (
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            )}
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label="Settings"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors focus:outline-none"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Settings Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <User className="w-4 h-4 mr-3 text-slate-400 dark:text-slate-400" />
                  <span>Profile</span>
                </Link>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDarkMode();
                  }}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-left cursor-pointer"
                >
                  {isDarkMode ? (
                    <>
                      <Sun className="w-4 h-4 mr-3 text-amber-500" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 mr-3 text-slate-500 dark:text-slate-400" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>

                {/* Constraint 2: Archived Reports link below Dark Mode toggle */}
                {['superadmin', 'department'].includes(userRole?.toLowerCase()) && (
                  <Link
                    to="/archive"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    <Archive className="w-4 h-4 mr-3 text-slate-400 dark:text-slate-400" />
                    <span>Archived Reports</span>
                  </Link>
                )}

                <div className="border-t border-slate-200 dark:border-slate-700/60 my-1" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-red-600 dark:hover:text-red-400 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-3 text-slate-400 dark:text-slate-400" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
