# SecureConnect — Security Architecture & E2EE Roadmap

## 1. Authentication & Session Security

- **Password Storage:** Passwords hashed with Argon2id (or bcrypt with cost factor >= 12). Plaintext passwords are never logged or stored.
- **Session Strategy:** HTTP-only, Secure, SameSite=Strict cookies containing signed JWT or session tokens. Protects against XSS token theft.
- **Email Verification:** Required upon registration before full chat access is granted. Token generated with high-entropy cryptographic random bytes (32-byte hex).
- **Password Reset:** Short-lived (15-minute expiry) single-use tokens sent via email.

---

## 2. API & Network Protection

- **Transport Encryption:** Mandatory HTTPS for REST endpoints and WSS for WebSockets in production environments.
- **Security Headers:** Configured via `helmet` (Strict-Transport-Security, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options).
- **CORS Control:** Restricted strictly to configured `CLIENT_URL` domain.
- **Rate Limiting:**
  - Auth Endpoints (`/api/auth/*`): 5 requests per minute per IP.
  - General API (`/api/*`): 100 requests per minute per IP.
  - WebSocket Connection Attempts: 10 connections per minute per IP.
- **Input Validation:** All incoming payloads validated via strict schemas (e.g. Zod or Joi) to prevent NoSQL injection and XSS payloads.

---

## 3. Upload & File Security

- **File Validation:** Strict MIME-type sniffing (inspecting magic bytes, not just file extensions).
- **Size Caps:** Hard limits (e.g., 10MB images, 50MB video/docs).
- **Access Authorization:** Private media files served via authenticated endpoints (`/api/uploads/:id`) verifying participant membership in the target conversation.

---

## 4. End-to-End Encryption (E2EE) Roadmap (Phase 8)

### 4.1 Core Design Principle
The server acts purely as an untrusted message relay and ciphertext storage engine. Message contents are encrypted on the client device before transmission and decrypted on the recipient client device.

```text
[Sender Device]                                [Server]                              [Recipient Device]
  Plaintext
      │
      ▼
  (Encrypt with Recipient Session Key)
      │
      ▼
  Ciphertext ─────────────────────────────> Store & Relay ─────────────────────────────> Ciphertext
                                            (Server cannot                              │
                                             read content)                              ▼
                                                                                   (Decrypt with Local Key)
                                                                                        │
                                                                                        ▼
                                                                                    Plaintext
```

### 4.2 Cryptographic Standards & Protocols
- **Algorithm Standard:** Double Ratchet Algorithm (inspired by Signal Protocol / libsignal-protocol).
- **Asymmetric Key Exchange:** X25519 for key agreement (ECDH).
- **Symmetric Encryption:** AES-256-GCM or ChaCha20-Poly1305 for message payloads.
- **PreKey Distribution:** Public identity keys and prekeys stored on server database in `UserPreKeys` collection.

### 4.3 Database Schema Compatibility
The `MessageModel` is designed from Phase 0 with dual compatibility:
```typescript
{
  conversationId: ObjectId,
  senderId: ObjectId,
  messageType: 'text' | 'image' | 'file',
  content?: string,        // Used in Phase 1-7 (Plaintext)
  ciphertext?: string,     // Used in Phase 8+ (Encrypted Payload)
  iv?: string,             // Initial Vector / Nonce
  keyVersion?: number,     // Encryption key rotation index
  isEncrypted: boolean     // Flag indicating E2EE state
}
```
This guarantees zero database schema migration downtime when transitioning from server-stored messaging to full E2EE.
