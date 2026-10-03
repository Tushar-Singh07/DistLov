import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, MessageSquare, PhoneMissed, ShieldAlert, Check } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { mockNotifications } from '../mock/notifications';
import { NotificationItem } from '../types';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getIcon = (type: NotificationItem['type']) => {
    if (type === 'message') return <MessageSquare className="w-4 h-4 text-brand-500" />;
    if (type === 'call') return <PhoneMissed className="w-4 h-4 text-red-500" />;
    return <ShieldAlert className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Activity alerts, messages, and call logs</p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={markAllRead} icon={<Check className="w-4 h-4" />}>
            Mark all read
          </Button>
        </div>

        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl glass-panel border transition-all flex items-start gap-4 ${
                !n.isRead ? 'border-brand-300 dark:border-brand-700 bg-brand-50/40 dark:bg-brand-950/20' : 'border-gray-200/80 dark:border-gray-800/80'
              }`}
            >
              {n.sender ? (
                <Avatar src={n.sender.avatarUrl} name={n.sender.name} size="md" />
              ) : (
                <div className="p-3 rounded-2xl bg-brand-100 dark:bg-brand-950 shrink-0">{getIcon(n.type)}</div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{n.title}</h4>
                  <span className="text-[11px] text-gray-400 font-medium shrink-0">{n.timestamp}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{n.body}</p>
              </div>

              {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-brand-600 shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
