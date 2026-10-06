import { updateUser } from './src/controllers/user.controller';
import { db } from '../../packages/database/src/index.js';
import bcrypt from 'bcryptjs';

// Standalone automated regression runner for SEC-011
async function runSec011Tests() {
  console.log('--- START SEC-011 REGRESSION TESTS ---');
  let passed = 0;
  let failed = 0;

  // Test 1: Student attempts to update parentEmail and parentPassword
  {
    const req: any = {
      params: { id: 'student-uuid-1' },
      user: { userId: 'student-uuid-1', role: 'ONLINE_STUDENT', email: 'student@example.com' },
      body: {
        name: 'Student Name',
        parentEmail: 'victim-parent@example.com',
        parentPassword: 'AttackerNewPassword123'
      }
    };
    let statusSent = 0;
    let jsonSent: any = null;
    const res: any = {
      status: (s: number) => { statusSent = s; return res; },
      json: (j: any) => { jsonSent = j; return res; }
    };

    await updateUser(req, res);

    if (statusSent === 403 && jsonSent?.message?.includes('Only administrators')) {
      console.log('✅ Test 1 Passed: Student attempting to supply parent credentials was rejected with 403 Forbidden.');
      passed++;
    } else {
      console.error(`❌ Test 1 Failed: Expected 403 Forbidden, got status ${statusSent}`, jsonSent);
      failed++;
    }
  }

  // Test 2: Student attempts to modify parentId directly
  {
    const req: any = {
      params: { id: 'student-uuid-1' },
      user: { userId: 'student-uuid-1', role: 'ONLINE_STUDENT', email: 'student@example.com' },
      body: {
        parentId: 'a0000000-0000-0000-0000-000000000001'
      }
    };
    let statusSent = 0;
    let jsonSent: any = null;
    const res: any = {
      status: (s: number) => { statusSent = s; return res; },
      json: (j: any) => { jsonSent = j; return res; }
    };

    await updateUser(req, res);

    if (statusSent === 403) {
      console.log('✅ Test 2 Passed: Student attempting to set arbitrary parentId was rejected with 403 Forbidden.');
      passed++;
    } else {
      console.error(`❌ Test 2 Failed: Expected 403 Forbidden, got status ${statusSent}`, jsonSent);
      failed++;
    }
  }

  // Test 3: Student attempts to escalate role
  {
    const req: any = {
      params: { id: 'student-uuid-1' },
      user: { userId: 'student-uuid-1', role: 'ONLINE_STUDENT', email: 'student@example.com' },
      body: {
        role: 'ADMIN'
      }
    };
    let statusSent = 0;
    let jsonSent: any = null;
    const res: any = {
      status: (s: number) => { statusSent = s; return res; },
      json: (j: any) => { jsonSent = j; return res; }
    };

    await updateUser(req, res);

    if (statusSent === 403) {
      console.log('✅ Test 3 Passed: Student attempting role escalation was rejected with 403 Forbidden.');
      passed++;
    } else {
      console.error(`❌ Test 3 Failed: Expected 403 Forbidden, got status ${statusSent}`, jsonSent);
      failed++;
    }
  }

  console.log(`--- SEC-011 RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runSec011Tests().catch(err => {
  console.error('Fatal error running SEC-011 test:', err);
  process.exit(1);
});
