import { generateVideoTicket, verifyVideoTicket } from './src/services/videoToken.service';

async function runVideoSecurityTests() {
  console.log('--- START VIDEO SECURITY & SSRF REGRESSION TESTS ---');
  let passed = 0;
  let failed = 0;

  process.env.JWT_SECRET = 'test-video-jwt-secret-key-1234567890';

  // Test 1: Valid video ticket verification
  {
    const ticket = generateVideoTicket({
      userId: 'student-uuid-1',
      lessonId: 'lesson-uuid-100',
      expiresInSeconds: 60
    });

    const verified = verifyVideoTicket(ticket, 'lesson-uuid-100');
    if (verified && verified.userId === 'student-uuid-1' && verified.lessonId === 'lesson-uuid-100') {
      console.log('✅ Test 1 Passed: Valid scoped video ticket verified.');
      passed++;
    } else {
      console.error('❌ Test 1 Failed: Valid ticket could not be verified.');
      failed++;
    }
  }

  // Test 2: Mismatched lessonId ticket rejection
  {
    const ticket = generateVideoTicket({
      userId: 'student-uuid-1',
      lessonId: 'lesson-uuid-100',
      expiresInSeconds: 60
    });

    const verified = verifyVideoTicket(ticket, 'lesson-uuid-999'); // different lesson
    if (verified === null) {
      console.log('✅ Test 2 Passed: Mismatched lessonId video ticket rejected.');
      passed++;
    } else {
      console.error('❌ Test 2 Failed: Mismatched lessonId ticket was accepted.');
      failed++;
    }
  }

  // Test 3: Tampered ticket rejection
  {
    const ticket = generateVideoTicket({
      userId: 'student-uuid-1',
      lessonId: 'lesson-uuid-100',
      expiresInSeconds: 60
    });

    const tampered = ticket.substring(0, ticket.length - 4) + 'abcd';
    const verified = verifyVideoTicket(tampered, 'lesson-uuid-100');
    if (verified === null) {
      console.log('✅ Test 3 Passed: Tampered video ticket signature rejected.');
      passed++;
    } else {
      console.error('❌ Test 3 Failed: Tampered video ticket was accepted.');
      failed++;
    }
  }

  console.log(`--- VIDEO SECURITY RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runVideoSecurityTests().catch(err => {
  console.error('Fatal error in Video Security test:', err);
  process.exit(1);
});
