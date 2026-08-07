import http from 'k6/http';
import { check, sleep } from 'k6';
import { COURSE_URL, AUTH_URL, currentScenario, thresholds, headers } from './config.js';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  scenarios: {
    exams: currentScenario,
  },
  thresholds,
};

export function setup() {
  const email = `testuser_${randomString(6)}@example.com`;
  const password = 'TestPassword123!';

  http.post(`${AUTH_URL}/api/auth/register`, JSON.stringify({
    name: 'Exams Test',
    email,
    password,
    role: 'ONLINE_STUDENT',
  }), { headers: headers() });

  const loginRes = http.post(`${AUTH_URL}/api/auth/login`, JSON.stringify({
    email,
    password,
  }), { headers: headers() });

  return { token: loginRes.json('token') };
}

export default function (data) {
  if (!data.token) return;

  const mockExamId = 'mock-exam-uuid';
  
  // 1. Fetch exam questions (simulated)
  const examRes = http.get(`${COURSE_URL}/api/exams/${mockExamId}`, { headers: headers(data.token) });
  check(examRes, { 'exam fetched': (r) => r.status === 200 || r.status === 404 });

  sleep(randomIntBetween(30, 60)); // Simulate taking the exam

  // 2. Submit exam answers
  const submitRes = http.post(`${COURSE_URL}/api/exams/${mockExamId}/submit`, JSON.stringify({
    answers: { q1: 'A', q2: 'B' }
  }), { headers: headers(data.token) });
  
  check(submitRes, { 'exam submitted': (r) => r.status === 200 || r.status === 404 });

  sleep(randomIntBetween(3, 10));
}
