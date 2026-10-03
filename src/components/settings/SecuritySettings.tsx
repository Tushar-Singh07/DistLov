import React, { useState } from 'react';
import { Lock, ShieldCheck, Key } from 'lucide-react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Toggle } from '../common/Toggle';
import { SessionManager } from './SessionManager';

export const SecuritySettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Security & Authentication</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Manage account credentials, two-factor authentication, and active sessions.</p>
      </div>

      {/* Change Password */}
      <form onSubmit={e => { e.preventDefault(); alert('Mock Password Updated'); }} className="space-y-4 max-w-md">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-brand-500" /> Change Password
        </h4>
        <Input
          type="password"
          label="Current Password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          label="New Password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
        />
        <Button variant="outline" size="sm" type="submit" icon={<Lock className="w-3.5 h-3.5" />}>
          Update Password
        </Button>
      </form>

      {/* 2FA */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-500" /> Two-Factor Authentication (2FA)
        </h4>
        <Toggle
          checked={twoFactor}
          onChange={setTwoFactor}
          label="Enable Authenticator App"
          description="Protect your account with an extra verification code from Google Authenticator or Authy."
        />
      </div>

      {/* Active Sessions */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <SessionManager />
      </div>
    </div>
  );
};
