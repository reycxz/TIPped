import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import TippedLogo from './TippedLogo';
import {
  Settings,
  User,
  Moon,
  Sun,
  LogOut,
  Archive,
  Bell,
  Menu,
  X,
  LayoutDashboard,
  FilePlus2,
  ClipboardList,
  Shield,
  ChartNoAxesColumn,
  ChevronDown,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useHeroOutOfView } from '../hooks/useHeroOutOfView';

const socketUrl = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

export default function Navbar({ user: propUser, userRole = 'User', onLogout, isLanding = false }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileExpandedPanel, setMobileExpandedPanel] = useState(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const mobileNotificationsButtonRef = useRef(null);
  const mobileSettingsButtonRef = useRef(null);
  const mobileNotificationsPanelRef = useRef(null);
  const mobileSettingsPanelRef = useRef(null);
  const previousMobilePanelRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isHeroOutOfView = useHeroOutOfView(isLanding);

  // Normalize user and role - strictly identify authenticated users
  const isAuthenticated = Boolean(propUser && (propUser._id || propUser.id || propUser.email || propUser.role));
  const resolvedRole = isAuthenticated
    ? (propUser.role || (typeof userRole === 'string' ? userRole : userRole?.role) || 'user').toLowerCase()
    : null;
  const user = isAuthenticated ? { ...propUser, role: resolvedRole } : null;

  // Close dropdown on outside click
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleBreakpointChange = (event) => {
      setIsDesktopViewport(event.matches);
      setDropdownOpen(false);
      setNotificationsOpen(false);
      setIsMobileMenuOpen(false);
      setMobileExpandedPanel(null);
    };
    mediaQuery.addEventListener('change', handleBreakpointChange);
    return () => mediaQuery.removeEventListener('change', handleBreakpointChange);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileExpandedPanel(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen || isDesktopViewport) return undefined;

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (mobileExpandedPanel) {
        setMobileExpandedPanel(null);
      } else {
        setIsMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDesktopViewport, isMobileMenuOpen, mobileExpandedPanel]);

  useEffect(() => {
    if (!isMobileMenuOpen || !mobileExpandedPanel) {
      if (previousMobilePanelRef.current) {
        const previousRef = previousMobilePanelRef.current === 'notifications'
          ? mobileNotificationsButtonRef
          : mobileSettingsButtonRef;
        if (isMobileMenuOpen) previousRef.current?.focus();
        else mobileMenuButtonRef.current?.focus();
      }
      previousMobilePanelRef.current = null;
      return;
    }

    previousMobilePanelRef.current = mobileExpandedPanel;
    const panelRef = mobileExpandedPanel === 'notifications'
      ? mobileNotificationsPanelRef
      : mobileSettingsPanelRef;
    panelRef.current?.focus();
  }, [isMobileMenuOpen, mobileExpandedPanel]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
        setMobileExpandedPanel(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'user') return undefined;
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const socket = io(socketUrl, {
      auth: { token },
      withCredentials: true
    });
    const joinUserRoom = () => {
      socket.emit('join_user_room', user._id || user.id);
    };
    const handleTicketUpdated = (updatedTicket) => {
      if (!updatedTicket?.ticketId || !updatedTicket?.status) return;
      const createdAt = Date.now();
      setNotifications((previous) => [
        {
          id: `${updatedTicket.ticketId}-${createdAt}`,
          message: `Report ${updatedTicket.ticketId} status changed to ${updatedTicket.status}`,
          createdAt
        },
        ...previous
      ].slice(0, 10));
      setUnreadNotifications((previous) => previous + 1);
    };
    const handleConnectError = (error) => {
      console.error('Notification socket connection failed:', error.message);
    };

    socket.on('connect', joinUserRoom);
    socket.on('connect_error', handleConnectError);
    socket.on('ticketUpdated', handleTicketUpdated);
    if (socket.connected) joinUserRoom();
    return () => {
      socket.off('connect', joinUserRoom);
      socket.off('connect_error', handleConnectError);
      socket.off('ticketUpdated', handleTicketUpdated);
      socket.disconnect();
    };
  }, [isAuthenticated, user?._id, user?.role]);

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
    setIsMobileMenuOpen(false);
    setMobileExpandedPanel(null);
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const handleSignInClick = () => {
    const card = document.querySelector('[data-hiw-signin-card="true"]');
    if (!card) return;
    const email = document.querySelector('[data-hiw-signin-email="true"]');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const navbarHeight = mobileMenuRef.current?.getBoundingClientRect().height || 0;
    if (navbarHeight) card.style.scrollMarginTop = `${navbarHeight}px`;

    const focusEmail = () => email?.focus({ preventScroll: true });
    if (Math.abs(card.getBoundingClientRect().top - navbarHeight) < 1) {
      window.requestAnimationFrame(focusEmail);
      return;
    }

    const supportsScrollEnd = 'onscrollend' in document;
    if (supportsScrollEnd) {
      document.addEventListener('scrollend', focusEmail, { once: true });
    }

    card.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });

    if (!supportsScrollEnd) window.setTimeout(focusEmail, 450);
  };

  const navLinkClass = ({ isActive }) =>
    `relative text-sm font-medium transition-colors ${
      isActive
        ? 'text-amber-500 font-semibold underline decoration-2 underline-offset-8 decoration-amber-500 dark:decoration-amber-400'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
    }`;

  const mobileNavLinks = user?.role === 'user'
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/report/new', label: 'New Report', icon: FilePlus2 },
        { to: '/my-reports', label: 'My Reports', icon: ClipboardList },
      ]
    : [
        { to: '/admin', label: 'Console', icon: Shield },
        ...(user?.role === 'superadmin'
          ? [
              { to: '/analytics', label: 'Analytics', icon: ChartNoAxesColumn },
              { to: '/archive', label: 'Archive', icon: Archive },
            ]
          : []),
      ];

  const notificationsContent = (
    <>
      <h2 className="px-4 pb-2 text-sm font-semibold text-slate-900 dark:text-white">
        Notifications
      </h2>
      {notifications.length ? (
        <ul className="max-h-72 overflow-y-auto">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className="border-t border-slate-100 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              {notification.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No notifications
        </p>
      )}
    </>
  );

  const settingsContent = (
    <>
      <Link
        to="/profile"
        onClick={() => {
          setDropdownOpen(false);
          setIsMobileMenuOpen(false);
          setMobileExpandedPanel(null);
        }}
        className="flex items-center px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
      >
        <User className="w-4 h-4 mr-3 text-slate-400 dark:text-slate-400" />
        <span>Profile</span>
      </Link>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
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

      {user?.role === 'superadmin' && (
        <Link
          to="/archive"
          onClick={() => {
            setDropdownOpen(false);
            setIsMobileMenuOpen(false);
            setMobileExpandedPanel(null);
          }}
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
    </>
  );

  return (
    <header
      ref={mobileMenuRef}
      className="relative w-full bg-mist dark:bg-midnight text-midnight dark:text-mist border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200"
    >
      <div className="max-w-7xl 2xl:max-w-[1400px] 3xl:max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center space-x-8">
          <Link
            to={!isAuthenticated || isLanding ? '/' : user?.role === 'user' ? '/dashboard' : '/admin'}
            className="landing-brand tipped-brand flex items-center focus:outline-none"
            aria-label="TIPped"
          >
            <TippedLogo className="h-9 w-auto" />
          </Link>

          {isAuthenticated && !isLanding && (
            <nav className="hidden md:flex items-center space-x-6">
              {/* User Navigation */}
              {user?.role === 'user' && (
                <>
                  <NavLink to="/dashboard" className={navLinkClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/report/new" className={navLinkClass}>
                    New Report
                  </NavLink>
                  <NavLink to="/my-reports" className={navLinkClass}>
                    My Reports
                  </NavLink>
                </>
              )}

              {/* Department Staff & Superadmin Navigation */}
              {(user?.role === 'department' || user?.role === 'superadmin') && (
                <NavLink to="/admin" className={navLinkClass}>
                  Console
                </NavLink>
              )}

              {/* Constraint 2: Analytics Link Strictly Superadmin */}
              {user?.role === 'superadmin' && (
                <NavLink to="/analytics" className={navLinkClass}>
                  Analytics
                </NavLink>
              )}
            </nav>
          )}
        </div>

        {/* Right Section: Theme Toggle for Guests/Landing or Settings Dropdown for Authenticated */}
        {!isAuthenticated || isLanding ? (
          <div className="flex items-center gap-2">
            {isLanding && !isAuthenticated && isHeroOutOfView && (
              <button
                type="button"
                onClick={handleSignInClick}
                className="h-11 min-w-[44px] whitespace-nowrap rounded-lg border border-slate-300 bg-transparent px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:text-sm"
              >
                Sign in
              </button>
            )}
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
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {isDesktopViewport && user?.role === 'user' && (
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen((previous) => !previous);
                    setUnreadNotifications(0);
                  }}
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white py-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    {notificationsContent}
                  </div>
                )}
              </div>
            )}
            {isDesktopViewport && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-label="Settings"
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {settingsContent}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              ref={mobileMenuButtonRef}
              onClick={() => {
                if (isMobileMenuOpen) {
                  setIsMobileMenuOpen(false);
                  setMobileExpandedPanel(null);
                } else {
                  setDropdownOpen(false);
                  setNotificationsOpen(false);
                  setMobileExpandedPanel(null);
                  setIsMobileMenuOpen(true);
                }
              }}
              aria-label={
                isMobileMenuOpen
                  ? 'Close navigation menu'
                  : unreadNotifications > 0
                    ? `Open menu, ${unreadNotifications} unread notifications`
                    : 'Open navigation menu'
              }
              aria-expanded={isMobileMenuOpen}
              aria-controls="navbar-mobile-menu"
              className="relative inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl box-border m-0 p-0 md:hidden text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 focus:outline-none"
            >
              {unreadNotifications > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              )}
              {isMobileMenuOpen ? <X className="block h-6 w-6 m-0" /> : <Menu className="block h-6 w-6 m-0" />}
            </button>
          </div>
        )}
      </div>
      {isAuthenticated && !isLanding && !isDesktopViewport && isMobileMenuOpen && (
        <nav
          id="navbar-mobile-menu"
          className="absolute left-0 top-full z-50 block max-h-[55vh] w-full overflow-y-auto border-b border-slate-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900 md:hidden"
        >
          {mobileNavLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => {
                setIsMobileMenuOpen(false);
                setMobileExpandedPanel(null);
              }}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 px-5 py-3 text-sm font-medium ${
                  isActive
                    ? 'border-l-2 border-amber-500 pl-4 text-amber-500 font-semibold dark:border-amber-400 dark:text-amber-400'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

          <button
            type="button"
            ref={mobileNotificationsButtonRef}
            aria-expanded={mobileExpandedPanel === 'notifications'}
            aria-controls="navbar-mobile-notifications"
            onClick={() => {
              setDropdownOpen(false);
              setNotificationsOpen(false);
              setMobileExpandedPanel((openPanel) => (
                openPanel === 'notifications' ? null : 'notifications'
              ));
              if (mobileExpandedPanel !== 'notifications') setUnreadNotifications(0);
            }}
            className="flex min-h-12 w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Bell className="h-4 w-4" />
            <span className="flex-1">Notifications</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{unreadNotifications}</span>
            <ChevronDown
              className={`h-4 w-4 ${mobileExpandedPanel === 'notifications' ? 'rotate-180' : ''}`}
            />
          </button>
          {mobileExpandedPanel === 'notifications' && (
            <div
              id="navbar-mobile-notifications"
              ref={mobileNotificationsPanelRef}
              tabIndex={-1}
              className="max-h-[55vh] overflow-y-auto border-t border-slate-200 bg-slate-50 py-2 outline-none dark:border-slate-700 dark:bg-slate-800"
            >
              {notificationsContent}
            </div>
          )}

          <button
            type="button"
            ref={mobileSettingsButtonRef}
            aria-expanded={mobileExpandedPanel === 'settings'}
            aria-controls="navbar-mobile-settings"
            onClick={() => {
              setDropdownOpen(false);
              setNotificationsOpen(false);
              setMobileExpandedPanel((openPanel) => (
                openPanel === 'settings' ? null : 'settings'
              ));
            }}
            className="flex min-h-12 w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Settings className="h-4 w-4" />
            <span className="flex-1">Settings</span>
            <ChevronDown
              className={`h-4 w-4 ${mobileExpandedPanel === 'settings' ? 'rotate-180' : ''}`}
            />
          </button>
          {mobileExpandedPanel === 'settings' && (
            <div
              id="navbar-mobile-settings"
              ref={mobileSettingsPanelRef}
              tabIndex={-1}
              className="max-h-[55vh] overflow-y-auto border-t border-slate-200 bg-slate-50 py-1 outline-none dark:border-slate-700 dark:bg-slate-800 [&_a]:min-h-11 [&_button]:min-h-11"
            >
              {settingsContent}
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
