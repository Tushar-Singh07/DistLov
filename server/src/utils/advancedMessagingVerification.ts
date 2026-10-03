import mongoose from 'mongoose';
import ioClient, { type Socket } from 'socket.io-client';
import { connectDB } from '../config/db.js';
import { UserModel } from '../models/UserModel.js';
import { SessionModel } from '../models/SessionModel.js';
import { conversationService } from '../services/conversationService.js';
import { messageService } from '../services/messageService.js';
import { createSession } from '../services/sessionService.js';
import { hashPassword } from '../utils/password.js';

async function runAdvancedMessagingVerification() {
  console.log('[Phase 3B Verification] Starting Advanced One-to-One Messaging Tests...');
  await connectDB();

  try {
    // 1. Setup Test Users
    await UserModel.deleteMany({ email: { $in: ['adv_a@test.com', 'adv_b@test.com', 'adv_c@test.com'] } });
    const passwordHash = await hashPassword('TestPass123!');

    const userA = await UserModel.create({
      name: 'User A Adv',
      username: 'user_a_adv',
      email: 'adv_a@test.com',
      passwordHash,
      emailVerified: true,
      isActive: true,
    });

    const userB = await UserModel.create({
      name: 'User B Adv',
      username: 'user_b_adv',
      email: 'adv_b@test.com',
      passwordHash,
      emailVerified: true,
      isActive: true,
    });

    const userC = await UserModel.create({
      name: 'User C Adv',
      username: 'user_c_adv',
      email: 'adv_c@test.com',
      passwordHash,
      emailVerified: true,
      isActive: true,
    });

    const sessionResA = await createSession({ userId: userA._id, ipAddress: '127.0.0.1' });
    const sessionResB = await createSession({ userId: userB._id, ipAddress: '127.0.0.1' });
    const sessionResC = await createSession({ userId: userC._id, ipAddress: '127.0.0.1' });

    const tokenA = sessionResA.accessToken;
    const tokenB = sessionResB.accessToken;
    const tokenC = sessionResC.accessToken;

    console.log('  ✓ Test 1 Passed: Setup test users & active sessions.');

    // 2. Setup Direct Conversation
    const conv = await conversationService.getOrCreateDirectConversation(userA._id.toString(), userB._id.toString());
    
    // 3. Test Message Creation & Quoted Reply Reference
    const originalMsg = await messageService.createMessage(conv.id, userA._id.toString(), 'Original message from User A');
    const replyMsg = await messageService.createMessage(conv.id, userB._id.toString(), 'Replying to original', originalMsg.id);

    if (!replyMsg.replyToMessage || replyMsg.replyToMessage.id !== originalMsg.id || replyMsg.replyToMessage.senderName !== 'User A Adv') {
      throw new Error('Test 2 Failed: Reply preview reference invalid.');
    }
    console.log('  ✓ Test 2 Passed: Message creation and quoted reply reference verified.');

    // 4. Test Message Editing & Authorization
    const editedMsg = await messageService.editMessage(originalMsg.id, userA._id.toString(), 'Edited original text');
    if (!editedMsg.isEdited || editedMsg.content !== 'Edited original text') {
      throw new Error('Test 3 Failed: Message edit failed.');
    }

    try {
      await messageService.editMessage(originalMsg.id, userB._id.toString(), 'Hacked edit attempt');
      throw new Error('Test 3 Failed: Unauthorized edit by non-sender was not rejected.');
    } catch (err: any) {
      if (err.status !== 403 && !err.message.includes('original sender')) throw err;
    }
    console.log('  ✓ Test 3 Passed: Message editing & sender authorization verified.');

    // 5. Test Message Reactions
    const reactedMsg = await messageService.addReaction(editedMsg.id, userB._id.toString(), '❤️');
    if (!reactedMsg.reactions.some((r: any) => r.userId === userB._id.toString() && r.emoji === '❤️')) {
      throw new Error('Test 4 Failed: Reaction addition failed.');
    }

    try {
      await messageService.addReaction(editedMsg.id, userB._id.toString(), '💩');
      throw new Error('Test 4 Failed: Unsupported emoji reaction was not rejected.');
    } catch (err: any) {
      if (!err.message.includes('not supported')) throw err;
    }

    const unreactedMsg = await messageService.removeReaction(editedMsg.id, userB._id.toString(), '❤️');
    if (unreactedMsg.reactions.some((r: any) => r.userId === userB._id.toString() && r.emoji === '❤️')) {
      throw new Error('Test 4 Failed: Reaction removal failed.');
    }
    console.log('  ✓ Test 4 Passed: Message reaction add/remove and emoji validation verified.');

    // 6. Test Soft Deletion & Authorization
    const msgToDelete = await messageService.createMessage(conv.id, userA._id.toString(), 'Temporary message to delete');
    const deletedMsg = await messageService.deleteMessage(msgToDelete.id, userA._id.toString());

    if (!deletedMsg.isDeleted || deletedMsg.content !== 'This message was deleted') {
      throw new Error('Test 5 Failed: Message soft deletion failed or content unmasked.');
    }

    try {
      await messageService.deleteMessage(replyMsg.id, userA._id.toString());
      throw new Error('Test 5 Failed: Unauthorized deletion of another user message was not rejected.');
    } catch (err: any) {
      if (err.status !== 403 && !err.message.includes('original sender')) throw err;
    }
    console.log('  ✓ Test 5 Passed: Message soft deletion and content masking verified.');

    // 7. Test Message Search in Conversation
    const searchResults = await messageService.searchMessages(conv.id, userA._id.toString(), 'Edited');
    if (searchResults.length !== 1 || searchResults[0].id !== editedMsg.id) {
      throw new Error('Test 6 Failed: Message search failed.');
    }
    console.log('  ✓ Test 6 Passed: Conversation message search verified.');

    // 8. Test Real-time Socket Typing & Multi-tab Presence
    const socketA1: any = ioClient('http://localhost:5000', { auth: { token: tokenA }, transports: ['websocket', 'polling'] });
    const socketA2: any = ioClient('http://localhost:5000', { auth: { token: tokenA }, transports: ['websocket', 'polling'] });
    const socketB: any = ioClient('http://localhost:5000', { auth: { token: tokenB }, transports: ['websocket', 'polling'] });

    const connectSocket = (s: any) =>
      new Promise<void>((res, rej) => {
        if (s.connected) return res();
        s.on('connect', () => res());
        s.on('connect_error', (err: any) => rej(err));
      });

    await Promise.all([connectSocket(socketA1), connectSocket(socketA2), connectSocket(socketB)]);

    socketA1.on('chat:error', (err: any) => console.error('[Socket A1 Chat Error]:', err));
    socketB.on('chat:error', (err: any) => console.error('[Socket B Chat Error]:', err));

    // Test direct call to getConversationById
    const testConvCheck = await conversationService.getConversationById(conv.id, userA._id.toString());
    console.log('  [Debug getConversationById]: Success! ID =', testConvCheck.id);

    const joinA = new Promise<void>((res, rej) => {
      socketA1.on('conversation:joined', () => res());
      socketA1.on('chat:error', (err: any) => rej(new Error(err.message)));
    });
    const joinB = new Promise<void>((res, rej) => {
      socketB.on('conversation:joined', () => res());
      socketB.on('chat:error', (err: any) => rej(new Error(err.message)));
    });

    socketA1.emit('conversation:join', { conversationId: conv.id });
    socketB.emit('conversation:join', { conversationId: conv.id });

    await Promise.all([joinA, joinB]);

    const typingPromise = new Promise<any>(res => {
      socketB.on('typing:update', (payload: any) => res(payload));
    });
    socketA1.emit('typing:start', { conversationId: conv.id });
    const typingPayload = await typingPromise;

    if (!typingPayload || typingPayload.userId !== userA._id.toString() || !typingPayload.isTyping) {
      throw new Error('Test 7 Failed: Typing indicator socket broadcast failed.');
    }
    console.log('  ✓ Test 7 Passed: Typing indicator real-time socket broadcast verified.');

    // Presence check
    const docAOnline = await UserModel.findById(userA._id);
    console.log('  [Debug Presence 1] docAOnline.isOnline =', docAOnline?.isOnline);
    if (!docAOnline?.isOnline) {
      throw new Error('Test 8 Failed: Multi-tab user should be online.');
    }

    // Disconnect tab 1 (tab 2 still open)
    socketA1.disconnect();
    await new Promise(r => setTimeout(r, 1000));
    const docAStillOnline = await UserModel.findById(userA._id);
    console.log('  [Debug Presence 2] docAStillOnline.isOnline =', docAStillOnline?.isOnline);
    if (!docAStillOnline?.isOnline) {
      throw new Error('Test 8 Failed: User with active second tab was incorrectly marked offline.');
    }

    // Disconnect tab 2 -> user offline
    socketA2.disconnect();
    socketB.disconnect();
    await new Promise(r => setTimeout(r, 1000));

    const docAOffline = await UserModel.findById(userA._id);
    console.log('  [Debug Presence 3] docAOffline.isOnline =', docAOffline?.isOnline);
    if (docAOffline?.isOnline) {
      throw new Error('Test 8 Failed: User with 0 active sockets was not marked offline.');
    }
    console.log('  ✓ Test 8 Passed: Multi-tab socket presence tracking verified.');

    // Clean up test data
    await UserModel.deleteMany({ email: { $in: ['adv_a@test.com', 'adv_b@test.com', 'adv_c@test.com'] } });

    console.log('[Phase 3B Test Suite Summary]: All 8/8 Advanced One-to-One Messaging Tests Passed Cleanly!');
    process.exit(0);
  } catch (err) {
    console.error('[Phase 3B Verification Failure]:', err);
    process.exit(1);
  }
}

runAdvancedMessagingVerification();
