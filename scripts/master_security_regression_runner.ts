import { execSync } from 'child_process';

interface SuiteResult {
  name: string;
  command: string;
  passed: boolean;
  output: string;
}

const suites = [
  { name: 'SEC-011: Parent Takeover 7-Scenario Runtime Test', cmd: 'npx.cmd tsx services/user-service/sec011_runtime.test.ts' },
  { name: 'SEC-001 & SEC-002: Exam BOLA & Answer Leak Runtime Test', cmd: 'npx.cmd tsx services/course-service/sec001_sec002_runtime.test.ts' },
  { name: 'SEC-003: Payment Price Integrity 5-Case Runtime Test', cmd: 'npx.cmd tsx services/course-service/sec003_runtime.test.ts' },
  { name: 'SEC-004: Socket.IO Event Isolation Runtime Test', cmd: 'npx.cmd tsx services/course-service/sec004_runtime.test.ts' },
  { name: 'SEC-005 & SEC-007: CORS & Pagination Runtime Test', cmd: 'npx.cmd tsx services/auth-service/cors_pagination_runtime.test.ts' },
  { name: 'SEC-008: Video Ticket & SSRF Runtime Test', cmd: 'npx.cmd tsx services/course-service/video_security_runtime.test.ts' },
  { name: 'SEC-009: 15m Auth, Session & Redis Revocation Runtime Test', cmd: 'npx.cmd tsx services/auth-service/sec009_runtime.test.ts' },
  { name: 'SEC-012: PostgreSQL Database RLS State Audit', cmd: 'npx.cmd tsx scripts/verify_sec012_rls.ts' },
  { name: 'SEC-013: Express Trust Proxy & IP Spoofing Runtime Test', cmd: 'npx.cmd tsx services/auth-service/trust_proxy_runtime.test.ts' },
  { name: 'Phase 3 Suite: SEC-011 Unit Test', cmd: 'npx.cmd tsx services/user-service/sec011.test.ts' },
  { name: 'Phase 3 Suite: SEC-001/002 Unit Test', cmd: 'npx.cmd tsx services/course-service/sec001_sec002.test.ts' },
  { name: 'Phase 3 Suite: SEC-003 Payment Unit Test', cmd: 'npx.cmd tsx services/course-service/sec003.test.ts' },
  { name: 'Phase 3 Suite: CORS & Proxy Unit Test', cmd: 'npx.cmd tsx services/auth-service/cors_proxy.test.ts' },
  { name: 'Phase 3 Suite: Video Security Unit Test', cmd: 'npx.cmd tsx services/course-service/video_security.test.ts' },
  { name: 'Phase 3 Suite: SEC-009 Session Unit Test', cmd: 'npx.cmd tsx services/auth-service/sec009.test.ts' }
];

console.log('================================================================');
console.log('  AL-SADEN PLATFORM: MASTER SECURITY REGRESSION SUITE RUNNER');
console.log('================================================================\n');

let totalSuites = 0;
let passedSuites = 0;
let failedSuites = 0;

for (const suite of suites) {
  totalSuites++;
  try {
    const out = execSync(suite.cmd, { stdio: 'pipe' }).toString();
    console.log(`✅ [PASSED] ${suite.name}`);
    passedSuites++;
  } catch (err: any) {
    console.error(`❌ [FAILED] ${suite.name}`);
    console.error(err.stdout ? err.stdout.toString() : err.message);
    failedSuites++;
  }
}

console.log('\n================================================================');
console.log(`SUMMARY: ${passedSuites} / ${totalSuites} Test Suites PASSED (${failedSuites} Failed)`);
console.log('================================================================\n');

if (failedSuites > 0) process.exit(1);
