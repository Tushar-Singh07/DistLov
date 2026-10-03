import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MessageSquare, Check, Clock, X, Send } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { useChat } from '../../context/ChatContext';
import { userService } from '../../services/userService';
import { chatRequestService } from '../../services/chatRequestService';
import { User, ChatStatusResult } from '../../types';
import { Spinner } from '../common/Spinner';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({ isOpen, onClose }) => {
  const {
    conversations,
    setActiveConversationId,
    sendChatRequest,
    acceptChatRequest,
    cancelChatRequest,
    pendingRequests
  } = useChat();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Record<string, ChatStatusResult>>({});
  const [noteUserTarget, setNoteUserTarget] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search users whenever query changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      if (!query.trim()) {
        // Fetch default recommended/all active users
        try {
          setIsLoading(true);
          const defaultUsers = await userService.getUsers();
          setResults(defaultUsers);
        } catch (e) {
          console.warn('Failed to load users:', e);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const searchResults = await userService.searchUsers(query);
        setResults(searchResults);
      } catch (e) {
        console.warn('User search failed:', e);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchUsers, 250);
    return () => clearTimeout(debounceTimer);
  }, [query, isOpen]);

  // Load status for displayed users
  useEffect(() => {
    if (results.length === 0) return;

    results.forEach(async (u) => {
      // Check if already in active conversation
      const existingConv = conversations.find(c =>
        c.type === 'direct' && c.participants.some(p => p.userId === u.id || p.user?.id === u.id)
      );

      if (existingConv) {
        setUserStatuses(prev => ({
          ...prev,
          [u.id]: { status: 'accepted', conversationId: existingConv.id }
        }));
        return;
      }

      // Check pending state in context
      const incoming = pendingRequests.incoming.find(r => r.senderId === u.id || r.sender?.id === u.id);
      if (incoming) {
        setUserStatuses(prev => ({
          ...prev,
          [u.id]: { status: 'pending_received', requestId: incoming.id }
        }));
        return;
      }

      const outgoing = pendingRequests.outgoing.find(r => r.receiverId === u.id || r.receiver?.id === u.id);
      if (outgoing) {
        setUserStatuses(prev => ({
          ...prev,
          [u.id]: { status: 'pending_sent', requestId: outgoing.id }
        }));
        return;
      }

      try {
        const st = await chatRequestService.getStatusWithUser(u.id);
        setUserStatuses(prev => ({ ...prev, [u.id]: st }));
      } catch (e) {
        // Fallback status
      }
    });
  }, [results, conversations, pendingRequests]);

  const handleSendRequest = async (targetUserId: string) => {
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    setFeedbackMessage(null);
    try {
      const res = await sendChatRequest(targetUserId, requestNote);
      if (res.autoAccepted && res.conversation) {
        setActiveConversationId(res.conversation.id);
        onClose();
      } else {
        setFeedbackMessage({ text: 'Chat request sent successfully!', type: 'success' });
        setUserStatuses(prev => ({
          ...prev,
          [targetUserId]: { status: 'pending_sent', requestId: res.request.id }
        }));
      }
      setNoteUserTarget(null);
      setRequestNote('');
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to send request.', type: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleAcceptRequest = async (targetUserId: string, requestId: string) => {
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    try {
      const res = await acceptChatRequest(requestId);
      if (res.conversation) {
        setActiveConversationId(res.conversation.id);
        onClose();
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to accept request.', type: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleCancelRequest = async (targetUserId: string, requestId: string) => {
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    try {
      await cancelChatRequest(requestId);
      setUserStatuses(prev => ({
        ...prev,
        [targetUserId]: { status: 'none', conversationId: null, requestId: null }
      }));
      setFeedbackMessage({ text: 'Request cancelled.', type: 'success' });
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Failed to cancel request.', type: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleOpenChat = (conversationId: string) => {
    setActiveConversationId(conversationId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Find & Connect with Users" maxWidth="md">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search users by name or @username..."
            className="w-full bg-gray-100 dark:bg-dark-panel text-gray-900 dark:text-gray-100 text-sm rounded-xl pl-9 pr-8 py-2.5 border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-dark-panel focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-gray-400"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button onClick={() => setFeedbackMessage(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Spinner size="md" className="mb-2" />
              <p className="text-xs">Searching platform users...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No registered users found</p>
              <p className="text-[11px] mt-0.5">Try searching by full name or exact username</p>
            </div>
          ) : (
            results.map(user => {
              const statusObj = userStatuses[user.id] || { status: 'none' };
              const isActionLoading = actionLoading[user.id];
              const isWritingNote = noteUserTarget === user.id;

              return (
                <div
                  key={user.id}
                  className="p-3 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/60 dark:bg-dark-panel/60 hover:border-brand-500/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={user.avatarUrl || user.profilePhoto || undefined}
                        name={user.name}
                        status={user.status}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                          {user.name}
                          {user.isOnline && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Online" />
                          )}
                        </h4>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">@{user.username}</p>
                        {user.bio && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 italic">
                            "{user.bio}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      {statusObj.status === 'accepted' && statusObj.conversationId ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenChat(statusObj.conversationId!)}
                          icon={<MessageSquare className="w-3.5 h-3.5" />}
                        >
                          Chat
                        </Button>
                      ) : statusObj.status === 'pending_sent' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={isActionLoading}
                          onClick={() => statusObj.requestId && handleCancelRequest(user.id, statusObj.requestId)}
                          icon={<Clock className="w-3.5 h-3.5 text-amber-500" />}
                          className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          Pending (Cancel)
                        </Button>
                      ) : statusObj.status === 'pending_received' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isActionLoading}
                          onClick={() => statusObj.requestId && handleAcceptRequest(user.id, statusObj.requestId)}
                          icon={<Check className="w-3.5 h-3.5" />}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Accept
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={isActionLoading}
                          onClick={() => setNoteUserTarget(isWritingNote ? null : user.id)}
                          icon={<UserPlus className="w-3.5 h-3.5" />}
                        >
                          Request Chat
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Request Note Prompt */}
                  {isWritingNote && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex gap-2 items-center animate-fadeIn">
                      <input
                        type="text"
                        value={requestNote}
                        onChange={e => setRequestNote(e.target.value)}
                        placeholder="Add an optional message (e.g. Hi, let's connect!)..."
                        className="flex-1 bg-gray-50 dark:bg-dark-bg text-xs rounded-xl px-3 py-1.5 border border-gray-200 dark:border-gray-700 focus:border-brand-500 focus:outline-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendRequest(user.id);
                          }
                        }}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isActionLoading}
                        onClick={() => handleSendRequest(user.id)}
                        icon={<Send className="w-3 h-3" />}
                      >
                        Send
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
