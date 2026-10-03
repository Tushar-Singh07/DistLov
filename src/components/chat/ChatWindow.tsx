import React from 'react';
import { useChat } from '../../context/ChatContext';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ShieldCheck } from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const { activeConversation } = useChat();

  if (!activeConversation) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-dark-bg/50">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 flex items-center justify-center mb-4 shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Your Conversations</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
          Select a chat from the sidebar or search for users to start a private conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 dark:bg-dark-bg/40 min-w-0 overflow-hidden relative">
      <ChatHeader />
      <MessageList />
      <MessageInput />
    </div>
  );
};
