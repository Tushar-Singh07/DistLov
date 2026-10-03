import React from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeValue,
  placeholder = 'Search users, messages, groups...',
  className,
  ...props
}) => {
  return (
    <div className={clsx('relative flex items-center w-full', className)}>
      <Search className="absolute left-3.5 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChangeValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-100 dark:bg-dark-panel/90 text-gray-900 dark:text-gray-100 text-sm rounded-xl pl-9 pr-8 py-2 border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-dark-panel focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
        {...props}
      />
      {value && (
        <button
          onClick={() => onChangeValue('')}
          className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
