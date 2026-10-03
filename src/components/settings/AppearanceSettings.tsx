import React from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const AppearanceSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Clean light background with high contrast readability.',
      icon: <Sun className="w-5 h-5 text-amber-500" />
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Sleek dark theme tailored for low-light environments.',
      icon: <Moon className="w-5 h-5 text-indigo-400" />
    },
    {
      id: 'system',
      label: 'System Preference',
      desc: 'Automatically matches your system OS appearance setting.',
      icon: <Laptop className="w-5 h-5 text-gray-400" />
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Appearance & Theme</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Customize visual theme and display options.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {themeOptions.map(opt => {
          const isSelected = theme === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => setTheme(opt.id as any)}
              className={`p-4 rounded-2xl cursor-pointer border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
                  : 'bg-white dark:bg-dark-panel border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">{opt.icon}</div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{opt.label}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
