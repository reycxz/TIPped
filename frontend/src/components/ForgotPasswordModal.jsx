import React, { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { forgotPassword, resetPassword } from '../api/auth';

export default function ForgotPasswordModal({ initialEmail = '', isOpen, onClose }) {
  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email required');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setOtpSent(true);
      setMessage(res.otp ? `Code: ${res.otp}` : 'OTP sent');
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      setError('Missing fields');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      setMessage('Password saved');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl relative transition-colors duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Forgot Password</h2>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs text-center font-mono">
            {message}
          </div>
        )}

        {/* Email Field with Edit Toggle */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Email
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="email"
              value={email}
              disabled={!isEditingEmail}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm text-slate-900 dark:text-white transition-colors focus:outline-none ${
                isEditingEmail
                  ? 'border-primary'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 cursor-not-allowed text-slate-500 dark:text-slate-400'
              }`}
            />
            <button
              type="button"
              onClick={() => setIsEditingEmail(!isEditingEmail)}
              aria-label="Edit"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-500 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!otpSent ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleSendOtp}
            className="w-full py-2.5 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-colors mt-2 cursor-pointer"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                6-Digit Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-Digit Code"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
