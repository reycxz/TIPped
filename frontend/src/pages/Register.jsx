import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, verifyRegistrationOtp } from '../api/auth';
import { AlertCircle, X } from 'lucide-react';

export default function Register({ onLoginSuccess, isEmbedded = false, onToggleLogin }) {
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
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpInfo, setOtpInfo] = useState('');
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
      // Constraint 3: Strict 'User' role payload (Admin/Department cannot self-register)
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        program: formData.program,
        password: formData.password,
        role: 'User',
      };

      const res = await registerUser(payload);

      setPendingEmail(res.email || formData.email.toLowerCase().trim());
      if (res.otp) {
        setOtpInfo(`Code: ${res.otp}`);
      }
      setShowOtpModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Invalid code');
      return;
    }

    setLoading(true);

    try {
      const res = await verifyRegistrationOtp(pendingEmail, otpCode.trim());

      localStorage.setItem('token', res.token);

      if (onLoginSuccess && res.user) {
        onLoginSuccess(res.user);
      }

      setShowOtpModal(false);

      if (res.user.role === 'Department' || res.user.role === 'Superadmin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const cardContent = (
    <div className="w-full max-w-md bg-surface border border-slate-700/60 rounded-xl p-8 shadow-2xl">
      {/* Tabs: User Only */}
      <div className="flex border-b border-slate-700 mb-6">
        <button
          type="button"
          className="flex-1 pb-3 text-sm font-semibold text-center transition-colors border-b-2 border-primary text-primary cursor-default"
        >
          User
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
        {onToggleLogin ? (
          <button
            type="button"
            onClick={onToggleLogin}
            className="text-xs text-muted hover:text-primary transition-colors font-medium cursor-pointer"
          >
            Sign In
          </button>
        ) : (
          <Link
            to="/login"
            className="text-xs text-muted hover:text-primary transition-colors font-medium"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );

  const otpModal = showOtpModal && (
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
          Verify
        </h2>

        {otpInfo && (
          <div className="mb-4 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-mono">
            {otpInfo}
          </div>
        )}

        {error && (
          <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              6-Digit Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="6-Digit Code"
              className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-center tracking-widest text-lg font-mono text-text focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-background font-semibold rounded-lg text-sm transition-colors"
          >
            {loading ? 'Submitting...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {isEmbedded ? (
        cardContent
      ) : (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          {cardContent}
        </div>
      )}
      {otpModal}
    </>
  );
}
