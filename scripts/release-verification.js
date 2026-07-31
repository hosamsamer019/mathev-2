const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const JWT_SECRET = '4685c8216cff4502cea1cf993d197d0dcbe6704215d2e2d29055b1e8fec1e02b';

const URLS = {
  auth: 'http://localhost:4001',
  user: 'http://localhost:4002',
  ai: 'http://localhost:4003',
  course: 'http://localhost:4004',
  analytics: 'http://localhost:4005',
};

const report = { passed: 0, warnings: 0, failed: 0, blocked: 0, sections: [] };

function pass(section, test, detail) {
  console.log(`  ✅ ${test}${detail ? ': ' + detail : ''}`);
  report.passed++;
  section.tests.push({ status: 'PASS', test, detail });
}
function fail(section, test, detail) {
  console.error(`  ❌ ${test}${detail ? ': ' + detail : ''}`);
  report.failed++;
  section.tests.push({ status: 'FAIL', test, detail });
}
function warn(section, test, detail) {
  console.warn(`  ⚠  ${test}${detail ? ': ' + detail : ''}`);
  report.warnings++;
  section.tests.push({ status: 'WARN', test, detail });
}
function blocked(section, test, detail) {
  console.log(`  🚫 ${test}${detail ? ': ' + detail : ''}`);
  report.blocked++;
  section.tests.push({ status: 'BLOCKED', test, detail });
}

