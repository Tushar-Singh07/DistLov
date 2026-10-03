import { Message } from '../types';

export const mockMessages: Record<string, Message[]> = {
  'conv_rahul': [
    {
      id: 'msg_1',
      conversationId: 'conv_rahul',
      senderId: 'usr_rahul',
      messageType: 'text',
      content: 'Hey Alex! Have you reviewed the Phase 0 architecture specification for SecureConnect?',
      status: 'read',
      createdAt: '10:14 AM'
    },
    {
      id: 'msg_2',
      conversationId: 'conv_rahul',
      senderId: 'usr_me',
      messageType: 'text',
      content: 'Yes! The separation between the Express REST API and Socket.IO gateway looks super clean.',
      status: 'read',
      createdAt: '10:16 AM'
    },
    {
      id: 'msg_3',
      conversationId: 'conv_rahul',
      senderId: 'usr_rahul',
      messageType: 'text',
      content: 'Awesome. Here is the draft architectural schematic for the WebRTC signaling pipeline:',
      status: 'read',
      createdAt: '10:18 AM'
    },
    {
      id: 'msg_4',
      conversationId: 'conv_rahul',
      senderId: 'usr_rahul',
      messageType: 'image',
      content: 'WebRTC Peer Connection Flowchart',
      attachments: [
        {
          id: 'att_1',
          originalName: 'webrtc-flowchart.png',
          mimeType: 'image/png',
          fileSize: 1450000,
          url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&auto=format&fit=crop&q=80'
        }
      ],
      reactions: [
        { userId: 'usr_me', emoji: '👍' },
        { userId: 'usr_rahul', emoji: '🔥' }
      ],
      status: 'read',
      createdAt: '10:19 AM'
    },
    {
      id: 'msg_5',
      conversationId: 'conv_rahul',
      senderId: 'usr_me',
      messageType: 'text',
      content: 'Looks great! I especially like how STUN/TURN traversal fallback is structured.',
      replyToMessageId: 'msg_3',
      replyToMessage: {
        senderName: 'Rahul Sharma',
        content: 'Awesome. Here is the draft architectural schematic...'
      },
      status: 'read',
      createdAt: '10:22 AM'
    },
    {
      id: 'msg_6',
      conversationId: 'conv_rahul',
      senderId: 'usr_rahul',
      messageType: 'document',
      content: 'Full Technical Specification PDF',
      attachments: [
        {
          id: 'att_2',
          originalName: 'SecureConnect_Phase0_Blueprint.pdf',
          mimeType: 'application/pdf',
          fileSize: 4200000,
          url: '#'
        }
      ],
      status: 'read',
      createdAt: '10:25 AM'
    },
    {
      id: 'msg_7',
      conversationId: 'conv_rahul',
      senderId: 'usr_rahul',
      messageType: 'audio',
      content: 'Voice Memo',
      attachments: [
        {
          id: 'att_3',
          originalName: 'audio-note.wav',
          mimeType: 'audio/wav',
          fileSize: 850000,
          durationSeconds: 42,
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
        }
      ],
      status: 'read',
      createdAt: '10:28 AM'
    },
    {
      id: 'msg_8',
      conversationId: 'conv_rahul',
      senderId: 'usr_rahul',
      messageType: 'text',
      content: 'Let me know if you want to jump on a quick test video call to verify the mock overlay layout!',
      status: 'delivered',
      createdAt: '10:30 AM'
    }
  ],
  'conv_sarah': [
    {
      id: 'msg_s1',
      conversationId: 'conv_sarah',
      senderId: 'usr_sarah',
      messageType: 'text',
      content: 'Hi Alex! I updated the design system tokens for Dark Mode glassmorphism in Tailwind.',
      status: 'read',
      createdAt: 'Yesterday'
    },
    {
      id: 'msg_s2',
      conversationId: 'conv_sarah',
      senderId: 'usr_me',
      messageType: 'text',
      content: 'That sounds amazing! The contrast ratios look crisp.',
      status: 'read',
      createdAt: 'Yesterday'
    }
  ],
  'conv_group_core': [
    {
      id: 'msg_g1',
      conversationId: 'conv_group_core',
      senderId: 'usr_david',
      messageType: 'text',
      content: 'Team, MongoDB indexes for compound participant queries are ready in the design doc.',
      status: 'read',
      createdAt: '9:00 AM'
    },
    {
      id: 'msg_g2',
      conversationId: 'conv_group_core',
      senderId: 'usr_elena',
      messageType: 'text',
      content: '@Alex Morgan let us know when Phase 1 UI mockups are ready for review!',
      status: 'read',
      createdAt: '9:15 AM'
    }
  ]
};
