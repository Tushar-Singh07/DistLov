import React, { useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { MessageBubble } from './MessageBubble';

export const MessageList: React.FC = () => {
  const { messages } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 dark:text-gray-500">
        <p className="text-sm font-medium">No messages in this conversation yet</p>
        <p className="text-xs mt-1">Send a message below to start chatting!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-1">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
