import http from 'k6/http';
import { check, sleep } from 'k6';
import { AUTH_URL, currentScenario, thresholds, headers } from './config.js';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  scenarios: {
    auth_stress: currentScenario,
  },
  thresholds,
};

// This test focuses purely on auth bottlenecks
export default function () {
  const email = `testuser_${randomString(8)}@example.com`;
  const password = 'TestPassword123!';

  // 1. Register
  const registerRes = http.post(`${AUTH_URL}/api/auth/register`, JSON.stringify({
    name: 'Load Test User',
    email,
    password,
    role: 'ONLINE_STUDENT',
  }), { headers: headers() });

  check(registerRes, {
    'register success': (r) => r.status === 201,
  });

  sleep(1);

  // 2. Login
  const loginRes = http.post(`${AUTH_URL}/api/auth/login`, JSON.stringify({
    email,
    password,
    deviceName: 'k6-load-tester'
  }), { headers: headers() });

  check(loginRes, {
    'login success': (r) => r.status === 200,
    'has token': (r) => r.json('token') !== undefined,
  });

  const token = loginRes.json('token');
  const refreshToken = loginRes.json('refreshToken');

  sleep(2);

  // 3. Refresh Token
  if (refreshToken) {
    const refreshRes = http.post(`${AUTH_URL}/api/auth/refresh`, JSON.stringify({
      token: refreshToken
    }), { headers: headers() });

    check(refreshRes, {
      'refresh success': (r) => r.status === 200,
    });
  }

  sleep(1);

  // 4. Validate Me
  if (token) {
    const meRes = http.get(`${AUTH_URL}/api/auth/me`, { headers: headers(token) });
    check(meRes, {
      'me profile fetch success': (r) => r.status === 200,
    });
  }

  sleep(1);
}
