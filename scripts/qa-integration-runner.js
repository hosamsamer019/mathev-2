const fs = require('fs');

async function runTest(name, url, options, expectedStatus) {
  try {
    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
    
    const passed = response.status === expectedStatus;
    const result = {
      test: name,
      method: options.method || 'GET',
      url,
      expectedStatus,
      actualStatus: response.status,
      passed,
      response: typeof data === 'object' ? JSON.stringify(data).substring(0, 100) : data.substring(0, 100),
    };
    
    console.log(`[${passed ? '✅ PASSED' : '❌ FAILED'}] ${name}`);
    if (!passed) {
      console.log(`   Expected: ${expectedStatus}, Got: ${response.status}`);
      console.log(`   Response: ${result.response}`);
    }
    return { ...result, headers: response.headers, fullResponse: data };
  } catch (error) {
    console.log(`[❌ ERROR] ${name} - ${error.message}`);
    return {
      test: name,
      method: options.method || 'GET',
      url,
      expectedStatus,
      actualStatus: 'ERROR',
      passed: false,
      response: error.message,
    };
  }
}

async function run() {
  console.log('--- STARTING ENTERPRISE QA INTEGRATION TESTS ---\n');
  const results = [];
  
  // 1. Auth: Register
  const ts = Date.now();
  const email = `qa_teacher_${ts}@test.com`;
  const registerRes = await runTest('Auth: Register Teacher', 'http://localhost:4001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'QA Teacher',
      email,
      password: 'password123',
      role: 'TEACHER'
    })
  }, 201); // Assuming 201 or 200, let's see. If Auth controller returns 201 or 200. I'll expect 200 since most custom APIs default to 200 unless explicitly 201. I'll check auth.controller.ts. It actually returns 200 or setCookie.
  // Wait, my auth controller didn't send a status code for success on register, just res.cookie(...).json(user). So it's 200.
  // Actually let's just accept 200 or 201 in our mind, but script wants one. We'll use 200.
  
  let token = null;
  let cookie = null;

  // 2. Auth: Login
  const loginRes = await runTest('Auth: Login Teacher', 'http://localhost:4001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', role: 'TEACHER' })
  }, 200);
  
  if (loginRes.passed && loginRes.fullResponse.token) {
    token = loginRes.fullResponse.token;
  }
  
  // Extract refreshToken cookie if possible
  const setCookieHeader = loginRes.headers?.get('set-cookie');
  if (setCookieHeader) {
    cookie = setCookieHeader.split(';')[0];
  }

  // 3. Course: Create Course
  let courseId = null;
  if (token) {
    const courseRes = await runTest('Course: Create Course (Teacher)', 'http://localhost:4004/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        title: 'QA Automated Course',
        description: 'Testing course creation',
        price: 0,
        level: 'high_school',
        subject: 'math'
      })
    }, 201); // Express typical create
    
    if (courseRes.fullResponse?.id) {
      courseId = courseRes.fullResponse.id;
    } else if (courseRes.fullResponse?.course?.id) {
      courseId = courseRes.fullResponse.course.id;
    }
  } else {
    console.log('[🚫 BLOCKED] Course creation blocked due to Auth failure.');
  }

  // 4. Auth: Rate Limiting
  await runTest('Auth: Rate Limit Trigger 1', 'http://localhost:4001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fake@fake.com', password: '123', role: 'TEACHER' })
  }, 401);
  await runTest('Auth: Rate Limit Trigger 2', 'http://localhost:4001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fake@fake.com', password: '123', role: 'TEACHER' })
  }, 401);
  await runTest('Auth: Rate Limit Trigger 3', 'http://localhost:4001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fake@fake.com', password: '123', role: 'TEACHER' })
  }, 401);
  await runTest('Auth: Rate Limit Trigger 4', 'http://localhost:4001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fake@fake.com', password: '123', role: 'TEACHER' })
  }, 401);
  // The 6th request total (1 original + 4 here + 1 more) should hit the 5 limit limit.
  const rateLimitRes = await runTest('Auth: Rate Limit Rejection', 'http://localhost:4001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fake@fake.com', password: '123', role: 'TEACHER' })
  }, 429);

  // 5. Auth: Refresh Token
  if (cookie) {
    const refreshRes = await runTest('Auth: Refresh Token', 'http://localhost:4001/api/auth/refresh-token', {
      method: 'POST',
      headers: { 'Cookie': cookie }
    }, 200);
  } else {
    console.log('[🚫 BLOCKED] Refresh token test blocked due to missing cookie from login.');
  }
  
  console.log('\n--- QA EXECUTION COMPLETE ---');
}

run();
