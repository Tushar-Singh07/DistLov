# SecureConnect — Database Design Overview

## 1. Overview

SecureConnect uses **MongoDB** as its primary persistent store via the **Mongoose ORM** in Node.js. MongoDB's document model provides flexible schema validation, high write throughput for real-time messaging, and multi-field indexing for search and history pagination.

---

## 2. Entity-Relationship Overview

```text
+---------------+         1:N          +------------------+
|     Users     | <------------------- |     Sessions     |
+-------+-------+                      +------------------+
        |
        | 1:N (Participant)
        v
+-------+-------+         1:N          +------------------+
| Conversations | <------------------- |     Messages     |
+-------+-------+                      +--------+---------+
        |                                       |
        | 1:1 (Group metadata)                  | 1:N
        v                                       v
+-------+-------+                      +------------------+
|    Groups     |                      |   Attachments    |
+---------------+                      +------------------+
        |                                       |
        | 1:N                                   | 1:N
        v                                       v
+---------------+                      +------------------+
|     Calls     |                      |  Notifications   |
+---------------+                      +------------------+
```

---

## 3. Key Collections Summary

1. **`users`**: Stores user identity, authentication hashes, profile details, online status, and privacy preferences.
2. **`conversations`**: Stores conversation containers (direct 1-on-1 chats and group chats) with participant lists and unread tracking.
3. **`messages`**: Stores individual messages, reactions, replies, status flags, and ciphertext metadata.
4. **`attachments`**: Stores file upload metadata, MIME types, file sizes, and storage keys.
5. **`calls`**: Stores call history, caller/callee IDs, call type (voice/video), duration, and end reasons.
6. **`sessions`**: Stores active device sessions, IP logs, refresh tokens, and user-agent strings.
7. **`notifications`**: Stores system/user notifications, unread flags, and push targets.
8. **`groups`**: Stores group admin settings, member permissions, avatars, and description.

---

## 4. Indexing & Optimization Strategy

- **Conversations Collection:**
  - Compound Index: `{ "participants.userId": 1, "updatedAt": -1 }` (Fast lookup of user's active conversations sorted by recency).
- **Messages Collection:**
  - Compound Index: `{ "conversationId": 1, "createdAt": -1 }` (Fast pagination of conversation message feeds).
  - Text Index: `{ "content": "text" }` (Full-text search across plaintext messages).
- **Users Collection:**
  - Unique Index: `{ "email": 1 }`
  - Unique Index: `{ "username": 1 }`
  - Text Index: `{ "name": "text", "username": "text", "email": "text" }` (Fast user search for starting chats).
