'use client';

import React, { useState } from 'react';
import { User, Phone, Mail, Lock, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { updateAdminProfileAction, changeAdminPasswordAction, updateEmailSettingsAction } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

interface ProfileFormProps {
  admin: {
    name: string;
    email: string;
    mobile: string;
    agentEmailSettings?: {
      smtpEmail: string;
      smtpAppPassword: string;
      isConfigured: boolean;
    };
  };
}

export default function ProfileForm({ admin }: ProfileFormProps) {
  const router = useRouter();
  
  // Profile form state
  const [name, setName] = useState(admin.name);
  const [email, setEmail] = useState(admin.email);
  const [mobile, setMobile] = useState(admin.mobile);
  
  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Email settings form state
  const [smtpEmail, setSmtpEmail] = useState(admin.agentEmailSettings?.smtpEmail || '');
  const [smtpAppPassword, setSmtpAppPassword] = useState(admin.agentEmailSettings?.smtpAppPassword || '');

  // Indicators
  const [profilePending, setProfilePending] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [emailSettingsPending, setEmailSettingsPending] = useState(false);
  const [emailSettingsSuccess, setEmailSettingsSuccess] = useState(false);
  const [emailSettingsError, setEmailSettingsError] = useState<string | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfilePending(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      const result = await updateAdminProfileAction({ name, email, mobile });
      if (result.success) {
        setProfileSuccess(true);
        router.refresh();
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile details');
    } finally {
      setProfilePending(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordPending(true);
    setPasswordSuccess(false);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      setPasswordPending(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      setPasswordPending(false);
      return;
    }

    try {
      const result = await changeAdminPasswordAction({ oldPassword, newPassword });
      if (result.success) {
        setPasswordSuccess(true);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordPending(false);
    }
  };

  const handleEmailSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSettingsPending(true);
    setEmailSettingsSuccess(false);
    setEmailSettingsError(null);

    try {
      const result = await updateEmailSettingsAction({ smtpEmail, smtpAppPassword });
      if (result.success) {
        setEmailSettingsSuccess(true);
        router.refresh();
        setTimeout(() => setEmailSettingsSuccess(false), 3000);
      }
    } catch (err: any) {
      setEmailSettingsError(err.message || 'Failed to update email settings');
    } finally {
      setEmailSettingsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="border-b border-neutral-250 pb-4">
        <h2 className="font-mono text-2xl font-black text-neutral-900 tracking-wider uppercase">
          ADMIN PROFILE SETTINGS
        </h2>
        <p className="text-neutral-500 text-xs font-mono tracking-wide mt-1">
          SECURE AGENT PROFILE CREDENTIALS & SECURITY CONTROL
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Card */}
        <div className="bg-white border border-neutral-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3">
              <User className="w-5 h-5 text-orange-650" />
              <h3 className="font-mono text-sm font-black text-neutral-900 uppercase tracking-wider">
                PROFILE DETAILS
              </h3>
            </div>

            {profileError && (
              <div className="p-3 bg-red-50 border-l-2 border-red-500 font-mono text-xs text-red-800">
                ERROR: {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 font-mono text-xs text-emerald-850 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>PROFILE DETAILS UPDATED SUCCESSFULLY</span>
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  FULL NAME //
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-sm font-mono rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  EMAIL ADDRESS //
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-sm font-mono rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  MOBILE NUMBER //
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-sm font-mono rounded-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profilePending}
                  className="px-5 py-3 bg-neutral-900 hover:bg-orange-650 text-white font-mono font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 rounded-none min-h-[44px] w-full"
                >
                  {profilePending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span>UPDATING DETAILS...</span>
                    </>
                  ) : (
                    <span>UPDATE DETAILS</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Password Card */}
        <div className="bg-white border border-neutral-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3">
              <Lock className="w-5 h-5 text-orange-655" />
              <h3 className="font-mono text-sm font-black text-neutral-900 uppercase tracking-wider">
                SECURITY CONTROLS
              </h3>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 border-l-2 border-red-500 font-mono text-xs text-red-800">
                ERROR: {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 font-mono text-xs text-emerald-850 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>PASSWORD CHANGED SUCCESSFULLY</span>
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  CURRENT PASSWORD //
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-sm font-mono rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  NEW PASSWORD //
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-sm font-mono rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  CONFIRM NEW PASSWORD //
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-sm font-mono rounded-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordPending}
                  className="px-5 py-3 bg-neutral-900 hover:bg-orange-655 text-white font-mono font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 rounded-none min-h-[44px] w-full"
                >
                  {passwordPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span>UPDATING PASSWORD...</span>
                    </>
                  ) : (
                    <span>CHANGE PASSWORD</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Settings Card */}
        <div className="bg-white border border-neutral-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3">
              <Mail className="w-5 h-5 text-orange-655" />
              <h3 className="font-mono text-sm font-black text-neutral-900 uppercase tracking-wider">
                SMTP EMAIL SETTINGS
              </h3>
            </div>

            {emailSettingsError && (
              <div className="p-3 bg-red-50 border-l-2 border-red-500 font-mono text-xs text-red-800">
                ERROR: {emailSettingsError}
              </div>
            )}

            {emailSettingsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 font-mono text-xs text-emerald-850 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>SMTP SETTINGS SAVED SUCCESSFULLY</span>
              </div>
            )}

            <form onSubmit={handleEmailSettingsUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  SMTP EMAIL //
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    value={smtpEmail}
                    onChange={(e) => setSmtpEmail(e.target.value)}
                    required
                    placeholder="agent@gmail.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-sm font-mono rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  APP PASSWORD //
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="password"
                    value={smtpAppPassword}
                    onChange={(e) => setSmtpAppPassword(e.target.value)}
                    required
                    placeholder="16-digit app password"
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-orange-500 text-sm font-mono rounded-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={emailSettingsPending}
                  className="px-5 py-3 bg-neutral-900 hover:bg-orange-655 text-white font-mono font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 rounded-none min-h-[44px] w-full"
                >
                  {emailSettingsPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span>SAVING SETTINGS...</span>
                    </>
                  ) : (
                    <span>SAVE SMTP SETTINGS</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}