async function http(url, opts = {}) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(10000) });
    let body;
    try { body = await res.json(); } catch { body = {}; }
    return { ok: res.ok, status: res.status, body, headers: res.headers };
  } catch (e) {
    return { ok: false, status: 0, body: {}, error: e.message };
  }
}

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION & SECURITY
// ─────────────────────────────────────────────────────────────────────────────
async function testSecurity() {
  const s = { name: 'SECURITY & AUTH', tests: [] };
  report.sections.push(s);
  console.log('\n[ SECURITY & AUTH ]');

  // Password Reset Endpoints
  const resReq = await http(`${URLS.auth}/api/auth/forgot-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com' })
  });
  if (resReq.status === 200) pass(s, 'Forgot Password Endpoint', '200 OK');
  else fail(s, 'Forgot Password Endpoint', `HTTP ${resReq.status}`);

  // Invalid Reset Token Rejection
  const resToken = await http(`${URLS.auth}/api/auth/reset-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: '1234567890123456789012345678901234567890123456789012345678901234', password: 'newpassword123' })
  });
  if (resToken.status === 400) pass(s, 'Invalid Reset Token Rejection', '400 Bad Request');
  else fail(s, 'Invalid Reset Token Rejection', `Expected 400, got ${resToken.status}`);

  // Helmet / CORS
  const helmRes = await http(`${URLS.auth}/health`);
  if (helmRes.headers.get('x-frame-options')) pass(s, 'Helmet Headers Active', 'X-Frame-Options present');
  else fail(s, 'Helmet Headers Active', 'Missing');

  // Email Config Check
  if (process.env.SMTP_HOST || process.env.SENDGRID_API_KEY) pass(s, 'Email Provider Configuration', 'Credentials found');
  else blocked(s, 'Email Provider Configuration', 'SMTP_HOST or SENDGRID_API_KEY missing - falling back to DEV console logging');
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE (UPLOADS)
// ─────────────────────────────────────────────────────────────────────────────
async function testStorage() {
  const s = { name: 'STORAGE & UPLOADS', tests: [] };
  report.sections.push(s);
  console.log('\n[ STORAGE & UPLOADS ]');

  const teacherToken = makeToken({ userId: 'probe', role: 'TEACHER' });
  const fakePng = Buffer.from('fake png bytes');
  const boundary = '----TestBoundary';
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n`),
    fakePng,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const uploadRes = await http(`${URLS.course}/api/upload/image`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${teacherToken}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body
  });

  if (uploadRes.ok && uploadRes.body.url) {
    pass(s, 'Image Upload Success', `URL: ${uploadRes.body.url}`);
    if (uploadRes.body.backend === 'supabase') {
      pass(s, 'Cloud Storage Adapter', 'Supabase Cloud Storage ACTIVE');
    } else {
      warn(s, 'Cloud Storage Adapter', 'Running on Local Disk fallback');
    }
  } else {
    fail(s, 'Image Upload Success', `HTTP ${uploadRes.status}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION & PERFORMANCE (COURSES, USERS, ETC)
// ─────────────────────────────────────────────────────────────────────────────
async function testPagination() {
  const s = { name: 'PAGINATION & PERFORMANCE', tests: [] };
  report.sections.push(s);
  console.log('\n[ PAGINATION & PERFORMANCE ]');

  const adminToken = makeToken({ userId: 'admin', role: 'ADMIN' });

  // Test Course Pagination
  const coursesRes = await http(`${URLS.course}/api/courses?page=1&limit=5`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
  if (coursesRes.ok && coursesRes.body.page !== undefined && coursesRes.body.totalPages !== undefined) {
    pass(s, 'Course Pagination Format', 'Top-level pagination meta fields present');
  } else {
    fail(s, 'Course Pagination Format', 'Missing top-level pagination meta fields');
  }

  // Test Users Pagination
  const usersRes = await http(`${URLS.user}/api/users/users?page=1&limit=5`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
  if (usersRes.ok && usersRes.body.page !== undefined) pass(s, 'Users Pagination Format', 'Top-level fields present');
  else fail(s, 'Users Pagination Format', 'Missing top-level fields');
}

// ─────────────────────────────────────────────────────────────────────────────
// AI SERVICE
// ─────────────────────────────────────────────────────────────────────────────
async function testAI() {
  const s = { name: 'AI SERVICE', tests: [] };
  report.sections.push(s);
  console.log('\n[ AI SERVICE ]');

  const studentToken = makeToken({ userId: 'student', role: 'ONLINE_STUDENT' });

  // Test AI solver endpoint (even if AI key missing, should return appropriate response or 500 cleanly, not crash)
  const aiRes = await http(`${URLS.ai}/api/ai/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
    body: JSON.stringify({ problem: '2+2' })
  });

  if (aiRes.status === 200 || aiRes.status === 500) {
    pass(s, 'AI Solver Endpoint Connectivity', `Responded with HTTP ${aiRes.status}`);
  } else {
    fail(s, 'AI Solver Endpoint Connectivity', `Expected 200 or 500 (if no key), got ${aiRes.status}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS & STRIPE
// ─────────────────────────────────────────────────────────────────────────────
async function testPayments() {
  const s = { name: 'PAYMENTS & STRIPE', tests: [] };
  report.sections.push(s);
  console.log('\n[ PAYMENTS & STRIPE ]');

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    pass(s, 'Stripe Credentials Configured', 'Keys present');
  } else {
    blocked(s, 'Stripe Credentials Configured', 'STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing');
  }

  // Test webhook endpoint accepts connections
  const webhookRes = await http(`${URLS.analytics}/api/analytics/stripe/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': 'fake-sig' },
    body: JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed' })
  });

  // Because sig is fake, it should reject with 400 (if keys are there) or 503 (if keys missing)
  if (webhookRes.status === 400 || webhookRes.status === 503) {
    pass(s, 'Stripe Webhook Handler', `Responded with HTTP ${webhookRes.status}`);
  } else {
    fail(s, 'Stripe Webhook Handler', `Expected 400/503, got ${webhookRes.status}`);
  }
}

async function main() {
  await testSecurity();
  await testStorage();
  await testPagination();
  await testAI();
  await testPayments();

  console.log('\n======================================================');
  console.log('FINAL GATE SUMMARY');
  console.log('======================================================');

  let fullReport = `# FINAL AUTOMATED PRODUCTION GATE REPORT\n**Date:** ${new Date().toISOString()}\n\n`;

  report.sections.forEach(sec => {
    fullReport += `### ${sec.name}\n`;
    sec.tests.forEach(t => {
      const icon = t.status === 'PASS' ? '✅' : t.status === 'WARN' ? '⚠ ' : t.status === 'BLOCKED' ? '🚫' : '❌';
      fullReport += `- ${icon} **${t.test}**${t.detail ? `: ${t.detail}` : ''}\n`;
    });
    fullReport += '\n';
  });

  const total = report.passed + report.warnings + report.failed + report.blocked;
  
  fullReport += `## SUMMARY\n`;
  fullReport += `- **PASSED:** ${report.passed}\n`;
  fullReport += `- **WARNINGS:** ${report.warnings}\n`;
  fullReport += `- **BLOCKED:** ${report.blocked}\n`;
  fullReport += `- **FAILED:** ${report.failed}\n\n`;

  if (report.failed > 0) {
    fullReport += `**FINAL STATUS:** ❌ NOT READY\n`;
  } else if (report.blocked > 0 || report.warnings > 0) {
    fullReport += `**FINAL STATUS:** ⚠ READY WITH BLOCKERS\n`;
  } else {
    fullReport += `**FINAL STATUS:** ✅ PRODUCTION READY\n`;
  }

  fs.writeFileSync(path.join(process.cwd(), 'scripts', 'gate_output.md'), fullReport);

  if (report.failed > 0) {
    console.log('❌ NOT READY');
    process.exit(1);
  } else {
    console.log(report.blocked > 0 ? '⚠ READY WITH BLOCKERS' : '✅ PRODUCTION READY');
    process.exit(0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
