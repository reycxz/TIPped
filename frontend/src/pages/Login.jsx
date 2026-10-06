import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { AlertCircle } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('User'); // 'User' | 'Admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginUser(email, password);

      // Constraint 2: Only store the JWT string, never store isLoggedIn
      localStorage.setItem('token', data.token);

      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }

      setFailedAttempts(0);

      // Route based on role
      if (data.user.role === 'Department' || data.user.role === 'Superadmin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      // Constraint 3: If login fails > 5 times, display exact lockout message
      if (nextFailures > 5) {
        setError('Please check spelling or click Forgot password');
      } else {
        setError(err.response?.data?.error || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
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
          Sign In
        </h1>

        {/* Lockout or Error Banner */}
        {error && (
          <div
            className={`mb-6 p-3 rounded-lg border flex items-center space-x-2 text-xs ${
              failedAttempts > 5
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-red-500/10 border-red-500/40 text-red-400'
            }`}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-muted uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-xs text-primary hover:underline"
              >
                Forgot Password
              </button>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-background font-semibold rounded-lg text-sm transition-colors mt-2"
          >
            {loading ? 'Submitting...' : 'Sign In'}
          </button>
        </form>

        {/* Link to Registration */}
        <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
          <Link
            to="/register"
            className="text-xs text-muted hover:text-primary transition-colors font-medium"
          >
            Sign Up
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        initialEmail={email}
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}
