# SecureConnect — Socket.IO Events Specification

## 1. Presence & Connection Events

### 1.1 `user:online` (Server -> Client)
- **Purpose:** Broadcasts to contacts that a user has connected.
- **Scope:** Broadcast to user's contacts.
- **Payload:**
  ```json
  { "userId": "60d5ec49f1b2c81234567890", "timestamp": "2026-09-29T22:00:00.000Z" }
  ```

### 1.2 `user:offline` (Server -> Client)
- **Purpose:** Broadcasts that a user has disconnected.
- **Payload:**
  ```json
  { "userId": "60d5ec49f1b2c81234567890", "lastSeen": "2026-09-29T22:05:00.000Z" }
  ```

---

## 2. Messaging Events

### 2.1 `message:send` (Client -> Server)
- **Purpose:** Client submits a new chat message over WebSocket.
- **Payload:**
  ```json
  {
    "tempId": "temp-123456",
    "conversationId": "60d5ec49f1b2c81234567895",
    "messageType": "text",
    "content": "Hey there!",
    "replyToMessageId": null
  }
  ```
- **Ack Response:** `{ "status": "ok", "message": { /* Saved IMessage object */ } }`

### 2.2 `message:new` (Server -> Client)
- **Purpose:** Server relays a newly arrived message to conversation participants.
- **Payload:** Complete `IMessage` object.

### 2.3 `message:delivered` (Client -> Server & Server -> Client)
- **Purpose:** Client acknowledges receipt of a message rendered in their client window.
- **Payload:** `{ "messageId": "60d5ec49...", "conversationId": "60d5..." }`

### 2.4 `message:read` (Client -> Server & Server -> Client)
- **Purpose:** Client informs server that a conversation was opened and messages were viewed.
- **Payload:** `{ "conversationId": "60d5...", "lastReadMessageId": "60d5..." }`

### 2.5 `message:edit` (Client -> Server & Server -> Client)
- **Payload:** `{ "messageId": "60d5...", "newContent": "Updated text", "editedAt": "..." }`

### 2.6 `message:delete` (Client -> Server & Server -> Client)
- **Payload:** `{ "messageId": "60d5...", "deletedAt": "..." }`

---

## 3. Typing Indicator Events

### 3.1 `typing:start` (Client -> Server & Server -> Client)
- **Payload:** `{ "conversationId": "60d5...", "userId": "60d5..." }`

### 3.2 `typing:stop` (Client -> Server & Server -> Client)
- **Payload:** `{ "conversationId": "60d5...", "userId": "60d5..." }`

---

## 4. WebRTC Signaling & Call Events

### 4.1 `call:initiate` (Client -> Server)
- **Payload:** `{ "receiverId": "60d5...", "callType": "video" }`

### 4.2 `call:incoming` (Server -> Client)
- **Payload:** `{ "callId": "call_999", "caller": { "id": "...", "name": "...", "profilePhoto": "..." }, "callType": "video" }`

### 4.3 `call:accept` (Client -> Server) / `call:accepted` (Server -> Client)
- **Payload:** `{ "callId": "call_999" }`

### 4.4 `call:reject` (Client -> Server) / `call:rejected` (Server -> Client)
- **Payload:** `{ "callId": "call_999", "reason": "declined" }`

### 4.5 `call:offer` (Client -> Server & Server -> Client)
- **Payload:** `{ "callId": "call_999", "targetUserId": "...", "sdp": { "type": "offer", "sdp": "v=0..." } }`

### 4.6 `call:answer` (Client -> Server & Server -> Client)
- **Payload:** `{ "callId": "call_999", "targetUserId": "...", "sdp": { "type": "answer", "sdp": "v=0..." } }`

### 4.7 `call:ice-candidate` (Client -> Server & Server -> Client)
- **Payload:** `{ "callId": "call_999", "targetUserId": "...", "candidate": { "candidate": "...", "sdpMid": "...", "sdpMLineIndex": 0 } }`

### 4.8 `call:ended` (Client -> Server & Server -> Client)
- **Payload:** `{ "callId": "call_999", "durationSeconds": 142 }`
