import React, { useState } from 'react';
import { X, Search, BellOff, Bell, ShieldAlert, Ban, Image as ImageIcon, FileText, Link as LinkIcon, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { Tabs } from '../common/Tabs';
import { ConfirmClearChatModal } from './ConfirmClearChatModal';

export const DetailsPanel: React.FC = () => {
  const { user } = useAuth();
  const { activeConversation, setIsDetailsOpen, setMobileView, toggleMuteConversation, allUsers, messages, setActiveMediaViewer } = useChat();
  const [mediaTab, setMediaTab] = useState<'media' | 'docs'>('media');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  if (!activeConversation) return null;

  let name = activeConversation.name;
  let username = 'group';
  let avatarUrl = activeConversation.avatarUrl;
  let bio = activeConversation.description || 'Group conversation';
  let peerUser: any = null;

  if (activeConversation.type === 'direct') {
    const peerParticipant = activeConversation.participants.find(p => p.userId !== user?.id);
    peerUser = allUsers.find(u => u.id === peerParticipant?.userId);
    if (peerUser) {
      name = peerUser.name;
      username = `@${peerUser.username}`;
      avatarUrl = peerUser.avatarUrl;
      bio = peerUser.bio || 'No bio provided.';
    }
  }

  // Extract shared media attachments
  const allAttachments = messages.flatMap(m => m.attachments || []);
  const sharedImages = allAttachments.filter(a => a.mimeType.startsWith('image/'));
  const sharedDocs = allAttachments.filter(a => !a.mimeType.startsWith('image/'));

  return (
    <aside className="w-full lg:w-80 glass-panel border-l border-gray-200/80 dark:border-gray-800/80 flex flex-col h-full overflow-y-auto z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 dark:border-gray-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMobileView('chat');
              setIsDetailsOpen(false);
            }}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Back to chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Conversation Info</h3>
        </div>
        <button
          onClick={() => setIsDetailsOpen(false)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* User Card */}
        <div className="flex flex-col items-center text-center">
          <Avatar src={avatarUrl} name={name || 'Chat'} size="xl" className="mb-3" />
          <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">{name}</h4>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{username}</span>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 px-2 leading-relaxed">{bio}</p>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-800/60">
          <button
            onClick={() => toggleMuteConversation(activeConversation.id)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-semibold"
          >
            {activeConversation.isMuted ? <Bell className="w-4 h-4 text-brand-500" /> : <BellOff className="w-4 h-4" />}
            <span>{activeConversation.isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button
            onClick={() => setIsConfirmClearOpen(true)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/80 transition-colors text-xs font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Chat</span>
          </button>
        </div>

        {/* Shared Media */}
        <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800/60">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Shared Files</h5>
          </div>

          <Tabs
            tabs={[
              { id: 'media', label: 'Photos & Videos', badge: sharedImages.length },
              { id: 'docs', label: 'Docs', badge: sharedDocs.length }
            ]}
            activeTab={mediaTab}
            onChange={id => setMediaTab(id as any)}
            className="mb-3"
          />

          {mediaTab === 'media' ? (
            sharedImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {sharedImages.map(img => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt="Shared thumbnail"
                    onClick={() => setActiveMediaViewer(img)}
                    className="w-full h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No photos shared yet</p>
            )
          ) : sharedDocs.length > 0 ? (
            <div className="space-y-2">
              {sharedDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800/60 rounded-xl text-xs">
                  <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                  <span className="truncate flex-1 font-medium">{doc.originalName}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No documents shared yet</p>
          )}
        </div>

        {/* Danger Options */}
        <div className="pt-4 border-t border-gray-200/60 dark:border-gray-800/60 space-y-2">
          <button
            onClick={() => setIsConfirmClearOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear All Messages
          </button>
          <button
            onClick={() => alert('Mock User Blocked')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Ban className="w-4 h-4" /> Block User
          </button>
          <button
            onClick={() => alert('Mock User Reported')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <ShieldAlert className="w-4 h-4" /> Report Conversation
          </button>
        </div>
      </div>

      <ConfirmClearChatModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        conversationId={activeConversation.id}
        conversationName={name || 'this conversation'}
      />
    </aside>
  );
};
