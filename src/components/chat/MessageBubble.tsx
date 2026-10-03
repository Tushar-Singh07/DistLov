import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { Check, CheckCheck, MoreVertical, CornerUpLeft, PhoneCall, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Message } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { FileAttachmentCard } from '../media/FileAttachmentCard';
import { AudioPlayer } from '../media/AudioPlayer';
import { MessageContextMenu } from './MessageContextMenu';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { user } = useAuth();
  const { setReplyingToMessage, setEditingMessage, deleteMessage, toggleReaction } = useChat();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMe = message.senderId === user?.id;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return ts;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Centered Call Log & System Message Badge
  if (message.messageType === 'call' || message.messageType === 'system') {
    const content = message.content || '';
    const lower = content.toLowerCase();
    const isVideo = lower.includes('video');
    const isMissedOrFailed = lower.includes('missed') || lower.includes('declined') || lower.includes('cancelled');

    const Icon = isMissedOrFailed
      ? (isVideo ? VideoOff : PhoneOff)
      : (isVideo ? Video : PhoneCall);

    return (
      <div className="flex justify-center my-3 w-full">
        <div
          className={clsx(
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border shadow-xs transition-all duration-200',
            isMissedOrFailed
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 dark:bg-rose-950/40'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 dark:bg-emerald-950/40'
          )}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span>{content}</span>
          <span className="text-[10px] opacity-70 ml-1">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  // Group reactions by emoji
  const reactionGroups: { emoji: string; count: number; hasReacted: boolean }[] = [];
  if (message.reactions && message.reactions.length > 0) {
    const map: Record<string, { count: number; hasReacted: boolean }> = {};
    for (const r of message.reactions) {
      if (!map[r.emoji]) {
        map[r.emoji] = { count: 0, hasReacted: false };
      }
      map[r.emoji].count += 1;
      if (r.userId === user?.id) {
        map[r.emoji].hasReacted = true;
      }
    }
    for (const emoji in map) {
      reactionGroups.push({ emoji, count: map[emoji].count, hasReacted: map[emoji].hasReacted });
    }
  }

  return (
    <div className={clsx('flex flex-col group my-1.5', isMe ? 'items-end' : 'items-start')}>
      <div className="relative flex items-center gap-1.5 max-w-[85%] md:max-w-[70%]" ref={menuRef}>
        {/* Context Menu Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-opacity"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {/* Context Menu Overlay */}
        {showMenu && (
          <MessageContextMenu
            message={message}
            isMe={isMe}
            onReply={() => setReplyingToMessage(message)}
            onReact={emoji => toggleReaction(message.id, emoji)}
            onCopy={() => navigator.clipboard.writeText(message.content || '')}
            onForward={() => alert('Forwarding message')}
            onEdit={() => setEditingMessage(message)}
            onDelete={() => deleteMessage(message.id)}
            onClose={() => setShowMenu(false)}
          />
        )}

        {/* Bubble container */}
        <div
          className={clsx(
            'px-4 py-2.5 rounded-2xl relative shadow-sm border text-sm',
            isMe
              ? 'bg-brand-600 text-white rounded-br-xs border-brand-500'
              : 'bg-white dark:bg-dark-panel text-gray-900 dark:text-gray-100 rounded-bl-xs border-gray-200 dark:border-gray-800'
          )}
        >
          {/* Threaded Reply Reference */}
          {message.replyToMessage && (
            <div
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 text-xs border-l-2',
                isMe
                  ? 'bg-brand-700/60 border-white/80 text-brand-100'
                  : 'bg-gray-100 dark:bg-gray-800 border-brand-500 text-gray-600 dark:text-gray-300'
              )}
            >
              <CornerUpLeft className="w-3.5 h-3.5 shrink-0" />
              <div className="truncate">
                <span className="font-semibold block">{message.replyToMessage.senderName}</span>
                <span className="truncate block opacity-90">{message.replyToMessage.content}</span>
              </div>
            </div>
          )}

          {/* Main Content */}
          {message.isDeleted ? (
            <span className="italic text-xs opacity-75">This message was deleted</span>
          ) : (
            <div>
              {message.content && <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="space-y-1 mt-1">
                  {message.attachments.map(att =>
                    att.mimeType.startsWith('audio/') ? (
                      <AudioPlayer key={att.id} attachment={att} />
                    ) : (
                      <FileAttachmentCard key={att.id} attachment={att} />
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer Metadata */}
          <div className={clsx('flex items-center justify-end gap-1 text-[10px] mt-1', isMe ? 'text-brand-200' : 'text-gray-400')}>
            {message.isEdited && <span>edited</span>}
            <span>{formatTime(message.createdAt)}</span>
            {isMe && (
              <span className="ml-0.5">
                {message.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-white" />
                ) : message.status === 'delivered' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-brand-200" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-brand-200" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reactions Display */}
      {reactionGroups.length > 0 && (
        <div className={clsx('flex items-center gap-1 mt-1', isMe ? 'pr-2' : 'pl-2')}>
          {reactionGroups.map((rg, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleReaction(message.id, rg.emoji)}
              className={clsx(
                'px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-all cursor-pointer',
                rg.hasReacted
                  ? 'bg-brand-100 dark:bg-brand-900/40 border-brand-400 text-brand-700 dark:text-brand-300 font-semibold'
                  : 'bg-white dark:bg-dark-panel border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <span>{rg.emoji}</span>
              {rg.count > 1 && <span className="text-[10px]">{rg.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

