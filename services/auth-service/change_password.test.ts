import { changePassword, changePasswordSchema } from './src/controllers/auth.controller.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../packages/database/src/index.js';
import { blocklistToken, isTokenBlocklisted } from '@shared/utils';

// Mock DB and request/response
async function runChangePasswordTests() {
  console.log('--- START SELF-SERVICE PASSWORD CHANGE TESTS ---');
  let passed = 0;
  let failed = 0;

  process.env.JWT_SECRET = 'test-jwt-secret-4685c8216cff4502';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-8a9f262fa15f';

  const mockAdminId = 'admin-user-uuid-12345';
  const initialPassword = 'InitialTemporaryPassword123!';
  const initialHash = await bcrypt.hash(initialPassword, 10);

  // Store in memory mock
  let currentUserInDb = {
    id: mockAdminId,
    email: 'admin@edu.com',
    role: 'ADMIN',
    password: initialHash
  };

  // Mock db.user methods
  const originalFindUnique = db.user.findUnique;
  const originalUpdate = db.user.update;

  (db.user as any).findUnique = async ({ where }: any) => {
    if (where.id === mockAdminId) return { ...currentUserInDb };
    return null;
  };

  (db.user as any).update = async ({ where, data }: any) => {
    if (where.id === mockAdminId) {
      currentUserInDb = { ...currentUserInDb, ...data };
      return { ...currentUserInDb };
    }
    throw new Error('User not found');
  };

  const createMockRes = () => {
    const res: any = {
      statusCode: 200,
      jsonData: null,
      clearedCookies: [] as string[],
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonData = data;
        return this;
      },
      clearCookie(name: string) {
        this.clearedCookies.push(name);
        return this;
      }
    };
    return res;
  };

  // 1. Unauthenticated request -> 401
  {
    const req: any = { user: null, body: { currentPassword: initialPassword, newPassword: 'NewSecurePassword123!' } };
    const res = createMockRes();
    await changePassword(req, res);
    if (res.statusCode === 401) {
      console.log('✅ Test 1 Passed: Unauthenticated request rejected with 401.');
      passed++;
    } else {
      console.error('❌ Test 1 Failed: Expected 401, got', res.statusCode);
      failed++;
    }
  }

  // 2. Incorrect current password -> 400
  {
    const req: any = {
      user: { userId: mockAdminId, role: 'ADMIN', email: 'admin@edu.com' },
      body: { currentPassword: 'WrongCurrentPassword', newPassword: 'NewSecurePassword123!' }
    };
    const res = createMockRes();
    await changePassword(req, res);
    if (res.statusCode === 400 && res.jsonData?.message?.includes('غير صحيحة')) {
      console.log('✅ Test 2 Passed: Wrong current password rejected with 400.');
      passed++;
    } else {
      console.error('❌ Test 2 Failed: Expected 400 with error message, got', res.statusCode, res.jsonData);
      failed++;
    }
  }

  // 3. Schema validation: newPassword < 6 chars -> rejected
  {
    const parsed = changePasswordSchema.safeParse({ currentPassword: initialPassword, newPassword: '123' });
    if (!parsed.success) {
      console.log('✅ Test 3 Passed: Short new password (<6 chars) rejected by Zod schema.');
      passed++;
    } else {
      console.error('❌ Test 3 Failed: Short password was accepted.');
      failed++;
    }
  }

  // 4. Same new password as current password -> 400
  {
    const req: any = {
      user: { userId: mockAdminId, role: 'ADMIN', email: 'admin@edu.com' },
      body: { currentPassword: initialPassword, newPassword: initialPassword }
    };
    const res = createMockRes();
    await changePassword(req, res);
    if (res.statusCode === 400) {
      console.log('✅ Test 4 Passed: Same current & new password rejected.');
      passed++;
    } else {
      console.error('❌ Test 4 Failed: Expected 400, got', res.statusCode);
      failed++;
    }
  }

  // 5. Valid change password -> 200 OK & Hash Updated & Session Revoked & No Hash Leak
  {
    const newPassword = 'NewlyChangedSecretPassword2026!';
    const testJti = 'test-jti-session-uuid-111';
    const mockRefreshToken = jwt.sign(
      { userId: mockAdminId, jti: testJti },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    const req: any = {
      user: { userId: mockAdminId, role: 'ADMIN', email: 'admin@edu.com' },
      body: { currentPassword: initialPassword, newPassword },
      cookies: { refreshToken: mockRefreshToken }
    };
    const res = createMockRes();
    await changePassword(req, res);

    const hashMatch = await bcrypt.compare(newPassword, currentUserInDb.password);
    const oldHashMatch = await bcrypt.compare(initialPassword, currentUserInDb.password);
    const jtiRevoked = await isTokenBlocklisted(testJti);

    if (
      res.statusCode === 200 &&
      hashMatch === true &&
      oldHashMatch === false &&
      jtiRevoked === true &&
      res.clearedCookies.includes('refreshToken') &&
      !res.jsonData?.password &&
      !res.jsonData?.hash
    ) {
      console.log('✅ Test 5 Passed: Password change successfully updated hash, revoked old sessions, and never leaked hashes.');
      passed++;
    } else {
      console.error('❌ Test 5 Failed: Verification failed.', {
        statusCode: res.statusCode,
        hashMatch,
        oldHashMatch,
        jtiRevoked,
        jsonData: res.jsonData
      });
      failed++;
    }
  }

  // Restore originals
  (db.user as any).findUnique = originalFindUnique;
  (db.user as any).update = originalUpdate;

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}


runChangePasswordTests().catch(err => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
