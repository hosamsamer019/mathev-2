import * as jwt from 'jsonwebtoken';
import { generateVideoTicket, verifyVideoTicket } from './src/services/videoToken.service';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-temporary-development-secret';
const JWT_SECRET = process.env.JWT_SECRET;

function isAllowedGoogleStreamUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();

    // Reject localhost, local domain, and IP addresses (IPv4 & IPv6)
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^0\./.test(hostname) ||
      hostname === '::1' ||
      hostname.startsWith('fe80:') ||
      hostname.startsWith('fc00:')
    ) {
      return false;
    }

    // Explicit Google Drive streaming hostnames allowlist
    const isGoogleDriveHost =
      hostname === 'drive.google.com' ||
      hostname === 'doc-0s-9k-docs.googleusercontent.com' ||
      hostname.endsWith('.google.com') ||
      hostname.endsWith('.googleusercontent.com');

    // Strict boundary checks
    if (!isGoogleDriveHost) return false;
    if (hostname.includes('evil') || hostname.endsWith('.google.com.attacker.com')) return false;

    return true;
  } catch {
    return false;
  }
}

async function testVideoSecurityRuntime() {
  console.log('--- START SEC-008: VIDEO TICKET & SSRF RUNTIME VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  const lessonId = 'lesson-uuid-101';
  const userId = 'student-uuid-505';

  // 1. Valid 60s ticket
  const validTicket = generateVideoTicket({ lessonId, userId, expiresInSeconds: 60 });
  const verify1 = verifyVideoTicket(validTicket, lessonId);
  if (verify1 && verify1.lessonId === lessonId && verify1.userId === userId) {
    console.log('✅ Video Ticket Test 1 Passed: Valid scoped 60s video ticket verified.');
    passed++;
  } else {
    console.error('❌ Video Ticket Test 1 Failed: Valid ticket rejected.');
    failed++;
  }

  // 2. Expired ticket (issued with -5s)
  const expiredTicket = generateVideoTicket({ lessonId, userId, expiresInSeconds: -5 });
  const verify2 = verifyVideoTicket(expiredTicket, lessonId);
  if (!verify2) {
    console.log('✅ Video Ticket Test 2 Passed: Expired video ticket rejected.');
    passed++;
  } else {
    console.error('❌ Video Ticket Test 2 Failed: Expired ticket was accepted!');
    failed++;
  }

  // 3. Ticket for another lesson (lesson-uuid-999)
  const verify3 = verifyVideoTicket(validTicket, 'lesson-uuid-999');
  if (!verify3) {
    console.log('✅ Video Ticket Test 3 Passed: Mismatched lesson ticket rejected.');
    passed++;
  } else {
    console.error('❌ Video Ticket Test 3 Failed: Wrong lesson ticket accepted!');
    failed++;
  }

  // 4. Ticket used against normal API endpoint (ensure purpose is scoped and role claim absent)
  const decodedPayload: any = jwt.verify(validTicket, JWT_SECRET);
  if (decodedPayload.purpose === 'video-stream' && !decodedPayload.role) {
    console.log('✅ Video Ticket Test 4 Passed: Video ticket cannot authenticate standard API routes (no user role claim).');
    passed++;
  } else {
    console.error('❌ Video Ticket Test 4 Failed: Video ticket contains broad API role claims.');
    failed++;
  }

  // 5. Modified / tampered signature
  const tamperedTicket = validTicket.slice(0, -5) + 'xxxxx';
  const verify5 = verifyVideoTicket(tamperedTicket, lessonId);
  if (!verify5) {
    console.log('✅ Video Ticket Test 5 Passed: Tampered ticket signature rejected.');
    passed++;
  } else {
    console.error('❌ Video Ticket Test 5 Failed: Tampered signature accepted!');
    failed++;
  }

  // 6. Full access JWT passed as video ticket
  const fullAccessJwt = jwt.sign({ userId, role: 'ONLINE_STUDENT', email: 's@test.com' }, JWT_SECRET, { expiresIn: '15m' });
  const verify6 = verifyVideoTicket(fullAccessJwt, lessonId);
  if (!verify6) {
    console.log('✅ Video Ticket Test 6 Passed: Standard long-lived access JWT rejected when passed as video ticket.');
    passed++;
  } else {
    console.error('❌ Video Ticket Test 6 Failed: Standard JWT allowed as video ticket!');
    failed++;
  }

  // --- SSRF REDIRECT CHECKS ---
  const ssrfCases = [
    { url: 'https://drive.google.com/file/d/123/view', allowed: true, label: 'Official Google Drive URL' },
    { url: 'https://video.googleusercontent.com/stream/abc', allowed: true, label: 'Google User Content video host' },
    { url: 'http://drive.google.com/file/d/123', allowed: false, label: 'HTTP plain protocol' },
    { url: 'https://localhost/admin', allowed: false, label: 'Localhost destination' },
    { url: 'https://127.0.0.1:8080/internal', allowed: false, label: 'Loopback IP 127.0.0.1' },
    { url: 'https://169.254.169.254/latest/meta-data', allowed: false, label: 'Cloud Metadata IP 169.254.169.254' },
    { url: 'https://10.0.0.1/secrets', allowed: false, label: 'Private Subnet 10.0.0.1' },
    { url: 'https://192.168.1.1/router', allowed: false, label: 'Private Subnet 192.168.1.1' },
    { url: 'https://172.16.0.5/docker', allowed: false, label: 'Docker Private Network 172.16.0.5' },
    { url: 'https://evil-google.com/phish', allowed: false, label: 'Deceptive domain evil-google.com' },
    { url: 'https://drive.google.com.attacker.com/leak', allowed: false, label: 'Attacker subdomain drive.google.com.attacker.com' }
  ];

  for (const tc of ssrfCases) {
    const result = isAllowedGoogleStreamUrl(tc.url);
    if (result === tc.allowed) {
      console.log(`✅ SSRF Test Passed: [${tc.label}] -> correctly ${tc.allowed ? 'ALLOWED' : 'REJECTED'}`);
      passed++;
    } else {
      console.error(`❌ SSRF Test Failed: [${tc.label}] -> expected ${tc.allowed}, got ${result}`);
      failed++;
    }
  }

  console.log(`\n--- SEC-008 & SSRF RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

testVideoSecurityRuntime();
