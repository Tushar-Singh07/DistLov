import { Conversation } from '../types';
import { mockMessages } from './messages';

export const mockConversations: Conversation[] = [
  {
    id: 'conv_rahul',
    type: 'direct',
    participants: [
      { userId: 'usr_me', unreadCount: 0 },
      { userId: 'usr_rahul', unreadCount: 2 }
    ],
    lastMessage: mockMessages['conv_rahul'][mockMessages['conv_rahul'].length - 1],
    updatedAt: '10:30 AM',
    isMuted: false
  },
  {
    id: 'conv_sarah',
    type: 'direct',
    participants: [
      { userId: 'usr_me', unreadCount: 0 },
      { userId: 'usr_sarah', unreadCount: 0 }
    ],
    lastMessage: mockMessages['conv_sarah'][mockMessages['conv_sarah'].length - 1],
    updatedAt: 'Yesterday',
    isMuted: false
  },
  {
    id: 'conv_group_core',
    type: 'group',
    name: 'SecureConnect Core Team 🛡️',
    avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
    description: 'Main architecture and product engineering discussion group.',
    ownerId: 'usr_me',
    admins: ['usr_me', 'usr_rahul'],
    participants: [
      { userId: 'usr_me', role: 'admin', unreadCount: 0 },
      { userId: 'usr_rahul', role: 'admin', unreadCount: 0 },
      { userId: 'usr_david', role: 'member', unreadCount: 1 },
      { userId: 'usr_elena', role: 'member', unreadCount: 1 }
    ],
    lastMessage: mockMessages['conv_group_core'][mockMessages['conv_group_core'].length - 1],
    updatedAt: '9:15 AM',
    isMuted: false
  }
];
