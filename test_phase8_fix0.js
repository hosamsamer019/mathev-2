import axios from 'axios';

async function testFix0() {
  const AUTH_API = 'http://localhost:4001/api/auth';
  const USER_API = 'http://localhost:4002/api/users';

  try {
    console.log('--- Testing Fix 0: Admin User Creation ---');
    
    // 1. Login as Admin
    console.log('Logging in as Admin (admin@edu.com)...');
    const adminLogin = await axios.post(`${AUTH_API}/login`, {
      email: 'admin@edu.com',
      password: '123456',
      role: 'admin'
    });
    const adminToken = adminLogin.data.token;
    console.log('Admin login successful!');

    // 2. Admin creates a new Teacher
    const newTeacherEmail = `teacher${Date.now()}@test.com`;
    console.log(`Admin creating new Teacher (${newTeacherEmail})...`);
    
    const createRes = await axios.post(`${USER_API}/users`, {
      name: 'New Teacher',
      email: newTeacherEmail,
      password: 'teacherpassword123',
      role: 'TEACHER'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('Teacher created successfully:', createRes.data.user.email, 'Role:', createRes.data.user.role);

    // 3. New Teacher attempts to log in
    console.log('\nNew Teacher attempting to log in...');
    const teacherLogin = await axios.post(`${AUTH_API}/login`, {
      email: newTeacherEmail,
      password: 'teacherpassword123',
      role: 'teacher'
    });
    console.log('Teacher login successful! Token received:', !!teacherLogin.data.token);

  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
  }
}

testFix0();
