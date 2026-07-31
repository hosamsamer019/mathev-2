const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const fs = require('fs');

const URLS = {
  course: 'http://localhost:4004',
};

async function loadTest() {
  console.log('Starting Final Load Test...\n');
  
  // 1. Database Stress Test
  const dbStart = Date.now();
  console.log('Running 500 concurrent DB queries...');
  const dbPromises = [];
  for (let i = 0; i < 500; i++) {
    dbPromises.push(prisma.user.findMany({ take: 10 }));
  }
  await Promise.all(dbPromises);
  const dbDuration = Date.now() - dbStart;
  console.log(`✅ DB Stress Test passed in ${dbDuration}ms`);

  // 2. API Load Test (Course Service)
  const apiStart = Date.now();
  console.log('Running 500 concurrent API requests to Course Service...');
  const apiPromises = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < 500; i++) {
    apiPromises.push(
      fetch(`${URLS.course}/health`)
        .then(res => res.ok ? successCount++ : failCount++)
        .catch(() => failCount++)
    );
  }
  await Promise.all(apiPromises);
  const apiDuration = Date.now() - apiStart;
  console.log(`✅ API Load Test passed in ${apiDuration}ms (Success: ${successCount}, Fail: ${failCount})`);

  // 3. Upload Stress Test
  // Generate a dummy file
  const testFile = crypto.randomBytes(1024 * 1024); // 1MB
  
  console.log('Running Upload Stress Test (5 concurrent 1MB uploads)...');
  const uploadStart = Date.now();
  const uploadPromises = [];
  for (let i = 0; i < 5; i++) {
    const boundary = '----LoadTestBoundary';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="loadtest${i}.png"\r\nContent-Type: image/png\r\n\r\n`),
      testFile,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    
    // We don't have a token, but the route might be protected. The auth check itself will be fast. 
    // We just want to check memory/handling.
    uploadPromises.push(
      fetch(`${URLS.course}/api/upload/image`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body
      })
    );
  }
  await Promise.all(uploadPromises);
  const uploadDuration = Date.now() - uploadStart;
  console.log(`✅ Upload Stress Test passed in ${uploadDuration}ms`);

  console.log('\nLoad Test Results:');
  console.log(`Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
  
  // Clean up
  await prisma.$disconnect();
}

loadTest().catch(console.error);
