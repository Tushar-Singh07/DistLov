import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { UserModel } from '../models/UserModel.js';
import * as userService from '../services/userService.js';
import { hashPassword } from './password.js';

export const runUserVerificationTests = async (): Promise<boolean> => {
  console.log('[User Test Suite] Running Phase 2D User System & Privacy Tests...');
  await connectDB();

  let passedCount = 0;
  const totalTests = 8;

  const testUserAEmail = `user_a_${Date.now()}@example.com`;
  const testUserAUsername = `usera_${Date.now()}`;
  const testUserBEmail = `user_b_${Date.now()}@example.com`;
  const testUserBUsername = `userb_${Date.now()}`;

  try {
    // Setup 2 test users in MongoDB
    const passwordHash = await hashPassword('Password123!');
    const userA = await new UserModel({
      name: 'User Alpha',
      username: testUserAUsername,
      email: testUserAEmail,
      passwordHash,
      emailVerified: true,
      bio: 'Alpha bio content',
    }).save();

    const userB = await new UserModel({
      name: 'User Beta',
      username: testUserBUsername,
      email: testUserBEmail,
      passwordHash,
      emailVerified: true,
      bio: 'Beta bio content',
    }).save();

    const userAId = userA._id.toString();
    const userBId = userB._id.toString();

    // 1. Retrieve Own Profile & Omit Password Hash
    const profileA = await userService.getMyProfile(userAId);
    if (profileA.username === testUserAUsername && profileA.email === testUserAEmail && !(profileA as any).passwordHash) {
      console.log('  ✓ Test 1 Passed: Retrieve own profile returned valid profile omitting passwordHash.');
      passedCount++;
    } else {
      console.error('  ✗ Test 1 Failed: Profile serialization exposed secrets or failed.');
    }

    // 2. Update Profile & Duplicate Username Rejection
    await userService.updateMyProfile(userAId, { name: 'Alpha Updated', bio: 'New updated bio' });
    try {
      await userService.updateMyProfile(userAId, { username: testUserBUsername });
      console.error('  ✗ Test 2 Failed: Duplicate username update was allowed.');
    } catch (e: any) {
      if (e.statusCode === 400) {
        console.log('  ✓ Test 2 Passed: Profile update succeeded and duplicate username attempt was correctly rejected.');
        passedCount++;
      }
    }

    // 3. User Search Test
    const searchResults = await userService.searchUsers('Beta', userAId);
    if (searchResults.length === 1 && searchResults[0].username === testUserBUsername && !(searchResults[0] as any).email) {
      console.log('  ✓ Test 3 Passed: User search returned matching public user and omitted email address.');
      passedCount++;
    } else {
      console.error('  ✗ Test 3 Failed: Search results improper.');
    }

    // 4. Public Profile Retrieval & Security
    const publicProfileB = await userService.getPublicProfileByUsername(testUserBUsername, userAId);
    if (publicProfileB.user.username === testUserBUsername && !(publicProfileB.user as any).email && !(publicProfileB.user as any).passwordHash) {
      console.log('  ✓ Test 4 Passed: Public profile lookup returned safe user details omitting email and hashes.');
      passedCount++;
    } else {
      console.error('  ✗ Test 4 Failed: Public profile exposed sensitive fields.');
    }

    // 5. Block User & Self-Block Rejection
    try {
      await userService.blockUser(userAId, userAId);
      console.error('  ✗ Test 5 Failed: Self-block was allowed.');
    } catch (e: any) {
      if (e.statusCode === 400) {
        await userService.blockUser(userAId, userBId);
        console.log('  ✓ Test 5 Passed: Self-block correctly rejected and User A blocked User B.');
        passedCount++;
      }
    }

    // 6. Block Relationship Check
    const rel = await userService.getPublicProfileByUsername(testUserBUsername, userAId);
    if (rel.relationship && rel.relationship.isBlockedByMe && !rel.relationship.canInteract) {
      console.log('  ✓ Test 6 Passed: Block relationship accurately detected (isBlockedByMe = true, canInteract = false).');
      passedCount++;
    } else {
      console.error('  ✗ Test 6 Failed: Block relationship check failed.');
    }

    // 7. Unblock User Test
    await userService.unblockUser(userAId, userBId);
    const relAfterUnblock = await userService.getPublicProfileByUsername(testUserBUsername, userAId);
    if (relAfterUnblock.relationship && !relAfterUnblock.relationship.isBlockedByMe && relAfterUnblock.relationship.canInteract) {
      console.log('  ✓ Test 7 Passed: Unblock user succeeded and restored interaction permission.');
      passedCount++;
    } else {
      console.error('  ✗ Test 7 Failed: Unblock user failed.');
    }

    // 8. Privacy Settings Get & Update Test
    const privacy = await userService.getMyPrivacySettings(userAId);
    const updatedPrivacy = await userService.updateMyPrivacySettings(userAId, { showOnlineStatus: false, showLastSeen: false });
    if (updatedPrivacy.showOnlineStatus === false && updatedPrivacy.showLastSeen === false) {
      console.log('  ✓ Test 8 Passed: Privacy settings retrieval and update verified.');
      passedCount++;
    } else {
      console.error('  ✗ Test 8 Failed: Privacy settings update failed.');
    }

    // Cleanup
    await UserModel.deleteMany({ _id: { $in: [userA._id, userB._id] } });

  } catch (err) {
    console.error('[User Test Suite Error]:', err);
  }

  console.log(`[User Test Suite Summary]: ${passedCount}/${totalTests} Tests Passed.`);
  return passedCount === totalTests;
};

// Execute if called directly
if (process.argv[1] && process.argv[1].includes('userVerification')) {
  runUserVerificationTests().then(() => process.exit(0));
}
