# SecureConnect — Backend Architecture

## 1. Directory Structure

The Node.js + Express + TypeScript backend follows a layered service repository architecture.

```text
server/
└── src/
    ├── config/          # Environment variables, DB connection, CORS, Socket.IO config
    │   ├── db.ts
    │   ├── env.ts
    │   ├── cors.ts
    │   └── mailer.ts
    ├── controllers/     # HTTP Request & Response handlers (Validates req, calls service, returns res)
    │   ├── authController.ts
    │   ├── userController.ts
    │   ├── conversationController.ts
    │   ├── messageController.ts
    │   ├── mediaController.ts
    │   ├── callController.ts
    │   ├── notificationController.ts
    │   └── groupController.ts
    ├── routes/          # Express route definitions & middleware mapping
    │   ├── authRoutes.ts
    │   ├── userRoutes.ts
    │   ├── conversationRoutes.ts
    │   ├── messageRoutes.ts
    │   ├── mediaRoutes.ts
    │   ├── callRoutes.ts
    │   ├── notificationRoutes.ts
    │   └── index.ts
    ├── models/          # Mongoose document schemas & interface definitions
    │   ├── UserModel.ts
    │   ├── ConversationModel.ts
    │   ├── MessageModel.ts
    │   ├── AttachmentModel.ts
    │   ├── CallModel.ts
    │   ├── SessionModel.ts
    │   ├── NotificationModel.ts
    │   └── GroupModel.ts
    ├── services/        # Core business logic (DB queries, password hashing, mail dispatch)
    │   ├── authService.ts
    │   ├── userService.ts
    │   ├── conversationService.ts
    │   ├── messageService.ts
    │   ├── mediaService.ts
    │   ├── callService.ts
    │   └── mailerService.ts
    ├── sockets/         # Socket.IO event namespaces, handlers, and connection life-cycle
    │   ├── socketServer.ts
    │   ├── presenceHandler.ts
    │   ├── messageHandler.ts
    │   ├── typingHandler.ts
    │   └── callHandler.ts
    ├── middleware/      # Express request middlewares
    │   ├── authMiddleware.ts
    │   ├── errorMiddleware.ts
    │   ├── rateLimiterMiddleware.ts
    │   ├── validateMiddleware.ts
    │   └── uploadMiddleware.ts
    ├── utils/           # Utility functions (logger, tokens, cryptography, validators)
    │   ├── logger.ts
    │   ├── password.ts
    │   └── helpers.ts
    ├── types/           # Express req context extensions & custom backend interfaces
    └── server.ts        # Server entry point (HTTP server + Socket.IO initialization)
```

---

## 2. Layered Control Flow

```text
HTTP Request / WS Event
         │
         v
+-----------------------+
|  Express Router / WS  |  (Maps endpoints / events)
+-----------+-----------+
            |
            v
+-----------------------+
|      Middleware       |  (Auth verification, Rate limiting, Input validation)
+-----------+-----------+
            |
            v
+-----------------------+
|      Controller       |  (Extracts parameters, controls HTTP status code response)
+-----------+-----------+
            |
            v
+-----------------------+
|        Service        |  (Business logic, hash generation, mail trigger)
+-----------+-----------+
            |
            v
+-----------------------+
|   Mongoose Model      |  (Interacts with MongoDB collection)
+-----------------------+
```

---

## 3. Server Initialization & Boot Sequence (`server.ts`)

1. **Load Environment Variables:** Validate required key existence via `dotenv` & schema check.
2. **Connect Data Store:** Establish MongoDB client pool via Mongoose with auto-reconnect strategy.
3. **Initialize Express App:** Mount CORS, Security Headers (Helmet), JSON Body Parsing, Rate Limiters.
4. **Attach Routes:** Mount `/api/auth`, `/api/users`, `/api/conversations`, `/api/messages`, `/api/uploads`, `/api/calls`.
5. **Create HTTP & WebSockets Server:** Wrap Express app in Node `http.createServer()` and initialize `Server` from `socket.io`.
6. **Register Socket Middleware & Handlers:** Socket handshake authentication, attach presence, chat, and WebRTC call event listeners.
7. **Mount Global Error Handler:** Catch uncaught async exceptions and format clean JSON error payloads.
