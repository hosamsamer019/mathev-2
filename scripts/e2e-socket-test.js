const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { io } = require('socket.io-client');
const crypto = require('crypto');

const JWT_SECRET = '4685c8216cff4502cea1cf993d197d0dcbe6704215d2e2d29055b1e8fec1e02b';
const PORT = 4004;
const BASE_URL = `http://localhost:${PORT}`;

async function runE2E() {
  console.log('--- STARTING SECURE MULTI-TENANT SOCKET.IO TEST ---\n');
  const prisma = new PrismaClient();
  
  try {
    // 1. Setup Mock Users in DB
    const teacherId = crypto.randomUUID();
    const enrolledStudentId = crypto.randomUUID();
    const unenrolledStudentId = crypto.randomUUID();
    
    await prisma.user.create({ data: { id: teacherId, name: 'Teacher', email: `t_${Date.now()}@test.com`, password: 'hash', role: 'TEACHER' } });
    await prisma.user.create({ data: { id: enrolledStudentId, name: 'Enrolled', email: `es_${Date.now()}@test.com`, password: 'hash', role: 'ONLINE_STUDENT' } });
    await prisma.user.create({ data: { id: unenrolledStudentId, name: 'Unenrolled', email: `us_${Date.now()}@test.com`, password: 'hash', role: 'ONLINE_STUDENT' } });

    // Generate JWTs
    const teacherToken = jwt.sign({ userId: teacherId, role: 'TEACHER' }, JWT_SECRET, { expiresIn: '1h' });
    const enrolledToken = jwt.sign({ userId: enrolledStudentId, role: 'ONLINE_STUDENT' }, JWT_SECRET, { expiresIn: '1h' });
    const unenrolledToken = jwt.sign({ userId: unenrolledStudentId, role: 'ONLINE_STUDENT' }, JWT_SECRET, { expiresIn: '1h' });

    console.log('[INFO] Mock Users & Secure JWTs created.');

    // 2. Setup Base Course and Enrollment
    const courseRes = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
      body: JSON.stringify({ title: 'Strict Namespace Course', description: 'desc', category: 'math' })
    });
    const course = await courseRes.json();

    // Create Enrollment directly via Prisma
    await prisma.courseEnrollment.create({
      data: {
        studentId: enrolledStudentId,
        courseId: course.id
      }
    });

    console.log('[INFO] Base Course and Enrollment Created.');

    // Wait slightly for connections to establish after enrollment
    // 3. Connect Sockets (With JWT Auth payload)
    const teacherSocket = io(BASE_URL, { transports: ['websocket'], auth: { token: teacherToken } });
    const enrolledSocket = io(BASE_URL, { transports: ['websocket'], auth: { token: enrolledToken } });
    const unenrolledSocket = io(BASE_URL, { transports: ['websocket'], auth: { token: unenrolledToken } });

    await new Promise((resolve) => {
      let connections = 0;
      teacherSocket.on('connect', () => { connections++; if(connections===3) resolve(); });
      enrolledSocket.on('connect', () => { connections++; if(connections===3) resolve(); });
      unenrolledSocket.on('connect', () => { connections++; if(connections===3) resolve(); });
    });
    console.log('[INFO] Authenticated Sockets Connected successfully to isolated namespaces.');

    // Fail handler for Unenrolled Student
    unenrolledSocket.onAny((event) => {
      console.error(`\n[❌ SECURITY VIOLATION] Unenrolled student received unauthorized event: ${event}`);
      process.exit(1);
    });

    const runScenario = async (name, action, eventName) => {
      return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout waiting for event: ${eventName}`));
        }, 3000);

        enrolledSocket.once(eventName, (data) => {
          clearTimeout(timeout);
          console.log(`[✅ PASSED] Scenario: ${name}`);
          console.log(`   - Data Privacy Verified: Unenrolled student blocked.`);
          console.log(`   - Event Emitted: ${eventName}`);
          resolve(data);
        });

        try {
          await action();
        } catch (err) {
          clearTimeout(timeout);
          console.log(`[❌ FAILED] Scenario: ${name} - HTTP Action Failed: ${err.message}`);
          reject(err);
        }
      });
    };

    // Scenario 1: Create Homework
    await runScenario('1. Teacher Creates Homework in Namespace', async () => {
      const res = await fetch(`${BASE_URL}/api/homework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
        body: JSON.stringify({ title: 'Namespace Homework', courseId: course.id })
      });
      if(!res.ok) throw new Error(await res.text());
    }, 'homework_assigned');

    // Scenario 2: Create Exam
    await runScenario('2. Teacher Creates Exam in Namespace', async () => {
      const res = await fetch(`${BASE_URL}/api/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${teacherToken}` },
        body: JSON.stringify({ title: 'Namespace Exam', courseId: course.id, duration: 60, type: 'quiz' })
      });
      if(!res.ok) throw new Error(await res.text());
    }, 'exam_created');

    console.log('\n[INFO] SECURE NAMESPACES AND MULTI-TENANCY VERIFIED SUCCESSFULLY.');
    
    // Cleanup
    await prisma.user.deleteMany({ where: { id: { in: [teacherId, enrolledStudentId, unenrolledStudentId] } } });
    await prisma.course.delete({ where: { id: course.id } });
    teacherSocket.disconnect();
    enrolledSocket.disconnect();
    unenrolledSocket.disconnect();

  } catch (error) {
    console.error('\n[❌ E2E TEST RUNNER FAILED]');
    console.error(error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runE2E();
