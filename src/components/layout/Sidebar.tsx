import React from 'react';
import { Plus, Settings, LogOut, UserPlus, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { SearchInput } from '../common/SearchInput';
import { Tabs } from '../common/Tabs';
import { ConversationList } from '../chat/ConversationList';
import { Dropdown } from '../common/Dropdown';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    filterTab,
    setFilterTab,
    searchQuery,
    setSearchQuery,
    setIsCreateGroupOpen,
    setIsUserSearchOpen,
    setIsRequestsModalOpen,
    pendingRequests
  } = useChat();

  const navigate = useNavigate();

  const incomingCount = pendingRequests.incoming.length;

  const userMenuItems = [
    {
      label: 'View Profile',
      icon: <Avatar src={user?.avatarUrl} name={user?.name || ''} size="xs" />,
      onClick: () => navigate('/profile')
    },
    {
      label: 'Account Settings',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => navigate('/settings')
    },
    {
      label: 'Sign Out',
      danger: true,
      icon: <LogOut className="w-4 h-4" />,
      onClick: () => logout().then(() => navigate('/login'))
    }
  ];

  const tabs = [
    { id: 'all', label: 'All' },
    {
      id: 'unread',
      label: 'Unread',
      badge: conversations.reduce(
        (acc, c) => acc + (c.participants.find(p => p.userId === user?.id)?.unreadCount || 0),
        0
      )
    },
    { id: 'groups', label: 'Groups' }
  ];

  return (
    <aside className="w-full md:w-80 lg:w-96 glass-panel border-r border-gray-200/80 dark:border-gray-800/80 flex flex-col h-full shrink-0 z-10">
      {/* Top Sidebar Header */}
      <div className="p-4 border-b border-gray-200/80 dark:border-gray-800/80 flex items-center justify-between">
        <Dropdown
          trigger={
            <div className="flex items-center gap-3 cursor-pointer group">
              <Avatar src={user?.avatarUrl} name={user?.name || 'User'} status={user?.status} size="md" />
              <div className="min-w-0 text-left">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 transition-colors truncate">
                  {user?.name}
                </h3>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 block truncate">@{user?.username}</span>
              </div>
            </div>
          }
          items={userMenuItems}
          align="left"
        />

        <div className="flex items-center gap-1.5">
          {/* Chat Requests Button */}
          <button
            onClick={() => setIsRequestsModalOpen(true)}
            className="relative p-2 rounded-xl bg-gray-100 dark:bg-dark-panel text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Manage Chat Requests"
          >
            <UserCheck className="w-4 h-4" />
            {incomingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {incomingCount}
              </span>
            )}
          </button>

          {/* User Search & Discover Button */}
          <button
            onClick={() => setIsUserSearchOpen(true)}
            className="p-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm"
            title="Search & Connect with Users"
          >
            <UserPlus className="w-4 h-4" />
          </button>

          {/* Create Group Button */}
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors"
            title="Create Group Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 space-y-3">
        <SearchInput
          value={searchQuery}
          onChangeValue={setSearchQuery}
          placeholder="Search chats or users..."
        />
        <Tabs tabs={tabs} activeTab={filterTab} onChange={id => setFilterTab(id as any)} />
      </div>

      {/* Conversation Feed */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <ConversationList
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={id => setActiveConversationId(id)}
        />
      </div>
    </aside>
  );
};
