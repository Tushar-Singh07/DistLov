import mongoose from 'mongoose';
import ioClient from 'socket.io-client';
import path from 'path';
import fs from 'fs';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { UserModel } from '../models/UserModel.js';
import { ConversationModel } from '../models/ConversationModel.js';
import { AttachmentModel } from '../models/AttachmentModel.js';
import { MessageModel } from '../models/MessageModel.js';
import { conversationService } from '../services/conversationService.js';
import { messageService } from '../services/messageService.js';
import { attachmentService } from '../services/attachmentService.js';
import express from 'express';
import http from 'http';
import { initSocketIO } from '../sockets/socketManager.js';
import { createSession } from '../services/sessionService.js';

async function runMediaSharingVerification() {
  console.log(`\n===================================================`);
  console.log(`🧪 STARTING SECURECONNECT PHASE 4 VERIFICATION SUITE`);
  console.log(`===================================================\n`);

  await connectDB();

  // Clean test users
  await UserModel.deleteMany({ email: { $regex: /@mediaverification\.test$/i } });

  // 1. Seed Test Users
  const userA = await UserModel.create({
    name: 'Media User A',
    username: 'media_usera',
    email: 'usera@mediaverification.test',
    passwordHash: 'hash123',
    isEmailVerified: true,
  });

  const userB = await UserModel.create({
    name: 'Media User B',
    username: 'media_userb',
    email: 'userb@mediaverification.test',
    passwordHash: 'hash123',
    isEmailVerified: true,
  });

  const userC = await UserModel.create({
    name: 'Media User C (Outsider)',
    username: 'media_userc',
    email: 'userc@mediaverification.test',
    passwordHash: 'hash123',
    isEmailVerified: true,
  });

  // Create Direct Conversation between A and B
  const conv = await conversationService.getOrCreateDirectConversation(userA._id.toString(), userB._id.toString());

  console.log(`[Setup]: Created test users & conversation ID: ${conv.id}`);

  let passedCount = 0;
  let totalTests = 16;

  // Helper for mock Multer File
  const createMockFile = (originalname: string, mimetype: string, sizeBytes: number, bufferContent: string = 'test data'): Express.Multer.File => {
    const buf = Buffer.alloc(sizeBytes, bufferContent);
    return {
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype,
      size: sizeBytes,
      buffer: buf,
      destination: '',
      filename: originalname,
      path: '',
      stream: null as any,
    };
  };

  let imageAttachmentId = '';
  let docAttachmentId = '';

  // Test 1: Authenticated user can upload a valid image
  try {
    const mockImage = createMockFile('sample_photo.png', 'image/png', 50 * 1024, 'image payload');
    const att = await attachmentService.uploadAttachment({
      uploaderId: userA._id.toString(),
      conversationId: conv.id,
      file: mockImage,
    });

    if (att && att.id && att.mimeType === 'image/png' && att.fileUrl.includes(att.id)) {
      imageAttachmentId = att.id;
      console.log(`✓ Test 1 Passed: Authenticated user uploaded valid image (${att.originalName})`);
      passedCount++;
    } else {
      console.error(`✗ Test 1 Failed: Invalid attachment response`, att);
    }
  } catch (err: any) {
    console.error(`✗ Test 1 Failed with error:`, err.message);
  }

  // Test 2: Authenticated user can upload a valid document
  try {
    const mockDoc = createMockFile('document_spec.pdf', 'application/pdf', 120 * 1024, 'pdf document payload');
    const att = await attachmentService.uploadAttachment({
      uploaderId: userA._id.toString(),
      conversationId: conv.id,
      file: mockDoc,
    });

    if (att && att.id && att.mimeType === 'application/pdf') {
      docAttachmentId = att.id;
      console.log(`✓ Test 2 Passed: Authenticated user uploaded valid document (${att.originalName})`);
      passedCount++;
    } else {
      console.error(`✗ Test 2 Failed: Invalid attachment response`, att);
    }
  } catch (err: any) {
    console.error(`✗ Test 2 Failed with error:`, err.message);
  }

  // Test 3: Authenticated user can upload a valid video/audio file within limits
  try {
    const mockAudio = createMockFile('voice_note.mp3', 'audio/mpeg', 200 * 1024, 'mp3 audio payload');
    const att = await attachmentService.uploadAttachment({
      uploaderId: userA._id.toString(),
      conversationId: conv.id,
      file: mockAudio,
    });

    if (att && att.id && att.mimeType === 'audio/mpeg') {
      console.log(`✓ Test 3 Passed: Authenticated user uploaded valid audio file (${att.originalName})`);
      passedCount++;
    } else {
      console.error(`✗ Test 3 Failed: Invalid audio response`, att);
    }
  } catch (err: any) {
    console.error(`✗ Test 3 Failed with error:`, err.message);
  }

  // Test 4: Unauthenticated upload is rejected
  try {
    let unauthRejected = false;
    try {
      const mockImage = createMockFile('test.jpg', 'image/jpeg', 1024);
      await attachmentService.uploadAttachment({
        uploaderId: '', // Empty ID
        conversationId: conv.id,
        file: mockImage,
      });
    } catch (err: any) {
      unauthRejected = true;
    }

    if (unauthRejected) {
      console.log(`✓ Test 4 Passed: Unauthenticated upload rejected as expected`);
      passedCount++;
    } else {
      console.error(`✗ Test 4 Failed: Unauthenticated upload was not rejected`);
    }
  } catch (err: any) {
    console.error(`✗ Test 4 Failed with error:`, err.message);
  }

  // Test 5: Non-member cannot upload to another conversation
  try {
    let nonMemberRejected = false;
    try {
      const mockImage = createMockFile('secret.png', 'image/png', 1024);
      await attachmentService.uploadAttachment({
        uploaderId: userC._id.toString(), // User C is not in conversation A-B
        conversationId: conv.id,
        file: mockImage,
      });
    } catch (err: any) {
      if (err.status === 403 || err.message.includes('not a participant')) {
        nonMemberRejected = true;
      }
    }

    if (nonMemberRejected) {
      console.log(`✓ Test 5 Passed: Non-member upload blocked with 403 Forbidden`);
      passedCount++;
    } else {
      console.error(`✗ Test 5 Failed: Non-member upload was allowed`);
    }
  } catch (err: any) {
    console.error(`✗ Test 5 Failed with error:`, err.message);
  }

  // Test 6: Non-member cannot download another conversation's attachment
  try {
    let downloadBlocked = false;
    try {
      await attachmentService.getAttachmentForUser(imageAttachmentId, userC._id.toString());
    } catch (err: any) {
      if (err.status === 403 || err.message.includes('Unauthorized')) {
        downloadBlocked = true;
      }
    }

    if (downloadBlocked) {
      console.log(`✓ Test 6 Passed: Non-member download blocked with 403 Forbidden`);
      passedCount++;
    } else {
      console.error(`✗ Test 6 Failed: Non-member download was not blocked`);
    }
  } catch (err: any) {
    console.error(`✗ Test 6 Failed with error:`, err.message);
  }

  // Test 7: Oversized file is rejected
  try {
    let oversizedRejected = false;
    try {
      // 15 MB image (exceeds default MAX_IMAGE_SIZE_MB=10)
      const hugeImage = createMockFile('big_photo.png', 'image/png', 15 * 1024 * 1024, 'big data');
      await attachmentService.uploadAttachment({
        uploaderId: userA._id.toString(),
        conversationId: conv.id,
        file: hugeImage,
      });
    } catch (err: any) {
      if (err.status === 400 || err.message.includes('exceeds limit')) {
        oversizedRejected = true;
      }
    }

    if (oversizedRejected) {
      console.log(`✓ Test 7 Passed: Oversized file rejected with 400 Bad Request`);
      passedCount++;
    } else {
      console.error(`✗ Test 7 Failed: Oversized file was accepted`);
    }
  } catch (err: any) {
    console.error(`✗ Test 7 Failed with error:`, err.message);
  }

  // Test 8: Unsupported MIME type/extension is rejected
  try {
    let executableRejected = false;
    try {
      const mockExe = createMockFile('malware.exe', 'application/x-msdownload', 5 * 1024, 'mz payload');
      await attachmentService.uploadAttachment({
        uploaderId: userA._id.toString(),
        conversationId: conv.id,
        file: mockExe,
      });
    } catch (err: any) {
      if (err.status === 400 || err.message.includes('not allowed for security')) {
        executableRejected = true;
      }
    }

    if (executableRejected) {
      console.log(`✓ Test 8 Passed: Executable file type rejected for security`);
      passedCount++;
    } else {
      console.error(`✗ Test 8 Failed: Dangerous executable was allowed`);
    }
  } catch (err: any) {
    console.error(`✗ Test 8 Failed with error:`, err.message);
  }

  // Test 9: Path traversal filename is safely handled/sanitized
  try {
    const traversalFile = createMockFile('../../etc/passwd.png', 'image/png', 10 * 1024, 'path test');
    const att = await attachmentService.uploadAttachment({
      uploaderId: userA._id.toString(),
      conversationId: conv.id,
      file: traversalFile,
    });

    if (att && !att.originalName.includes('..') && !att.storedFileName.includes('..')) {
      console.log(`✓ Test 9 Passed: Path traversal filename safely sanitized (${att.originalName})`);
      passedCount++;
    } else {
      console.error(`✗ Test 9 Failed: Path traversal unsafe filename`, att);
    }
  } catch (err: any) {
    console.error(`✗ Test 9 Failed with error:`, err.message);
  }

  // Test 10: Attachment metadata is correctly stored in MongoDB
  try {
    const mongoDoc = await AttachmentModel.findById(imageAttachmentId);
    if (
      mongoDoc &&
      mongoDoc.conversationId.toString() === conv.id &&
      mongoDoc.uploaderId.toString() === userA._id.toString() &&
      mongoDoc.checksum &&
      mongoDoc.fileUrl.includes(imageAttachmentId)
    ) {
      console.log(`✓ Test 10 Passed: Attachment metadata correctly stored in MongoDB (SHA-256: ${mongoDoc.checksum.substring(0, 10)}...)`);
      passedCount++;
    } else {
      console.error(`✗ Test 10 Failed: MongoDB record mismatch`, mongoDoc);
    }
  } catch (err: any) {
    console.error(`✗ Test 10 Failed with error:`, err.message);
  }

  // Test 11: Attachment message is correctly created
  try {
    const message = await messageService.createMessage(
      conv.id,
      userA._id.toString(),
      'Check out this image!',
      undefined,
      [imageAttachmentId]
    );

    if (
      message &&
      message.messageType === 'image' &&
      message.attachments &&
      message.attachments.length === 1 &&
      message.attachments[0].id === imageAttachmentId
    ) {
      console.log(`✓ Test 11 Passed: Attachment message created with type '${message.messageType}'`);
      passedCount++;
    } else {
      console.error(`✗ Test 11 Failed: Message creation issue`, message);
    }
  } catch (err: any) {
    console.error(`✗ Test 11 Failed with error:`, err.message);
  }

  // Test 12: Recipient receives attachment message through Socket.IO
  try {
    const testApp = express();
    const testServer = http.createServer(testApp);
    initSocketIO(testServer);
    await new Promise<void>((res) => testServer.listen(5099, res));

    const { accessToken: tokenA } = await createSession({
      userId: userA._id as any,
      ipAddress: '127.0.0.1',
      userAgent: 'Verification Agent A',
    });

    const { accessToken: tokenB } = await createSession({
      userId: userB._id as any,
      ipAddress: '127.0.0.1',
      userAgent: 'Verification Agent B',
    });

    const clientSocketA = ioClient('http://localhost:5099', {
      auth: { token: tokenA },
      transports: ['websocket'],
      reconnection: false,
    });

    const clientSocketB = ioClient('http://localhost:5099', {
      auth: { token: tokenB },
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clientSocketA.disconnect();
        clientSocketB.disconnect();
        testServer.close();
        reject(new Error('Socket connection timeout'));
      }, 5000);

      clientSocketB.on('connect', () => {
        clientSocketB.emit('conversation:join', { conversationId: conv.id });

        clientSocketB.on('message:new', (receivedMsg: any) => {
          if (receivedMsg && receivedMsg.attachments && receivedMsg.attachments.length > 0) {
            clearTimeout(timeout);
            clientSocketA.disconnect();
            clientSocketB.disconnect();
            testServer.close();
            console.log(`✓ Test 12 Passed: Recipient received attachment message in real-time via Socket.IO`);
            passedCount++;
            resolve();
          }
        });

        // Trigger message emission from User A via Socket.IO
        setTimeout(() => {
          clientSocketA.emit('attachment:send', {
            conversationId: conv.id,
            content: 'Realtime attachment test via socket',
            attachmentIds: [docAttachmentId],
          });
        }, 300);
      });

      clientSocketB.on('connect_error', (err: any) => {
        clearTimeout(timeout);
        clientSocketA.disconnect();
        clientSocketB.disconnect();
        testServer.close();
        reject(err);
      });
    });
  } catch (err: any) {
    console.error(`✗ Test 12 Failed with error:`, err.message);
  }

  // Test 13: Image preview/download works for authorized participant
  try {
    const fileResult = await attachmentService.getAttachmentForUser(imageAttachmentId, userB._id.toString());
    if (fileResult && fileResult.filePath && fs.existsSync(fileResult.filePath)) {
      console.log(`✓ Test 13 Passed: Authorized member (User B) retrieved image preview/download path`);
      passedCount++;
    } else {
      console.error(`✗ Test 13 Failed: Could not get attachment for user B`);
    }
  } catch (err: any) {
    console.error(`✗ Test 13 Failed with error:`, err.message);
  }

  // Test 14: Document/file download works for authorized participant
  try {
    const fileResult = await attachmentService.getAttachmentForUser(docAttachmentId, userA._id.toString());
    if (fileResult && fileResult.filePath && fs.existsSync(fileResult.filePath)) {
      console.log(`✓ Test 14 Passed: Document download retrieved successfully for User A`);
      passedCount++;
    } else {
      console.error(`✗ Test 14 Failed: Document download issue`);
    }
  } catch (err: any) {
    console.error(`✗ Test 14 Failed with error:`, err.message);
  }

  // Test 15: Existing Phase 3B messaging still works
  try {
    const textMsg = await messageService.createMessage(conv.id, userA._id.toString(), 'Standard text message test');
    const history = await messageService.getMessagesHistory(conv.id, userA._id.toString());

    if (textMsg && history.messages.some(m => m.id === textMsg.id)) {
      console.log(`✓ Test 15 Passed: Standard Phase 3B text messaging & history intact`);
      passedCount++;
    } else {
      console.error(`✗ Test 15 Failed: Text message not found in history`);
    }
  } catch (err: any) {
    console.error(`✗ Test 15 Failed with error:`, err.message);
  }

  // Test 16: Existing edit/delete/reaction functionality still works
  try {
    const msg = await messageService.createMessage(conv.id, userA._id.toString(), 'Original message for edit/reaction test');
    const edited = await messageService.editMessage(msg.id, userA._id.toString(), 'Edited message content');
    const reacted = await messageService.addReaction(edited.id, userB._id.toString(), '👍');
    const deleted = await messageService.deleteMessage(reacted.id, userA._id.toString());

    if (edited.isEdited && reacted.reactions.length === 1 && deleted.isDeleted) {
      console.log(`✓ Test 16 Passed: Message edit, reaction, and deletion features work cleanly`);
      passedCount++;
    } else {
      console.error(`✗ Test 16 Failed: Feature verification mismatch`, { edited, reacted, deleted });
    }
  } catch (err: any) {
    console.error(`✗ Test 16 Failed with error:`, err.message);
  }

  // Clean test data
  await UserModel.deleteMany({ email: { $regex: /@mediaverification\.test$/i } });

  console.log(`\n===================================================`);
  console.log(`📊 PHASE 4 VERIFICATION RESULTS: ${passedCount}/${totalTests} TESTS PASSED`);
  console.log(`===================================================\n`);

  if (passedCount === totalTests) {
    console.log(`🎉 ALL 16 PHASE 4 TESTS PASSED CLEANLY!`);
    process.exit(0);
  } else {
    console.error(`❌ ${totalTests - passedCount} TESTS FAILED.`);
    process.exit(1);
  }
}

runMediaSharingVerification().catch(err => {
  console.error('[Media Verification Suite Fatal Error]:', err);
  process.exit(1);
});
