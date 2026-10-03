import mongoose from 'mongoose';
import ioClient, { type Socket } from 'socket.io-client';
import { connectDB } from '../config/db.js';
import { UserModel } from '../models/UserModel.js';
import { SessionModel } from '../models/SessionModel.js';
import { conversationService } from '../services/conversationService.js';
import { messageService } from '../services/messageService.js';
import { generateAccessToken } from '../utils/token.js';
import { hashPassword } from '../utils/password.js';
import { createSession } from '../services/sessionService.js';

async function runSocketChatVerification() {
  console.log('[Phase 3A Verification] Starting Real-Time Chat & Socket.IO Tests...');
  await connectDB();

  try {
    // 1. Setup Test Users
    await UserModel.deleteMany({ email: { $in: ['chat_user_a@test.com', 'chat_user_b@test.com', 'chat_user_blocked@test.com'] } });
    const passwordHash = await hashPassword('TestPass123!');

    const userA = await UserModel.create({
      name: 'User A Chat',
      username: 'user_a_chat',
      email: 'chat_user_a@test.com',
      passwordHash,
      emailVerified: true,
      isActive: true,
    });

    const userB = await UserModel.create({
      name: 'User B Chat',
      username: 'user_b_chat',
      email: 'chat_user_b@test.com',
      passwordHash,
      emailVerified: true,
      isActive: true,
    });

    const userBlocked = await UserModel.create({
      name: 'User Blocked',
      username: 'user_blocked_chat',
      email: 'chat_user_blocked@test.com',
      passwordHash,
      emailVerified: true,
      isActive: true,
      blockedUsers: [userA._id],
    });

    // 2. Setup Sessions & Tokens
    const sessionResA = await createSession({ userId: userA._id, ipAddress: '127.0.0.1' });
    const sessionResB = await createSession({ userId: userB._id, ipAddress: '127.0.0.1' });

    const tokenA = sessionResA.accessToken;
    const tokenB = sessionResB.accessToken;

    console.log('  ✓ Test 1 Passed: Setup test users & active sessions.');

    // 3. Test Direct Conversation Creation & Reuse
    const conv1 = await conversationService.getOrCreateDirectConversation(userA._id.toString(), userB._id.toString());
    if (!conv1 || !conv1.id || conv1.type !== 'direct') {
      throw new Error('Test 2 Failed: Direct conversation creation failed.');
    }

    const conv2 = await conversationService.getOrCreateDirectConversation(userA._id.toString(), userB._id.toString());
    if (conv1.id !== conv2.id) {
      throw new Error('Test 2 Failed: Existing direct conversation was not reused.');
    }
    console.log('  ✓ Test 2 Passed: Direct conversation created and reused correctly.');

    // 4. Test Blocking Enforcement
    try {
      await conversationService.getOrCreateDirectConversation(userA._id.toString(), userBlocked._id.toString());
      throw new Error('Test 3 Failed: Conversation creation between blocked users was not rejected.');
    } catch (err: any) {
      if (!err.message.includes('blocking')) {
        throw err;
      }
    }
    console.log('  ✓ Test 3 Passed: Blocking enforcement prevented conversation creation.');

    // 5. Test Message Creation & Validation
    const msg1 = await messageService.createMessage(conv1.id, userA._id.toString(), 'Hello User B!');
    if (!msg1 || msg1.content !== 'Hello User B!' || msg1.status !== 'sent') {
      throw new Error('Test 4 Failed: Message creation failed.');
    }

    try {
      await messageService.createMessage(conv1.id, userA._id.toString(), '   ');
      throw new Error('Test 4 Failed: Empty message was not rejected.');
    } catch (err: any) {
      if (!err.message.includes('required')) throw err;
    }
    console.log('  ✓ Test 4 Passed: Message creation and content validation verified.');

    // 6. Test Message History Pagination
    const history = await messageService.getMessagesHistory(conv1.id, userA._id.toString(), 10);
    if (history.messages.length !== 1 || history.messages[0].content !== 'Hello User B!') {
      throw new Error('Test 5 Failed: Message history retrieval failed.');
    }
    console.log('  ✓ Test 5 Passed: Message history correctly retrieved from MongoDB.');

    // 7. Test Socket.IO Real-Time Messaging & Status Updates
    const socketA: any = ioClient('http://localhost:5000', {
      auth: { token: tokenA },
      transports: ['websocket'],
    });

    const socketB: any = ioClient('http://localhost:5000', {
      auth: { token: tokenB },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        socketA.on('connect', () => resolve());
        socketA.on('connect_error', (err: any) => reject(err));
      }),
      new Promise<void>((resolve, reject) => {
        socketB.on('connect', () => resolve());
        socketB.on('connect_error', (err: any) => reject(err));
      }),
    ]);

    // User A & B join conversation room
    socketA.emit('conversation:join', { conversationId: conv1.id });
    socketB.emit('conversation:join', { conversationId: conv1.id });

    // User A sends real-time message via socket
    const realTimeMessagePromise = new Promise<any>((resolve) => {
      socketB.on('message:new', (msg: any) => {
        resolve(msg);
      });
    });

    socketA.emit('message:send', { conversationId: conv1.id, content: 'Real-time test message from A' });
    const receivedMsg = await realTimeMessagePromise;

    if (!receivedMsg || receivedMsg.content !== 'Real-time test message from A') {
      throw new Error('Test 6 Failed: Socket.IO message:new event payload invalid.');
    }
    console.log('  ✓ Test 6 Passed: Real-time Socket.IO message broadcast verified.');

    // User B acknowledges delivery and read status
    const deliveryPromise = new Promise<any>((resolve) => {
      socketA.on('message:delivered', (payload: any) => resolve(payload));
    });
    socketB.emit('message:delivered', { messageId: receivedMsg.id, conversationId: conv1.id });
    await deliveryPromise;

    const readPromise = new Promise<any>((resolve) => {
      socketA.on('message:read', (payload: any) => resolve(payload));
    });
    socketB.emit('message:read', { conversationId: conv1.id });
    await readPromise;

    console.log('  ✓ Test 7 Passed: Real-time message delivery & read acknowledgements verified.');

    socketA.disconnect();
    socketB.disconnect();

    // Clean up test users & conversations
    await UserModel.deleteMany({ email: { $in: ['chat_user_a@test.com', 'chat_user_b@test.com', 'chat_user_blocked@test.com'] } });

    console.log('[Phase 3A Test Suite Summary]: All 7/7 Real-Time Socket.IO & Chat Tests Passed Cleanly!');
    process.exit(0);
  } catch (err) {
    console.error('[Phase 3A Verification Failure]:', err);
    process.exit(1);
  }
}

runSocketChatVerification();
