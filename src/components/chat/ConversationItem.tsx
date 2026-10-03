import React from 'react';
import { clsx } from 'clsx';
import { Conversation } from '../../types';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { VolumeX, CheckCheck, Check } from 'lucide-react';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick
}) => {
  const { user: currentUser } = useAuth();
  const { allUsers } = useChat();

  let name = conversation.name;
  let avatarUrl = conversation.avatarUrl;
  let status: any = undefined;

  if (conversation.type === 'direct') {
    const peerParticipant: any = conversation.participants.find(p => (p.userId || p.id || p.user?.id) !== currentUser?.id);
    const peerUser = peerParticipant?.user || allUsers.find(u => u.id === (peerParticipant?.userId || peerParticipant?.id));
    if (peerUser) {
      name = peerUser.name;
      avatarUrl = peerUser.profilePhoto || peerUser.avatarUrl;
      status = peerUser.isOnline !== undefined ? (peerUser.isOnline ? 'online' : 'offline') : peerUser.status;
    }
  }

  const unreadCount = conversation.participants.find(p => p.userId === currentUser?.id)?.unreadCount || 0;
  const lastMsg = conversation.lastMessage;

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 group relative',
        isActive
          ? 'bg-brand-50 dark:bg-brand-950/50 border border-brand-200/60 dark:border-brand-800/60 shadow-sm'
          : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/60 border border-transparent'
      )}
    >
      <Avatar src={avatarUrl} name={name || 'Chat'} status={status} size="lg" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <h4
            className={clsx(
              'text-sm font-semibold truncate',
              isActive
                ? 'text-brand-900 dark:text-brand-200'
                : 'text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400'
            )}
          >
            {name}
          </h4>
          {lastMsg && (
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 shrink-0">
              {formatTime(lastMsg.createdAt)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
            {lastMsg && lastMsg.senderId === currentUser?.id && lastMsg.messageType !== 'call' && lastMsg.messageType !== 'system' && (
              <span className="shrink-0 text-brand-500">
                {lastMsg.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </span>
            )}
            <span className="truncate">
              {lastMsg ? (lastMsg.content || 'Media message') : 'No messages yet'}
            </span>
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            {conversation.isMuted && <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-600 text-white rounded-full shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
