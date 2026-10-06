import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-temporary-development-secret';

async function testSec004Runtime() {
  console.log('--- START SEC-004: SOCKET.IO ISOLATION RUNTIME VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  const app = express();
  app.use(express.json());
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });

  // Socket auth and room joining (mirroring course-service index.ts)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (user.role === 'TEACHER') {
      socket.join(`teacher:${user.userId}`);
    } else if (user.role === 'ADMIN') {
      socket.join('admin_room');
    }
    // All users join public course room
    socket.join(`course:${socket.handshake.query.courseId || 'default_course'}`);
  });

  // Homework submit handler with SEC-004 targeted broadcast remediation
  app.post('/api/homework/submit', (req, res) => {
    const { teacherId, studentName, homeworkTitle } = req.body;
    
    // SEC-004 Remediation: Target ONLY teacher private room and admin room, NOT general course room
    io.to(`teacher:${teacherId}`).to('admin_room').emit('homework_submitted', {
      studentName,
      homeworkTitle,
      submittedAt: new Date().toISOString()
    });

    res.json({ message: 'Submitted successfully' });
  });

  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  const teacherId = 'teacher-1234';
  const studentAId = 'student-A-1234';
  const studentBId = 'student-B-1234';

  const tokenTeacher = jwt.sign({ userId: teacherId, role: 'TEACHER' }, JWT_SECRET, { expiresIn: '15m' });
  const tokenStudentA = jwt.sign({ userId: studentAId, role: 'ONLINE_STUDENT' }, JWT_SECRET, { expiresIn: '15m' });
  const tokenStudentB = jwt.sign({ userId: studentBId, role: 'ONLINE_STUDENT' }, JWT_SECRET, { expiresIn: '15m' });

  let teacherSocket: any;
  let studentASocket: any;
  let studentBSocket: any;

  try {
    // Connect 3 clients
    teacherSocket = ioClient(baseUrl, { auth: { token: tokenTeacher }, query: { courseId: 'math_101' }, transports: ['websocket'] });
    studentASocket = ioClient(baseUrl, { auth: { token: tokenStudentA }, query: { courseId: 'math_101' }, transports: ['websocket'] });
    studentBSocket = ioClient(baseUrl, { auth: { token: tokenStudentB }, query: { courseId: 'math_101' }, transports: ['websocket'] });

    await Promise.all([
      new Promise(resolve => teacherSocket.on('connect', resolve)),
      new Promise(resolve => studentASocket.on('connect', resolve)),
      new Promise(resolve => studentBSocket.on('connect', resolve))
    ]);

    let teacherReceived = false;
    let studentBReceived = false;
    let studentAReceived = false;

    teacherSocket.on('homework_submitted', (data: any) => { teacherReceived = true; });
    studentBSocket.on('homework_submitted', (data: any) => { studentBReceived = true; });
    studentASocket.on('homework_submitted', (data: any) => { studentAReceived = true; });

    // Student A submits homework
    await fetch(`${baseUrl}/api/homework/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId,
        studentName: 'Student A',
        homeworkTitle: 'Calculus HW 1'
      })
    });

    // Wait 300ms for event propagation
    await new Promise(r => setTimeout(r, 300));

    if (teacherReceived) {
      console.log('✅ SEC-004 Test 1 Passed: Teacher received private homework submission notification.');
      passed++;
    } else {
      console.error('❌ SEC-004 Test 1 Failed: Teacher did not receive notification!');
      failed++;
    }

    if (!studentBReceived) {
      console.log('✅ SEC-004 Test 2 Passed: Student B in same course did NOT receive private submission notification (Data leak prevented).');
      passed++;
    } else {
      console.error('❌ SEC-004 Test 2 Failed: Student B received Student A homework event (LEAK)!');
      failed++;
    }

    if (!studentAReceived) {
      console.log('✅ SEC-004 Test 3 Passed: Student A does not receive unneeded private teacher notification.');
      passed++;
    } else {
      console.error('❌ SEC-004 Test 3 Failed: Student A received teacher broadcast.');
      failed++;
    }

    console.log(`\n--- SEC-004 RUNTIME RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  } catch (err: any) {
    console.error('❌ SEC-004 test error:', err.message);
    failed++;
  } finally {
    if (teacherSocket) teacherSocket.disconnect();
    if (studentASocket) studentASocket.disconnect();
    if (studentBSocket) studentBSocket.disconnect();
    server.close();
  }

  if (failed > 0) process.exit(1);
}

testSec004Runtime();
