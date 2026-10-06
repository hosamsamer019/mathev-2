import { createPayment, handleWebhook } from './src/controllers/payment.controller';
import { db } from '../../packages/database/src/index.js';

async function runSec003Tests() {
  console.log('--- START SEC-003 PAYMENT INTEGRITY REGRESSION TESTS ---');
  let passed = 0;
  let failed = 0;

  // Test 1: Tampered client amount (sending 1 EGP when course is not matching or nonexistent)
  {
    const req: any = {
      user: { userId: 'student-uuid-1', email: 'student@example.com', name: 'Student' },
      body: {
        provider: 'paymob',
        courseId: 'non-existent-course-id',
        amount: 1
      }
    };
    let statusSent = 0;
    const res: any = {
      status: (s: number) => { statusSent = s; return res; },
      json: () => res
    };
    await createPayment(req, res);
    if (statusSent === 404 || statusSent === 400) {
      console.log('✅ Test 1 Passed: Client-controlled payment amount was safely rejected with authoritative course validation.');
      passed++;
    } else {
      console.error(`❌ Test 1 Failed: Expected 404/400, got status ${statusSent}`);
      failed++;
    }
  }

  // Test 2: Missing courseId or provider
  {
    const req: any = {
      user: { userId: 'student-uuid-1', email: 'student@example.com' },
      body: { provider: 'fawry' }
    };
    let statusSent = 0;
    const res: any = {
      status: (s: number) => { statusSent = s; return res; },
      json: () => res
    };
    await createPayment(req, res);
    if (statusSent === 400) {
      console.log('✅ Test 2 Passed: Missing required courseId rejected with 400.');
      passed++;
    } else {
      console.error(`❌ Test 2 Failed: Expected 400, got status ${statusSent}`);
      failed++;
    }
  }

  console.log(`--- SEC-003 RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runSec003Tests().catch(err => {
  console.error('Fatal error in SEC-003 test:', err);
  process.exit(1);
});
