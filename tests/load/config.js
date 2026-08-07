/**
 * AL-SADEN Load Testing Configuration
 */

// Define the target API URL based on environment
export const BASE_URL = __ENV.BASE_URL || 'http://localhost';
export const AUTH_URL = `${BASE_URL}:4001`; // Or API Gateway port if Nginx is configured
export const USER_URL = `${BASE_URL}:4002`;
export const COURSE_URL = `${BASE_URL}:4004`;
export const ANALYTICS_URL = `${BASE_URL}:4005`;

// If hitting the Nginx API gateway in production:
export const API_GATEWAY = __ENV.API_GATEWAY || 'http://localhost';

// Determine the scale of the test
const testScale = __ENV.SCALE || 'validation';

// Define scenarios for different scale limits
export const scenarios = {
  // Local 50-user validation (NOT FOR CAPACITY PLANNING)
  validation: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50 },
      { duration: '1m', target: 50 },
      { duration: '30s', target: 0 },
    ],
  },
  // 100 concurrent users
  tier_100: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '1m', target: 0 },
    ],
  },
  // 1,000 concurrent users
  tier_1000: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '3m', target: 1000 },
      { duration: '10m', target: 1000 },
      { duration: '2m', target: 0 },
    ],
  },
  // 5,000 concurrent users
  tier_5000: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 5000 },
      { duration: '15m', target: 5000 },
      { duration: '3m', target: 0 },
    ],
  },
  // 10,000 concurrent users
  tier_10000: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10m', target: 10000 },
      { duration: '20m', target: 10000 },
      { duration: '5m', target: 0 },
    ],
  }
};

export const currentScenario = scenarios[testScale] || scenarios.validation;

// Universal thresholds that mark the acceptance criteria (SLOs)
export const thresholds = {
  http_req_duration: ['p(95)<300', 'p(99)<500'], // 95% of requests must complete below 300ms
  http_req_failed: ['rate<0.01'],                // Error rate must be less than 1%
};

// Helper for generating standard headers
export function headers(token = null) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}
