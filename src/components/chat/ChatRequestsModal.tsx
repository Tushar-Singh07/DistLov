import React, { useState } from 'react';
import { UserCheck, Check, X, Clock, MessageSquare, Inbox, Send } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { useChat } from '../../context/ChatContext';

interface ChatRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatRequestsModal: React.FC<ChatRequestsModalProps> = ({ isOpen, onClose }) => {
  const {
    pendingRequests,
    acceptChatRequest,
    declineChatRequest,
    cancelChatRequest,
    setActiveConversationId
  } = useChat();

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const incoming = pendingRequests.incoming;
  const outgoing = pendingRequests.outgoing;

  const handleAccept = async (requestId: string) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const res = await acceptChatRequest(requestId);
      if (res.conversation) {
        setActiveConversationId(res.conversation.id);
        onClose();
      }
    } catch (err) {
      console.warn('Accept error:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDecline = async (requestId: string) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      await declineChatRequest(requestId);
    } catch (err) {
      console.warn('Decline error:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleCancel = async (requestId: string) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      await cancelChatRequest(requestId);
    } catch (err) {
      console.warn('Cancel error:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Chat Requests" maxWidth="md">
      <div className="space-y-4">
        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'incoming'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Incoming ({incoming.length})
          </button>

          <button
            onClick={() => setActiveTab('outgoing')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'outgoing'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Sent Requests ({outgoing.length})
          </button>
        </div>

        {/* Requests List */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {activeTab === 'incoming' ? (
            incoming.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">No pending incoming requests</p>
                <p className="text-[11px] mt-0.5">When users request to chat with you, they will appear here.</p>
              </div>
            ) : (
              incoming.map(req => {
                const sender = req.sender;
                const isLoading = actionLoading[req.id];
                return (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/60 dark:bg-dark-panel/60 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={sender?.avatarUrl || sender?.profilePhoto || undefined}
                          name={sender?.name || 'User'}
                          status={sender?.status}
                          size="md"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                            {sender?.name}
                          </h4>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">@{sender?.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isLoading}
                          onClick={() => handleAccept(req.id)}
                          icon={<Check className="w-3.5 h-3.5" />}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Accept
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={isLoading}
                          onClick={() => handleDecline(req.id)}
                          icon={<X className="w-3.5 h-3.5" />}
                          className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>

                    {req.message && (
                      <div className="text-[11px] bg-brand-50/50 dark:bg-brand-950/40 p-2 rounded-xl text-gray-600 dark:text-gray-300 italic border border-brand-100/50 dark:border-brand-900/40 flex items-start gap-1.5">
                        <MessageSquare className="w-3 h-3 text-brand-500 shrink-0 mt-0.5" />
                        <span>"{req.message}"</span>
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : outgoing.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No sent requests pending</p>
              <p className="text-[11px] mt-0.5">Use "Find Users" to search and connect with anyone on the platform.</p>
            </div>
          ) : (
            outgoing.map(req => {
              const receiver = req.receiver;
              const isLoading = actionLoading[req.id];
              return (
                <div
                  key={req.id}
                  className="p-3 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/60 dark:bg-dark-panel/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={receiver?.avatarUrl || receiver?.profilePhoto || undefined}
                      name={receiver?.name || 'User'}
                      status={receiver?.status}
                      size="md"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                        {receiver?.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">@{receiver?.username}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isLoading}
                    onClick={() => handleCancel(req.id)}
                    icon={<X className="w-3.5 h-3.5" />}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
                  >
                    Cancel Request
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
