import { db } from '../packages/database/src/index.js';
import { generateVideoTicket } from '../services/course-service/src/services/videoToken.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function runDiagnostic() {
  console.log('=== VITE PROXY VS COURSE SERVICE STREAM DIAGNOSTIC ===');

  // 1. Find the lesson with Google Drive video
  const lesson = await db.lesson.findFirst({
    where: { videoUrl: { contains: '1U-N5hmS0mmpRGVqjJjZJQiJ0-qxCO257' } },
    include: { course: true }
  });

  if (!lesson) {
    console.error('Lesson not found in DB!');
    return;
  }

  // 2. Find enrolled user
  const enrollment = await db.courseEnrollment.findFirst({
    where: { courseId: lesson.courseId }
  });

  if (!enrollment) {
    console.error('No enrollment found for course:', lesson.courseId);
    return;
  }

  const studentId = enrollment.studentId;

  // 3. Generate valid video ticket
  const ticket = generateVideoTicket({
    userId: studentId,
    lessonId: lesson.id,
    expiresInSeconds: 60
  });

  console.log(`Lesson ID: ${lesson.id}`);
  console.log(`Student ID: ${studentId}`);
  console.log('Ticket generated: <REDACTED_TICKET>');

  const targets = [
    { name: 'Direct Course Service (127.0.0.1:4004)', url: `http://127.0.0.1:4004/api/courses/lessons/${lesson.id}/stream?token=${encodeURIComponent(ticket)}` },
    { name: 'Direct Course Service (localhost:4004)', url: `http://localhost:4004/api/courses/lessons/${lesson.id}/stream?token=${encodeURIComponent(ticket)}` },
    { name: 'Vite Proxy (localhost:5173)', url: `http://localhost:5173/api/courses/lessons/${lesson.id}/stream?token=${encodeURIComponent(ticket)}` },
    { name: 'Vite Proxy (127.0.0.1:5173)', url: `http://127.0.0.1:5173/api/courses/lessons/${lesson.id}/stream?token=${encodeURIComponent(ticket)}` },
  ];

  const testRanges = [
    { rangeName: 'Range: bytes=0-1023', rangeHeader: 'bytes=0-1023' },
    { rangeName: 'Range: bytes=2097152-2098175', rangeHeader: 'bytes=2097152-2098175' },
    { rangeName: 'Range: bytes=0-', rangeHeader: 'bytes=0-' },
    { rangeName: 'No Range Header', rangeHeader: undefined }
  ];

  for (const target of targets) {
    console.log(`\n========================================`);
    console.log(`Testing Target: ${target.name}`);
    console.log(`URL: ${target.url.replace(/token=.*/, 'token=<REDACTED_TICKET>')}`);

    for (const r of testRanges) {
      console.log(`\n--- Test: ${r.rangeName} ---`);
      try {
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        };
        if (r.rangeHeader) {
          headers['Range'] = r.rangeHeader;
        }

        const res = await fetch(target.url, { headers });
        console.log(`Status: ${res.status} ${res.statusText}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);
        console.log(`Content-Length: ${res.headers.get('content-length')}`);
        console.log(`Content-Range: ${res.headers.get('content-range')}`);
        console.log(`Accept-Ranges: ${res.headers.get('accept-ranges')}`);

        if (res.status === 206 || res.status === 200) {
          const reader = res.body?.getReader();
          if (reader) {
            const chunk = await reader.read();
            console.log(`First chunk received! Size: ${chunk.value?.byteLength || 0} bytes`);
            await reader.cancel();
          }
        } else {
          const text = await res.text();
          console.log(`Response Body: ${text.slice(0, 300)}`);
        }
      } catch (err: any) {
        console.error(`Fetch error on ${target.name}:`, err.message);
      }
    }
  }

  await db.$disconnect();
}

runDiagnostic();
