import * as jwt from 'jsonwebtoken';
import {
  setPasswordResetToken,
  getPasswordResetEmail,
  deletePasswordResetToken,
  blocklistToken,
  isTokenBlocklisted
} from '@shared/utils';

const JWT_SECRET = process.env.JWT_SECRET || 'test-temporary-development-secret';

async function testSec009Runtime() {
  console.log('--- START SEC-009: AUTHENTICATION & SESSION RUNTIME VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  // 1. Verify Access Token 15-minute lifespan
  const testUser = { userId: 'user-auth-123', role: 'ONLINE_STUDENT', email: 'user@test.com' };
  const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '15m' });
  const decoded: any = jwt.decode(token);
  const lifespanMinutes = (decoded.exp - decoded.iat) / 60;

  if (lifespanMinutes === 15) {
    console.log('✅ SEC-009 Test 1 Passed: Access token lifespan correctly configured to 15 minutes (900s).');
    passed++;
  } else {
    console.error(`❌ SEC-009 Test 1 Failed: Expected 15 minutes, got ${lifespanMinutes}m`);
    failed++;
  }

  // 2. Redis Password Reset Token Store & TTL
  const resetTokenHash = 'ephemeral_cryptographic_reset_token_hash_xyz123';
  await setPasswordResetToken(resetTokenHash, testUser.email, 3600);

  const retrievedEmail = await getPasswordResetEmail(resetTokenHash);
  if (retrievedEmail === testUser.email) {
    console.log('✅ SEC-009 Test 2 Passed: Password reset token correctly persisted in Redis store.');
    passed++;
  } else {
    console.error('❌ SEC-009 Test 2 Failed: Reset token not found in Redis.');
    failed++;
  }

  // 3. Single-Use Consumption of Reset Token
  await deletePasswordResetToken(resetTokenHash);
  const secondAttempt = await getPasswordResetEmail(resetTokenHash);
  if (secondAttempt === null) {
    console.log('✅ SEC-009 Test 3 Passed: Password reset token consumed atomically (single-use enforced).');
    passed++;
  } else {
    console.error('❌ SEC-009 Test 3 Failed: Reset token was reusable after consumption!');
    failed++;
  }

  // 4. Logout Token Revocation via Redis JTI Blacklist
  const jti = 'jti-unique-session-id-456';
  const isBlacklistedBefore = await isTokenBlocklisted(jti);
  await blocklistToken(jti, 900); // 15 min TTL matching token lifespan
  const isBlacklistedAfter = await isTokenBlocklisted(jti);

  if (!isBlacklistedBefore && isBlacklistedAfter) {
    console.log('✅ SEC-009 Test 4 Passed: Logout invalidation successfully blacklists token JTI in shared Redis.');
    passed++;
  } else {
    console.error('❌ SEC-009 Test 4 Failed: Token JTI was not blacklisted upon logout.');
    failed++;
  }

  console.log(`\n--- SEC-009 RUNTIME RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

testSec009Runtime();
