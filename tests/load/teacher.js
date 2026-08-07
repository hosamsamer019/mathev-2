import http from 'k6/http';
import { check, sleep } from 'k6';
import { COURSE_URL, AUTH_URL, currentScenario, thresholds, headers } from './config.js';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  scenarios: {
    teacher_activity: currentScenario,
  },
  thresholds,
};

export function setup() {
  const email = `testuser_${randomString(6)}@example.com`;
  const password = 'TestPassword123!';

  http.post(`${AUTH_URL}/api/auth/register`, JSON.stringify({
    name: 'Teacher Load Test',
    email,
    password,
    role: 'TEACHER',
  }), { headers: headers() });

  const loginRes = http.post(`${AUTH_URL}/api/auth/login`, JSON.stringify({
    email,
    password,
  }), { headers: headers() });

  return { token: loginRes.json('token') };
}

export default function (data) {
  if (!data.token) return;

  // 1. Fetch teacher courses
  const coursesRes = http.get(`${COURSE_URL}/api/courses/teacher`, { headers: headers(data.token) });
  check(coursesRes, { 'courses fetched': (r) => r.status === 200 });
  
  sleep(randomIntBetween(2, 5));

  // 2. Fetch upload statuses (simulating checking video processing dashboard)
  const uploadsRes = http.get(`${COURSE_URL}/api/uploads/status/mock-id`, { headers: headers(data.token) });
  check(uploadsRes, { 'upload status fetched': (r) => r.status === 404 || r.status === 200 }); // 404 is fine as mock-id doesn't exist

  sleep(randomIntBetween(3, 10));
}
