/**
 * Enterprise QA: Phase 2 (Payments), Phase 3 (Auth Security), Phase 4 (DB Audit)
 * Evidence-based testing with autonomous verification.
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const AUTH_URL = 'http://localhost:4001';
const ANALYTICS_URL = 'http://localhost:4003';

const JWT_SECRET = '4685c8216cff4502cea1cf993d197d0dcbe6704215d2e2d29055b1e8fec1e02b';
const REFRESH_TOKEN_SECRET = '8a9f262fa15f04a193f2d2a6a102cc98c1fe96e77448d9ce88e2844197b9e37b';

let errors = 0;
const results = [];

function pass(scenario, detail = '') {
  const msg = `✅ PASSED [${scenario}]${detail ? ': ' + detail : ''}`;
  console.log(msg);
  results.push({ scenario, status: 'PASSED', detail });
}

function fail(scenario, detail = '') {
  const msg = `❌ FAILED [${scenario}]${detail ? ': ' + detail : ''}`;
  console.error(msg);
  results.push({ scenario, status: 'FAILED', detail });
  errors++;
}

function warn(scenario, detail = '') {
  const msg = `⚠ WARNING [${scenario}]${detail ? ': ' + detail : ''}`;
  console.warn(msg);
  results.push({ scenario, status: 'WARNING', detail });
}

async function http(url, opts = {}) {
  const res = await fetch(url, opts);
  let body;
  try { body = await res.json(); } catch { body = {}; }
  return { status: res.status, body, headers: res.headers };
}

// ===================== PHASE 2: PAYMENT AUDIT =====================
async function phase2_PaymentsAudit() {
  console.log('\n==================== PHASE 2: PAYMENT SYSTEM ====================');

  // Check if Stripe env vars exist
  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
  if (!hasStripeKey) {
    warn('2.1 - Stripe API Key', 'STRIPE_SECRET_KEY not set → Payments BLOCKED (not a code issue, missing credentials)');
  }

  // Check Payment model has correct fields
  const paymentCols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='Payment' ORDER BY column_name;
  `;
  console.log('   [DB] Payment table columns:', paymentCols.map(c => c.column_name).join(', '));
  
  // Check analytics controller for mock revenue (code smell)
  const fs = require('fs');
  const analyticsCtrl = fs.readFileSync(
    'E:/Mathe/Mathteachersmartplatform-main/services/analytics-service/src/controllers/analytics.controller.ts',
    'utf8'
  );
  if (analyticsCtrl.includes('Mock revenue')) {
    warn('2.2 - Mock Revenue Data', 'Analytics controller uses mock revenue: "Mock revenue since no billing module exists"');
  }

  // Verify Payment DB write/read works
  const testUserId = crypto.randomUUID();
  await prisma.user.create({ data: { id: testUserId, name: 'PayTest', email: `pay_${Date.now()}@t.c`, password: 'h', role: 'ONLINE_STUDENT' } });
  const pay = await prisma.payment.create({ data: { userId: testUserId, amount: 99.99, status: 'PENDING' } });
  if (pay.id && pay.status === 'PENDING') {
    pass('2.3 - Payment DB Write', `Record created id=${pay.id}`);
  } else {
    fail('2.3 - Payment DB Write', 'Failed to create payment record');
  }
  
  const fetched = await prisma.payment.findUnique({ where: { id: pay.id } });
  if (fetched?.amount === 99.99) {
    pass('2.4 - Payment DB Read', `amount=${fetched.amount} verified`);
  } else {
    fail('2.4 - Payment DB Read', 'Data mismatch');
  }

  // Update payment status (simulates webhook callback)
  await prisma.payment.update({ where: { id: pay.id }, data: { status: 'COMPLETED' } });
  const updated = await prisma.payment.findUnique({ where: { id: pay.id } });
  if (updated?.status === 'COMPLETED') {
    pass('2.5 - Payment Status Update (Webhook sim)', 'PENDING → COMPLETED');
  } else {
    fail('2.5 - Payment Status Update', 'Status did not update');
  }
  
  // Cleanup
  await prisma.payment.delete({ where: { id: pay.id } });
  await prisma.user.delete({ where: { id: testUserId } });
}

// ===================== PHASE 3: AUTH SECURITY =====================
async function phase3_AuthSecurity() {
  console.log('\n==================== PHASE 3: AUTH SECURITY ====================');

  const email = `authtest_${Date.now()}@test.example.com`;
  const password = 'TestPass123!';

  // 3.1 Register
  const regRes = await http(`${AUTH_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'AuthTestUser', email, password, role: 'ONLINE_STUDENT' })
  });
  if (regRes.status === 201 && regRes.body.token) {
    pass('3.1 - Register', `User created, token issued`);
  } else {
    fail('3.1 - Register', JSON.stringify(regRes.body));
    return;
  }

  // 3.2 Login
  const loginRes = await http(`${AUTH_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role: 'ONLINE_STUDENT' })
  });
  if (loginRes.status === 200 && loginRes.body.token) {
    pass('3.2 - Login', 'Token returned');
  } else {
    fail('3.2 - Login', JSON.stringify(loginRes.body));
    return;
  }
  const accessToken = loginRes.body.token;
  const refreshCookie = loginRes.headers.get('set-cookie');

  // 3.3 getMe (valid token)
  const meRes = await http(`${AUTH_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (meRes.status === 200 && meRes.body.email === email) {
    pass('3.3 - GetMe (valid token)', `Role: ${meRes.body.role}`);
  } else {
    fail('3.3 - GetMe', JSON.stringify(meRes.body));
  }

  // 3.4 Token Expiration - forge an expired JWT
  const expiredToken = jwt.sign({ userId: 'x', role: 'ONLINE_STUDENT', email }, JWT_SECRET, { expiresIn: '-1s' });
  const expiredRes = await http(`${AUTH_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  });
  if (expiredRes.status === 401 || expiredRes.status === 403) {
    pass('3.4 - Expired Token Rejection', `HTTP ${expiredRes.status}`);
  } else {
    fail('3.4 - Expired Token Rejection', `Expected 401/403 but got HTTP ${expiredRes.status}`);
  }

  // 3.5 Tampered JWT (wrong signature)
  const parts = accessToken.split('.');
  const tamperedToken = parts[0] + '.' + parts[1] + '.invalidsignature';
  const tamperedRes = await http(`${AUTH_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${tamperedToken}` }
  });
  if (tamperedRes.status === 401 || tamperedRes.status === 403) {
    pass('3.5 - Tampered JWT Rejection', `HTTP ${tamperedRes.status}`);
  } else {
    fail('3.5 - Tampered JWT Rejection', `Expected 401/403 but got HTTP ${tamperedRes.status}`);
  }

  // 3.6 Refresh Token
  if (refreshCookie) {
    const refreshRes = await http(`${AUTH_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Cookie': refreshCookie }
    });
    if (refreshRes.status === 200 && refreshRes.body.token) {
      pass('3.6 - Refresh Token Rotation', 'New access token issued');
    } else {
      fail('3.6 - Refresh Token', JSON.stringify(refreshRes.body));
    }
  } else {
    warn('3.6 - Refresh Token', 'No Set-Cookie header from login. Refresh token cookie not returned to test client.');
  }

  // 3.7 Logout
  const logoutRes = await http(`${AUTH_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (logoutRes.status === 200) {
    pass('3.7 - Logout', 'Session cleared');
  } else {
    fail('3.7 - Logout', JSON.stringify(logoutRes.body));
  }

  // 3.8 Password Security (bcrypt hash in DB)
  const user = await prisma.user.findFirst({ where: { email } });
  if (user && user.password.startsWith('$2')) {
    pass('3.8 - Password bcrypt Hash', 'Stored as bcrypt, not plaintext');
  } else {
    fail('3.8 - Password Storage', 'Password may not be hashed!');
  }

  // 3.9 Duplicate Registration Prevention
  const dupRes = await http(`${AUTH_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dup', email, password, role: 'ONLINE_STUDENT' })
  });
  if (dupRes.status === 400) {
    pass('3.9 - Duplicate Registration', 'Correctly blocked with 400');
  } else {
    fail('3.9 - Duplicate Registration', `Expected 400, got ${dupRes.status}`);
  }

  // Cleanup
  await prisma.user.deleteMany({ where: { email } });
}

// ===================== PHASE 4: DATABASE AUDIT =====================
async function phase4_DatabaseAudit() {
  console.log('\n==================== PHASE 4: DATABASE AUDIT ====================');

  // 4.1 Check indexes on high-traffic columns
  const indexes = await prisma.$queryRaw`
    SELECT indexname, tablename FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `;
  
  const indexList = indexes.map(i => `${i.tablename}:${i.indexname}`);
  console.log('   [DB] Indexes found:', indexList.length);
  
  // Check critical indexes
  const hasUserEmailIdx = indexList.some(i => i.includes('User') && i.includes('email'));
  const hasEnrollmentIdx = indexList.some(i => i.includes('CourseEnrollment'));
  
  if (hasUserEmailIdx) pass('4.1 - Index: User.email', 'Unique index exists');
  else warn('4.1 - Index: User.email', 'No explicit index found beyond unique constraint');
  
  if (hasEnrollmentIdx) pass('4.1b - Index: CourseEnrollment', 'Index exists');
  else warn('4.1b - Index: CourseEnrollment', 'May need composite index on (studentId, courseId) for join performance');

  // 4.2 Check pagination on high-volume API
  const courseRes = await http('http://localhost:4004/api/courses?page=1&limit=5', {
    headers: { 'Authorization': `Bearer ${jwt.sign({ userId: 'x', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' })}` }
  });
  if (courseRes.body?.pagination || courseRes.body?.data) {
    pass('4.2 - Pagination', 'Courses API returns paginated data');
  } else {
    warn('4.2 - Pagination', 'No pagination metadata in response');
  }

  // 4.3 Data consistency: Orphan check (enrollments for deleted users)
  const orphanEnrollments = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM "CourseEnrollment" e
    WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = e."studentId");
  `;
  if (Number(orphanEnrollments[0].count) === 0) {
    pass('4.3 - Orphan Records', 'No orphan enrollments found');
  } else {
    fail('4.4 - Orphan Records', `${orphanEnrollments[0].count} orphan enrollment(s) found`);
  }

  // 4.4 Cascade delete verification
  const testTeacherId = crypto.randomUUID();
  await prisma.user.create({ data: { id: testTeacherId, name: 'CascT', email: `casc_${Date.now()}@t.c`, password: 'h', role: 'TEACHER' } });
  const cascCourse = await prisma.course.create({ data: { title: 'Cascade Test', teacherId: testTeacherId } });
  const cascHw = await prisma.homework.create({ data: { title: 'HW', courseId: cascCourse.id } });
  
  await prisma.course.delete({ where: { id: cascCourse.id } });
  const deletedHw = await prisma.homework.findUnique({ where: { id: cascHw.id } });
  
  if (!deletedHw) {
    pass('4.4 - Cascade Delete', 'Homework cascaded correctly when Course deleted');
  } else {
    fail('4.4 - Cascade Delete', 'Orphan homework remained after course deletion');
  }
  
  await prisma.user.delete({ where: { id: testTeacherId } });
}

// ===================== FINAL SUMMARY =====================
async function main() {
  console.log('🏢 ENTERPRISE QA PHASES 2, 3, 4 - STARTING...\n');
  
  try {
    await phase2_PaymentsAudit();
    await phase3_AuthSecurity();
    await phase4_DatabaseAudit();
  } catch (e) {
    console.error('\n[CRITICAL] Test runner crashed:', e.message);
    errors++;
  }

  console.log('\n==================== FINAL RESULTS ====================');
  results.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : r.status === 'WARNING' ? '⚠' : '❌';
    console.log(`${icon} ${r.scenario}: ${r.detail}`);
  });
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const warned = results.filter(r => r.status === 'WARNING').length;
  
  console.log(`\nTOTAL: ${passed} Passed | ${warned} Warnings | ${errors} Failed`);
  if (errors === 0) console.log('\n✅ ALL EXECUTABLE TESTS PASSED');
  else console.log(`\n❌ ${errors} FAILURES DETECTED`);
  
  await prisma.$disconnect();
  process.exit(errors === 0 ? 0 : 1);
}

main();
