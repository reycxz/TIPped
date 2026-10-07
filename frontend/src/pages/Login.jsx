import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess, isEmbedded = false, onToggleRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

      // Constraint 3: Evaluate role from user object or decoded JWT
      let role = data.user?.role;
      if (!role && data.token) {
        try {
          const payload = JSON.parse(atob(data.token.split('.')[1]));
          role = payload.role;
        } catch (parseErr) {
          console.error('Error decoding JWT payload:', parseErr);
        }
      }

      if (role === 'Superadmin' || role === 'Department') {
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

  const cardContent = (
    <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-xl transition-colors duration-200">
      {/* Header - 1-2 words only, no subtitles */}
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">
        Sign In
      </h1>

      {/* Lockout or Error Banner */}
      {error && (
        <div
          className={`mb-6 p-3 rounded-lg border flex items-center space-x-2 text-xs ${
            failedAttempts > 5
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-300'
              : 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400'
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              Forgot Password
            </button>
          </div>
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-colors mt-2 cursor-pointer"
        >
          {loading ? 'Submitting...' : 'Sign In'}
        </button>
      </form>

      {/* Link to Registration */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/60 text-center">
        {onToggleRegister ? (
          <button
            type="button"
            onClick={onToggleRegister}
            className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium cursor-pointer"
          >
            Sign Up
          </button>
        ) : (
          <Link
            to="/register"
            className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium"
          >
            Sign Up
          </Link>
        )}
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

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        initialEmail={email}
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </>
  );
}
