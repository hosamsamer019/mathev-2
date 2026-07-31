// Phase 5: Backend API integration tests (runs against live services)
// No mocks — real HTTP, real DB
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = '4685c8216cff4502cea1cf993d197d0dcbe6704215d2e2d29055b1e8fec1e02b';

const services = {
  auth: 'http://localhost:4001',
  user: 'http://localhost:4002',
  course: 'http://localhost:4004',
  analytics: 'http://localhost:4005',
};

let total = 0, passed = 0, failed = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function http(url, opts = {}) {
  const res = await fetch(url, opts);
  let body;
  try { body = await res.json(); } catch { body = {}; }
  return { status: res.status, body };
}

async function run() {
  console.log('\n🧪 PHASE 5: INTEGRATION TEST SUITE\n');
  
  const email = `int_${Date.now()}@test.example.com`;
  const password = 'IntTest123!';
  let accessToken, userId, courseId, homeworkId, examId;

  // --- AUTH FLOW ---
  await test('AUTH-01: Health check - auth-service', async () => {
    const r = await http(`${services.auth}/health`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
  });

  await test('AUTH-02: Register new user', async () => {
    const r = await http(`${services.auth}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'IntTest', email, password, role: 'TEACHER' })
    });
    assert(r.status === 201, `Status: ${r.status} ${JSON.stringify(r.body)}`);
    assert(r.body.token, 'No token in response');
    userId = r.body.user.id;
  });

  await test('AUTH-03: Login', async () => {
    const r = await http(`${services.auth}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'TEACHER' })
    });
    assert(r.status === 200, `Status: ${r.status}`);
    assert(r.body.token, 'No access token');
    accessToken = r.body.token;
  });

  await test('AUTH-04: GetMe returns correct user', async () => {
    const r = await http(`${services.auth}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert(r.status === 200, `Status: ${r.status}`);
    assert(r.body.email === email, 'Email mismatch');
    assert(r.body.role === 'TEACHER', `Role mismatch: ${r.body.role}`);
  });

  // --- COURSE CRUD ---
  await test('COURSE-01: Health check - course-service', async () => {
    const r = await http(`${services.course}/health`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
  });

  await test('COURSE-02: Create course', async () => {
    const r = await http(`${services.course}/api/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ title: 'Integration Test Course', description: 'desc', category: 'math' })
    });
    assert(r.status === 201, `Status: ${r.status} ${JSON.stringify(r.body)}`);
    assert(r.body.id, 'No course id');
    courseId = r.body.id;
  });

  await test('COURSE-03: Fetch course list', async () => {
    const r = await http(`${services.course}/api/courses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert(r.status === 200, `Status: ${r.status}`);
    assert(r.body.data || Array.isArray(r.body), 'No data array');
  });

  await test('COURSE-04: Get single course', async () => {
    const r = await http(`${services.course}/api/courses/${courseId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert(r.status === 200, `Status: ${r.status}`);
    assert(r.body.title === 'Integration Test Course', 'Title mismatch');
  });

  // --- HOMEWORK ---
  await test('HW-01: Create homework', async () => {
    const r = await http(`${services.course}/api/homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ title: 'Integration HW', courseId })
    });
    assert(r.status === 201, `Status: ${r.status} ${JSON.stringify(r.body)}`);
    homeworkId = r.body.id;
  });

  await test('HW-02: List homework', async () => {
    const r = await http(`${services.course}/api/homework?courseId=${courseId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert(r.status === 200, `Status: ${r.status}`);
  });

  // --- EXAM ---
  await test('EXAM-01: Create exam', async () => {
    const r = await http(`${services.course}/api/exams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ title: 'Integration Exam', courseId, duration: 60, type: 'quiz' })
    });
    assert(r.status === 201, `Status: ${r.status} ${JSON.stringify(r.body)}`);
    examId = r.body.id;
  });

  await test('EXAM-02: List exams', async () => {
    const r = await http(`${services.course}/api/exams`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    assert(r.status === 200, `Status: ${r.status}`);
  });

  // --- ANALYTICS ---
  await test('ANALYTICS-01: Health check - analytics-service', async () => {
    const r = await http(`${services.analytics}/health`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
  });

  await test('ANALYTICS-02: Admin analytics', async () => {
    const adminToken = jwt.sign({ userId: 'admin', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    const r = await http(`${services.analytics}/api/analytics/admin`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(r.status === 200, `Status: ${r.status}`);
    assert(r.body.overview, 'No overview data');
  });

  // --- UPLOAD ---
  await test('UPLOAD-01: Upload endpoint responds', async () => {
    // Probe without file to confirm 400 not 404
    const r = await http(`${services.course}/api/upload/image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(r.status !== 404, `Upload route missing (404)`);
  });

  // --- CLEANUP ---
  try {
    if (courseId) await prisma.course.delete({ where: { id: courseId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
  } catch {}

  console.log(`\n📊 RESULTS: ${passed}/${total} Passed | ${failed} Failed`);
  if (failed === 0) console.log('✅ ALL INTEGRATION TESTS PASSED');
  else console.log(`❌ ${failed} INTEGRATION FAILURES`);
  
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

run();
