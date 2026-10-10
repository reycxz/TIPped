import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { acceptPrivacyConsent, declinePrivacyConsent } from '../api/auth';

const CONSENT_TEXT =
  'By signing in with your TIP Institutional Account, you authorize TIPped to process your institutional email, name, and program strictly for campus safety dispatch, incident verification, and routing under the Data Privacy Act of 2012.';

export default function PrivacyConsentModal({
  consentToken,
  onAccepted,
  onDecline
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declineInput, setDeclineInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const preventEscapeDismissal = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('keydown', preventEscapeDismissal, true);
    return () => window.removeEventListener('keydown', preventEscapeDismissal, true);
  }, []);

  const handleAgree = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await acceptPrivacyConsent(consentToken);
      if (!data.token || !data.user) {
        throw new Error('Consent could not be completed. Please try signing in again.');
      }

      localStorage.setItem('token', data.token);
      onAccepted(data.user);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
        requestError.message ||
        'Consent could not be completed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDecline = async () => {
    setLoading(true);
    setError('');

    try {
      await declinePrivacyConsent(consentToken);
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      onDecline();
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
        requestError.message ||
        'The decline could not be recorded. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelDecline = () => {
    setShowDeclineConfirm(false);
    setDeclineInput('');
    setError('');
  };

  const handleInitialDecline = () => {
    setShowDeclineConfirm(true);
    setError('');
  };

  const declineText = showDeclineConfirm
    ? 'Declining will log you out and queue your account for deletion in 30 days. To confirm, type DECLINE below.'
    : CONSENT_TEXT;

  const handleDeclineConfirmSubmit = (event) => {
    event.preventDefault();
    if (declineInput === 'DECLINE' && !loading) handleConfirmDecline();
  };

  const renderActions = () => {
    if (showDeclineConfirm) {
      return (
        <form onSubmit={handleDeclineConfirmSubmit} className="mt-6 space-y-4">
          <label htmlFor="decline-confirmation" className="sr-only">
            Type DECLINE to confirm
          </label>
          <input
            id="decline-confirmation"
            type="text"
            autoComplete="off"
            value={declineInput}
            onChange={(event) => setDeclineInput(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={cancelDecline}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={declineInput !== 'DECLINE' || loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Decline'}
            </button>
          </div>
        </form>
      );
    }

    return (
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleInitialDecline}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-600"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={handleAgree}
          disabled={loading}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Agree'}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-consent-title"
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        <h1 id="privacy-consent-title" className="mb-4 text-lg font-semibold">
          Privacy Consent
        </h1>
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
          {declineText}
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {renderActions()}
      </section>
    </div>
  );
}
