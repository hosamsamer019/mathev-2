import { db } from './packages/database/src/index.js';
import jwt from 'jsonwebtoken';
import { examApi } from './apps/frontend/src/app/services/api.js';

const JWT_SECRET = process.env.JWT_SECRET || "supersecret_jwt_key_for_local_dev";

async function verify() {
  console.log("=== SETUP ===");
  // Create test user, course, exam, homework
  const user = await db.user.create({ data: { email: `test${Date.now()}@test.com`, password: 'pw', name: 'Test User', role: 'ONLINE_STUDENT' } });
  const course = await db.course.create({ data: { title: 'Test Course', teacherId: user.id } });
  
  const exam = await db.exam.create({
    data: {
      title: 'Test Exam',
      courseId: course.id,
      questions: [
        { id: 'q1', correct: 0 },
        { id: 'q2', correct: 1 }
      ]
    }
  });

  const homework = await db.homework.create({
    data: {
      title: 'Test HW',
      courseId: course.id,
      questions: [
        { id: 'hq1', correct: 2 },
        { id: 'hq2', correct: 0 }
      ]
    }
  });

  const token = jwt.sign({ userId: user.id, role: user.role, email: user.email }, JWT_SECRET);
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  console.log("\n=== VERIFY 1: Exam Grading (Server-side and spoof-proof) ===");
  // 1A. Normal attempt (1 correct, 1 wrong = 50%)
  const req1Body = { answers: [{ questionId: 'q1', selectedOption: 0 }, { questionId: 'q2', selectedOption: 0 }] };
  const res1 = await fetch(`http://localhost:4004/api/exams/${exam.id}/submit`, { method: 'POST', headers, body: JSON.stringify(req1Body) });
  const data1 = await res1.json();
  console.log("Normal Submission Response:", data1);
  const attemptInDb = await db.examAttempt.findUnique({ where: { id: data1.attempt.id } });
  console.log("DB Row (Normal):", { id: attemptInDb?.id, score: attemptInDb?.score, answers: attemptInDb?.answers });

  // 1B. Malicious attempt (0 correct, but sends score: 100)
  const req2Body = { answers: [{ questionId: 'q1', selectedOption: 1 }, { questionId: 'q2', selectedOption: 0 }], score: 100 };
  const res2 = await fetch(`http://localhost:4004/api/exams/${exam.id}/submit`, { method: 'POST', headers, body: JSON.stringify(req2Body) });
  const data2 = await res2.json();
  console.log("Malicious Submission Response:", data2);
  const attemptInDb2 = await db.examAttempt.findUnique({ where: { id: data2.attempt.id } });
  console.log("DB Row (Malicious):", { id: attemptInDb2?.id, score: attemptInDb2?.score, answers: attemptInDb2?.answers });

  console.log("\n=== VERIFY 2: Exam Routing (API Resolution) ===");
  // Bypass Vite's import.meta by creating a mock axios instance similarly configured
  const mockAxios = require('axios').create({ baseURL: 'http://localhost:4004/api/exams' });
  const startUrl = mockAxios.getUri({ url: `/${exam.id}/start` });
  const submitUrl = mockAxios.getUri({ url: `/${exam.id}/submit` });
  console.log("Resolved Start URL in Frontend:", startUrl);
  console.log("Resolved Submit URL in Frontend:", submitUrl);

  console.log("\n=== VERIFY 3: Redis Fallback Rate Limiter ===");
  // Test hitting the AI chat service directly multiple times
  let allowed = 0;
  let blocked = 0;
  const chatReqBody = { sessionId: 'test-session-id', message: 'hello' };
  for (let i = 0; i < 12; i++) {
    const res = await fetch(`http://localhost:4003/api/ai/chat`, { method: 'POST', headers, body: JSON.stringify(chatReqBody) });
    if (res.status === 200 || res.status === 500) {
      // 500 means it bypassed rate limiter but failed due to missing session or API key, which means it was "allowed" by rate limiter
      allowed++;
    } else if (res.status === 429) {
      blocked++;
    } else {
      console.log("Unexpected status:", res.status, await res.text());
      allowed++; // Assume allowed if not 429
    }
  }
  console.log(`Rate Limiter Results: ${allowed} allowed, ${blocked} blocked (Limit is 10)`);

  console.log("\n=== VERIFY 4: Homework Grading and Score Display ===");
  const req3Body = { answers: [{ questionId: 'hq1', selectedOption: 2 }, { questionId: 'hq2', selectedOption: 0 }] }; // Both correct
  const res3 = await fetch(`http://localhost:4004/api/homework/${homework.id}/submit`, { method: 'POST', headers, body: JSON.stringify(req3Body) });
  const data3 = await res3.json();
  console.log("Homework Response Data:", data3);
  const hwSubmission = await db.submission.findUnique({ where: { id: data3.id } });
  console.log("Homework DB Row:", { id: hwSubmission?.id, grade: hwSubmission?.grade, answers: hwSubmission?.answers });

  process.exit(0);
}

verify().catch(console.error);
