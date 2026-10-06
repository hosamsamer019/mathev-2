import { createCorsOptions, configureTrustProxy } from '@shared/utils';
import express from 'express';

async function runCorsProxyTests() {
  console.log('--- START CORS & TRUST PROXY REGRESSION TESTS ---');
  let passed = 0;
  let failed = 0;

  // Test 1: Trust proxy configuration
  {
    const app = express();
    configureTrustProxy(app);
    const trustProxyValue = app.get('trust proxy');
    if (trustProxyValue !== undefined) {
      console.log(`✅ Test 1 Passed: Trust proxy configured (${trustProxyValue}).`);
      passed++;
    } else {
      console.error('❌ Test 1 Failed: Trust proxy not set.');
      failed++;
    }
  }

  // Test 2: CORS Allowlist rejection of unauthorized / lookalike origins
  {
    process.env.ALLOWED_ORIGINS = 'https://saden-math.com,https://app.saden-math.com';
    const corsOptions = createCorsOptions();
    let allowed: boolean | undefined;
    let receivedErr: Error | null = null;

    // A. Authorized origin
    corsOptions.origin('https://saden-math.com', (err, allow) => {
      receivedErr = err;
      allowed = allow;
    });
    if (!receivedErr && allowed === true) {
      console.log('✅ Test 2A Passed: Authoritative origin allowed.');
      passed++;
    } else {
      console.error('❌ Test 2A Failed: Authoritative origin rejected.', receivedErr);
      failed++;
    }

    // B. Lookalike / substring spoofing origin (e.g. evil-vercel.app or saden-math.com.attacker.com)
    receivedErr = null;
    allowed = undefined;
    corsOptions.origin('https://saden-math.com.attacker.com', (err, allow) => {
      receivedErr = err;
      allowed = allow;
    });
    if (receivedErr && receivedErr.message.includes('Not allowed by CORS')) {
      console.log('✅ Test 2B Passed: Lookalike spoofing origin rejected.');
      passed++;
    } else {
      console.error('❌ Test 2B Failed: Lookalike origin was unexpectedly accepted.', allowed);
      failed++;
    }

    // C. Random unauthorized vercel domain
    receivedErr = null;
    allowed = undefined;
    corsOptions.origin('https://attacker-random-site.vercel.app', (err, allow) => {
      receivedErr = err;
      allowed = allow;
    });
    if (receivedErr && receivedErr.message.includes('Not allowed by CORS')) {
      console.log('✅ Test 2C Passed: Arbitrary vercel.app domain rejected.');
      passed++;
    } else {
      console.error('❌ Test 2C Failed: Arbitrary vercel.app domain was unexpectedly accepted.', allowed);
      failed++;
    }
  }

  console.log(`--- CORS & TRUST PROXY RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runCorsProxyTests().catch(err => {
  console.error('Fatal error in CORS & Proxy test:', err);
  process.exit(1);
});
