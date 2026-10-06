import express from 'express';
import http from 'http';
import { configureTrustProxy } from '@shared/utils';

async function testTrustProxyRuntime() {
  console.log('--- START SEC-013: TRUST PROXY RUNTIME VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  const app = express();
  configureTrustProxy(app);

  app.get('/test-ip', (req, res) => {
    res.json({
      ip: req.ip,
      ips: req.ips
    });
  });

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // Test 1: Direct request through 1 trusted proxy (Nginx)
    // Client IP: 203.0.113.50, Nginx adds to X-Forwarded-For
    const res1 = await fetch(`${baseUrl}/test-ip`, {
      headers: { 'X-Forwarded-For': '203.0.113.50' }
    });
    const body1 = await res1.json();

    if (body1.ip === '203.0.113.50') {
      console.log('✅ Test 1 Passed: Client IP correctly extracted through trusted Nginx proxy hop (203.0.113.50).');
      passed++;
    } else {
      console.error(`❌ Test 1 Failed: Expected 203.0.113.50, got ${body1.ip}`);
      failed++;
    }

    // Test 2: Attacker attempts IP spoofing by injecting fake upstream IP in X-Forwarded-For
    // Attacker IP: 203.0.113.99, Attacker sends spoofed header: "198.51.100.1, 203.0.113.99"
    // Express with trust proxy=1 must trust ONLY 1 proxy hop, taking 203.0.113.99, NOT the spoofed 198.51.100.1
    const res2 = await fetch(`${baseUrl}/test-ip`, {
      headers: { 'X-Forwarded-For': '198.51.100.1, 203.0.113.99' }
    });
    const body2 = await res2.json();

    if (body2.ip === '203.0.113.99') {
      console.log('✅ Test 2 Passed: Spoofed upstream IP ignored; real client IP 203.0.113.99 enforced.');
      passed++;
    } else {
      console.error(`❌ Test 2 Failed: IP spoofing succeeded! Express returned ${body2.ip}`);
      failed++;
    }

    // Test 3: Two distinct client IPs produce distinct rate-limiting identities
    const res3A = await fetch(`${baseUrl}/test-ip`, { headers: { 'X-Forwarded-For': '192.0.2.1' } });
    const res3B = await fetch(`${baseUrl}/test-ip`, { headers: { 'X-Forwarded-For': '192.0.2.2' } });
    const body3A = await res3A.json();
    const body3B = await res3B.json();

    if (body3A.ip !== body3B.ip && body3A.ip === '192.0.2.1' && body3B.ip === '192.0.2.2') {
      console.log('✅ Test 3 Passed: Distinct clients produce isolated IP identities (192.0.2.1 vs 192.0.2.2).');
      passed++;
    } else {
      console.error(`❌ Test 3 Failed: Distinct clients were not isolated.`);
      failed++;
    }

    console.log(`--- SEC-013 RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  } finally {
    server.close();
  }

  if (failed > 0) process.exit(1);
}

testTrustProxyRuntime();
