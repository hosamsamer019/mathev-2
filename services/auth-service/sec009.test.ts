import { forgotPassword, resetPassword, logout } from './src/controllers/auth.controller';
import { setPasswordResetToken, getPasswordResetEmail, deletePasswordResetToken, blocklistToken, isTokenBlocklisted } from '@shared/utils';

async function runSec009Tests() {
  console.log('--- START SEC-009 AUTH & SESSION REGRESSION TESTS ---');
  let passed = 0;
  let failed = 0;

  process.env.JWT_SECRET = 'test-sec009-jwt-secret-1234567890';
  process.env.REFRESH_TOKEN_SECRET = 'test-sec009-refresh-secret-1234567890';

  // Test 1: Redis / Shared Password Reset Token Store lifecycle
  {
    const tokenHash = 'mock-sha256-token-hash-12345';
    const email = 'user-reset-test@example.com';

    await setPasswordResetToken(tokenHash, email, 3600);
    const retrievedEmail = await getPasswordResetEmail(tokenHash);

    if (retrievedEmail === email) {
      console.log('✅ Test 1A Passed: Reset token correctly stored and retrieved.');
      passed++;
    } else {
      console.error('❌ Test 1A Failed: Expected email match, got', retrievedEmail);
      failed++;
    }

    // Single use invalidation
    await deletePasswordResetToken(tokenHash);
    const afterDelete = await getPasswordResetEmail(tokenHash);

    if (afterDelete === null) {
      console.log('✅ Test 1B Passed: Reset token deleted after consumption.');
      passed++;
    } else {
      console.error('❌ Test 1B Failed: Token was not deleted after consumption.');
      failed++;
    }
  }

  // Test 2: Token Blocklisting on Logout
  {
    const testJti = 'mock-jti-session-uuid-999';
    await blocklistToken(testJti, 3600);
    const isRevoked = await isTokenBlocklisted(testJti);

    if (isRevoked === true) {
      console.log('✅ Test 2 Passed: Token JTI successfully blocklisted.');
      passed++;
    } else {
      console.error('❌ Test 2 Failed: Token JTI was not found in blocklist.');
      failed++;
    }
  }

  console.log(`--- SEC-009 RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runSec009Tests().catch(err => {
  console.error('Fatal error in SEC-009 test:', err);
  process.exit(1);
});
