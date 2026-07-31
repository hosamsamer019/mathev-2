import axios from 'axios';

async function testPhase6() {
  try {
    console.log('Testing Phase 6 - Analytics API & Form Validation');

    // 1. Login as Admin
    console.log('\n--- Logging in as Admin ---');
    const adminLogin = await axios.post(`http://localhost:4001/api/auth/login`, {
      email: 'admin@edu.com',
      password: '123456',
      role: 'admin'
    });
    const adminToken = adminLogin.data.token;
    console.log('Admin login successful.');

    // 2. Fetch Analytics
    console.log('\n--- Fetching Admin Analytics ---');
    let analyticsUrl = 'http://localhost:4005/api/analytics/admin'; // Port 4005 is for analytics based on package.json, wait, I will try 4005, then 4004.
    try {
      const analyticsRes = await axios.get(analyticsUrl, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('SUCCESS: Analytics data:', JSON.stringify(analyticsRes.data, null, 2));
    } catch(e) {
      console.log('Failed on 4005, trying 4004 for analytics/admin');
      const analyticsRes = await axios.get('http://localhost:4004/api/analytics/admin', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('SUCCESS: Analytics data:', JSON.stringify(analyticsRes.data, null, 2));
    }
  } catch (err) {
    console.error('Test failed unexpectedly:', err.response?.data || err.message);
  }
}

testPhase6();
