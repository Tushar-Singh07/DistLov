import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit3, ShieldCheck, Mail, Calendar, UserCheck } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Profile</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">View public profile details and verification status</p>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-gray-200/80 dark:border-gray-800/80 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar src={user?.avatarUrl} name={user?.name || 'User'} size="xl" className="shadow-lg" />

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 w-fit mx-auto sm:mx-0 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Verified User
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">@{user?.username}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 pt-2 leading-relaxed">{user?.bio}</p>
            </div>

            <Link to="/settings">
              <Button variant="outline" size="sm" icon={<Edit3 className="w-4 h-4" />}>
                Edit Profile
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-dark-panel border border-gray-200 dark:border-gray-800 space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-500" /> Email Address
              </span>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{user?.email}</p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-dark-panel border border-gray-200 dark:border-gray-800 space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-500" /> Member Since
              </span>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">September 2026</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
