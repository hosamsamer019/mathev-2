const http = require('http');

async function request(url, options = {}) {
  const start = Date.now();
  try {
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }});
    let body = '';
    try { body = await res.text(); } catch(e){}
    const latency = Date.now() - start;
    return { status: res.status, ok: res.ok, body, latency, error: null };
  } catch (err) {
    return { status: 0, ok: false, body: null, latency: Date.now() - start, error: err.message };
  }
}

async function runPhase1Verification() {
  console.log("=== Phase 1 Runtime Verification ===");

  const email = `test_phase1_${Date.now()}@edu.com`;

  // 1. Verify Registration (and Login)
  console.log("\n[1] Registering User...");
  const regRes = await request('http://localhost:4001/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Phase1 Test', email, password: 'password', role: 'STUDENT' })
  });
  console.log("Register Status:", regRes.status);
  const token = JSON.parse(regRes.body).token;
  console.log("JWT Received:", !!token);

  // 2. Verify Protected Route
  console.log("\n[2] Verifying Protected Route /me...");
  const meRes = await request('http://localhost:4001/api/auth/me', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log("Protected Route Status:", meRes.status);

  // 3. Verify Forgot Password
  console.log("\n[3] Verifying Forgot Password...");
  const forgotRes = await request('http://localhost:4001/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
  console.log("Forgot Password Status:", forgotRes.status);

  // 4. Verify Reset Password (will fail with 400 because we don't have the real token, but proves endpoint is connected)
  console.log("\n[4] Verifying Reset Password...");
  const resetRes = await request('http://localhost:4001/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: "invalid_token_12345", password: "newpassword" })
  });
  console.log("Reset Password Status (Expecting 400):", resetRes.status);

  // 5. Verify Logout
  console.log("\n[5] Verifying Logout...");
  const logoutRes = await request('http://localhost:4001/api/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log("Logout Status:", logoutRes.status);
}

runPhase1Verification();
