# SecureConnect — WebRTC Architecture (Voice & Video Calls)

## 1. Overview

SecureConnect provides high-definition, peer-to-peer 1-on-1 voice and video calling alongside screen sharing capabilities. Real-time media streams travel directly between clients (P2P) using WebRTC (RTP/SRTP), while Socket.IO acts as the signaling channel.

---

## 2. WebRTC Signaling Architecture

```text
User A (Caller)                  Signaling Server (Socket.IO)                  User B (Callee)
   │                                          │                                          │
   │── 1. call:initiate (callType, peerId) ──>│                                          │
   │                                          │── 2. call:incoming (callerInfo) ────────>│
   │                                          │                                          │
   │                                          │<── 3. call:accept (callId) ──────────────│
   │<── 4. call:accepted ─────────────────────│                                          │
   │                                          │                                          │
   │── 5. Create RTCPeerConnection            │                                          │
   │── 6. Create SDP Offer & Set Local ──────>│                                          │
   │                                          │── 7. Relay call:offer (SDP) ────────────>│
   │                                          │                                          │
   │                                          │── 8. Set Remote SDP (Offer)              │
   │                                          │── 9. Create SDP Answer & Set Local       │
   │                                          │<── 10. Relay call:answer (SDP) ──────────│
   │<── 11. Set Remote SDP (Answer) ──────────│                                          │
   │                                          │                                          │
   │<============== 12. Exchange ICE Candidates via call:ice-candidate =================>│
   │                                          │                                          │
   │======================== 13. Direct P2P Media Stream Established =====================│
```

---

## 3. Media Stream & Track Management

### 3.1 Local Device Capture
- **Voice Call:** `navigator.mediaDevices.getUserMedia({ audio: true, video: false })`.
- **Video Call:** `navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 1280, height: 720 } })`.
- **Screen Share:** `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })`.

### 3.2 Dynamic Track Replacement
- **Mute / Unmute Microphone:** Toggle `audioTrack.enabled = !isMuted`.
- **Camera On / Off:** Toggle `videoTrack.enabled = !isVideoOff`.
- **Screen Sharing Switch:** Replace the outbound video track on the existing `RTCPeerConnection` sender (`rtpSender.replaceTrack(screenTrack)`) without dropping the call. Switching back to camera restores the original camera track.

---

## 4. NAT Traversal (STUN & TURN)

### 4.1 STUN (Session Traversal Utilities for NAT)
- Used to discover public IP addresses and ports when peers are behind standard router NATs.
- Local Development Default: `stun:stun.l.google.com:19302`.

### 4.2 TURN (Traversal Using Relays around NAT)
- Used when direct P2P connections are blocked by strict/symmetric corporate firewalls.
- Architecture is designed to consume dynamically requested short-lived TURN credentials from `/api/calls/turn-credentials` (e.g. Coturn integration in Phase 10).

---

## 5. Call Life-Cycle & Status Tracking

Calls pass through distinct states:
1. `IDLE`: No active call.
2. `OUTGOING_RINGING`: Caller waiting for callee to accept/reject.
3. `INCOMING_RINGING`: Callee receiving incoming call notification.
4. `CONNECTED`: P2P connection active; media streaming.
5. `ENDED` / `REJECTED` / `MISSED`: Call terminated; logged to backend database via REST/Socket.
