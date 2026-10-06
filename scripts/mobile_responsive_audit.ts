import puppeteer, { Browser, Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-temporary-development-secret';
const BASE_URL = 'http://localhost:5173';

interface Breakpoint {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}

const BREAKPOINTS: Breakpoint[] = [
  { name: '320x568 (Small Phone)', width: 320, height: 568, isMobile: true },
  { name: '360x800 (Common Android)', width: 360, height: 800, isMobile: true },
  { name: '390x844 (Modern iPhone)', width: 390, height: 844, isMobile: true },
  { name: '430x932 (Large Phone)', width: 430, height: 932, isMobile: true },
  { name: '568x320 (Landscape Small)', width: 568, height: 320, isMobile: true },
  { name: '844x390 (Landscape Modern)', width: 844, height: 390, isMobile: true },
  { name: '768x1024 (Tablet Portrait)', width: 768, height: 1024, isMobile: true },
  { name: '1280x720 (Desktop HD)', width: 1280, height: 720, isMobile: false },
  { name: '1920x1080 (Desktop FHD)', width: 1920, height: 1080, isMobile: false },
];

interface PageTestTarget {
  role: 'PUBLIC' | 'ADMIN' | 'TEACHER' | 'ONLINE_STUDENT' | 'CENTER_STUDENT' | 'PARENT';
  path: string;
  name: string;
}

interface TestResult {
  role: string;
  pageName: string;
  path: string;
  breakpoint: string;
  viewportWidth: number;
  documentScrollWidth: number;
  hasHorizontalOverflow: boolean;
  overflowAmountPx: number;
  overflowingElements: string[];
  consoleErrors: string[];
  status: 'PASSED' | 'FAILED';
}

async function runMobileAudit() {
  console.log('===============================================================');
  console.log('  AL-SADEN PLATFORM: AUTOMATED MULTI-DEVICE MOBILE UX AUDIT');
  console.log('===============================================================\n');

  // Fetch or resolve authentic test users for each role
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const teacherUser = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
  const onlineStudent = await prisma.user.findFirst({ where: { role: 'ONLINE_STUDENT' } });
  const centerStudent = await prisma.user.findFirst({ where: { role: 'CENTER_STUDENT' } });
  const parentUser = await prisma.user.findFirst({ where: { role: 'PARENT' } });
  
  // Find a lesson to test video player
  const sampleLesson = await prisma.lesson.findFirst({ where: { videoUrl: { not: null } } });
  const onlineVideoPath = sampleLesson ? `/student/online/videos/${sampleLesson.id}` : '/student/online/courses';
  const centerVideoPath = sampleLesson ? `/student/center/videos/${sampleLesson.id}` : '/student/center/lessons';

  // Ensure onlineStudent and centerStudent are enrolled in sampleLesson's course
  if (sampleLesson && onlineStudent) {
    await prisma.courseEnrollment.upsert({
      where: { studentId_courseId: { studentId: onlineStudent.id, courseId: sampleLesson.courseId } },
      update: {},
      create: { studentId: onlineStudent.id, courseId: sampleLesson.courseId }
    });
  }
  if (sampleLesson && centerStudent) {
    await prisma.courseEnrollment.upsert({
      where: { studentId_courseId: { studentId: centerStudent.id, courseId: sampleLesson.courseId } },
      update: {},
      create: { studentId: centerStudent.id, courseId: sampleLesson.courseId }
    });
  }

  const PAGES_TO_TEST: PageTestTarget[] = [
    { role: 'PUBLIC', path: '/login', name: 'Authentication - Login Page' },
    { role: 'PUBLIC', path: '/admin/login', name: 'Authentication - Admin Login Page' },
    { role: 'PUBLIC', path: '/external-exam', name: 'Public External Exam Portal' },
    { role: 'ADMIN', path: '/admin/dashboard', name: 'Admin Dashboard' },
    { role: 'ADMIN', path: '/admin/users', name: 'Admin Users & Bulk Actions' },
    { role: 'TEACHER', path: '/teacher/home', name: 'Teacher Dashboard' },
    { role: 'TEACHER', path: '/teacher/attendance', name: 'Teacher Attendance Page' },
    { role: 'TEACHER', path: '/teacher/courses', name: 'Teacher Courses & Lessons' },
    { role: 'ONLINE_STUDENT', path: '/student/online/home', name: 'Online Student Home' },
    { role: 'ONLINE_STUDENT', path: '/student/online/courses', name: 'Online Student Courses' },
    { role: 'ONLINE_STUDENT', path: onlineVideoPath, name: 'Online Student Video Player Page' },
    { role: 'ONLINE_STUDENT', path: '/student/online/exams', name: 'Student Exams Page' },
    { role: 'CENTER_STUDENT', path: '/student/center/lessons', name: 'Center Student Lessons' },
    { role: 'CENTER_STUDENT', path: centerVideoPath, name: 'Center Student Video Player Page' },
    { role: 'PARENT', path: '/parent/home', name: 'Parent Dashboard' },
  ];

  const browser: Browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results: TestResult[] = [];

  for (const target of PAGES_TO_TEST) {
    console.log(`\n🔍 Auditing Page: [${target.role}] ${target.name} (${target.path})`);

    // Determine auth credentials for role
    let userForRole: any = null;
    if (target.role === 'ADMIN') userForRole = adminUser;
    else if (target.role === 'TEACHER') userForRole = teacherUser;
    else if (target.role === 'ONLINE_STUDENT') userForRole = onlineStudent;
    else if (target.role === 'CENTER_STUDENT') userForRole = centerStudent;
    else if (target.role === 'PARENT') userForRole = parentUser;

    let token: string | null = null;
    if (userForRole) {
      token = jwt.sign(
        { userId: userForRole.id, email: userForRole.email, role: userForRole.role },
        JWT_SECRET,
        { expiresIn: '2h' }
      );
    }

    for (const bp of BREAKPOINTS) {
      const page: Page = await browser.newPage();
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('vite') && !text.includes('favicon')) {
            consoleErrors.push(text);
          }
        }
      });

      page.on('pageerror', (err: any) => {
        consoleErrors.push(String(err?.message || err));
      });

      await page.setViewport({
        width: bp.width,
        height: bp.height,
        isMobile: bp.isMobile ?? false,
      });

      // Set auth state in localStorage before navigation if role requires auth
      if (token && userForRole) {
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(
          (t, u) => {
            localStorage.setItem('token', t);
            localStorage.setItem('edu-user', JSON.stringify(u));
            localStorage.setItem('userRole', u.role);
          },
          token,
          userForRole
        );
      }

      try {
        await page.goto(`${BASE_URL}${target.path}`, {
          waitUntil: 'networkidle2',
          timeout: 15000,
        });

        // Wait a brief moment for layout/animations to settle
        await new Promise((r) => setTimeout(r, 600));

        // Evaluate scroll metrics and find overflowing elements
        const metrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const viewportWidth = window.innerWidth;
          const docScrollWidth = Math.max(
            docEl.scrollWidth,
            docEl.offsetWidth,
            body.scrollWidth,
            body.offsetWidth
          );

          // Find any elements sticking out beyond the viewport
          const overflowingNodes: string[] = [];
          const allElements = Array.from(document.querySelectorAll('*'));
          for (const el of allElements) {
            const rect = el.getBoundingClientRect();
            if (rect.right > viewportWidth + 1 || rect.left < -1) {
              const tag = el.tagName.toLowerCase();
              const id = el.id ? `#${el.id}` : '';
              const className = el.className && typeof el.className === 'string' ? `.${el.className.split(' ').slice(0, 2).join('.')}` : '';
              const desc = `${tag}${id}${className} (right: ${Math.round(rect.right)}px, left: ${Math.round(rect.left)}px)`;
              if (overflowingNodes.length < 5) {
                overflowingNodes.push(desc);
              }
            }
          }

          return {
            viewportWidth,
            docScrollWidth,
            overflowingNodes,
          };
        });

        const hasOverflow = metrics.docScrollWidth > metrics.viewportWidth;
        const overflowAmount = Math.max(0, metrics.docScrollWidth - metrics.viewportWidth);
        const status: 'PASSED' | 'FAILED' = hasOverflow ? 'FAILED' : 'PASSED';

        const result: TestResult = {
          role: target.role,
          pageName: target.name,
          path: target.path,
          breakpoint: bp.name,
          viewportWidth: metrics.viewportWidth,
          documentScrollWidth: metrics.docScrollWidth,
          hasHorizontalOverflow: hasOverflow,
          overflowAmountPx: overflowAmount,
          overflowingElements: metrics.overflowingNodes,
          consoleErrors,
          status,
        };

        results.push(result);

        const icon = status === 'PASSED' ? '✅' : '❌';
        console.log(
          `  ${icon} [${bp.name}] viewport: ${metrics.viewportWidth}px, scrollWidth: ${metrics.docScrollWidth}px ${
            hasOverflow ? `-> OVERFLOW: +${overflowAmount}px` : '-> Clean'
          }`
        );
        if (hasOverflow && metrics.overflowingNodes.length > 0) {
          console.log(`     └─ Elements: ${metrics.overflowingNodes.join(', ')}`);
        }
      } catch (err: any) {
        console.error(`  ❌ Error auditing ${target.path} at ${bp.name}:`, err.message);
        results.push({
          role: target.role,
          pageName: target.name,
          path: target.path,
          breakpoint: bp.name,
          viewportWidth: bp.width,
          documentScrollWidth: 0,
          hasHorizontalOverflow: true,
          overflowAmountPx: 0,
          overflowingElements: [err.message],
          consoleErrors: [err.message],
          status: 'FAILED',
        });
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();
  await prisma.$disconnect();

  console.log('\n===============================================================');
  console.log('                    AUDIT SUMMARY MATRIX');
  console.log('===============================================================\n');

  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;
  console.log(`Total Viewport Tests: ${results.length}`);
  console.log(`Passed: ${passedCount} | Failed: ${failedCount}`);

  // Summary by Page
  const pagesSummary = new Map<string, { role: string; bpStatus: Record<string, string> }>();
  for (const r of results) {
    if (!pagesSummary.has(r.pageName)) {
      pagesSummary.set(r.pageName, { role: r.role, bpStatus: {} });
    }
    pagesSummary.get(r.pageName)!.bpStatus[r.breakpoint.split(' ')[0]] = r.status;
  }

  console.log('\n| Role | Page | 320 | 360 | 390 | 430 | 768 | Desktop | Status |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const [name, summary] of Array.from(pagesSummary.entries())) {
    const s320 = summary.bpStatus['320x568'] || 'N/A';
    const s360 = summary.bpStatus['360x800'] || 'N/A';
    const s390 = summary.bpStatus['390x844'] || 'N/A';
    const s430 = summary.bpStatus['430x932'] || 'N/A';
    const s768 = summary.bpStatus['768x1024'] || 'N/A';
    const sDesk = summary.bpStatus['1280x720'] || 'N/A';
    const overall = Object.values(summary.bpStatus).every((s) => s === 'PASSED') ? 'PASSED' : 'FAILED';
    console.log(
      `| ${summary.role} | ${name} | ${s320} | ${s360} | ${s390} | ${s430} | ${s768} | ${sDesk} | **${overall}** |`
    );
  }
}

runMobileAudit().catch((err) => {
  console.error('Fatal error running mobile audit:', err);
  process.exit(1);
});
