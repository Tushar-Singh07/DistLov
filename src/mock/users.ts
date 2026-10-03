import { User, SessionDevice } from '../types';

export const mockCurrentUser: User = {
  id: 'usr_me',
  name: 'Alex Morgan',
  username: 'alexmorgan',
  email: 'alex.morgan@secureconnect.dev',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  bio: 'Building the future of real-time encrypted communications 🚀 | Cybersecurity & Web Enthusiast',
  status: 'online',
  lastSeen: 'Just now',
  isEmailVerified: true,
  privacySettings: {
    showOnlineStatus: true,
    showLastSeen: true,
    allowMessagesFrom: 'everyone',
    allowCallsFrom: 'everyone',
    lastSeenVisibility: 'everyone',
    readReceipts: true,
    profilePhotoVisibility: 'everyone'
  }
};

export const mockUsers: User[] = [
  mockCurrentUser,
  {
    id: 'usr_rahul',
    name: 'Rahul Sharma',
    username: 'rahulsharma',
    email: 'rahul@secureconnect.dev',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Lead System Architect | Distributed Systems',
    status: 'online',
    lastSeen: 'Online',
    isEmailVerified: true
  },
  {
    id: 'usr_sarah',
    name: 'Sarah Jenkins',
    username: 'sarahj',
    email: 'sarah.j@secureconnect.dev',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    bio: 'UI/UX Product Designer 🎨',
    status: 'online',
    lastSeen: 'Online',
    isEmailVerified: true
  },
  {
    id: 'usr_david',
    name: 'David Chen',
    username: 'dchen',
    email: 'david.chen@secureconnect.dev',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: 'DevOps & Cloud Security Specialist',
    status: 'away',
    lastSeen: '15 minutes ago',
    isEmailVerified: true
  },
  {
    id: 'usr_elena',
    name: 'Elena Rostova',
    username: 'elena_r',
    email: 'elena@secureconnect.dev',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    bio: 'Mobile Engineer & WebRTC Protocol Specialist',
    status: 'offline',
    lastSeen: '2 hours ago',
    isEmailVerified: true
  }
];

export const mockSessions: SessionDevice[] = [
  {
    id: 'sess_1',
    deviceName: 'MacBook Pro 16"',
    browser: 'Chrome 128.0',
    os: 'macOS Sonoma',
    ipAddress: '192.168.1.45 (New York, USA)',
    lastActive: 'Active Now',
    isCurrent: true
  },
  {
    id: 'sess_2',
    deviceName: 'iPhone 15 Pro',
    browser: 'Mobile Safari 17.4',
    os: 'iOS 17.5',
    ipAddress: '172.56.21.9 (Cellular)',
    lastActive: '3 hours ago',
    isCurrent: false
  },
  {
    id: 'sess_3',
    deviceName: 'Windows Desktop Workstation',
    browser: 'Edge 127.0',
    os: 'Windows 11 Enterprise',
    ipAddress: '192.168.1.102',
    lastActive: 'Yesterday',
    isCurrent: false
  }
];
