import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Smile } from 'lucide-react';
import { ALL_EMOJIS, EMOJI_CATEGORIES, EmojiItem } from '../../data/emojis';
import { clsx } from 'clsx';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelectEmoji,
  onClose,
  className = '',
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle outside click if onClose provided
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (onClose) onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Filter emojis based on query & category
  const filteredEmojis = ALL_EMOJIS.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const matchName = item.name.toLowerCase().includes(q);
      const matchKeyword = item.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchName || matchKeyword;
    }
    return item.category === activeCategory;
  });

  return (
    <div
      ref={containerRef}
      className={clsx(
        'w-[calc(100vw-2rem)] max-w-xs sm:w-88 h-80 sm:h-96 bg-white/95 dark:bg-dark-panel/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 animate-fadeIn transition-all',
        className
      )}
    >
      {/* Header Search & Close Bar */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/30 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emojis..."
            className="w-full pl-9 pr-7 py-1.5 bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 text-xs rounded-xl border border-gray-200 dark:border-gray-700/80 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="flex items-center justify-around px-2 py-1.5 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/30 dark:bg-gray-900/20 shrink-0">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={clsx(
                'p-1.5 rounded-xl text-lg transition-all transform active:scale-95',
                activeCategory === cat.id
                  ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300 scale-110 shadow-xs'
                  : 'hover:bg-gray-200/50 dark:hover:bg-gray-800/50 opacity-70 hover:opacity-100'
              )}
              title={cat.label}
            >
              <span>{cat.icon}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {filteredEmojis.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs py-8">
            <Smile className="w-8 h-8 mb-2 stroke-1 opacity-50" />
            <p>No matching emojis found</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
            {filteredEmojis.map((item, idx) => (
              <button
                key={`${item.emoji}-${idx}`}
                onClick={() => {
                  onSelectEmoji(item.emoji);
                  if (onClose) onClose();
                }}
                onMouseEnter={() => setHoveredEmoji(item)}
                onMouseLeave={() => setHoveredEmoji(null)}
                className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-brand-50 dark:hover:bg-brand-950/60 hover:scale-125 transition-all duration-150 active:scale-90"
                title={item.name}
              >
                <span>{item.emoji}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Emoji Name Preview */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="text-base">{hoveredEmoji ? hoveredEmoji.emoji : '😀'}</span>
          <span className="capitalize truncate font-medium text-gray-700 dark:text-gray-300">
            {hoveredEmoji ? hoveredEmoji.name : 'Select an emoji'}
          </span>
        </div>
        <span className="text-[10px] text-gray-400 uppercase font-semibold shrink-0">
          {filteredEmojis.length} emojis
        </span>
      </div>
    </div>
  );
};
