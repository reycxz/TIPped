import React, { useState, useEffect } from 'react';
import { updateProfile } from '../api/auth';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { User, Shield, Check, AlertCircle, CheckCircle2 } from 'lucide-react';

const PRESET_AVATARS = [
  { id: 'avatar-1', color: 'from-amber-500 to-amber-600', label: 'Amber' },
  { id: 'avatar-2', color: 'from-sky-400 to-sky-600', label: 'Sky' },
  { id: 'avatar-3', color: 'from-emerald-400 to-emerald-600', label: 'Emerald' },
  { id: 'avatar-4', color: 'from-purple-500 to-purple-700', label: 'Purple' },
  { id: 'avatar-5', color: 'from-rose-500 to-rose-700', label: 'Rose' },
  { id: 'avatar-6', color: 'from-indigo-500 to-indigo-700', label: 'Indigo' },
];

export default function Profile({ user, onProfileUpdated }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('avatar-1');
  const [showPicker, setShowPicker] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || 'avatar-1');
    }
  }, [user]);

  const activeAvatarObj =
    PRESET_AVATARS.find((a) => a.id === avatar) || PRESET_AVATARS[0];

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await updateProfile({
        firstName,
        lastName,
        avatar,
      });

      setSuccess('Profile updated');
      if (onProfileUpdated) {
        onProfileUpdated(res.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      <div className="bg-surface border border-slate-700/60 rounded-xl p-6 sm:p-8 shadow-2xl">
        {/* Header - No Subtitles */}
        <h1 className="text-xl font-bold text-text mb-6">Profile</h1>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 flex items-center space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center space-x-2 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Constraint 1: Avatar selection with grid of 6 static preset avatar images */}
        <div className="mb-6 p-4 rounded-xl bg-background/50 border border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`w-14 h-14 rounded-full bg-gradient-to-tr ${activeAvatarObj.color} flex items-center justify-center text-white shadow-lg`}
              >
                <User className="w-7 h-7" />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Avatar
                </div>
                <div className="text-sm font-semibold text-text">
                  {activeAvatarObj.label}
                </div>
              </div>
            </div>

            {/* [Avatar Icon] Picker Trigger */}
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              aria-label="Change Avatar"
              className="p-2.5 rounded-lg border border-slate-700 bg-surface text-muted hover:text-primary hover:border-primary transition-colors"
            >
              <User className="w-5 h-5" />
            </button>
          </div>

          {/* Grid of 6 static preset avatar images */}
          {showPicker && (
            <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-6 gap-3">
              {PRESET_AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    setAvatar(av.id);
                    setShowPicker(false);
                  }}
                  aria-label={av.label}
                  className={`aspect-square rounded-full bg-gradient-to-tr ${av.color} flex items-center justify-center text-white shadow transition-all hover:scale-110 relative ${
                    avatar === av.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''
                  }`}
                >
                  <User className="w-4 h-4" />
                  {avatar === av.id && (
                    <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Identity Fields Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              disabled
              value={email}
              placeholder="Email"
              className="w-full px-3 py-2.5 bg-background/50 border border-slate-700/60 rounded-lg text-sm text-muted cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-background font-semibold rounded-lg text-sm transition-colors"
            >
              {loading ? 'Saving...' : 'Update Profile'}
            </button>

            {/* Constraint 2: Trigger Change Password Modal */}
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex-1 py-2.5 px-4 bg-background border border-slate-700 hover:border-primary text-text font-semibold rounded-lg text-sm transition-colors"
            >
              Change Password
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
