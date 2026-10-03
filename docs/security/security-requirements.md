# SecureConnect — Security Requirements & Compliance Matrix

## 1. Authentication & Identity Management

1. **Password Policy & Hashing:**
   - Minimum 8 characters with at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.
   - Hashed using **Argon2id** (memory cost 65536 KB, time cost 3, parallelism 4) or **bcrypt** (cost factor 12).
2. **Session Storage:**
   - Auth tokens stored exclusively in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
   - Cookie expiration set to 7 days for normal sessions, 30 days for "Remember Me".
3. **Email Verification Gate:**
   - Unverified accounts cannot initiate new conversations or join group calls.
   - Tokens expire after 24 hours.
4. **Password Reset Controls:**
   - Password reset tokens expire in 15 minutes and automatically invalidate all existing active sessions upon completion.

---

## 2. Network & Server Hardening

1. **Transport Security:**
   - Mandatory HTTPS (TLS 1.3 preferred) and WSS (WebSockets over TLS).
   - HSTS header enforced (`max-age=31536000; includeSubDomains; preload`).
2. **CORS Policy:**
   - Explicit whitelist matching `process.env.CLIENT_URL` only.
   - `Access-Control-Allow-Credentials` set to `true`.
3. **Rate Limiting Matrix:**
   - `/api/auth/login`: 5 attempts per 15-minute window per IP.
   - `/api/auth/register`: 3 attempts per hour per IP.
   - General API endpoints: 100 requests per minute per authenticated user.

---

## 3. WebSocket Security Controls

1. **Handshake Verification:**
   - Validate cookie signature during initial HTTP handshake. Reject invalid sessions with `401 Unauthorized`.
2. **Origin Check:**
   - Verify `Origin` header matches allowed domain whitelist.
3. **Payload Sanitization:**
   - Parse all socket message payloads against JSON schemas before broadcasting.

---

## 4. Storage & File Security

1. **Upload Validation:**
   - File extensions validated against strict whitelist.
   - File content inspected via magic byte detection to prevent file extension spoofing.
2. **Sanitized Storage Names:**
   - File names sanitized and prepended with cryptographically unique UUIDs (e.g. `uuidv4()-sanitized-name.ext`).
3. **Authorization Check:**
   - `/api/uploads/:fileId` checks conversation participant membership before piping media streams.

---

## 5. E2EE Future Security Requirements (Phase 8)

1. **No Proprietary Cryptography:** Standard established primitives only (Signal Protocol, X25519, AES-256-GCM / ChaCha20-Poly1305).
2. **Key Storage:** Private keys MUST NEVER leave client IndexedDB storage. Server only retains public identity keys and PreKeys.
3. **Forward Secrecy:** Double Ratchet algorithm guarantees past messages remain secure even if current ratchet keys are compromised.
