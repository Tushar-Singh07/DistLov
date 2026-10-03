# SecureConnect — Frontend Architecture

## 1. Directory Structure

The frontend application follows a feature-oriented, modular React + TypeScript folder architecture designed for Vite.

```text
client/
└── src/
    ├── assets/          # Static images, icons, branding assets, sound effects (ringtone, notification)
    ├── components/      # Reusable presentation & visual components
    │   ├── common/      # Generic UI primitives (Button, Input, Avatar, Modal, Badge, Spinner)
    │   ├── auth/        # Auth forms (LoginForm, SignupForm, PasswordResetForm, EmailVerifyModal)
    │   ├── chat/        # Chat layout sub-components (MessageItem, MessageInput, ChatHeader, TypingIndicator)
    │   ├── conversation/# Conversation list items, SearchBar, FilterTabs, GroupCreateModal
    │   ├── media/       # Media players, Image Lightbox, Video Preview, Document Card
    │   ├── calls/       # Call overlays (IncomingCallModal, ActiveCallView, ControlsBar, ScreenShareView)
    │   ├── settings/    # ProfileEditor, SecuritySettings, PrivacySettings, SessionManager
    │   └── ui/          # High-level UI elements (Toast, Dropdown Menu, Tooltip)
    ├── pages/           # Top-level page views (Routed components)
    │   ├── LandingPage.tsx
    │   ├── LoginPage.tsx
    │   ├── SignupPage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   ├── ResetPasswordPage.tsx
    │   ├── VerifyEmailPage.tsx
    │   ├── DashboardPage.tsx
    │   └── SettingsPage.tsx
    ├── layouts/         # Frame wrappers (AuthLayout, MainDashboardLayout, SettingsLayout)
    ├── hooks/           # Custom React hooks (useAuth, useChat, useSocket, useWebRTC, useMedia)
    ├── services/        # Axios API clients & standard HTTP handlers
    │   ├── api.ts       # Axios instance config with interceptors
    │   ├── authService.ts
    │   ├── chatService.ts
    │   ├── userService.ts
    │   └── mediaService.ts
    ├── context/         # React Context providers for global application state
    │   ├── AuthContext.tsx
    │   ├── ChatContext.tsx
    │   ├── SocketContext.tsx
    │   ├── CallContext.tsx
    │   └── ThemeContext.tsx
    ├── socket/          # Socket.IO client event listeners, emission wrappers, connection handlers
    │   ├── socketClient.ts
    │   ├── chatEvents.ts
    │   ├── presenceEvents.ts
    │   └── callEvents.ts
    ├── webrtc/          # WebRTC peer connection wrappers, candidate queues, media stream utils
    │   ├── peerConnection.ts
    │   ├── mediaDevices.ts
    │   └── screenShare.ts
    ├── utils/           # Helper methods (date formatters, file size formatters, validators, sound player)
    ├── types/           # TypeScript interfaces & type definitions (User, Message, Conversation, Call, etc.)
    ├── App.tsx          # Main route controller & provider assembly
    └── main.tsx         # DOM entry point
```

---

## 2. Component Responsibility & Modular State Flow

```text
+-----------------------------------------------------------------------+
|                              App.tsx                                  |
|   Providers: AuthProvider -> SocketProvider -> ChatProvider -> Call   |
+-----------------------------------+-----------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|  Auth Pages & Views   |                       | Main Dashboard View   |
| (Login, Signup, etc.) |                       | (Protected Route)     |
+-----------------------+                       +-----------+-----------+
                                                            |
                                  +-------------------------+-------------------------+
                                  |                                                   |
                                  v                                                   v
                    +---------------------------+                       +---------------------------+
                    | Conversation Sidebar View |                       | Active Chat Window View   |
                    | (List, Search, User Card) |                       | (Messages, Input, Media)  |
                    +---------------------------+                       +-------------+-------------+
                                                                                      |
                                                                                      v
                                                                        +---------------------------+
                                                                        | Voice / Video Call Overlay|
                                                                        | (Floating / Fullscreen)   |
                                                                        +---------------------------+
```

---

## 3. Context & State Abstraction Plan

To support building **Phase 1 (Mock UI)** cleanly without needing backend services, all business state is exposed to components via standardized React Context hooks:

1. **`AuthContext`**: Exposes `user`, `isAuthenticated`, `login()`, `logout()`, `updateProfile()`. In Phase 1, backed by mock user data.
2. **`ChatContext`**: Exposes `conversations`, `activeConversationId`, `messages`, `sendMessage()`, `typingUsers`, `markAsRead()`. In Phase 1, backed by mock conversation/message feeds.
3. **`SocketContext`**: Exposes `isConnected`, `onlineUsers`. In Phase 1, returns mock status (`true`).
4. **`CallContext`**: Exposes `callState`, `activeCall`, `startCall()`, `acceptCall()`, `rejectCall()`, `endCall()`, `isMuted`, `isVideoOff`, `isScreenSharing`. In Phase 1, operates against mock call controls and local test video streams.

---

## 4. UI Strategy & Design Guidelines

- **Styling:** Vanilla CSS design tokens & Tailwind utility classes. Dark mode standard with glassmorphism overlays (`backdrop-blur-md`).
- **Icons:** `lucide-react` icon set.
- **Responsiveness:** Mobile-first layout with collapsible sidebar views on small screens (< 768px).
- **Accessibility:** Keyboard navigable dialogs, ARIA landmarks, clear visual focus states.
