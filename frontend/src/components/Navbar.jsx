import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Settings, User, Moon, Sun, LogOut } from 'lucide-react';

export default function Navbar({ userRole = 'User', onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
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
    `text-sm font-medium transition-colors hover:text-primary ${
      isActive ? 'text-primary' : 'text-muted'
    }`;

  return (
    <header className="w-full bg-surface border-b border-surface/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-xl font-bold tracking-tight text-primary">
            TIPped
          </Link>

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
            {userRole === 'Department' && (
              <NavLink to="/admin" className={navLinkClass}>
                Console
              </NavLink>
            )}

            {/* Superadmin Navigation */}
            {userRole === 'Superadmin' && (
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
        </div>

        {/* Right: Profile Area (Strictly Icon Only - No Text) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="Settings"
            className="p-2 rounded-lg text-muted hover:text-text hover:bg-background/80 transition-colors focus:outline-none"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Settings Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface border border-slate-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm text-text hover:bg-background/80 hover:text-primary transition-colors"
              >
                <User className="w-4 h-4 mr-3 text-muted" />
                <span>Profile</span>
              </Link>

              <button
                type="button"
                onClick={toggleDarkMode}
                className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-background/80 hover:text-primary transition-colors text-left"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 mr-3 text-muted" />
                ) : (
                  <Moon className="w-4 h-4 mr-3 text-muted" />
                )}
                <span>Dark Mode</span>
              </button>

              <div className="border-t border-slate-700/60 my-1" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2.5 text-sm text-text hover:bg-background/80 hover:text-red-400 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 mr-3 text-muted" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
