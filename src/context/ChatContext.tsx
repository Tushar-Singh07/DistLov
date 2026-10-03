import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Conversation, Message, User, Attachment, ChatRequest } from '../types';
import { conversationService } from '../services/conversationService';
import { messageService } from '../services/messageService';
import { userService } from '../services/userService';
import { chatRequestService } from '../services/chatRequestService';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  messages: Message[];
  allUsers: User[];
  pendingRequests: { incoming: ChatRequest[]; outgoing: ChatRequest[] };
  filterTab: 'all' | 'unread' | 'groups';
  searchQuery: string;
  mobileView: 'list' | 'chat' | 'details';
  isDetailsOpen: boolean;
  replyingToMessage: Message | null;
  editingMessage: Message | null;
  activeMediaViewer: Attachment | null;
  isCreateGroupOpen: boolean;
  isUserSearchOpen: boolean;
  isRequestsModalOpen: boolean;
  typingUsers: string[]; // List of user IDs currently typing in active conversation

  // Actions
  setActiveConversationId: (id: string | null) => void;
  startDirectConversationWithUser: (targetUserId: string) => Promise<Conversation>;
  setFilterTab: (tab: 'all' | 'unread' | 'groups') => void;
  setSearchQuery: (query: string) => void;
  setMobileView: (view: 'list' | 'chat' | 'details') => void;
  setIsDetailsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setReplyingToMessage: (msg: Message | null) => void;
  setEditingMessage: (msg: Message | null) => void;
  setActiveMediaViewer: (att: Attachment | null) => void;
  setIsCreateGroupOpen: (open: boolean) => void;
  setIsUserSearchOpen: (open: boolean) => void;
  setIsRequestsModalOpen: (open: boolean) => void;
  refreshPendingRequests: () => Promise<void>;
  sendChatRequest: (targetUserId: string, message?: string) => Promise<{ request: ChatRequest; conversation?: Conversation; autoAccepted?: boolean }>;
  acceptChatRequest: (requestId: string) => Promise<{ request: ChatRequest; conversation: Conversation }>;
  declineChatRequest: (requestId: string) => Promise<{ request: ChatRequest }>;
  cancelChatRequest: (requestId: string) => Promise<{ request: ChatRequest }>;
  sendMessage: (content: string, messageType?: Message['messageType'], attachments?: Attachment[]) => Promise<void>;
  uploadAttachment: (file: File, onProgress?: (percent: number) => void) => Promise<Attachment>;
  sendAttachmentMessage: (file: File, caption?: string, onProgress?: (percent: number) => void) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  searchMessagesInActiveConversation: (query: string) => Promise<Message[]>;
  handleStartTyping: () => void;
  handleStopTyping: () => void;
  createGroup: (name: string, memberIds: string[]) => Promise<void>;
  toggleMuteConversation: (id: string) => void;
  clearChat: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ incoming: ChatRequest[]; outgoing: ChatRequest[] }>({
    incoming: [],
    outgoing: [],
  });
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'groups'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'details'>('list');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeMediaViewer, setActiveMediaViewer] = useState<Attachment | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);

  // Track typing users per conversation: { conversationId -> Set of userIds }
  const [typingMap, setTypingMap] = useState<Record<string, string[]>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshPendingRequests = async () => {
    try {
      const data = await chatRequestService.getPendingRequests();
      setPendingRequests(data);
    } catch (err) {
      console.warn('Failed to fetch pending chat requests:', err);
    }
  };

  // Initialize socket connection, fetch user conversations & pending requests on auth
  useEffect(() => {
    if (isAuthenticated && user) {
      socketService.connect();
      conversationService.getConversations().then(convs => {
        setConversations(convs);
        if (convs.length > 0 && !activeConversationId) {
          setActiveConversationIdState(convs[0].id);
        }
      }).catch(err => console.warn('Failed to fetch conversations:', err));

      userService.getUsers().then(setAllUsers).catch(err => console.warn('Failed to fetch users:', err));
      refreshPendingRequests();
    } else {
      socketService.disconnect();
      setConversations([]);
      setMessages([]);
      setActiveConversationIdState(null);
      setPendingRequests({ incoming: [], outgoing: [] });
    }
  }, [isAuthenticated, user]);

  // Load messages and join room when active conversation changes
  useEffect(() => {
    if (activeConversationId && isAuthenticated) {
      socketService.joinConversation(activeConversationId);
      
      messageService.getMessages(activeConversationId)
        .then(res => {
          setMessages(res.messages);
          socketService.markRead(activeConversationId);
          conversationService.markRead(activeConversationId).catch(() => {});
        })
        .catch(err => {
          console.warn('Failed to fetch conversation messages:', err);
          setMessages([]);
        });

      return () => {
        socketService.leaveConversation(activeConversationId);
      };
    } else {
      setMessages([]);
    }
  }, [activeConversationId, isAuthenticated]);

  // Real-time socket event handlers
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubNewMsg = socketService.onNewMessage((newMsg: any) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        if (newMsg.conversationId === activeConversationId) {
          return [...prev, newMsg];
        }
        return prev;
      });

      if (newMsg.senderId !== user?.id) {
        socketService.markDelivered(newMsg.id, newMsg.conversationId);
        if (newMsg.conversationId === activeConversationId) {
          socketService.markRead(newMsg.conversationId);
        }
      }

      setConversations(prev => {
        const existingIdx = prev.findIndex(c => c.id === newMsg.conversationId);
        if (existingIdx !== -1) {
          const updated = [...prev];
          const conv = { ...updated[existingIdx] };
          conv.lastMessage = newMsg;
          conv.updatedAt = newMsg.createdAt;
          if (newMsg.conversationId !== activeConversationId && newMsg.senderId !== user?.id) {
            const p = conv.participants.find(part => part.userId === user?.id || part.id === user?.id);
            if (p) p.unreadCount = (p.unreadCount || 0) + 1;
          }
          updated[existingIdx] = conv;
          return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
          conversationService.getConversations().then(setConversations).catch(() => {});
          return prev;
        }
      });
    });

    const unsubUpdatedMsg = socketService.onMessageUpdated((updatedMsg: any) => {
      setMessages(prev => prev.map(m => (m.id === updatedMsg.id ? updatedMsg : m)));
    });

    const unsubDeletedMsg = socketService.onMessageDeleted((deletedMsg: any) => {
      setMessages(prev => prev.map(m => (m.id === deletedMsg.id ? deletedMsg : m)));
    });

    const unsubReactionMsg = socketService.onReactionUpdated((reactionMsg: any) => {
      setMessages(prev => prev.map(m => (m.id === reactionMsg.id ? reactionMsg : m)));
    });

    const unsubTyping = socketService.onTypingUpdate(({ conversationId, userId: typingUserId, isTyping }) => {
      setTypingMap(prev => {
        const currentList = prev[conversationId] || [];
        if (isTyping) {
          if (!currentList.includes(typingUserId)) {
            return { ...prev, [conversationId]: [...currentList, typingUserId] };
          }
        } else {
          return { ...prev, [conversationId]: currentList.filter(id => id !== typingUserId) };
        }
        return prev;
      });
    });

    const unsubPresence = socketService.onPresenceUpdate(({ userId: presenceUserId, isOnline, lastSeen }) => {
      setAllUsers(prev =>
        prev.map(u => (u.id === presenceUserId ? { ...u, isOnline, lastSeen } : u))
      );
    });

    const unsubDelivered = socketService.onMessageDelivered(({ messageId }) => {
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, status: 'delivered' } : m)));
    });

    const unsubRead = socketService.onMessageRead(({ conversationId, readByUserId }) => {
      if (readByUserId !== user?.id) {
        setMessages(prev =>
          prev.map(m => (m.conversationId === conversationId ? { ...m, status: 'read' } : m))
        );
      }
    });

    const unsubReqReceived = socketService.onChatRequestReceived((reqData: ChatRequest) => {
      setPendingRequests(prev => ({
        ...prev,
        incoming: [reqData, ...prev.incoming.filter(r => r.id !== reqData.id)],
      }));
    });

    const unsubReqAccepted = socketService.onChatRequestAccepted(({ conversation }: { request: ChatRequest; conversation: Conversation }) => {
      if (conversation) {
        setConversations(prev => {
          if (prev.some(c => c.id === conversation.id)) return prev;
          return [conversation, ...prev];
        });
      }
      refreshPendingRequests();
    });

    const unsubCleared = socketService.onConversationCleared(({ conversationId }) => {
      if (conversationId === activeConversationId) {
        setMessages([]);
      }
      setConversations(prev =>
        prev.map(c => (c.id === conversationId ? { ...c, lastMessage: undefined } : c))
      );
    });

    return () => {
      unsubNewMsg();
      unsubUpdatedMsg();
      unsubDeletedMsg();
      unsubReactionMsg();
      unsubTyping();
      unsubPresence();
      unsubDelivered();
      unsubRead();
      unsubReqReceived();
      unsubReqAccepted();
      unsubCleared();
    };
  }, [isAuthenticated, activeConversationId, user]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;
  const activeConversationTypingUsers = activeConversationId ? (typingMap[activeConversationId] || []) : [];

  const setActiveConversationId = (id: string | null) => {
    setActiveConversationIdState(id);
    setEditingMessage(null);
    setReplyingToMessage(null);
    if (id) {
      setMobileView('chat');
    }
  };

  const startDirectConversationWithUser = async (targetUserId: string): Promise<Conversation> => {
    const conv = await conversationService.createDirectConversation(targetUserId);
    setConversations(prev => {
      if (prev.some(c => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
    setActiveConversationId(conv.id);
    return conv;
  };

  const sendChatRequest = async (targetUserId: string, message?: string) => {
    const res = await chatRequestService.sendRequest(targetUserId, message);
    if (res.conversation) {
      setConversations(prev => {
        if (prev.some(c => c.id === res.conversation!.id)) return prev;
        return [res.conversation!, ...prev];
      });
    }
    await refreshPendingRequests();
    return res;
  };

  const acceptChatRequest = async (requestId: string) => {
    const res = await chatRequestService.acceptRequest(requestId);
    if (res.conversation) {
      setConversations(prev => {
        if (prev.some(c => c.id === res.conversation.id)) return prev;
        return [res.conversation, ...prev];
      });
    }
    await refreshPendingRequests();
    return res;
  };

  const declineChatRequest = async (requestId: string) => {
    const res = await chatRequestService.declineRequest(requestId);
    await refreshPendingRequests();
    return res;
  };

  const cancelChatRequest = async (requestId: string) => {
    const res = await chatRequestService.cancelRequest(requestId);
    await refreshPendingRequests();
    return res;
  };

  const handleStartTyping = () => {
    if (!activeConversationId) return;
    socketService.startTyping(activeConversationId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (!activeConversationId) return;
    socketService.stopTyping(activeConversationId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const sendMessage = async (
    content: string,
    messageType: Message['messageType'] = 'text',
    attachments?: Attachment[]
  ) => {
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!activeConversationId || (!content.trim() && !hasAttachments)) return;

    handleStopTyping();

    if (editingMessage) {
      await editMessage(editingMessage.id, content);
      setEditingMessage(null);
      return;
    }

    await messageService.sendMessage(
      activeConversationId,
      content,
      messageType,
      replyingToMessage?.id,
      attachments
    );

    setReplyingToMessage(null);
  };

  const uploadAttachment = async (file: File, onProgress?: (percent: number) => void): Promise<Attachment> => {
    if (!activeConversationId) throw new Error('No active conversation');
    return await messageService.uploadAttachment(activeConversationId, file, onProgress);
  };

  const sendAttachmentMessage = async (file: File, caption?: string, onProgress?: (percent: number) => void): Promise<void> => {
    if (!activeConversationId) return;
    const attachment = await uploadAttachment(file, onProgress);
    
    let msgType: Message['messageType'] = 'file';
    const mime = (attachment.mimeType || file.type || '').toLowerCase();
    if (mime.startsWith('image/')) msgType = 'image';
    else if (mime.startsWith('video/')) msgType = 'video';
    else if (mime.startsWith('audio/')) msgType = 'audio';
    else if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) msgType = 'document';

    await sendMessage(caption || '', msgType, [attachment]);
  };

  const editMessage = async (messageId: string, content: string) => {
    if (!activeConversationId) return;
    const updated = await messageService.editMessage(activeConversationId, messageId, content);
    setMessages(prev => prev.map(m => (m.id === messageId ? updated : m)));
  };

  const deleteMessage = async (messageId: string) => {
    if (!activeConversationId) return;
    const deleted = await messageService.deleteMessage(activeConversationId, messageId);
    setMessages(prev => prev.map(m => (m.id === messageId ? deleted : m)));
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!activeConversationId) return;
    const targetMsg = messages.find(m => m.id === messageId);
    const hasReacted = targetMsg?.reactions?.some(r => r.userId === user?.id && r.emoji === emoji);

    if (hasReacted) {
      const updated = await messageService.removeReaction(activeConversationId, messageId, emoji);
      setMessages(prev => prev.map(m => (m.id === messageId ? updated : m)));
    } else {
      const updated = await messageService.addReaction(activeConversationId, messageId, emoji);
      setMessages(prev => prev.map(m => (m.id === messageId ? updated : m)));
    }
  };

  const searchMessagesInActiveConversation = async (query: string): Promise<Message[]> => {
    if (!activeConversationId || !query.trim()) return [];
    return await messageService.searchMessages(activeConversationId, query);
  };

  const createGroup = async (name: string, memberIds: string[]) => {
    const newGroup = await conversationService.createGroupConversation(name, memberIds);
    setConversations(prev => [newGroup, ...prev]);
    setActiveConversationId(newGroup.id);
  };

  const toggleMuteConversation = (id: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, isMuted: !c.isMuted } : c))
    );
  };

  const clearChat = async (conversationId: string) => {
    await conversationService.clearChat(conversationId);
    if (activeConversationId === conversationId) {
      setMessages([]);
    }
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, lastMessage: undefined } : c))
    );
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        activeConversationId,
        messages,
        allUsers,
        pendingRequests,
        filterTab,
        searchQuery,
        mobileView,
        isDetailsOpen,
        replyingToMessage,
        editingMessage,
        activeMediaViewer,
        isCreateGroupOpen,
        isUserSearchOpen,
        isRequestsModalOpen,
        typingUsers: activeConversationTypingUsers,
        setActiveConversationId,
        startDirectConversationWithUser,
        setFilterTab,
        setSearchQuery,
        setMobileView,
        setIsDetailsOpen,
        setReplyingToMessage,
        setEditingMessage,
        setActiveMediaViewer,
        setIsCreateGroupOpen,
        setIsUserSearchOpen,
        setIsRequestsModalOpen,
        refreshPendingRequests,
        sendChatRequest,
        acceptChatRequest,
        declineChatRequest,
        cancelChatRequest,
        sendMessage,
        uploadAttachment,
        sendAttachmentMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        searchMessagesInActiveConversation,
        handleStartTyping,
        handleStopTyping,
        createGroup,
        toggleMuteConversation,
        clearChat
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
