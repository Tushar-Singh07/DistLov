import React from 'react';
import { UserPlus } from 'lucide-react';
import { Conversation } from '../../types';
import { ConversationItem } from './ConversationItem';
import { useChat } from '../../context/ChatContext';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeId,
  onSelect
}) => {
  const { filterTab, searchQuery, setIsUserSearchOpen } = useChat();

  const filtered = conversations.filter(c => {
    if (filterTab === 'groups' && c.type !== 'group') return false;
    if (filterTab === 'unread') {
      const hasUnread = c.participants.some(p => p.unreadCount > 0);
      if (!hasUnread) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchParticipant = c.participants.some(
        p => p.user?.name?.toLowerCase().includes(q) || p.user?.username?.toLowerCase().includes(q)
      );
      const matchLastMsg = c.lastMessage?.content?.toLowerCase().includes(q);
      if (!matchName && !matchParticipant && !matchLastMsg) return false;
    }
    return true;
  });

  return (
    <div className="space-y-2 overflow-y-auto pr-1">
      {searchQuery.trim() && (
        <button
          onClick={() => setIsUserSearchOpen(true)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-dashed border-brand-300 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-300 hover:bg-brand-100/50 text-xs font-semibold transition-colors"
        >
          <span className="flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5" />
            Search all users for "{searchQuery}"
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider">Discover</span>
        </button>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 dark:text-gray-500">
          <p className="text-sm font-medium">No conversations found</p>
          <p className="text-xs mt-1">Try searching all users or changing filter tab</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(c => (
            <ConversationItem
              key={c.id}
              conversation={c}
              isActive={c.id === activeId}
              onClick={() => onSelect(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
