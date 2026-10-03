import React, { useState, useEffect } from 'react';
import { Laptop, Smartphone, Monitor, LogOut } from 'lucide-react';
import { userService } from '../../services/userService';
import { SessionDevice } from '../../types';
import { Button } from '../common/Button';

export const SessionManager: React.FC = () => {
  const [sessions, setSessions] = useState<SessionDevice[]>([]);

  useEffect(() => {
    userService.getSessions().then(setSessions);
  }, []);

  const handleRevoke = async (id: string) => {
    await userService.revokeSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const getIcon = (deviceName: string) => {
    if (deviceName.includes('iPhone') || deviceName.includes('Mobile')) return <Smartphone className="w-5 h-5" />;
    if (deviceName.includes('MacBook')) return <Laptop className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active Sessions & Devices</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Devices currently logged into your SecureConnect account.</p>
        </div>
        {sessions.length > 1 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setSessions(sessions.filter(s => s.isCurrent))}
            icon={<LogOut className="w-3.5 h-3.5" />}
          >
            Log Out Other Sessions
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {sessions.map(s => (
          <div
            key={s.id}
            className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-dark-panel rounded-2xl border border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300">
                {getIcon(s.deviceName)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100">{s.deviceName}</h5>
                  {s.isCurrent && (
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Current Device
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {s.browser} • {s.os} • {s.ipAddress}
                </p>
              </div>
            </div>

            {!s.isCurrent && (
              <button
                onClick={() => handleRevoke(s.id)}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline p-1"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
