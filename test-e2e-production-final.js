const { PrismaClient } = require('@prisma/client');
let baseDbUrl = process.env.DATABASE_URL.replace(':5432/', ':6543/');
const prismaUrl = baseDbUrl.includes('?') 
  ? `${baseDbUrl}&connection_limit=1&pgbouncer=true` 
  : `${baseDbUrl}?connection_limit=1&pgbouncer=true`;
const prisma = new PrismaClient({
  datasources: { db: { url: prismaUrl } }
});
const bcrypt = require('bcryptjs');

const API_BASE = 'https://mathev-2.vercel.app/api';
const RUN_ID = `[E2E-SYNC-${Date.now()}]`;

const TEST_ACCOUNTS = {
  admin: { email: `e2e_full_admin_${Date.now()}@test.com`, password: 'Password123!', role: 'ADMIN', name: `Admin ${RUN_ID}` },
  teacher: { email: `e2e_full_teacher_${Date.now()}@test.com`, password: 'Password123!', role: 'TEACHER', name: `Teacher ${RUN_ID}` },
  studentA: { email: `e2e_full_studentA_${Date.now()}@test.com`, password: 'Password123!', role: 'ONLINE_STUDENT', name: `Student A ${RUN_ID}` },
  studentB: { email: `e2e_full_studentB_${Date.now()}@test.com`, password: 'Password123!', role: 'ONLINE_STUDENT', name: `Student B ${RUN_ID}` },
  parentA: { email: `e2e_full_parentA_${Date.now()}@test.com`, password: 'Password123!', role: 'PARENT', name: `Parent A ${RUN_ID}` },
  parentB: { email: `e2e_full_parentB_${Date.now()}@test.com`, password: 'Password123!', role: 'PARENT', name: `Parent B ${RUN_ID}` },
};

let tokens = {};
let ids = {};
let createdEmails = [];
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function api(path, method = 'GET', body = null, token = null, retries = 3) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  let res, text, json;
  for (let i = 0; i < retries; i++) {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    text = await res.text();
    if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
      throw new Error(`API ${method} ${path} returned HTML fallback instead of JSON! Status: ${res.status}`);
    }
    
    try {
      if (text) json = JSON.parse(text);
    } catch (e) {
      json = { _raw: text };
    }
    
    // If we hit Supabase connection pool limits, retry
    if (res.status === 500 && text.includes('EMAXCONNSESSION') && i < retries - 1) {
      log(`⚠️ Hit Supabase connection pool limit. Retrying in 3 seconds...`);
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }
    break;
  }
  
  return { status: res.status, ok: res.ok, json };
}

async function verifyDbCleanup() {
  log('Verifying Cleanup...');
  const users = await prisma.user.count({ where: { name: { contains: '[E2E-SYNC' } } });
  const courses = await prisma.course.count({ where: { title: { contains: '[E2E-SYNC' } } });
  const exams = await prisma.exam.count({ where: { title: { contains: '[E2E-SYNC' } } });
  const homework = await prisma.homework.count({ where: { title: { contains: '[E2E-SYNC' } } });
  
  if (users > 0 || courses > 0 || exams > 0 || homework > 0) {
    throw new Error(`CLEANUP FAILURE: Found remaining records (Users: ${users}, Courses: ${courses}, Exams: ${exams}, Homework: ${homework})`);
  }
  log('✅ Database is fully clean of E2E test data.');
}

