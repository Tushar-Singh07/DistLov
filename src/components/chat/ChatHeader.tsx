import React, { useState } from 'react';
import { Phone, Video, Info, ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';
import { Dropdown } from '../common/Dropdown';
import { ConfirmClearChatModal } from './ConfirmClearChatModal';

export const ChatHeader: React.FC = () => {
  const { user } = useAuth();
  const { activeConversation, setActiveConversationId, setMobileView, setIsDetailsOpen, toggleMuteConversation, allUsers, typingUsers } = useChat();
  const { startCall } = useCall();
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  if (!activeConversation) return null;

  let name = activeConversation.name;
  let avatarUrl = activeConversation.avatarUrl;
  let statusText = 'Group Chat';
  let status: any = undefined;
  let peerUser: any = null;

  if (activeConversation.type === 'direct') {
    const peerParticipant: any = activeConversation.participants.find((p: any) => (p.userId || p.id || p.user?.id) !== user?.id);
    peerUser = peerParticipant?.user || allUsers.find(u => u.id === (peerParticipant?.userId || peerParticipant?.id));
    if (peerUser) {
      name = peerUser.name;
      avatarUrl = peerUser.profilePhoto || peerUser.avatarUrl;
      status = peerUser.isOnline !== undefined ? (peerUser.isOnline ? 'online' : 'offline') : peerUser.status;

      const isPeerTyping = typingUsers.includes(peerUser.id);
      if (isPeerTyping) {
        statusText = 'typing...';
      } else {
        statusText = peerUser.isOnline
          ? 'Online'
          : peerUser.lastSeen
          ? `Last seen ${new Date(peerUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Offline';
      }
    }
  } else {
    statusText = `${activeConversation.participants.length} members`;
  }

  const dropdownItems = [
    {
      label: activeConversation.isMuted ? 'Unmute Notifications' : 'Mute Notifications',
      onClick: () => toggleMuteConversation(activeConversation.id)
    },
    {
      label: 'View Details',
      onClick: () => setIsDetailsOpen(prev => !prev)
    },
    {
      label: 'Clear Chat',
      danger: true,
      onClick: () => setIsConfirmClearOpen(true)
    }
  ];

  return (
    <div className="flex items-center justify-between px-6 py-3.5 glass-panel border-b border-gray-200/80 dark:border-gray-800/80">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => {
            setMobileView('list');
            setActiveConversationId(null);
          }}
          className="md:hidden p-2 -ml-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          title="Back to conversation list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <Avatar src={avatarUrl} name={name || 'Chat'} status={status} size="md" />

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{statusText}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {peerUser && (
          <>
            <button
              onClick={() =>
                startCall(peerUser.id, activeConversation.id, 'voice', {
                  id: peerUser.id,
                  name: peerUser.name,
                  username: peerUser.username,
                  profilePhoto: peerUser.profilePhoto || peerUser.avatarUrl,
                })
              }
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand-600 transition-colors"
              title="Voice Call"
            >
              <Phone className="w-5 h-5" />
            </button>

            <button
              onClick={() =>
                startCall(peerUser.id, activeConversation.id, 'video', {
                  id: peerUser.id,
                  name: peerUser.name,
                  username: peerUser.username,
                  profilePhoto: peerUser.profilePhoto || peerUser.avatarUrl,
                })
              }
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand-600 transition-colors"
              title="Video Call"
            >
              <Video className="w-5 h-5" />
            </button>
          </>
        )}

        <button
          onClick={() => setIsDetailsOpen(prev => !prev)}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Conversation Info"
        >
          <Info className="w-5 h-5" />
        </button>

        <Dropdown
          trigger={
            <button className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          }
          items={dropdownItems}
        />
      </div>

      <ConfirmClearChatModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        conversationId={activeConversation.id}
        conversationName={name || 'this chat'}
      />
    </div>
  );
};
