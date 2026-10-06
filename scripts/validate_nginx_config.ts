import fs from 'fs';

function validateNginxConfig(configPath: string) {
  console.log('=== NGINX CONFIGURATION AUDIT ===\n');
  const content = fs.readFileSync(configPath, 'utf8');

  // Check balanced braces
  let braceCount = 0;
  for (const char of content) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
  }

  if (braceCount === 0) {
    console.log('✅ Brace syntax: BALANCED (All blocks opened and closed properly).');
  } else {
    console.error(`❌ Brace syntax error: Unbalanced braces (delta: ${braceCount})`);
  }

  // Check rate limiting zone
  const hasRateLimitZone = content.includes('limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;');
  console.log(`- Rate limit zone defined: ${hasRateLimitZone ? 'YES ✅' : 'NO ❌'}`);

  // Check rate limit attached to locations
  const requiredLocations = ['/api/auth', '/api/users', '/api/courses', '/api/exams', '/api/homework', '/api/payments', '/api/ai', '/api/analytics'];
  const missingRateLimits: string[] = [];
  requiredLocations.forEach(loc => {
    const locRegex = new RegExp(`location\\s+${loc.replace('/', '\\/')}\\s*\\{[^}]*limit_req\\s+zone=api_limit`, 's');
    if (!locRegex.test(content)) {
      missingRateLimits.push(loc);
    }
  });

  if (missingRateLimits.length === 0) {
    console.log('✅ Rate limiting attached: ALL API locations have limit_req zone=api_limit enabled.');
  } else {
    console.error(`❌ Rate limiting missing on: ${missingRateLimits.join(', ')}`);
  }

  // Check WebSocket proxying
  const hasWebSocket = content.includes('location /socket.io') && content.includes('proxy_set_header Upgrade $http_upgrade;');
  console.log(`- WebSocket Upgrade proxying configured: ${hasWebSocket ? 'YES ✅' : 'NO ❌'}`);

  // Check Security Headers
  const hasFrameOptions = content.includes('add_header X-Frame-Options "SAMEORIGIN"');
  const hasContentType = content.includes('add_header X-Content-Type-Options "nosniff"');
  const hasReferrerPolicy = content.includes('add_header Referrer-Policy "strict-origin-when-cross-origin"');
  console.log(`- Security Headers: X-Frame-Options=${hasFrameOptions}, X-Content-Type-Options=${hasContentType}, Referrer-Policy=${hasReferrerPolicy} ✅`);

  // Check sensitive file blocking
  const hasHiddenBlock = content.includes('location ~ /\\.(git|env|svn|ht|DS_Store)');
  console.log(`- Hidden sensitive file block (git/env): ${hasHiddenBlock ? 'ACTIVE ✅' : 'MISSING ❌'}`);
}

validateNginxConfig('D:/Mathe/Mathteachersmartplatform-main/nginx/nginx.conf');
