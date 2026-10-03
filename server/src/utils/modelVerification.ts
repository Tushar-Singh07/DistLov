import mongoose from 'mongoose';
import { UserModel } from '../models/UserModel.js';
import { MessageModel } from '../models/MessageModel.js';
import { AttachmentModel } from '../models/AttachmentModel.js';
import { CallModel } from '../models/CallModel.js';
import { connectDB } from '../config/db.js';

export const runModelValidationTests = async (): Promise<boolean> => {
  console.log('[Test Suite] Running Phase 2B Mongoose Model Validation Tests...');
  let passedCount = 0;
  let totalTests = 5;

  // 1. Test User missing/invalid email
  try {
    const invalidUser = new UserModel({
      name: 'Test User',
      username: 'testuser',
      email: 'invalid-email-format',
      passwordHash: 'hashed_pass'
    });
    const err = invalidUser.validateSync();
    if (err && err.errors.email) {
      console.log('  ✓ Test 1 Passed: User invalid email correctly rejected by schema validation.');
      passedCount++;
    } else {
      console.error('  ✗ Test 1 Failed: User invalid email was NOT rejected.');
    }
  } catch (e) {
    console.error('  ✗ Test 1 Error:', e);
  }

  // 2. Test User invalid username format
  try {
    const invalidUsernameUser = new UserModel({
      name: 'Test User',
      username: 'user@invalid!',
      email: 'valid@example.com',
      passwordHash: 'hashed_pass'
    });
    const err = invalidUsernameUser.validateSync();
    if (err && err.errors.username) {
      console.log('  ✓ Test 2 Passed: User invalid username format correctly rejected.');
      passedCount++;
    } else {
      console.error('  ✗ Test 2 Failed: Invalid username was NOT rejected.');
    }
  } catch (e) {
    console.error('  ✗ Test 2 Error:', e);
  }

  // 3. Test Message missing conversationId & invalid messageType
  try {
    const invalidMessage = new MessageModel({
      senderId: new mongoose.Types.ObjectId(),
      messageType: 'unsupported_type_xyz' as any,
    });
    const err = invalidMessage.validateSync();
    if (err && err.errors.conversationId && err.errors.messageType) {
      console.log('  ✓ Test 3 Passed: Message missing conversationId and invalid messageType correctly rejected.');
      passedCount++;
    } else {
      console.error('  ✗ Test 3 Failed: Invalid message was NOT rejected.');
    }
  } catch (e) {
    console.error('  ✗ Test 3 Error:', e);
  }

  // 4. Test Attachment missing required size / metadata
  try {
    const invalidAttachment = new AttachmentModel({
      uploaderId: new mongoose.Types.ObjectId(),
      conversationId: new mongoose.Types.ObjectId(),
      originalName: 'test.png',
      storedFileName: 'stored_test.png',
      mimeType: 'image/png',
      fileSize: 0 // Size must be > 0
    });
    const err = invalidAttachment.validateSync();
    if (err && err.errors.fileSize) {
      console.log('  ✓ Test 4 Passed: Attachment size = 0 correctly rejected by schema validation.');
      passedCount++;
    } else {
      console.error('  ✗ Test 4 Failed: Zero file size attachment was NOT rejected.');
    }
  } catch (e) {
    console.error('  ✗ Test 4 Error:', e);
  }

  // 5. Test Call invalid call status
  try {
    const invalidCall = new CallModel({
      callerId: new mongoose.Types.ObjectId(),
      receiverId: new mongoose.Types.ObjectId(),
      type: 'voice',
      status: 'invalid_status_abc' as any
    });
    const err = invalidCall.validateSync();
    if (err && err.errors.status) {
      console.log('  ✓ Test 5 Passed: Call with invalid status correctly rejected.');
      passedCount++;
    } else {
      console.error('  ✗ Test 5 Failed: Call with invalid status was NOT rejected.');
    }
  } catch (e) {
    console.error('  ✗ Test 5 Error:', e);
  }

  console.log(`[Test Suite] Model Validation Summary: ${passedCount}/${totalTests} Tests Passed.`);
  return passedCount === totalTests;
};

// If run directly via node/tsx
if (process.argv[1] && process.argv[1].includes('modelVerification')) {
  runModelValidationTests().then(() => process.exit(0));
}
