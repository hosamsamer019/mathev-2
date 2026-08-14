const axios = require('axios');
const { PrismaClient } = require('@smartmath/database');

const prisma = new PrismaClient();

async function testTeacherValidation() {
  console.log("=== TEST: TEACHER VALIDATION ===");
  const results = {
    test: 'Teacher Validation',
    caseA: 'FAILED',
    caseB: 'FAILED',
    caseC: 'FAILED',
    caseD: 'FAILED',
    no500: true,
    status: 'FAILED',
    evidence: []
  };

  try {
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_ADMIN_2026@test.com',
      password: 'Password123!',
      role: 'ADMIN'
    });
    const token = resAuth.data.token;

    const axiosInstance = axios.create({
      baseURL: 'http://localhost:5173/api',
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true // Prevent throwing on 4xx/5xx
    });

    // CASE A: Malformed teacherId
    const resA = await axiosInstance.post('/courses', {
      title: 'Validation Test A',
      teacherId: 'malformed-uuid'
    });
    if (resA.status === 400 || resA.status === 403) results.caseA = 'PASSED';
    if (resA.status >= 500) results.no500 = false;
    results.evidence.push(`Case A Status: ${resA.status}`);

    // CASE B: Valid UUID but nonexistent
    const resB = await axiosInstance.post('/courses', {
      title: 'Validation Test B',
      teacherId: '00000000-0000-0000-0000-000000000000'
    });
    if (resB.status === 400 || resB.status === 404) results.caseB = 'PASSED';
    if (resB.status >= 500) results.no500 = false;
    results.evidence.push(`Case B Status: ${resB.status}`);

    // CASE C: Existing user with non-TEACHER role
    const student = await prisma.user.findFirst({ where: { role: 'ONLINE_STUDENT' } });
    const resC = await axiosInstance.post('/courses', {
      title: 'Validation Test C',
      teacherId: student.id
    });
    if (resC.status === 400 || resC.status === 403) results.caseC = 'PASSED';
    if (resC.status >= 500) results.no500 = false;
    results.evidence.push(`Case C Status: ${resC.status}`);

    // CASE D: Existing valid TEACHER
    const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    const resD = await axiosInstance.post('/courses', {
      title: 'Validation Test D',
      teacherId: teacher.id
    });
    if (resD.status === 201 || resD.status === 200) {
      results.caseD = 'PASSED';
      // Cleanup
      await prisma.course.delete({ where: { id: resD.data.id } });
    }
    if (resD.status >= 500) results.no500 = false;
    results.evidence.push(`Case D Status: ${resD.status}`);

    if (results.caseA === 'PASSED' && results.caseB === 'PASSED' && results.caseC === 'PASSED' && results.caseD === 'PASSED' && results.no500) {
      results.status = 'PASSED';
    }
  } catch (e) {
    console.error("Error:", e.message);
    results.evidence.push(e.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log("RESULT:", results);
}

testTeacherValidation();
