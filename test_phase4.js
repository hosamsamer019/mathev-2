const axios = require('axios');

async function runTests() {
  const log = (msg) => console.log('\n--- ' + msg + ' ---');
  const userApi = axios.create({ baseURL: 'http://localhost:4002/api/users', validateStatus: () => true });
  const authApi = axios.create({ baseURL: 'http://localhost:4001/api/auth', validateStatus: () => true });
  const courseApi = axios.create({ baseURL: 'http://localhost:4004/api/courses', validateStatus: () => true });
  const examApi = axios.create({ baseURL: 'http://localhost:4004/api/exams', validateStatus: () => true });
  const homeworkApi = axios.create({ baseURL: 'http://localhost:4004/api/homework', validateStatus: () => true });

  const delay = ms => new Promise(r => setTimeout(r, ms));
  
  // 1. Create Teacher 1, Teacher 2, Student 1, Student 2, Admin
  log('Setting up Test Users');
  const createUsr = async (u) => {
    let res = await authApi.post('/register', u);
    let login = await authApi.post('/login', { email: u.email, password: u.password });
    return login.data;
  };
  
  const p = 'Test@123';
  const admin = await createUsr({ name: 'Admin', email: 'ad2@test.com', password: p, role: 'admin' });
  const t1 = await createUsr({ name: 'T1', email: 't12@test.com', password: p, role: 'teacher' });
  const t2 = await createUsr({ name: 'T2', email: 't22@test.com', password: p, role: 'teacher' });
  const s1 = await createUsr({ name: 'S1', email: 's12@test.com', password: p, role: 'student_online' });
  const s2 = await createUsr({ name: 'S2', email: 's22@test.com', password: p, role: 'student_online' });

  // 2. Setup Courses & Enrollment
  log('Setting up Test Courses');
  const cRes1 = await courseApi.post('/', { title: 'T1 Course', description: 'Desc', teacherId: t1.user.id }, { headers: { Authorization: `Bearer ${t1.token}`} });
  const course1 = cRes1.data;
  const lRes1 = await courseApi.post(`/${course1.id}/lessons`, { title: 'T1 Lesson', courseId: course1.id, quizzes: [{timestampSec:10, question:'Q', correctAnswer:'A', options:['A','B']}] }, { headers: { Authorization: `Bearer ${t1.token}`} });
  const lesson1 = lRes1.data;
  const eRes1 = await examApi.post('/', { title: 'T1 Exam', courseId: course1.id }, { headers: { Authorization: `Bearer ${t1.token}`} });
  const exam1 = eRes1.data;
  const hRes1 = await homeworkApi.post('/', { title: 'T1 HW', courseId: course1.id }, { headers: { Authorization: `Bearer ${t1.token}`} });
  const hw1 = hRes1.data;

  // enroll s1 in course1 directly in DB
  const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
  const db = new PrismaClient();
  await db.courseEnrollment.create({ data: { studentId: s1.user.id, courseId: course1.id, status: 'ACTIVE' } }).catch(e=>{});

  // VERIFY 1: IDOR
  log('VERIFY 1: IDOR FIXES');
  const idor1 = await userApi.put(`/${s2.user.id}`, { name: 'Hacked' }, { headers: { Authorization: `Bearer ${s1.token}`} });
  console.log('Student 1 trying to edit Student 2 (PUT):', idor1.status, idor1.data);
  const idor2 = await userApi.delete(`/${s2.user.id}`, { headers: { Authorization: `Bearer ${s1.token}`} });
  console.log('Student 1 trying to delete Student 2 (DELETE):', idor2.status, idor2.data);
  const idor3 = await examApi.delete(`/${exam1.id}`, { headers: { Authorization: `Bearer ${s1.token}`} });
  console.log('Student 1 trying to delete Exam (DELETE):', idor3.status, idor3.data);

  // VERIFY 2: Teacher Ownership
  log('VERIFY 2: TEACHER OWNERSHIP');
  const own1 = await courseApi.delete(`/${course1.id}`, { headers: { Authorization: `Bearer ${t2.token}`} });
  console.log('Teacher 2 trying to delete Teacher 1 Course (DELETE):', own1.status, own1.data);
  const own2 = await courseApi.delete(`/${course1.id}/lessons/${lesson1.id}`, { headers: { Authorization: `Bearer ${t2.token}`} });
  console.log('Teacher 2 trying to delete Teacher 1 Lesson (DELETE):', own2.status, own2.data);

  // VERIFY 3: Enrollment Scoping
  log('VERIFY 3: ENROLLMENT SCOPING');
  // s2 (not enrolled)
  const sc1 = await courseApi.get(`/${course1.id}`, { headers: { Authorization: `Bearer ${s2.token}`} });
  console.log('Unenrolled Student getting course details:', sc1.status, sc1.data);
  const sc2 = await courseApi.get(`/${course1.id}/lessons/${lesson1.id}`, { headers: { Authorization: `Bearer ${s2.token}`} });
  console.log('Unenrolled Student getting lesson details:', sc2.status, sc2.data);
  const sc3 = await examApi.post(`/${exam1.id}/start`, {}, { headers: { Authorization: `Bearer ${s2.token}`} });
  console.log('Unenrolled Student starting exam:', sc3.status, sc3.data);
  const sc4 = await homeworkApi.post(`/${hw1.id}/submit`, { url:'test' }, { headers: { Authorization: `Bearer ${s2.token}`} });
  console.log('Unenrolled Student submitting HW:', sc4.status, sc4.data);

  // s1 (enrolled)
  const sce1 = await courseApi.get(`/${course1.id}`, { headers: { Authorization: `Bearer ${s1.token}`} });
  console.log('Enrolled Student getting course details:', sce1.status);
  const sce2 = await courseApi.get(`/${course1.id}/lessons/${lesson1.id}`, { headers: { Authorization: `Bearer ${s1.token}`} });
  console.log('Enrolled Student getting lesson details:', sce2.status);
  const sce3 = await examApi.post(`/${exam1.id}/start`, {}, { headers: { Authorization: `Bearer ${s1.token}`} });
  console.log('Enrolled Student starting exam:', sce3.status);

  // VERIFY 4: Anti-Spoof
  log('VERIFY 4: VIDEO PROGRESS SPOOFING');
  // First valid request
  await courseApi.post(`/${course1.id}/lessons/${lesson1.id}/progress`, { progress: 5, lastTimestamp: 5 }, { headers: { Authorization: `Bearer ${s1.token}`} });
  // Spoof request immediately
  const spoof = await courseApi.post(`/${course1.id}/lessons/${lesson1.id}/progress`, { progress: 100, lastTimestamp: 5000 }, { headers: { Authorization: `Bearer ${s1.token}`} });
  console.log('Spoofed rapid progress update (5 -> 100):', spoof.status, spoof.data);

  // VERIFY 5: Lesson Quiz
  log('VERIFY 5: LESSON QUIZ SANITIZATION & SERVER GRADING');
  const ldet = await courseApi.get(`/${course1.id}/lessons/${lesson1.id}`, { headers: { Authorization: `Bearer ${s1.token}`} });
  const quiz = ldet.data.quizzes?.[0] || {};
  console.log('Quiz data exposed to frontend:', Object.keys(quiz));
  console.log('Has correctAnswer in frontend?', quiz.hasOwnProperty('correctAnswer'));
  
  const qSubmit = await courseApi.post(`/${course1.id}/lessons/${lesson1.id}/quiz/${quiz.id}/submit`, { answer: 'A' }, { headers: { Authorization: `Bearer ${s1.token}`} });
  console.log('Submit correct answer to new endpoint:', qSubmit.status, qSubmit.data);
  const qSubmitWrong = await courseApi.post(`/${course1.id}/lessons/${lesson1.id}/quiz/${quiz.id}/submit`, { answer: 'B' }, { headers: { Authorization: `Bearer ${s1.token}`} });
  console.log('Submit wrong answer to new endpoint:', qSubmitWrong.status, qSubmitWrong.data);
}

runTests().catch(console.error);
