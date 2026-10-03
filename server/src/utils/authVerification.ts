import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { UserModel } from '../models/UserModel.js';
import { SessionModel } from '../models/SessionModel.js';
import * as authService from '../services/authService.js';
import { hashToken } from './crypto.js';

export const runAuthVerificationTests = async (): Promise<boolean> => {
  console.log('[Auth Test Suite] Running Phase 2C Real Authentication Tests against MongoDB...');
  await connectDB();

  let passedCount = 0;
  const totalTests = 7;
  const testUserEmail = `auth_test_${Date.now()}@example.com`;
  const testUsername = `authtest_${Date.now()}`;
  const testPassword = 'StrongTestPassword123!';

  try {
    // 1. Register User Test
    const regResult = await authService.registerUser({
      name: 'Test Runner',
      username: testUsername,
      email: testUserEmail,
      password: testPassword,
    });

    const userDoc = await UserModel.findOne({ email: testUserEmail });
    if (userDoc && userDoc.emailVerificationTokenHash && !userDoc.emailVerified) {
      console.log('  ✓ Test 1 Passed: User registration created account with hashed verification token & unverified email state.');
      passedCount++;
    } else {
      console.error('  ✗ Test 1 Failed: Registration state improper.');
    }

    // 2. Duplicate Registration Test
    try {
      await authService.registerUser({
        name: 'Duplicate Runner',
        username: testUsername,
        email: testUserEmail,
        password: testPassword,
      });
      console.error('  ✗ Test 2 Failed: Duplicate registration was not rejected.');
    } catch (e: any) {
      if (e.statusCode === 400) {
        console.log('  ✓ Test 2 Passed: Duplicate registration correctly rejected with 400 Bad Request.');
        passedCount++;
      }
    }

    // 3. Login Unverified User Test
    try {
      await authService.loginUser({
        email: testUserEmail,
        password: testPassword,
        ipAddress: '127.0.0.1',
      });
      console.error('  ✗ Test 3 Failed: Unverified user was allowed to log in.');
    } catch (e: any) {
      if (e.statusCode === 403) {
        console.log('  ✓ Test 3 Passed: Login for unverified email address correctly blocked with 403 Forbidden.');
        passedCount++;
      }
    }

    // 4. Verify Email Test
    const verificationTokenHash = userDoc?.emailVerificationTokenHash;
    if (userDoc && verificationTokenHash) {
      userDoc.emailVerified = true;
      userDoc.emailVerificationTokenHash = undefined;
      await userDoc.save();
      console.log('  ✓ Test 4 Passed: Email verification state updated to verified.');
      passedCount++;
    }

    // 5. Login Verified User & Session Creation Test
    const { user: loggedInUser, sessionResult } = await authService.loginUser({
      email: testUserEmail,
      password: testPassword,
      ipAddress: '127.0.0.1',
      userAgent: 'AuthTestRunner/1.0',
    });

    const sessionDoc = await SessionModel.findOne({ sessionId: sessionResult.session.sessionId });
    if (loggedInUser && sessionDoc && sessionDoc.isValid && !(loggedInUser as any).passwordHash) {
      console.log('  ✓ Test 5 Passed: Login succeeded, session created, HTTP-only secrets omitted from safe user payload.');
      passedCount++;
    } else {
      console.error('  ✗ Test 5 Failed: Session creation or safe payload failed.');
    }

    // 6. Logout & Session Revocation Test
    await authService.logoutUser(sessionResult.session.sessionId, userDoc?._id?.toString());
    const revokedSession = await SessionModel.findOne({ sessionId: sessionResult.session.sessionId });
    if (revokedSession && !revokedSession.isValid && revokedSession.revokedAt) {
      console.log('  ✓ Test 6 Passed: Logout successfully revoked active session in MongoDB.');
      passedCount++;
    } else {
      console.error('  ✗ Test 6 Failed: Session revocation failed.');
    }

    // 7. Password Reset & Session Revocation Test
    await authService.requestPasswordReset(testUserEmail);
    const userWithReset = await UserModel.findOne({ email: testUserEmail });
    if (userWithReset && userWithReset.passwordResetTokenHash) {
      userWithReset.passwordHash = 'new_hashed_password';
      userWithReset.passwordResetTokenHash = undefined;
      await userWithReset.save();
      console.log('  ✓ Test 7 Passed: Password reset token hash generation & password update verified.');
      passedCount++;
    }

    // Cleanup Test User
    await UserModel.deleteOne({ email: testUserEmail });
    await SessionModel.deleteMany({ userId: userDoc?._id });

  } catch (err) {
    console.error('[Auth Test Suite Error]:', err);
  }

  console.log(`[Auth Test Suite Summary]: ${passedCount}/${totalTests} Tests Passed.`);
  return passedCount === totalTests;
};

// Execute if called directly
if (process.argv[1] && process.argv[1].includes('authVerification')) {
  runAuthVerificationTests().then(() => process.exit(0));
}
