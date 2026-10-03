import React from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatWindow } from '../components/chat/ChatWindow';
import { DetailsPanel } from '../components/chat/DetailsPanel';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';
import { UserSearchModal } from '../components/chat/UserSearchModal';
import { ChatRequestsModal } from '../components/chat/ChatRequestsModal';
import { MediaViewerModal } from '../components/media/MediaViewerModal';
import { IncomingCallOverlay } from '../components/calls/IncomingCallOverlay';
import { OutgoingCallOverlay } from '../components/calls/OutgoingCallOverlay';
import { ActiveVoiceCallModal } from '../components/calls/ActiveVoiceCallModal';
import { ActiveVideoCallModal } from '../components/calls/ActiveVideoCallModal';
import { useChat } from '../context/ChatContext';

export const DashboardPage: React.FC = () => {
  const {
    mobileView,
    isDetailsOpen,
    isUserSearchOpen,
    setIsUserSearchOpen,
    isRequestsModalOpen,
    setIsRequestsModalOpen
  } = useChat();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-gray-100">
      {/* Sidebar Navigation & Chat List */}
      <div className={`h-full ${mobileView === 'list' ? 'block w-full' : 'hidden'} md:block`}>
        <Sidebar />
      </div>

      {/* Main Active Chat Area */}
      <div className={`h-full flex-1 flex flex-col min-w-0 ${mobileView === 'chat' ? 'block w-full' : 'hidden'} md:flex`}>
        <ChatWindow />
      </div>

      {/* Right Information Details Panel */}
      {isDetailsOpen && (
        <div className={`h-full ${mobileView === 'details' ? 'block w-full' : 'hidden'} lg:block`}>
          <DetailsPanel />
        </div>
      )}

      {/* Global Modals & Call Overlays */}
      <CreateGroupModal />
      <UserSearchModal isOpen={isUserSearchOpen} onClose={() => setIsUserSearchOpen(false)} />
      <ChatRequestsModal isOpen={isRequestsModalOpen} onClose={() => setIsRequestsModalOpen(false)} />
      <MediaViewerModal />
      <IncomingCallOverlay />
      <OutgoingCallOverlay />
      <ActiveVoiceCallModal />
      <ActiveVideoCallModal />
    </div>
  );
};
