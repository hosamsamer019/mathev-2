const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const API_BASE = 'https://mathev-2.vercel.app/api';
const RUN_ID = `[E2E-TEST-${Date.now()}]`;

const TEST_ACCOUNTS = {
  admin: { email: 'e2e_admin@test.com', password: 'Password123!', role: 'ADMIN', name: `Admin ${RUN_ID}` },
  teacher: { email: 'e2e_teacher@test.com', password: 'Password123!', role: 'TEACHER', name: `Teacher ${RUN_ID}` },
  student: { email: 'e2e_student@test.com', password: 'Password123!', role: 'ONLINE_STUDENT', name: `Student ${RUN_ID}` },
  parent: { email: 'e2e_parent@test.com', password: 'Password123!', role: 'PARENT', name: `Parent ${RUN_ID}` },
};

let tokens = { admin: '', teacher: '', student: '', parent: '' };
let ids = { admin: '', teacher: '', student: '', parent: '', course: '', homework: '', exam: '', attempt: '', submission: '' };

async function cleanup() {
  console.log('\n--- STARTING CLEANUP ---');
  try {
    if (ids.attempt) await prisma.examAttempt.deleteMany({ where: { studentId: ids.student } });
    if (ids.submission) await prisma.submission.deleteMany({ where: { studentId: ids.student } });
    if (ids.exam) await prisma.exam.deleteMany({ where: { id: ids.exam } });
    if (ids.homework) await prisma.homework.deleteMany({ where: { id: ids.homework } });
    if (ids.course) await prisma.course.deleteMany({ where: { id: ids.course } });
    
    const emails = Object.values(TEST_ACCOUNTS).map(a => a.email);
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    
    console.log('✅ Cleanup completed successfully.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function api(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  // Dynamic fetch to support node 18+ globally
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { _raw: text };
  }
  
  return { status: res.status, ok: res.ok, json };
}

async function runTests() {
  try {
    console.log(`Starting E2E Test Run: ${RUN_ID}`);
    
    const bcrypt = require('bcryptjs');
    
    // 1. CREATE ACCOUNTS
    for (const [key, data] of Object.entries(TEST_ACCOUNTS)) {
      const hash = await bcrypt.hash(data.password, 10);
      const user = await prisma.user.create({
        data: { email: data.email, password: hash, name: data.name, role: data.role }
      });
      ids[key] = user.id;
    }
    
    // Link Parent to Student
    await prisma.user.update({
      where: { id: ids.student },
      data: { parentId: ids.parent }
    });
    
    // 2. AUTHENTICATION
    for (const [key, data] of Object.entries(TEST_ACCOUNTS)) {
      const res = await api('/auth/login', 'POST', { email: data.email, password: data.password, role: data.role });
      if (!res.ok || !res.json.token) throw new Error(`Failed to login ${key}: ${res.status}`);
      tokens[key] = res.json.token;
      console.log(`✅ Login successful for ${key}`);
    }

    // 3. TEACHER -> STUDENT (COURSE)
    console.log('\n--- TESTING COURSE FLOW ---');
    const courseRes = await api('/courses', 'POST', {
      title: `${RUN_ID} Math 101`,
      description: 'Test course',
      category: 'Math'
    }, tokens.teacher);
    
    if (courseRes.status !== 201) throw new Error(`Course creation failed: ${courseRes.status} ${JSON.stringify(courseRes.json)}`);
    ids.course = courseRes.json.id;
    console.log('✅ Teacher created course');
    
    // Enroll Student
    await prisma.courseEnrollment.create({
      data: { studentId: ids.student, courseId: ids.course }
    });
    
    const studentCourses = await api('/courses', 'GET', null, tokens.student);
    if (!Array.isArray(studentCourses.json.data)) throw new Error('Student courses API did not return an array');
    if (!studentCourses.json.data.find(c => c.id === ids.course)) throw new Error('Student cannot see the enrolled course');
    console.log('✅ Student can see the enrolled course');

    // 4. TEACHER -> STUDENT (HOMEWORK)
    console.log('\n--- TESTING HOMEWORK FLOW ---');
    const hwRes = await api('/homework', 'POST', {
      title: `${RUN_ID} Assignment 1`,
      courseId: ids.course,
      questions: [
        { id: 1, text: '1+1', type: 'MCQ', options: ['1', '2', '3', '4'], correctAnswer: 1 }
      ]
    }, tokens.teacher);
    
    if (hwRes.status !== 201) throw new Error(`Homework creation failed: ${JSON.stringify(hwRes.json)}`);
    ids.homework = hwRes.json.id;
    console.log('✅ Teacher created homework');

    const studentHw = await api('/homework', 'GET', null, tokens.student);
    if (!Array.isArray(studentHw.json.data)) throw new Error(`Student homework API did not return an array: ${JSON.stringify(studentHw.json)}`);
    if (!studentHw.json.data.find(h => h.id === ids.homework)) throw new Error('Student cannot see homework');
    console.log('✅ Student can see homework');

    const subRes = await api(`/homework/${ids.homework}/submit`, 'POST', {
      answers: { 'q1': '2' }
    }, tokens.student);
    if (subRes.status !== 201) throw new Error(`Homework submission failed: ${subRes.status} ${JSON.stringify(subRes.json)}`);
    ids.submission = subRes.json.id;
    console.log('✅ Student submitted homework');

    // 5. TEACHER -> STUDENT (EXAM)
    console.log('\n--- TESTING EXAM FLOW ---');
    const examRes = await api('/exams', 'POST', {
      title: `${RUN_ID} Final Exam`,
      courseId: ids.course,
      duration: 60,
      questions: [
        { id: 1, text: '2+2', type: 'MCQ', options: ['1', '2', '3', '4'], correctAnswer: 3 }
      ]
    }, tokens.teacher);
    if (examRes.status !== 201) throw new Error(`Exam creation failed: ${examRes.status} ${JSON.stringify(examRes.json)}`);
    ids.exam = examRes.json.id;
    console.log('✅ Teacher created exam');

    const attemptRes = await api(`/exams/${ids.exam}/submit`, 'POST', {
      answers: { '1': 3 }
    }, tokens.student);
    if (![200, 201].includes(attemptRes.status)) throw new Error(`Exam submission failed: ${attemptRes.status} ${JSON.stringify(attemptRes.json)}`);
    ids.attempt = attemptRes.json.id;
    console.log('✅ Student submitted exam');

    // 6. AI SOLVER TEST
    console.log('\n--- TESTING AI SOLVER ---');
    const aiRes = await api('/ai/solve', 'POST', { problem: 'x + 2 = 5', level: 'middle' }, tokens.student);
    if (aiRes.status !== 200 || !aiRes.json.solution) throw new Error(`AI Solver failed: ${aiRes.status} ${JSON.stringify(aiRes.json)}`);
    console.log('✅ AI Solver successful');
    
    // 7. PARENT VIEW TEST
    console.log('\n--- TESTING PARENT VIEW ---');
    const parentDashboard = await api('/analytics/parent', 'GET', null, tokens.parent);
    if (parentDashboard.status !== 200) throw new Error(`Parent dashboard failed: ${parentDashboard.status} ${JSON.stringify(parentDashboard.json)}`);
    console.log('✅ Parent dashboard successful');

    // 8. SECURITY & AUTHORIZATION TESTS
    console.log('\n--- TESTING SECURITY BOUNDARIES ---');
    // Student tries to create course
    const sec1 = await api('/courses', 'POST', { title: 'Hack', category: 'Math' }, tokens.student);
    if (sec1.status !== 403) throw new Error(`Security Fail: Student could create course (Status: ${sec1.status})`);
    console.log('✅ Student blocked from creating course');
    
    // Parent tries to fetch homework
    const sec2 = await api('/homework/student', 'GET', null, tokens.parent);
    if (sec2.status !== 403) throw new Error(`Security Fail: Parent could access student API (Status: ${sec2.status})`);
    console.log('✅ Parent blocked from direct student homework API');

    console.log('\n🎉 ALL E2E TESTS PASSED SUCCESSFULLY! Data flow verified.');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
  } finally {
    await cleanup();
  }
}

runTests();
