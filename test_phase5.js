import axios from 'axios';

async function testPhase5() {
  const API_URL = 'http://localhost:4002/api';
  const COURSE_API = 'http://localhost:4003/api';

  try {
    console.log('Testing Phase 5 - Real Attendance & Input Validation');

    // 1. Login as Admin
    console.log('\n--- Logging in as Admin ---');
    const adminLogin = await axios.post(`http://localhost:4001/api/auth/login`, {
      email: 'admin@edu.com',
      password: '123456',
      role: 'admin'
    });
    const adminToken = adminLogin.data.token;
    console.log('Admin login successful.');

    // 2. Test Zod validation on createUser (expect 400 with details)
    console.log('\n--- Testing Zod validation on User Creation (Invalid Email) ---');
    try {
      await axios.post(`${API_URL}/users/users`, {
        name: 'T', // invalid name
        email: 'invalid-email',
        password: '123', // invalid password
        role: 'INVALID_ROLE'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.error('FAILED: User creation should have failed validation');
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.errors) {
        console.log('SUCCESS: Validation caught invalid user creation:', err.response.data.errors);
      } else {
        console.error('FAILED: Unexpected error format', err.response?.data || err.message);
      }
    }

    // 3. Login as Teacher
    console.log('\n--- Logging in as Teacher ---');
    const teacherLogin = await axios.post(`http://localhost:4001/api/auth/login`, {
      email: 'teacher@edu.com',
      password: '123456',
      role: 'teacher'
    });
    const teacherToken = teacherLogin.data.token;
    const teacherId = teacherLogin.data.user.id;
    console.log('Teacher login successful.', teacherId);

    // 4. Create a student to test attendance
    const studentName = `Student_${Date.now()}`;
    const studentEmail = `student${Date.now()}@test.com`;
    const studentRes = await axios.post(`${API_URL}/users/users`, {
      name: studentName,
      email: studentEmail,
      password: 'password123',
      role: 'ONLINE_STUDENT'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const studentId = studentRes.data.user.id;

    // 5. Test Zod validation on markAttendance
    console.log('\n--- Testing Zod validation on markAttendance ---');
    try {
      await axios.post(`${API_URL}/attendance`, {
        studentId: 'not-a-uuid',
        status: 'INVALID_STATUS'
      }, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      console.error('FAILED: markAttendance should have failed validation');
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.errors) {
        console.log('SUCCESS: markAttendance validation caught invalid payload:', err.response.data.errors);
      } else {
        console.error('FAILED: Unexpected error format', err.response?.data || err.message);
      }
    }

    console.log('\n--- Logging in as Student ---');
    const studentLogin = await axios.post(`http://localhost:4001/api/auth/login`, {
      email: studentEmail,
      password: 'password123',
      role: 'student_online'
    });
    const studentToken = studentLogin.data.token;
    console.log('Student login successful.');

    console.log('\n--- Testing getAttendancePercentage as Student (No Data) ---');
    const attRes1 = await axios.get(`${API_URL}/attendance/${studentId}/percentage`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log('SUCCESS: Student attendance percentage:', attRes1.data);

    console.log('\n--- Marking Attendance as Admin ---');
    await axios.post(`${API_URL}/attendance`, {
      studentId,
      status: 'PRESENT'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    await axios.post(`${API_URL}/attendance`, {
      studentId,
      status: 'ABSENT'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Attendance records added (1 PRESENT, 1 ABSENT).');

    console.log('\n--- Re-fetching getAttendancePercentage as Student ---');
    const attRes2 = await axios.get(`${API_URL}/attendance/${studentId}/percentage`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log('SUCCESS: Computed attendance percentage:', attRes2.data);

    console.log('\nPhase 5 tests completed!');
  } catch (err) {
    console.error('Test failed unexpectedly:', err.response?.data || err.message);
  }
}

testPhase5();
