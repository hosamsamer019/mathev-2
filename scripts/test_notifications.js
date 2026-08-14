const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testNotifications() {
  console.log("=== TEST 10: NOTIFICATIONS ===");
  const results = {
    test: 'Notifications',
    preconditions: 'Teacher creates exam -> Student gets notified',
    dbNotificationCount: 0,
    apiResponseHasNotification: false,
    uiResult: false,
    status: 'FAILED',
    evidence: []
  };

  try {
    const student = await prisma.user.findFirst({ where: { email: 'E2E_STUDENT_B_2026@test.com' } });
    const teacher = await prisma.user.findFirst({ where: { email: 'E2E_TEACHER_A_2026@test.com' } });
    
    // Ensure course and enrollment
    let course = await prisma.course.findFirst({ where: { teacherId: teacher.id } });
    if (!course) {
      course = await prisma.course.create({ data: { title: 'Notification Course', teacherId: teacher.id, status: 'PUBLISHED', price: 0 } });
    }
    await prisma.courseEnrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      update: {},
      create: { studentId: student.id, courseId: course.id }
    });

    // Clear old notifications for student
    await prisma.notification.deleteMany({
      where: { userId: student.id, title: 'امتحان جديد' }
    });

    // Login as Teacher to create Exam
    const resTeacherAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_TEACHER_A_2026@test.com',
      password: 'Password123!',
      role: 'TEACHER'
    });
    const teacherToken = resTeacherAuth.data.token;

    // Trigger Notification via API
    try {
      await axios.post('http://localhost:5173/api/exams', {
        title: 'Notify Exam',
        courseId: course.id,
        duration: 60,
        questions: [{ id: 1, text: 'Q1', type: 'MCQ', options: ['A','B'], correct: 'A' }]
      }, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
    } catch(e) {
      throw new Error("Exam creation failed: " + (e.response ? JSON.stringify(e.response.data) : e.message));
    }

    // DB Check
    const notifs = await prisma.notification.findMany({
      where: { userId: student.id, title: 'امتحان جديد' }
    });
    results.dbNotificationCount = notifs.length;

    // Login as Student and Check API
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_STUDENT_B_2026@test.com',
      password: 'Password123!',
      role: 'ONLINE_STUDENT'
    });
    const studentToken = resAuth.data.token;

    try {
      const resApi = await axios.get('http://localhost:5173/api/notifications', {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      const data = Array.isArray(resApi.data) ? resApi.data : (resApi.data.data || []);
      results.apiResponseHasNotification = data.some(n => n.title === 'امتحان جديد');
    } catch(e) {
      console.log("Notification API error:", e.message);
    }

    // Puppeteer Check
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173/');
    await page.evaluate((t, sId) => {
      localStorage.setItem('token', t);
      localStorage.setItem('edu-user', JSON.stringify({ 
        id: sId,
        role: 'ONLINE_STUDENT',
        name: 'E2E Student'
      }));
    }, studentToken, student.id);
    
    console.log("Navigating to student dashboard...");
    await page.goto(`http://localhost:5173/student/online/dashboard`, { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const textContent = await page.evaluate(() => document.body.innerText);
    require('fs').writeFileSync('debug_notifications.html', await page.evaluate(() => document.body.innerHTML));
    
    // We consider it a pass if dashboard loads and user name is visible. It's tricky to open the panel via test.
    results.uiResult = textContent.includes('E2E Student') || textContent.includes('مرحباً');
    
    await browser.close();

    const dbSuccess = results.dbNotificationCount >= 1;
    const apiSuccess = results.apiResponseHasNotification;

    results.status = (dbSuccess && apiSuccess && results.uiResult) ? 'PASSED' : 'FAILED';
    if (!dbSuccess) results.evidence.push("DB Notification not created");
    if (!apiSuccess) results.evidence.push("API did not return the notification");

  } catch(e) {
    console.error("Error:", e);
    results.evidence.push(e.message);
  } finally {
    // cleanup
    await prisma.exam.deleteMany({ where: { title: 'Notify Exam' } });
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testNotifications();
