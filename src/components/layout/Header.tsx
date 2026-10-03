import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Bell, Sun, Moon, User as UserIcon, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { mockNotifications } from '../../mock/notifications';
import { Dropdown } from '../common/Dropdown';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const unreadNotifsCount = mockNotifications.filter(n => !n.isRead).length;

  const profileMenuItems = [
    {
      label: 'My Profile',
      icon: <UserIcon className="w-4 h-4" />,
      onClick: () => navigate('/profile')
    },
    {
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => navigate('/settings')
    },
    {
      label: 'Sign Out',
      danger: true,
      onClick: () => logout().then(() => navigate('/login'))
    }
  ];

  return (
    <header className="h-14 glass-panel border-b border-gray-200/80 dark:border-gray-800/80 px-4 flex items-center justify-between z-30 shrink-0">
      <Link to="/dashboard" className="flex items-center gap-2 font-bold text-base text-gray-900 dark:text-white">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <span>SecureConnect</span>
      </Link>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        <Link
          to="/notifications"
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifsCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-brand-600 ring-2 ring-white dark:ring-dark-bg" />
          )}
        </Link>

        <Dropdown
          trigger={
            <div className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
          }
          items={profileMenuItems}
        />
      </div>
    </header>
  );
};
