# SecureConnect — Real-Time Architecture (Socket.IO)

## 1. Overview

The real-time messaging, status, and signaling subsystem is built on **Socket.IO**. It provides low-latency full-duplex communication with automatic transport fallback (WebSocket primary, HTTP long-polling secondary) and automatic reconnection handling.

---

## 2. Authentication & Handshake Flow

```text
Client                                             Socket.IO Server
  │                                                        │
  │── 1. Connect Handshake with Auth Header / Cookie ─────>│
  │                                                        │── 2. Validate Session Token / Auth Key
  │                                                        │── 3. Find User & Bind Socket to user_<id> Room
  │<── 4. Connection Accepted (authenticated event) ───────│
  │                                                        │── 5. Broadcast user:online to Contacts
```

Every socket connection MUST pass through an authentication middleware during the connection handshake. Unauthenticated connections are immediately rejected with an `AuthenticationError`.

---

## 3. Room Management Strategy

Socket.IO rooms are utilized to scope real-time updates efficiently without broad server-wide broadcasts:

1. **User Room (`user_<userId>`):**
   - Automatically joined upon connection.
   - Target for direct notifications, incoming call signals, direct messages, and account events.
2. **Conversation Room (`conversation_<conversationId>`):**
   - Joined when the client opens a chat conversation or when active in the dashboard.
   - Target for chat messages, typing indicators, read receipts, and group participant updates.

---

## 4. Message Delivery & Receipt State Machine

```text
[SENT] ──(Server Receives)──> [DELIVERED TO SERVER] ──(Pushed to Recipient Socket)──> [DELIVERED] ──(Recipient Views Chat)──> [READ]
```

- **Sent:** Client generates optimistic message with temporary ID.
- **Delivered to Server:** Server persists message to MongoDB and returns ACK with permanent `messageId` and `createdAt`.
- **Delivered:** Server emits `message:new` to recipient's `user_<userId>` room. Recipient client sends `message:ack:delivered`.
- **Read:** When recipient opens the conversation, client emits `message:read`. Server updates DB and broadcasts `message:read` update to sender.

---

## 5. Reconnection & Offline Recovery

When a client loses network connection:
1. Client enters `reconnecting` state in UI.
2. Socket.IO client automatically attempts reconnection with exponential backoff.
3. Upon re-establishing connection, client re-authenticates and emits `sync:request` with `lastSyncedMessageTimestamp`.
4. Server returns missed message payload missed while offline.
