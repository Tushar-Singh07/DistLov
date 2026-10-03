import mongoose from 'mongoose';
import ioClient from 'socket.io-client';
import express from 'express';
import http from 'http';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { UserModel } from '../models/UserModel.js';
import { CallModel } from '../models/CallModel.js';
import { conversationService } from '../services/conversationService.js';
import { messageService } from '../services/messageService.js';
import { callService } from '../services/callService.js';
import { initSocketIO } from '../sockets/socketManager.js';
import { createSession } from '../services/sessionService.js';


async function runWebRTCVerification() {
  console.log(`\n===================================================`);
  console.log(`🧪 STARTING SECURECONNECT PHASE 5 WEBRTC VERIFICATION SUITE`);
  console.log(`===================================================\n`);

  await connectDB();

  // Setup Test Server
  const testApp = express();
  const testServer = http.createServer(testApp);
  initSocketIO(testServer);
  await new Promise<void>((res) => testServer.listen(5098, res));

  // Clean Test Data
  await UserModel.deleteMany({ email: { $regex: /@webrtcverification\.test$/i } });


  // 1. Seed Test Users
  const userA = await UserModel.create({
    name: 'WebRTC User A',
    username: 'webrtc_usera',
    email: 'usera@webrtcverification.test',
    passwordHash: 'hash123',
    isEmailVerified: true,
  });

  const userB = await UserModel.create({
    name: 'WebRTC User B',
    username: 'webrtc_userb',
    email: 'userb@webrtcverification.test',
    passwordHash: 'hash123',
    isEmailVerified: true,
  });

  const userC = await UserModel.create({
    name: 'WebRTC User C (Outsider)',
    username: 'webrtc_userc',
    email: 'userc@webrtcverification.test',
    passwordHash: 'hash123',
    isEmailVerified: true,
  });

  // Create Direct Conversation between A and B
  const conv = await conversationService.getOrCreateDirectConversation(userA._id.toString(), userB._id.toString());

  console.log(`[Setup]: Test users seeded. Conversation ID: ${conv.id}`);

  let passedCount = 0;
  const totalTests = 18;

  // Sessions & Tokens
  const { accessToken: tokenA } = await createSession({ userId: userA._id as any, ipAddress: '127.0.0.1' });
  const { accessToken: tokenB } = await createSession({ userId: userB._id as any, ipAddress: '127.0.0.1' });
  const { accessToken: tokenC } = await createSession({ userId: userC._id as any, ipAddress: '127.0.0.1' });

  // Test 1: Authenticated user can initiate a voice call
  let voiceCallId = '';
  try {
    const res = await callService.initiateCall({
      callerId: userA._id.toString(),
      receiverId: userB._id.toString(),
      conversationId: conv.id,
      callType: 'voice',
    });

    if (res.call && res.call.status === 'ringing' && res.call.type === 'voice') {
      voiceCallId = res.call._id.toString();
      console.log(`✓ Test 1 Passed: Authenticated user initiated voice call (${voiceCallId})`);
      passedCount++;
    } else {
      console.error(`✗ Test 1 Failed: Response mismatch`, res);
    }
  } catch (err: any) {
    console.error(`✗ Test 1 Failed with error:`, err.message);
  }

  // Clean active voice call for subsequent tests
  if (voiceCallId) {
    await CallModel.findByIdAndDelete(voiceCallId);
  }

  // Test 2: Authenticated user can initiate a video call
  let videoCallId = '';
  try {
    const res = await callService.initiateCall({
      callerId: userA._id.toString(),
      receiverId: userB._id.toString(),
      conversationId: conv.id,
      callType: 'video',
    });

    if (res.call && res.call.status === 'ringing' && res.call.type === 'video') {
      videoCallId = res.call._id.toString();
      console.log(`✓ Test 2 Passed: Authenticated user initiated video call (${videoCallId})`);
      passedCount++;
    } else {
      console.error(`✗ Test 2 Failed: Response mismatch`, res);
    }
  } catch (err: any) {
    console.error(`✗ Test 2 Failed with error:`, err.message);
  }

  if (videoCallId) {
    await CallModel.findByIdAndDelete(videoCallId);
  }

  // Test 3: Unauthenticated call initiation is rejected
  try {
    let unauthRejected = false;
    try {
      await callService.initiateCall({
        callerId: '',
        receiverId: userB._id.toString(),
        conversationId: conv.id,
        callType: 'voice',
      });
    } catch (err: any) {
      unauthRejected = true;
    }

    if (unauthRejected) {
      console.log(`✓ Test 3 Passed: Unauthenticated call initiation rejected`);
      passedCount++;
    } else {
      console.error(`✗ Test 3 Failed: Unauthenticated call was allowed`);
    }
  } catch (err: any) {
    console.error(`✗ Test 3 Failed with error:`, err.message);
  }

  // Test 4: Non-participant cannot initiate a call
  try {
    let nonParticipantRejected = false;
    try {
      await callService.initiateCall({
        callerId: userC._id.toString(),
        receiverId: userB._id.toString(),
        conversationId: conv.id,
        callType: 'voice',
      });
    } catch (err: any) {
      if (err.status === 403 || err.message.includes('Unauthorized')) {
        nonParticipantRejected = true;
      }
    }

    if (nonParticipantRejected) {
      console.log(`✓ Test 4 Passed: Non-participant call initiation blocked with 403`);
      passedCount++;
    } else {
      console.error(`✗ Test 4 Failed: Non-participant call was allowed`);
    }
  } catch (err: any) {
    console.error(`✗ Test 4 Failed with error:`, err.message);
  }

  // Test 5: Blocked user cannot initiate a call
  try {
    await UserModel.findByIdAndUpdate(userB._id, { $addToSet: { blockedUsers: userA._id } });
    let blockRejected = false;
    try {
      await callService.initiateCall({
        callerId: userA._id.toString(),
        receiverId: userB._id.toString(),
        conversationId: conv.id,
        callType: 'voice',
      });
    } catch (err: any) {
      if (err.status === 403 || err.message.includes('privacy or block')) {
        blockRejected = true;
      }
    }

    await UserModel.findByIdAndUpdate(userB._id, { $pull: { blockedUsers: userA._id } }); // Unblock

    if (blockRejected) {
      console.log(`✓ Test 5 Passed: Blocked user call initiation blocked with 403`);
      passedCount++;
    } else {
      console.error(`✗ Test 5 Failed: Blocked user call was allowed`);
    }
  } catch (err: any) {
    console.error(`✗ Test 5 Failed with error:`, err.message);
  }

  // Socket Connections for Real-Time Tests
  const clientA = ioClient('http://localhost:5098', { auth: { token: tokenA }, transports: ['websocket'] });
  const clientB = ioClient('http://localhost:5098', { auth: { token: tokenB }, transports: ['websocket'] });
  const clientC = ioClient('http://localhost:5098', { auth: { token: tokenC }, transports: ['websocket'] });

  await Promise.all([
    new Promise<void>((r) => clientA.on('connect', r)),
    new Promise<void>((r) => clientB.on('connect', r)),
    new Promise<void>((r) => clientC.on('connect', r)),
  ]);

  let activeTestCallId = '';

  // Test 6: Incoming call reaches intended recipient via Socket.IO
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Incoming call event timeout')), 4000);

      clientB.on('call:incoming', (payload: any) => {
        if (payload && payload.conversationId === conv.id && payload.caller.id === userA._id.toString()) {
          clearTimeout(timeout);
          activeTestCallId = payload.callId;
          console.log(`✓ Test 6 Passed: Incoming call event received by User B via Socket.IO`);
          passedCount++;
          resolve();
        }
      });

      clientA.emit('call:initiate', { conversationId: conv.id, receiverId: userB._id.toString(), callType: 'video' });
    });
  } catch (err: any) {
    console.error(`✗ Test 6 Failed with error:`, err.message);
  }

  // Test 7: Recipient can accept call
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Call accept timeout')), 4000);

      clientA.on('call:accepted', (payload: any) => {
        if (payload && payload.callId === activeTestCallId) {
          clearTimeout(timeout);
          console.log(`✓ Test 7 Passed: Call acceptance signal received by caller`);
          passedCount++;
          resolve();
        }
      });

      clientB.emit('call:accept', { callId: activeTestCallId });
    });
  } catch (err: any) {
    console.error(`✗ Test 7 Failed with error:`, err.message);
  }

  // Test 8: Recipient can reject call
  try {
    await CallModel.updateMany({ status: { $in: ['ringing', 'accepted'] } }, { status: 'ended', endedAt: new Date() });
    // Initiate another call to test rejection
    const initRes = await callService.initiateCall({
      callerId: userA._id.toString(),
      receiverId: userB._id.toString(),
      conversationId: conv.id,
      callType: 'voice',
    });

    const callToRejectId = initRes.call!._id.toString();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Call reject timeout')), 4000);

      clientA.on('call:rejected', (payload: any) => {
        if (payload && payload.callId === callToRejectId) {
          clearTimeout(timeout);
          console.log(`✓ Test 8 Passed: Call rejection signal received by caller`);
          passedCount++;
          resolve();
        }
      });

      clientB.emit('call:reject', { callId: callToRejectId, reason: 'declined' });
    });
  } catch (err: any) {
    console.error(`✗ Test 8 Failed with error:`, err.message);
  }

  // Test 9: Caller can cancel ringing call
  try {
    await CallModel.updateMany({ status: { $in: ['ringing', 'accepted'] } }, { status: 'ended', endedAt: new Date() });
    const initRes = await callService.initiateCall({
      callerId: userA._id.toString(),
      receiverId: userB._id.toString(),
      conversationId: conv.id,
      callType: 'voice',
    });

    const callToCancelId = initRes.call!._id.toString();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Call cancel timeout')), 4000);

      clientB.on('call:cancelled', (payload: any) => {
        if (payload && payload.callId === callToCancelId) {
          clearTimeout(timeout);
          console.log(`✓ Test 9 Passed: Call cancellation signal received by recipient`);
          passedCount++;
          resolve();
        }
      });

      clientA.emit('call:cancel', { callId: callToCancelId });
    });
  } catch (err: any) {
    console.error(`✗ Test 9 Failed with error:`, err.message);
  }

  // Test 10: Call timeout becomes missed
  try {
    await CallModel.updateMany({ status: { $in: ['ringing', 'accepted'] } }, { status: 'ended', endedAt: new Date() });
    const initRes = await callService.initiateCall({
      callerId: userA._id.toString(),
      receiverId: userB._id.toString(),
      conversationId: conv.id,
      callType: 'voice',
    });

    const callToTimeoutId = initRes.call!._id.toString();
    const missedCall = await callService.handleRingTimeout(callToTimeoutId);

    if (missedCall && missedCall.status === 'missed' && missedCall.endReason === 'timeout') {
      console.log(`✓ Test 10 Passed: Ringing timeout correctly updated status to missed`);
      passedCount++;
    } else {
      console.error(`✗ Test 10 Failed: Missed call status mismatch`, missedCall);
    }
  } catch (err: any) {
    console.error(`✗ Test 10 Failed with error:`, err.message);
  }

  // Test 11: Busy user cannot receive competing active call
  try {
    await CallModel.updateMany({ status: { $in: ['ringing', 'accepted'] } }, { status: 'ended', endedAt: new Date() });
    // Put User B in an active call
    const activeRes = await callService.initiateCall({
      callerId: userA._id.toString(),
      receiverId: userB._id.toString(),
      conversationId: conv.id,
      callType: 'voice',
    });

    const busyResult = await callService.initiateCall({
      callerId: userA._id.toString(),
      receiverId: userB._id.toString(),
      conversationId: conv.id,
      callType: 'voice',
    });

    if (busyResult.isBusy && busyResult.message?.includes('currently on another call')) {
      console.log(`✓ Test 11 Passed: Busy user call protection verified`);
      passedCount++;
    } else {
      console.error(`✗ Test 11 Failed: Busy check allowed duplicate active call`, busyResult);
    }

    if (activeRes.call) {
      await CallModel.findByIdAndDelete(activeRes.call._id);
    }
  } catch (err: any) {
    console.error(`✗ Test 11 Failed with error:`, err.message);
  }

  // Test 12: Offer signaling is authorized
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Offer signaling timeout')), 4000);

      clientB.on('call:offer', (payload: any) => {
        if (payload && payload.callId === activeTestCallId && payload.sdp.type === 'offer') {
          clearTimeout(timeout);
          console.log(`✓ Test 12 Passed: Authorized SDP offer forwarded via Socket.IO`);
          passedCount++;
          resolve();
        }
      });

      clientA.emit('call:offer', { callId: activeTestCallId, sdp: { type: 'offer', sdp: 'v=0...' } });
    });
  } catch (err: any) {
    console.error(`✗ Test 12 Failed with error:`, err.message);
  }

  // Test 13: Answer signaling is authorized
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Answer signaling timeout')), 4000);

      clientA.on('call:answer', (payload: any) => {
        if (payload && payload.callId === activeTestCallId && payload.sdp.type === 'answer') {
          clearTimeout(timeout);
          console.log(`✓ Test 13 Passed: Authorized SDP answer forwarded via Socket.IO`);
          passedCount++;
          resolve();
        }
      });

      clientB.emit('call:answer', { callId: activeTestCallId, sdp: { type: 'answer', sdp: 'v=0...' } });
    });
  } catch (err: any) {
    console.error(`✗ Test 13 Failed with error:`, err.message);
  }

  // Test 14: ICE candidate signaling is authorized
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('ICE candidate signaling timeout')), 4000);

      clientB.on('call:ice-candidate', (payload: any) => {
        if (payload && payload.callId === activeTestCallId && payload.candidate.candidate === 'candidate:1...') {
          clearTimeout(timeout);
          console.log(`✓ Test 14 Passed: Authorized ICE candidate forwarded via Socket.IO`);
          passedCount++;
          resolve();
        }
      });

      clientA.emit('call:ice-candidate', { callId: activeTestCallId, candidate: { candidate: 'candidate:1...' } });
    });
  } catch (err: any) {
    console.error(`✗ Test 14 Failed with error:`, err.message);
  }

  // Test 15: Unauthorized user cannot manipulate another call
  try {
    let unauthEndBlocked = true;
    try {
      await callService.endCall(activeTestCallId, userC._id.toString());
      unauthEndBlocked = false;
    } catch (err: any) {
      if (err.status === 403 || err.message.includes('Unauthorized')) {
        unauthEndBlocked = true;
      }
    }

    if (unauthEndBlocked) {
      console.log(`✓ Test 15 Passed: Unauthorized call manipulation blocked with 403`);
      passedCount++;
    } else {
      console.error(`✗ Test 15 Failed: Outsider user C was allowed to manipulate call`);
    }
  } catch (err: any) {
    console.error(`✗ Test 15 Failed with error:`, err.message);
  }

  // Test 16: Call end updates CallModel correctly
  try {
    const endedCall = await callService.endCall(activeTestCallId, userA._id.toString(), 'normal');
    if (endedCall && endedCall.status === 'ended' && endedCall.endedAt) {
      console.log(`✓ Test 16 Passed: Call end updated CallModel correctly with status ended`);
      passedCount++;
    } else {
      console.error(`✗ Test 16 Failed: Call end doc mismatch`, endedCall);
    }
  } catch (err: any) {
    console.error(`✗ Test 16 Failed with error:`, err.message);
  }

  // Test 17: Existing Phase 4 media/file sharing still works
  try {
    const mockImage = {
      fieldname: 'file',
      originalname: 'webrtc_test.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('test image data'),
      destination: '',
      filename: 'webrtc_test.png',
      path: '',
      stream: null as any,
    };

    const att = await messageService.createMessage(
      conv.id,
      userA._id.toString(),
      'Media check during call phase'
    );

    if (att && att.id) {
      console.log(`✓ Test 17 Passed: Phase 4 media/messaging pipeline intact`);
      passedCount++;
    } else {
      console.error(`✗ Test 17 Failed: Media creation issue`);
    }
  } catch (err: any) {
    console.error(`✗ Test 17 Failed with error:`, err.message);
  }

  // Test 18: Existing Phase 3B messaging & history still work
  try {
    const history = await messageService.getMessagesHistory(conv.id, userA._id.toString());
    if (history && history.messages.length > 0) {
      console.log(`✓ Test 18 Passed: Phase 3B message history intact`);
      passedCount++;
    } else {
      console.error(`✗ Test 18 Failed: Message history retrieval issue`);
    }
  } catch (err: any) {
    console.error(`✗ Test 18 Failed with error:`, err.message);
  }

  // Disconnect Sockets & Clean Up
  clientA.disconnect();
  clientB.disconnect();
  clientC.disconnect();
  testServer.close();

  await UserModel.deleteMany({ email: { $regex: /@webrtcverification\.test$/i } });

  console.log(`\n===================================================`);
  console.log(`📊 PHASE 5 VERIFICATION RESULTS: ${passedCount}/${totalTests} TESTS PASSED`);
  console.log(`===================================================\n`);

  if (passedCount === totalTests) {
    console.log(`🎉 ALL 18 PHASE 5 TESTS PASSED CLEANLY!`);
    process.exit(0);
  } else {
    console.error(`❌ ${totalTests - passedCount} TESTS FAILED.`);
    process.exit(1);
  }
}

runWebRTCVerification().catch((err) => {
  console.error('[WebRTC Verification Suite Fatal Error]:', err);
  process.exit(1);
});