async function cleanup() {
  log('\n--- STARTING HARD CLEANUP ---');
  try {
    if (createdEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    }
    // Hard fallback delete any dangling records
    await prisma.user.deleteMany({ where: { name: { contains: '[E2E-SYNC' } } });
    await prisma.course.deleteMany({ where: { title: { contains: '[E2E-SYNC' } } });
    await prisma.exam.deleteMany({ where: { title: { contains: '[E2E-SYNC' } } });
    await prisma.homework.deleteMany({ where: { title: { contains: '[E2E-SYNC' } } });
    
    await verifyDbCleanup();
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function runTests() {
  try {
    log(`Starting Full E2E Production Audit: ${RUN_ID}`);
    
    // 1. CREATE ACCOUNTS
    for (const [key, data] of Object.entries(TEST_ACCOUNTS)) {
      const hash = await bcrypt.hash(data.password, 10);
      const user = await prisma.user.create({
        data: { email: data.email, password: hash, name: data.name, role: data.role }
      });
      ids[key] = user.id;
      createdEmails.push(data.email);
    }
    // Link Parents
    await prisma.user.update({ where: { id: ids.studentA }, data: { parentId: ids.parentA } });
    await prisma.user.update({ where: { id: ids.studentB }, data: { parentId: ids.parentB } });
    
    // 2. AUTHENTICATION
    for (const [key, data] of Object.entries(TEST_ACCOUNTS)) {
      const res = await api('/auth/login', 'POST', { email: data.email, password: data.password, role: data.role });
      if (!res.ok || !res.json.token) throw new Error(`Failed to login ${key}: ${res.status}`);
      tokens[key] = res.json.token;
    }
    log(`✅ All test accounts authenticated successfully`);

    // ==========================================
    // COURSE LIFECYCLE & ISOLATION
    // ==========================================
    log('\n--- COURSE CREATION & ISOLATION ---');
    const courseRes = await api('/courses', 'POST', { title: `${RUN_ID} Math 101`, description: 'Test course', category: 'Math' }, tokens.teacher);
    if (![200, 201].includes(courseRes.status)) throw new Error(`Course creation failed: ${JSON.stringify(courseRes.json)}`);
    ids.course = courseRes.json.id;
    
    // Enroll ONLY Student A
    await prisma.courseEnrollment.create({ data: { studentId: ids.studentA, courseId: ids.course } });
    
    // Student A Sees Course
    let sCourses = await api('/courses', 'GET', null, tokens.studentA);
    if (sCourses.status !== 200) throw new Error(`GET /courses failed for Student A: ${JSON.stringify(sCourses.json)}`);
    if (!sCourses.json.data) throw new Error(`sCourses.json.data is undefined! Payload: ${JSON.stringify(sCourses.json)}`);
    if (!sCourses.json.data.find(c => c.id === ids.course)) throw new Error('Student A cannot see enrolled course');
    log('✅ Student A can see Course');
    
    // Student B Cannot See Course
    let bCourses = await api('/courses', 'GET', null, tokens.studentB);
    if (bCourses.json.data.find(c => c.id === ids.course)) {
       throw new Error(`SECURITY FAILURE: Student B can see Student A course. Data: ${JSON.stringify(bCourses.json.data)}`);
    }
    log('✅ Security: Student B isolated from Course');
    
    // ==========================================
    // HOMEWORK SYNC & GRADING
    // ==========================================
    log('\n--- HOMEWORK CREATION & SYNC ---');
    const hwRes = await api('/homework', 'POST', {
      title: `${RUN_ID} Assignment 1`,
      courseId: ids.course,
      questions: [{ id: 1, text: '3+3', type: 'MCQ', options: ['5', '6', '7', '8'], correct: 1 }]
    }, tokens.teacher);
    ids.homework = hwRes.json.id;
    
    // Student A Sees Homework
    let sHomeworks = await api('/homework', 'GET', null, tokens.studentA);
    if (sHomeworks.status !== 200) throw new Error(`GET /homework failed: ${JSON.stringify(sHomeworks.json)}`);
    if (!sHomeworks.json.data.find(h => h.id === ids.homework)) throw new Error('Student A cannot see Homework');
    log('✅ Student A can see Homework');
    
    // Student B Cannot See Homework
    let bHomeworks = await api('/homework', 'GET', null, tokens.studentB);
    if (bHomeworks.json.data.find(h => h.id === ids.homework)) throw new Error('SECURITY FAILURE: Student B can see Student A Homework');
    log('✅ Security: Student B isolated from Student A Homework');

    // Student A Submits Homework
    const hwSubmit = await api(`/homework/${ids.homework}/submit`, 'POST', { answers: [{ questionId: 1, selectedOption: 1 }] }, tokens.studentA);
    if (![200, 201].includes(hwSubmit.status)) throw new Error(`Homework submission failed: ${hwSubmit.status}`);
    
    // Verify Grading in DB
    const dbHwSub = await prisma.submission.findFirst({ where: { studentId: ids.studentA, homeworkId: ids.homework } });
    if (dbHwSub.grade !== 100) throw new Error(`FAIL: Homework grade is wrong. Expected 100, got ${dbHwSub.grade}`);
    log('✅ Grading: Homework correctly graded on submission');
    
    // ==========================================
    // EXAM SYNC, GRADING, CACHE
    // ==========================================
    log('\n--- EXAM CREATION & CACHE INVALIDATION ---');
    
    // DB Notif Check Before
    const notifsBefore = await prisma.notification.count();
    
    const examRes = await api('/exams', 'POST', {
      title: `${RUN_ID} Final Exam`,
      courseId: ids.course,
      duration: 60,
      questions: [{ id: 1, text: '2+2', type: 'MCQ', options: ['1', '2', '3', '4'], correct: 3 }]
    }, tokens.teacher);
    ids.exam = examRes.json.id;
    
    // Wait for async notification creation
    await new Promise(r => setTimeout(r, 1000));
    
    // DB Notif Check After
    const notifsAfter = await prisma.notification.count();
    if (notifsAfter > notifsBefore) {
       log('✅ NOTIFICATIONS: Exam creation triggers notifications in DB');
    } else {
       log('⚠️ NOT IMPLEMENTED: Notification record NOT automatically created in DB on Exam publish');
    }

    // Teacher Updates Exam (Test Cache)
    await api(`/exams/${ids.exam}`, 'PUT', { 
      title: `${RUN_ID} Final Exam UPDATED`, duration: 90, courseId: ids.course,
      questions: [{ id: 1, text: '2+2', type: 'MCQ', options: ['1', '2', '3', '4'], correct: 3 }]
    }, tokens.teacher);
    
    let sExams = await api('/exams', 'GET', null, tokens.studentA);
    if (sExams.status !== 200) throw new Error(`GET /exams failed for Student A: ${JSON.stringify(sExams.json)}`);
    if (!sExams.json.data) throw new Error(`sExams.json.data is undefined! Payload: ${JSON.stringify(sExams.json)}`);
    let sExam = sExams.json.data.find(e => e.id === ids.exam);
    if (sExam.title !== `${RUN_ID} Final Exam UPDATED`) throw new Error(`Stale Cache: Expected UPDATED title, got ${sExam.title}`);
    log('✅ Cache invalidation works across Teacher -> Student boundaries');
    
    // Student Exam Submit
    const attemptRes = await api(`/exams/${ids.exam}/submit`, 'POST', { answers: [{ questionId: 1, selectedOption: 3 }] }, tokens.studentA);
    
    // Verify Grading
    const dbAttempt = await prisma.examAttempt.findFirst({ where: { studentId: ids.studentA, examId: ids.exam } });
    if (dbAttempt.score !== 100) throw new Error(`FAIL: Database score computed incorrectly. Expected 100, got ${dbAttempt.score}`);
    log('✅ Grading: Exam correctly graded as 100 on submission');
    
    // Parent Verification
    log('Waiting for Vercel DB connections to clear...');
    await new Promise(r => setTimeout(r, 2000));
    const pDash = await api(`/analytics/parent`, 'GET', null, tokens.parentA);
    if (pDash.status !== 200) throw new Error(`Parent Dashboard failed: ${pDash.status} - ${JSON.stringify(pDash.json)}`);
    log('✅ Parent A Dashboard accessible');

    // Negative Security: Parent B tries to access Parent A's analytics
    // Parent B dashboard should only return Parent B's children data
    const pBDash = await api(`/analytics/parent`, 'GET', null, tokens.parentB);
    const pBData = JSON.stringify(pBDash.json);
    if (pBData.includes(ids.studentA)) throw new Error('SECURITY FAILURE: Parent B analytics leaked Student A data');
    log('✅ Security: Parent B correctly isolated from Parent A analytics');
    
    // ==========================================
    // DELETION PROPAGATION
    // ==========================================
    log('\n--- DELETION PROPAGATION ---');
    await api(`/exams/${ids.exam}`, 'DELETE', null, tokens.teacher);
    
    const dbExam = await prisma.exam.findUnique({ where: { id: ids.exam } });
    if (dbExam) throw new Error('FAIL: DELETE /exams/:id did not hard-delete from database');
    log('✅ Deletion: Exam hard-deleted from database');
    
    sExams = await api('/exams', 'GET', null, tokens.studentA);
    if (sExams.json.data.find(e => e.id === ids.exam)) throw new Error('FAIL: Deleted exam still visible to Student A');
    log('✅ Deletion: Exam removed from Student A API');
    
    // Student attempting to delete course (Security)
    const secDel = await api(`/courses/${ids.course}`, 'DELETE', null, tokens.studentA);
    if (![401, 403].includes(secDel.status)) throw new Error(`SECURITY FAILURE: Student deleted course! Status: ${secDel.status}`);
    log('✅ Security: Student isolated from Teacher deletion routes');
    
    log('\n🎉 ALL LIFECYCLE & SECURITY AUDIT TESTS COMPLETED!');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
  } finally {
    await cleanup();
  }
}

runTests();
