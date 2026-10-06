import { PrismaClient } from '@prisma/client';
import express from 'express';
import http from 'http';
import * as jwt from 'jsonwebtoken';
import { updateUser } from './src/controllers/user.controller';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-temporary-development-secret';

async function testSec011Runtime() {
  console.log('--- START SEC-011: PARENT ACCOUNT TAKEOVER RUNTIME VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  // Create Express App
  const app = express();
  app.use(express.json());

  // Middleware to inject authenticated user
  app.use((req: any, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        req.user = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }
    next();
  });

  app.put('/api/users/:id', updateUser);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  let studentA: any;
  let parentB: any;
  let adminUser: any;

  try {
    // 1. Setup DB Test Accounts
    const stamp = Date.now();
    parentB = await prisma.user.create({
      data: {
        email: `parent_b_${stamp}@test.com`,
        password: 'original_parent_password_hash',
        name: 'Parent B',
        role: 'PARENT'
      }
    });

    studentA = await prisma.user.create({
      data: {
        email: `student_a_${stamp}@test.com`,
        password: 'student_password_hash',
        name: 'Student A',
        role: 'ONLINE_STUDENT',
        country: 'EG',
        educationLevel: 'SECONDARY',
        gradeLevel: 'SECONDARY_1'
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: `admin_${stamp}@test.com`,
        password: 'admin_password_hash',
        name: 'Admin User',
        role: 'ADMIN'
      }
    });

    const tokenStudentA = jwt.sign({ userId: studentA.id, role: 'ONLINE_STUDENT', email: studentA.email }, JWT_SECRET, { expiresIn: '15m' });
    const tokenAdmin = jwt.sign({ userId: adminUser.id, role: 'ADMIN', email: adminUser.email }, JWT_SECRET, { expiresIn: '15m' });

    // Scenario 1: Student A updates own harmless profile fields (name) -> MUST succeed
    const res1 = await fetch(`${baseUrl}/api/users/${studentA.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudentA}` },
      body: JSON.stringify({ name: 'Student A Renamed' })
    });
    if (res1.status === 200) {
      console.log('✅ Scenario 1 Passed: Student A safely updated own authorized profile fields.');
      passed++;
    } else {
      console.error(`❌ Scenario 1 Failed: Status ${res1.status}, ${await res1.text()}`);
      failed++;
    }

    // Scenario 2: Student A attempts to modify Parent B password -> MUST fail (403)
    const res2 = await fetch(`${baseUrl}/api/users/${studentA.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudentA}` },
      body: JSON.stringify({ parentEmail: parentB.email, parentPassword: 'AttackerNewPassword123!' })
    });
    const parentCheck2 = await prisma.user.findUnique({ where: { id: parentB.id } });
    if (res2.status === 403 && parentCheck2?.password === 'original_parent_password_hash') {
      console.log('✅ Scenario 2 Passed: Student A prevented from mutating Parent B password (403 Forbidden).');
      passed++;
    } else {
      console.error(`❌ Scenario 2 Failed: Status ${res2.status}`);
      failed++;
    }

    // Scenario 3: Student A attempts to change Parent B email -> MUST fail (403)
    const res3 = await fetch(`${baseUrl}/api/users/${studentA.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudentA}` },
      body: JSON.stringify({ parentEmail: 'hijacked_parent@test.com' })
    });
    if (res3.status === 403) {
      console.log('✅ Scenario 3 Passed: Student A prevented from mutating parentEmail (403 Forbidden).');
      passed++;
    } else {
      console.error(`❌ Scenario 3 Failed: Status ${res3.status}`);
      failed++;
    }

    // Scenario 4: Student A attempts to assign Parent B using parentId -> MUST fail (403)
    const res4 = await fetch(`${baseUrl}/api/users/${studentA.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudentA}` },
      body: JSON.stringify({ parentId: parentB.id })
    });
    if (res4.status === 403) {
      console.log('✅ Scenario 4 Passed: Student A prevented from setting arbitrary parentId (403 Forbidden).');
      passed++;
    } else {
      console.error(`❌ Scenario 4 Failed: Status ${res4.status}`);
      failed++;
    }

    // Scenario 5: Student A attempts to change own role to ADMIN -> MUST fail (403)
    const res5 = await fetch(`${baseUrl}/api/users/${studentA.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudentA}` },
      body: JSON.stringify({ role: 'ADMIN' })
    });
    const studentCheck5 = await prisma.user.findUnique({ where: { id: studentA.id } });
    if (res5.status === 403 && studentCheck5?.role === 'ONLINE_STUDENT') {
      console.log('✅ Scenario 5 Passed: Student A prevented from elevating role (403 Forbidden).');
      passed++;
    } else {
      console.error(`❌ Scenario 5 Failed: Status ${res5.status}`);
      failed++;
    }

    // Scenario 6: Student A attempts to change centerGroupId -> MUST fail (403)
    const res6 = await fetch(`${baseUrl}/api/users/${studentA.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudentA}` },
      body: JSON.stringify({ centerGroupId: 'arbitrary-center-group-id' })
    });
    if (res6.status === 403) {
      console.log('✅ Scenario 6 Passed: Student A prevented from modifying centerGroupId (403 Forbidden).');
      passed++;
    } else {
      console.error(`❌ Scenario 6 Failed: Status ${res6.status}`);
      failed++;
    }

    // Scenario 7: Authorized Admin performs legitimate parent management -> MUST succeed
    const res7 = await fetch(`${baseUrl}/api/users/${studentA.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` },
      body: JSON.stringify({ name: 'Admin Renamed Student Profile' })
    });
    if (res7.status === 200) {
      console.log('✅ Scenario 7 Passed: Authorized Admin operation succeeded.');
      passed++;
    } else {
      console.error(`❌ Scenario 7 Failed: Status ${res7.status}`);
      failed++;
    }

    console.log(`\n--- SEC-011 RUNTIME RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  } catch (err: any) {
    console.error('❌ SEC-011 runtime execution error:', err.message);
    failed++;
  } finally {
    // Cleanup DB
    if (studentA?.id) await prisma.user.delete({ where: { id: studentA.id } }).catch(() => {});
    if (parentB?.id) await prisma.user.delete({ where: { id: parentB.id } }).catch(() => {});
    if (adminUser?.id) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    server.close();
    await prisma.$disconnect();
  }

  if (failed > 0) process.exit(1);
}

testSec011Runtime();
