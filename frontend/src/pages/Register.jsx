import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/auth';
import { AlertCircle, X } from 'lucide-react';

export default function Register({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('User'); // 'User' | 'Admin'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    program: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [savedToken, setSavedToken] = useState(null);
  const [savedUser, setSavedUser] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Password mismatch');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        program: formData.program,
        password: formData.password,
        role: activeTab === 'Admin' ? 'Department' : 'User',
      };

      const res = await registerUser(payload);

      // Store pending auth data and show OTP verification modal
      setSavedToken(res.token);
      setSavedUser(res.user);
      setShowOtpModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('Invalid code');
      return;
    }

    // Constraint 2: Only store the JWT string
    if (savedToken) {
      localStorage.setItem('token', savedToken);
    }

    if (onLoginSuccess && savedUser) {
      onLoginSuccess(savedUser);
    }

    setShowOtpModal(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-slate-700/60 rounded-xl p-8 shadow-2xl">
        {/* Tabs: User | Admin */}
        <div className="flex border-b border-slate-700 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('User')}
            className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              activeTab === 'User'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            User
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('Admin')}
            className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors border-b-2 ${
              activeTab === 'Admin'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            Admin
          </button>
        </div>

        {/* Header - 1-2 words only, no subtitles */}
        <h1 className="text-xl font-bold text-text mb-6 text-center">
          Sign Up
        </h1>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 flex items-center space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                First Name
              </label>
              <input
                type="text"
                required
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                required
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {activeTab === 'User' && (
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Program
              </label>
              <input
                type="text"
                name="program"
                value={formData.program}
                onChange={handleChange}
                placeholder="Program"
                className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-background font-semibold rounded-lg text-sm transition-colors mt-2"
          >
            {loading ? 'Submitting...' : 'Sign Up'}
          </button>
        </form>

        {/* Link to Login */}
        <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
          <Link
            to="/login"
            className="text-xs text-muted hover:text-primary transition-colors font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Registration OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface border border-slate-700 rounded-xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              aria-label="Close"
              className="absolute top-4 right-4 text-muted hover:text-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-text mb-4 text-center">
              Verify Code
            </h2>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                  Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Code"
                  className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-center tracking-widest text-lg font-mono text-text focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-primary hover:bg-amber-500 text-background font-semibold rounded-lg text-sm transition-colors"
              >
                Verify
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
