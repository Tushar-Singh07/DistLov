# SecureConnect — REST API Specification

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 `POST /api/auth/register`
- **Purpose:** Create a new user account and send an email verification link.
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "username": "janedoe",
    "email": "jane@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Registration successful. Please check your email to verify your account.",
    "user": {
      "id": "60d5ec49f1b2c81234567890",
      "name": "Jane Doe",
      "username": "janedoe",
      "email": "jane@example.com",
      "isEmailVerified": false
    }
  }
  ```
- **Error Responses:** `400 Bad Request` (Validation failure / Email or username already taken).

---

### 1.2 `POST /api/auth/login`
- **Purpose:** Authenticate user credentials and establish a session cookie.
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Success Response (200 OK):** Sets HTTP-only cookie `session_token`.
  ```json
  {
    "success": true,
    "user": {
      "id": "60d5ec49f1b2c81234567890",
      "name": "Jane Doe",
      "username": "janedoe",
      "email": "jane@example.com",
      "profilePhoto": null,
      "isEmailVerified": true
    }
  }
  ```
- **Error Responses:** `401 Unauthorized` (Invalid credentials), `403 Forbidden` (Email not verified).

---

### 1.3 `POST /api/auth/logout`
- **Purpose:** Invalidate session and clear auth cookies.
- **Auth Required:** Yes
- **Success Response (200 OK):**
  ```json
  { "success": true, "message": "Logged out successfully." }
  ```

---

### 1.4 `POST /api/auth/verify-email`
- **Purpose:** Confirm user email address via token.
- **Auth Required:** No
- **Request Body:** `{ "token": "a1b2c3d4e5f6..." }`
- **Success Response (200 OK):** `{ "success": true, "message": "Email verified successfully." }`

---

### 1.5 `POST /api/auth/forgot-password`
- **Purpose:** Request a password reset email link.
- **Auth Required:** No
- **Request Body:** `{ "email": "jane@example.com" }`
- **Success Response (200 OK):** `{ "success": true, "message": "If that email exists, a reset link has been sent." }`

---

### 1.6 `POST /api/auth/reset-password`
- **Purpose:** Reset password using valid reset token.
- **Auth Required:** No
- **Request Body:** `{ "token": "token123", "newPassword": "NewStrongPassword123!" }`
- **Success Response (200 OK):** `{ "success": true, "message": "Password updated successfully." }`

---

## 2. User Profile Endpoints (`/api/users`)

### 2.1 `GET /api/users/me`
- **Purpose:** Fetch current authenticated user profile.
- **Auth Required:** Yes
- **Success Response (200 OK):** Returns full `IUser` record (excluding `passwordHash`).

### 2.2 `GET /api/users/search?q=query`
- **Purpose:** Search for users by name, username, or email to initiate chats.
- **Auth Required:** Yes
- **Success Response (200 OK):** Returns array of matching public user profiles.

### 2.3 `PUT /api/users/profile`
- **Purpose:** Update user profile info (name, bio, profilePhoto).
- **Auth Required:** Yes
- **Request Body:** `{ "name": "Jane S. Doe", "bio": "Software Engineer & Crypto Enthusiast" }`
- **Success Response (200 OK):** Returns updated user object.

---

## 3. Conversation Endpoints (`/api/conversations`)

### 3.1 `GET /api/conversations`
- **Purpose:** List all direct and group conversations for the current user, sorted by last active.
- **Auth Required:** Yes
- **Success Response (200 OK):** Array of conversation objects populated with participant details and latest message.

### 3.2 `POST /api/conversations`
- **Purpose:** Create or retrieve an existing direct conversation with a target user.
- **Auth Required:** Yes
- **Request Body:** `{ "recipientId": "60d5ec49f1b2c81234567891" }`
- **Success Response (200 OK / 201 Created):** Returns conversation object.

### 3.3 `GET /api/conversations/:id`
- **Purpose:** Get detailed metadata of a specific conversation.
- **Auth Required:** Yes (Must be participant)

---

## 4. Message Endpoints (`/api/messages`)

### 4.1 `GET /api/conversations/:id/messages?page=1&limit=30`
- **Purpose:** Paginated retrieval of messages in a conversation.
- **Auth Required:** Yes (Must be participant)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "messages": [ /* Array of Message objects */ ],
    "pagination": { "page": 1, "limit": 30, "hasMore": true }
  }
  ```

### 4.2 `POST /api/messages`
- **Purpose:** Send a message (Fallback if Socket.IO offline, or for initial REST submission).
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "conversationId": "60d5ec49f1b2c81234567895",
    "messageType": "text",
    "content": "Hello world!",
    "replyToMessageId": null
  }
  ```

### 4.3 `PUT /api/messages/:id`
- **Purpose:** Edit an existing message content.
- **Auth Required:** Yes (Sender only)

### 4.4 `DELETE /api/messages/:id`
- **Purpose:** Soft-delete a message.
- **Auth Required:** Yes (Sender or Group Admin)

---

## 5. Media & Upload Endpoints (`/api/uploads`)

### 5.1 `POST /api/uploads`
- **Purpose:** Upload an image, video, audio, or document file.
- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data`
- **Success Response (201 Created):** Returns attachment object with `fileUrl`, `mimeType`, `fileSize`.

### 5.2 `GET /api/uploads/:id`
- **Purpose:** Download / view file securely.
- **Auth Required:** Yes (Participant of target conversation)

---

## 6. Call Endpoints (`/api/calls`)

### 6.1 `GET /api/calls/history`
- **Purpose:** Get user's call history.
- **Auth Required:** Yes

### 6.2 `POST /api/calls`
- **Purpose:** Log a completed or missed call record.
- **Auth Required:** Yes
