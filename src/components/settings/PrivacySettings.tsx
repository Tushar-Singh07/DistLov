import React, { useState, useEffect } from 'react';
import { Toggle } from '../common/Toggle';
import { Button } from '../common/Button';
import { Save, AlertCircle } from 'lucide-react';
import { userService } from '../../services/userService';

export const PrivacySettings: React.FC = () => {
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [allowMessagesFrom, setAllowMessagesFrom] = useState<'everyone' | 'contacts'>('everyone');
  const [allowCallsFrom, setAllowCallsFrom] = useState<'everyone' | 'contacts'>('everyone');
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    userService
      .getPrivacySettings()
      .then(settings => {
        setShowOnlineStatus(settings.showOnlineStatus ?? true);
        setShowLastSeen(settings.showLastSeen ?? true);
        setAllowMessagesFrom(settings.allowMessagesFrom || 'everyone');
        setAllowCallsFrom(settings.allowCallsFrom || 'everyone');
      })
      .catch(err => {
        setErrorMsg(err.message || 'Failed to load privacy settings.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSaved(false);

    try {
      const updated = await userService.updatePrivacySettings({
        showOnlineStatus,
        showLastSeen,
        allowMessagesFrom,
        allowCallsFrom,
      });
      setShowOnlineStatus(updated.showOnlineStatus);
      setShowLastSeen(updated.showLastSeen);
      setAllowMessagesFrom(updated.allowMessagesFrom || 'everyone');
      setAllowCallsFrom(updated.allowCallsFrom || 'everyone');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save privacy settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-xs text-gray-400 p-4">Loading privacy settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Privacy & Visibility Controls</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Control who can see your presence, message you, and initiate calls.</p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-4 pt-2">
        <Toggle
          checked={showOnlineStatus}
          onChange={setShowOnlineStatus}
          label="Show Online Indicator"
          description="Allow contacts to see when you are active on SecureConnect."
        />

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <Toggle
            checked={showLastSeen}
            onChange={setShowLastSeen}
            label="Show Last Seen Timestamp"
            description="Display your last activity time to other users."
          />
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Allow Messages From</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Filter who can send you direct messages.</p>
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            {(['everyone', 'contacts'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setAllowMessagesFrom(opt)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl capitalize border transition-all ${
                  allowMessagesFrom === opt
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-dark-panel text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Allow Calls From</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Filter who can initiate voice or video calls with you.</p>
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            {(['everyone', 'contacts'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setAllowCallsFrom(opt)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl capitalize border transition-all ${
                  allowCallsFrom === opt
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-dark-panel text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
        {saved ? (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Privacy settings saved</span>
        ) : (
          <span />
        )}
        <Button variant="primary" type="button" onClick={handleSave} isLoading={isSaving} icon={<Save className="w-4 h-4" />}>
          Save Settings
        </Button>
      </div>
    </div>
  );
};

