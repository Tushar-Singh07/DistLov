import React, { useState } from 'react';
import { User, Lock, Shield, Bell, Palette, Laptop, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { ProfileSettings } from '../components/settings/ProfileSettings';
import { PrivacySettings } from '../components/settings/PrivacySettings';
import { SecuritySettings } from '../components/settings/SecuritySettings';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { AppearanceSettings } from '../components/settings/AppearanceSettings';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'security' | 'notifications' | 'appearance'>('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield className="w-4 h-4" /> },
    { id: 'security', label: 'Security & Sessions', icon: <Lock className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/dashboard"
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage your account parameters, security preferences, and themes</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Settings Sub-nav */}
          <div className="w-full md:w-64 glass-panel p-2 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shrink-0 h-fit">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Settings Panel */}
          <div className="flex-1 glass-panel p-6 md:p-8 rounded-3xl border border-gray-200/80 dark:border-gray-800/80 shadow-sm">
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'privacy' && <PrivacySettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
          </div>
        </div>
      </main>
    </div>
  );
};
