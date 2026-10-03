import React, { useState } from 'react';
import { Reply, Smile, Copy, Forward, Edit, Trash2, Plus } from 'lucide-react';
import { Message } from '../../types';
import { EmojiPicker } from '../common/EmojiPicker';

interface MessageContextMenuProps {
  message: Message;
  isMe: boolean;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onForward: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  isMe,
  onReply,
  onReact,
  onCopy,
  onForward,
  onEdit,
  onDelete,
  onClose
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const quickEmojis = ['❤️', '👍', '🔥', '😂', '😮', '👏'];

  return (
    <div className="absolute z-30 bottom-full mb-2 bg-white dark:bg-dark-panel border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-2 w-56 text-xs animate-slide-up">
      {/* Quick emoji reactions */}
      <div className="flex items-center justify-between gap-1 pb-2 mb-1.5 border-b border-gray-100 dark:border-gray-800 relative">
        {quickEmojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => {
              onReact(emoji);
              onClose();
            }}
            className="hover:scale-125 transition-transform p-1 text-base"
          >
            {emoji}
          </button>
        ))}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1 rounded-full text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="More emojis"
        >
          <Plus className="w-4 h-4" />
        </button>

        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl">
            <EmojiPicker
              onSelectEmoji={(emoji) => {
                onReact(emoji);
                onClose();
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </div>

      <div className="space-y-0.5">
        <button
          onClick={() => {
            onReply();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
        >
          <Reply className="w-3.5 h-3.5 text-gray-400" /> Reply
        </button>
        <button
          onClick={() => {
            onCopy();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
        >
          <Copy className="w-3.5 h-3.5 text-gray-400" /> Copy Text
        </button>
        <button
          onClick={() => {
            onForward();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
        >
          <Forward className="w-3.5 h-3.5 text-gray-400" /> Forward
        </button>
        {isMe && (
          <button
            onClick={() => {
              onEdit();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
          >
            <Edit className="w-3.5 h-3.5 text-gray-400" /> Edit
          </button>
        )}
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Message
        </button>
      </div>
    </div>
  );
};
