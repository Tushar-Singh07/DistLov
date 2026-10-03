import { NotificationItem } from '../types';

export const mockNotifications: NotificationItem[] = [
  {
    id: 'notif_1',
    type: 'message',
    title: 'New Message from Rahul Sharma',
    body: 'Let me know if you want to jump on a quick test video call...',
    timestamp: '10:30 AM',
    isRead: false,
    sender: {
      name: 'Rahul Sharma',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    }
  },
  {
    id: 'notif_2',
    type: 'group',
    title: 'Group Mention in SecureConnect Core Team',
    body: 'Elena Rostova mentioned you: @Alex Morgan let us know when Phase 1 UI...',
    timestamp: '9:15 AM',
    isRead: false,
    sender: {
      name: 'Elena Rostova',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
    }
  },
  {
    id: 'notif_3',
    type: 'call',
    title: 'Missed Call',
    body: 'You missed a voice call from Sarah Jenkins.',
    timestamp: 'Yesterday at 4:12 PM',
    isRead: true,
    sender: {
      name: 'Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    }
  },
  {
    id: 'notif_4',
    type: 'security',
    title: 'New Device Signed In',
    body: 'MacBook Pro 16" in New York, USA signed into your account.',
    timestamp: '2 days ago',
    isRead: true
  }
];
