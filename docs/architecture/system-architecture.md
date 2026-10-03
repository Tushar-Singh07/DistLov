# SecureConnect — System Architecture

## 1. Executive Overview

**SecureConnect** is a modern, real-time, secure communication web application providing text messaging, rich media sharing, group collaboration, and 1-on-1 voice/video calls with screen sharing capabilities.

The system is designed with a decoupled tier architecture that cleanly isolates client interface, state management, REST API services, real-time event distribution, peer-to-peer signaling, and persistent data storage.

---

## 2. High-Level System Architecture Diagram

```text
+-------------------------------------------------------------------+
|                        Browser Client                             |
|  React 18 + TypeScript + Tailwind CSS + Socket.IO Client + WebRTC |
+---------------------------------+---------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            | HTTP / REST (JSON)                        | WebSockets (WSS)
            v                                           v
+-----------------------+                   +-----------------------+
| Express REST API      |                   | Socket.IO Server      |
| Authentication        |                   | Real-Time Events      |
| User Management       |                   | Messaging / Status    |
| File Upload Handlers  |                   | WebRTC Signaling      |
+-----------+-----------+                   +-----------+-----------+
            |                                           |
            +---------------------+---------------------+
                                  |
                                  v
                    +---------------------------+
                    |  Node.js / Express Core   |
                    |  (TypeScript Services)    |
                    +-------------+-------------+
                                  |
                                  v
                    +---------------------------+
                    | MongoDB (Mongoose ORM)    |
                    | Users, Conversations,     |
                    | Messages, Sessions, Calls |
                    +---------------------------+

            +-------------------------------------------+
            |              WebRTC Engine                |
            | User A <=======================> User B   |
            |     (Direct P2P Audio / Video Stream)     |
            +---------------------+---------------------+
                                  |
                    +-------------+-------------+
                    | STUN / TURN Infrastructure|
                    | NAT Traversal & Relay     |
                    +---------------------------+
```

---

## 3. Layer Responsibilities

### 3.1 Client Layer (React + TypeScript)
- **Role:** Presents user interfaces for authentication, chat, settings, user search, and calling.
- **Responsibilities:**
  - UI State Management (Context API / state hooks).
  - WebSocket connection maintenance & event listening.
  - WebRTC Peer Connection life-cycle management (MediaStreams, tracks, ICE candidates).
  - Optimistic UI updates for zero-latency user experience.
  - End-to-end encryption key management (Future Phase 8).

### 3.2 Application & API Layer (Node.js + Express.js)
- **Role:** Handles stateless request-response flows and business logic enforcement.
- **Responsibilities:**
  - Secure authentication & session validation (Argon2id / bcrypt, HTTP-only cookies).
  - Input validation and rate-limiting.
  - User management, conversation metadata operations, history pagination.
  - Secure file authorization and upload processing.

### 3.3 Real-Time Gateway (Socket.IO Engine)
- **Role:** Stateful full-duplex communication bus.
- **Responsibilities:**
  - Connection authentication via session / auth handshakes.
  - Presence tracking (online, offline, last seen updates).
  - Real-time message dispatch (typing indicators, delivery receipts, read receipts).
  - WebRTC signaling transport (offer, answer, ICE candidates).

### 3.4 Data & Persistence Layer (MongoDB)
- **Role:** Centralized document database.
- **Responsibilities:**
  - Storing user accounts, encrypted credentials, user profiles.
  - Conversation participant mapping and group metadata.
  - Persistent message history and media file references.
  - Active sessions, notification queues, and audit logs.

### 3.5 Peer-to-Peer & Media Layer (WebRTC + STUN/TURN)
- **Role:** Real-time audio, video, and screen sharing transport.
- **Responsibilities:**
  - Low-latency direct media transport between peers via RTP/SRTP.
  - ICE candidate discovery via STUN (Google public STUN servers for local dev).
  - Media relaying via TURN/Coturn when direct NAT traversal is blocked by symmetric firewalls.

---

## 4. Architectural Guarantees & Future Compatibility

1. **E2EE Readiness:** Message schemas separate structural routing metadata (`conversationId`, `senderId`, `timestamps`) from payload data (`content`, `ciphertext`, `iv`, `keyVersion`). The server remains agnostic to whether `content` is plaintext or ciphertext.
2. **Horizontal Scalability:** Socket.IO stateless gateway adapter patterns (e.g. Redis Adapter) can be attached seamlessly in later stages.
3. **Decoupled Calling:** WebRTC signaling flows exclusively through standard Socket.IO channels, allowing easy expansion from 1-on-1 calls to selective forwarding units (SFU) for group calls in future updates.
