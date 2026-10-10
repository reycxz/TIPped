import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, googleAuthApi } from '../api/auth';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login({
  onLoginSuccess,
  onConsentRequired,
  isEmbedded = false,
  onToggleRegister
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginUser(email, password);

      if (data.requiresConsent) {
        if (!data.consentToken || typeof onConsentRequired !== 'function') {
          throw new Error('Privacy consent could not be started. Please try signing in again.');
        }
        localStorage.removeItem('token');
        onConsentRequired({
          consentToken: data.consentToken,
          user: data.user
        });
        setFailedAttempts(0);
        return;
      }

      if (!data.token) {
        throw new Error('Login did not return an access token.');
      }

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

      if (['admin', 'superadmin', 'department'].includes((role || '').toLowerCase())) {
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
        setError(err.response?.data?.message || err.response?.data?.error || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });

        const gUser = userInfoRes.data;

        const email = (gUser.email || '').toLowerCase().trim();
        if (!email.endsWith('@tip.edu.ph')) {
          setError('Access restricted: Only institutional @tip.edu.ph Google accounts are allowed.');
          return;
        }

        const data = await googleAuthApi({
          token: tokenResponse.access_token,
          email: gUser.email,
          firstName: gUser.given_name || gUser.name?.split(' ')[0] || 'Google',
          lastName: gUser.family_name || gUser.name?.split(' ').slice(1).join(' ') || 'User',
          name: gUser.name,
          avatar: gUser.picture,
        });

        if (data.requiresConsent) {
          if (!data.consentToken || typeof onConsentRequired !== 'function') {
            throw new Error('Privacy consent could not be started. Please try signing in again.');
          }
          localStorage.removeItem('token');
          onConsentRequired({
            consentToken: data.consentToken,
            user: data.user
          });
          return;
        }

        if (!data.token) {
          throw new Error('Google authentication did not return an access token.');
        }

        localStorage.setItem('token', data.token);

        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }

        // Constraint 4: Ensure role persistence & redirection
        let role = data.user?.role;
        if (!role && data.token) {
          try {
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            role = payload.role;
          } catch (parseErr) {
            console.error('Error decoding JWT payload:', parseErr);
          }
        }

        if (['admin', 'superadmin', 'department'].includes((role || '').toLowerCase())) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('Google Sign-In failed:', err);
        setError(err.response?.data?.message || err.response?.data?.error || 'Google Sign-In failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error('Google Sign-In error:', errorResponse);
      setError('Google Sign-In was cancelled or failed.');
    },
  });

  const cardContent = (
    <div data-hiw-signin-card="true" className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-xl transition-colors duration-200">
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
            data-hiw-signin-email="true"
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
              className="text-sm p-2 pb-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
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

      {/* Link to Registration & Google Sign-In */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/60 text-center space-y-3">
        <div>
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

        {/* Constraint 1: Continue with Google button placed directly below Sign Up */}
        <button
          type="button"
          onClick={() => handleGoogleSignIn()}
          disabled={googleLoading}
          className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50 shadow-sm"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
        </button>
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
