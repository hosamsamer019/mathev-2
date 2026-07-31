import axios from 'axios';

async function testPhase7() {
  const AUTH_API = 'http://localhost:4001/api/auth';
  const USER_API = 'http://localhost:4002/api/users';

  try {
    console.log('Testing Phase 7 - Registration & Profile Update');

    // 1. Register new user
    const email = `newuser${Date.now()}@test.com`;
    console.log(`\n--- Registering new user: ${email} ---`);
    const registerRes = await axios.post(`${AUTH_API}/register`, {
      name: 'Test User',
      email: email,
      password: 'password123',
      role: 'student_online'
    });
    
    console.log('Registration successful, token received:', !!registerRes.data.token);
    const token = registerRes.data.token;
    const userId = registerRes.data.user.id;

    // 2. Test Invalid Profile Update (Zod Error)
    console.log('\n--- Testing Invalid Profile Update (Zod validation) ---');
    try {
      await axios.put(`${USER_API}/users/${userId}`, {
        name: 'A' // Too short
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.error('FAILED: Update should have failed validation');
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.errors) {
        console.log('SUCCESS: Validation caught invalid profile update:', err.response.data.errors);
      } else {
        console.error('FAILED: Unexpected error format', err.response?.data || err.message);
      }
    }

    // 3. Test Valid Profile Update
    console.log('\n--- Testing Valid Profile Update ---');
    const updateRes = await axios.put(`${USER_API}/users/${userId}`, {
      name: 'Updated Name',
      email: email
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('SUCCESS: Profile updated, new name:', updateRes.data.user.name);

    // 4. Verify login works for the newly registered user
    console.log('\n--- Testing Login with New Credentials ---');
    const loginRes = await axios.post(`${AUTH_API}/login`, {
      email: email,
      password: 'password123',
      role: 'student_online'
    });
    console.log('SUCCESS: Login worked for new user, token received:', !!loginRes.data.token);

    console.log('\nPhase 7 tests completed successfully!');

  } catch (err) {
    console.error('Test failed unexpectedly:', err.response?.data || err.message);
  }
}

testPhase7();
