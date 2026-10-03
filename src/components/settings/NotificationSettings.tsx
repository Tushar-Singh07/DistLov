import React, { useState } from 'react';
import { Toggle } from '../common/Toggle';

export const NotificationSettings: React.FC = () => {
  const [messages, setMessages] = useState(true);
  const [calls, setCalls] = useState(true);
  const [groups, setGroups] = useState(true);
  const [sounds, setSounds] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Notification Preferences</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Choose when and how you receive alerts across devices.</p>
      </div>

      <div className="space-y-4 pt-2">
        <Toggle
          checked={messages}
          onChange={setMessages}
          label="Direct Message Notifications"
          description="Receive desktop and push alerts for 1-on-1 text messages."
        />

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <Toggle
            checked={calls}
            onChange={setCalls}
            label="Incoming Call Alerts"
            description="Play ringtone and display overlays for incoming voice and video calls."
          />
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <Toggle
            checked={groups}
            onChange={setGroups}
            label="Group Chat Mentions"
            description="Only notify when explicitly tagged (@username) in group discussions."
          />
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <Toggle
            checked={sounds}
            onChange={setSounds}
            label="Notification Sounds"
            description="Play audio chimes when receiving new messages or alerts."
          />
        </div>
      </div>
    </div>
  );
};
