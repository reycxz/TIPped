import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, verifyRegistrationOtp } from '../api/auth';
import { AlertCircle, Eye, EyeOff, X } from 'lucide-react';

export default function Register({
  onLoginSuccess,
  onConsentRequired,
  isEmbedded = false,
  onToggleLogin
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    program: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
    if (emailError) setEmailError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    const normalizedEmail = (formData.email || '').toLowerCase().trim();
    if (!normalizedEmail.endsWith('@tip.edu.ph')) {
      setEmailError('Please use your institutional @tip.edu.ph email address.');
      return;
    }

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
      setShowOtpModal(true);
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.response?.data?.error;
      const isEmailConflict =
        err.response?.status === 400 ||
        (typeof serverMessage === 'string' && serverMessage.toLowerCase().includes('email'));

      if (isEmailConflict) {
        const errorMsg = serverMessage || 'Email already exists. Please log in.';
        setEmailError(errorMsg);
        setError('');
      } else {
        setError(serverMessage || 'Registration failed');
      }
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

      if (res.requiresConsent) {
        if (!res.consentToken || typeof onConsentRequired !== 'function') {
          throw new Error('Privacy consent could not be started. Please try signing in again.');
        }
        localStorage.removeItem('token');
        setShowOtpModal(false);
        onConsentRequired({
          consentToken: res.consentToken,
          user: res.user
        });
        return;
      }

      if (!res.token) {
        throw new Error('Verification did not return an access token.');
      }

      localStorage.setItem('token', res.token);

      if (onLoginSuccess && res.user) {
        onLoginSuccess(res.user);
      }

      setShowOtpModal(false);

      if (['admin', 'superadmin', 'department'].includes((res.user.role || '').toLowerCase())) {
        navigate('/admin');
      } else {
        navigate('/dashboard', { state: { isNewUser: true } });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const cardContent = (
    <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-xl transition-colors duration-200">
      {/* Tabs: User Only */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
        <button
          type="button"
          className="flex-1 pb-3 text-sm font-semibold text-center transition-colors border-b-2 border-primary text-primary cursor-default"
        >
          User
        </button>
      </div>

      {/* Header - 1-2 words only, no subtitles */}
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">
        Sign Up
      </h1>

      {/* General / Non-field-specific Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-500 dark:text-red-400 flex items-center space-x-2 text-xs" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              First Name
            </label>
            <input
              type="text"
              required
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First Name"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              required
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last Name"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border ${
              emailError ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-700 focus:border-primary'
            } rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors`}
          />
          {emailError && (
            <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center space-x-1" role="alert">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{emailError}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Program
          </label>
          <select
            name="program"
            value={formData.program}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="" disabled>
              Select your program
            </option>
            <optgroup label="College of Engineering and Architecture">
              <option value="BS Architecture">BS Architecture</option>
              <option value="BS Chemical Engineering">BS Chemical Engineering</option>
              <option value="BS Civil Engineering">BS Civil Engineering</option>
              <option value="BS Computer Engineering">BS Computer Engineering</option>
              <option value="BS Electrical Engineering">BS Electrical Engineering</option>
              <option value="BS Electronics Engineering">BS Electronics Engineering</option>
              <option value="BS Industrial Engineering">BS Industrial Engineering</option>
              <option value="BS Mechanical Engineering">BS Mechanical Engineering</option>
            </optgroup>
            <optgroup label="College of Computer Studies">
              <option value="BS Computer Science">BS Computer Science</option>
              <option value="BS Information Systems">BS Information Systems</option>
              <option value="BS Information Technology">BS Information Technology</option>
            </optgroup>
            <optgroup label="College of Business Education">
              <option value="BS Accountancy">BS Accountancy</option>
              <option value="BS Accounting Information Systems">BS Accounting Information Systems</option>
              <option value="BS Business Administration">BS Business Administration</option>
            </optgroup>
            <optgroup label="College of Arts">
              <option value="BA Political Science">BA Political Science</option>
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full px-3 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
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

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Confirm Password
          </label>
          <div className="relative w-full">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={6}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              className="w-full px-3 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {showConfirmPassword ? (
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
          {loading ? 'Submitting...' : 'Sign Up'}
        </button>
      </form>

      {/* Link to Login */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/60 text-center">
        {onToggleLogin ? (
          <button
            type="button"
            onClick={onToggleLogin}
            className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium cursor-pointer"
          >
            Sign In
          </button>
        ) : (
          <Link
            to="/login"
            className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );

  const otpModal = showOtpModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl relative transition-colors duration-200">
        <button
          type="button"
          onClick={() => setShowOtpModal(false)}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 text-center">
          Verify
        </h2>

        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 text-center">
          Please enter the 6-digit code sent to your email.
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              6-Digit Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="6-Digit Code"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center tracking-widest text-lg font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
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
