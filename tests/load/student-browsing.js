import http from 'k6/http';
import { check, sleep } from 'k6';
import { COURSE_URL, AUTH_URL, currentScenario, thresholds, headers } from './config.js';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  scenarios: {
    student_browsing: currentScenario,
  },
  thresholds,
};

export function setup() {
  const email = `testuser_${randomString(6)}@example.com`;
  const password = 'TestPassword123!';

  http.post(`${AUTH_URL}/api/auth/register`, JSON.stringify({
    name: 'Student Browsing Test',
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

  // Browse Courses
  const coursesRes = http.get(`${COURSE_URL}/api/courses`, { headers: headers(data.token) });
  check(coursesRes, { 'courses fetched': (r) => r.status === 200 });

  sleep(randomIntBetween(2, 5));

  // If there are courses, view the first one
  let courseList = coursesRes.json();
  if (Array.isArray(courseList) && courseList.length > 0) {
    const courseId = courseList[0].id;
    const detailRes = http.get(`${COURSE_URL}/api/courses/${courseId}`, { headers: headers(data.token) });
    check(detailRes, { 'course details fetched': (r) => r.status === 200 });
  }

  sleep(randomIntBetween(3, 10));
}
