import express from 'express';
import http from 'http';
import cors from 'cors';
import { createCorsOptions, parsePaginationParams } from '@shared/utils';

async function testCorsAndPaginationRuntime() {
  console.log('--- START SEC-005 (CORS) & SEC-007 (PAGINATION) RUNTIME VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  process.env.ALLOWED_ORIGINS = 'https://al-saden.edu.eg,https://staging.al-saden.edu.eg';

  const app = express();
  app.use(cors(createCorsOptions()));

  // Simulated pagination endpoint using standardized bounding logic
  app.get('/api/test-pagination', (req, res) => {
    const { page, limit, skip } = parsePaginationParams(req.query);
    res.json({ page, limit, skip });
  });

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // --- SEC-005 CORS TESTS ---
    // Test 1: Allowed Origin
    const res1 = await fetch(`${baseUrl}/api/test-pagination`, {
      headers: { 'Origin': 'https://al-saden.edu.eg' }
    });
    if (res1.headers.get('access-control-allow-origin') === 'https://al-saden.edu.eg') {
      console.log('✅ SEC-005 Test 1 Passed: Authoritative origin allowed (https://al-saden.edu.eg).');
      passed++;
    } else {
      console.error('❌ SEC-005 Test 1 Failed: Authoritative origin not allowed.');
      failed++;
    }

    // Test 2: Malicious Lookalike Substring Domain (e.g., https://evilvercel.app)
    const res2 = await fetch(`${baseUrl}/api/test-pagination`, {
      headers: { 'Origin': 'https://evilvercel.app' }
    });
    if (!res2.headers.get('access-control-allow-origin')) {
      console.log('✅ SEC-005 Test 2 Passed: Malicious lookalike domain rejected (https://evilvercel.app).');
      passed++;
    } else {
      console.error('❌ SEC-005 Test 2 Failed: Lookalike origin was allowed!');
      failed++;
    }

    // Test 3: Malicious Subdomain Spoofing (e.g., https://al-saden.edu.eg.attacker.com)
    const res3 = await fetch(`${baseUrl}/api/test-pagination`, {
      headers: { 'Origin': 'https://al-saden.edu.eg.attacker.com' }
    });
    if (!res3.headers.get('access-control-allow-origin')) {
      console.log('✅ SEC-005 Test 3 Passed: Subdomain prefix spoof rejected (https://al-saden.edu.eg.attacker.com).');
      passed++;
    } else {
      console.error('❌ SEC-005 Test 3 Failed: Prefix spoof was allowed!');
      failed++;
    }

    // Test 4: Preflight OPTIONS request for allowed origin
    const res4 = await fetch(`${baseUrl}/api/test-pagination`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://al-saden.edu.eg',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    });
    if (res4.headers.get('access-control-allow-origin') === 'https://al-saden.edu.eg') {
      console.log('✅ SEC-005 Test 4 Passed: CORS OPTIONS preflight handled correctly.');
      passed++;
    } else {
      console.error('❌ SEC-005 Test 4 Failed: Preflight not allowed.');
      failed++;
    }

    // --- SEC-007 PAGINATION BOUNDS TESTS ---
    const paginationTestCases = [
      { input: '1', expected: 1, label: 'limit=1' },
      { input: '10', expected: 10, label: 'limit=10' },
      { input: '100', expected: 100, label: 'limit=100' },
      { input: '101', expected: 100, label: 'limit=101 (capped to 100)' },
      { input: '999999999', expected: 100, label: 'limit=999999999 (capped to 100)' },
      { input: '-1', expected: 1, label: 'limit=-1 (bounded to min 1)' },
      { input: '0', expected: 1, label: 'limit=0 (bounded to min 1)' },
      { input: 'abc', expected: 10, label: 'limit=abc (falls back to default 10)' },
      { input: '1e9', expected: 100, label: 'limit=1e9 (capped to 100)' }
    ];

    for (const tc of paginationTestCases) {
      const res = await fetch(`${baseUrl}/api/test-pagination?limit=${tc.input}`);
      const body = await res.json();
      if (body.limit === tc.expected) {
        console.log(`✅ SEC-007 Passed: ${tc.label} -> resolved to ${body.limit}`);
        passed++;
      } else {
        console.error(`❌ SEC-007 Failed: ${tc.label} -> expected ${tc.expected}, got ${body.limit}`);
        failed++;
      }
    }

    console.log(`\n--- SEC-005 & SEC-007 RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  } finally {
    server.close();
  }

  if (failed > 0) process.exit(1);
}

testCorsAndPaginationRuntime();
