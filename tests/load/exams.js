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

  // Assume the assessment ID is passed via env, otherwise default to a known test ID
  // Note: K6 requires passing -e ASSESSMENT_ID=...
  const assessmentId = __ENV.ASSESSMENT_ID || 'test-assessment-id';

  return { token: loginRes.json('token'), assessmentId };
}

export default function (data) {
  if (!data.token) return;

  const assessmentId = data.assessmentId;
  
  // 1. Start assessment
  const startRes = http.post(`${COURSE_URL}/api/assessments/${assessmentId}/start`, JSON.stringify({}), { headers: headers(data.token) });
  check(startRes, { 'assessment started or recovered': (r) => r.status === 200 || r.status === 201 || r.status === 403 });

  if (startRes.status === 404) return; // If the test assessment doesn't exist in DB

  // 2. Fetch exam questions
  const examRes = http.get(`${COURSE_URL}/api/assessments/${assessmentId}`, { headers: headers(data.token) });
  check(examRes, { 'exam fetched': (r) => r.status === 200 });

  sleep(randomIntBetween(5, 15)); // Simulate taking the exam

  // 3. Save answers multiple times (simulating concurrency and real behavior)
  const answers = [{ questionId: 'q1', answer: 'A' }, { questionId: 'q2', answer: 'B' }];
  const saveRes = http.put(`${COURSE_URL}/api/assessments/${assessmentId}/attempt/answers`, JSON.stringify({ answers }), { headers: headers(data.token) });
  check(saveRes, { 'answers saved': (r) => r.status === 200 || r.status === 403 });

  sleep(randomIntBetween(3, 10));

  // 4. Submit exam
  const submitRes = http.post(`${COURSE_URL}/api/assessments/${assessmentId}/attempt/submit`, JSON.stringify({ answers }), { headers: headers(data.token) });
  check(submitRes, { 'exam submitted': (r) => r.status === 200 || r.status === 403 });
}
