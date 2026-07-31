import axios from 'axios';

async function testFix1And2() {
  const AUTH_API = 'http://localhost:4001/api/auth';
  const USER_API = 'http://localhost:4002/api/users';
  const ATTENDANCE_API = 'http://localhost:4002/api/attendance';
  const COURSE_API = 'http://localhost:4004/api/homeworks';
  const ANALYTICS_API = 'http://localhost:4005/api/analytics';

  try {
    console.log('--- Testing Fix 1 & 2: Notifications and Parent Dashboard ---');
    
    // 1. Login as Admin
    const adminLogin = await axios.post(`${AUTH_API}/login`, {
      email: 'admin@edu.com',
      password: '123456',
      role: 'admin'
    });
    const adminToken = adminLogin.data.token;
    console.log('Admin login successful.');

    // 2. Create Parent and Student
    const parentEmail = `parent${Date.now()}@test.com`;
    const studentEmail = `student${Date.now()}@test.com`;

    const parentRes = await axios.post(`${USER_API}/users`, {
      name: 'Test Parent',
      email: parentEmail,
      password: 'password123',
      role: 'PARENT'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    const parentId = parentRes.data.user.id;

    const studentRes = await axios.post(`${USER_API}/users`, {
      name: 'Test Student',
      email: studentEmail,
      password: 'password123',
      role: 'ONLINE_STUDENT',
      parentId: parentId
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    const studentId = studentRes.data.user.id;
    console.log('Parent and Student created and linked.');

    // 3. Mark Attendance (Triggers Notification)
    console.log('\nAdmin marking attendance for Student (triggers notification)...');
    await axios.post(`${ATTENDANCE_API}`, {
      studentId: studentId,
      status: 'PRESENT'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });

    // 4. Student logs in and checks notifications
    const studentLogin = await axios.post(`${AUTH_API}/login`, {
      email: studentEmail,
      password: 'password123',
      role: 'student_online'
    });
    const studentToken = studentLogin.data.token;

    console.log('\nStudent checking notifications...');
    const notifRes = await axios.get(`http://localhost:4002/api/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    if (notifRes.data.length > 0) {
      console.log('SUCCESS: Notification received:', notifRes.data[0].title, '-', notifRes.data[0].message);
    } else {
      console.error('FAILED: No notifications found');
    }

    // 5. Parent logs in and checks dashboard
    const parentLogin = await axios.post(`${AUTH_API}/login`, {
      email: parentEmail,
      password: 'password123',
      role: 'parent'
    });
    const parentToken = parentLogin.data.token;

    console.log('\nParent checking dashboard children...');
    const parentChildrenRes = await axios.get(`http://localhost:4002/api/users/parent/children`, {
      headers: { Authorization: `Bearer ${parentToken}` }
    });
    console.log('SUCCESS: Parent found children:', parentChildrenRes.data.map((c) => c.name));

    console.log('\nParent fetching overview for child...');
    const overviewRes = await axios.get(`${ANALYTICS_API}/parent/child/${studentId}/overview`, {
      headers: { Authorization: `Bearer ${parentToken}` }
    });
    console.log('SUCCESS: Child Overview data fetched:', JSON.stringify(overviewRes.data, null, 2));

  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
  }
}

testFix1And2();
