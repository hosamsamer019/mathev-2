const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'test-video-stream-jwt-secret-1234567890';

async function runBrowserTest() {
  console.log('=== STARTING ROBUST BROWSER VIDEO PLAYBACK TEST ===');

  const lesson = await prisma.lesson.findFirst({
    where: { videoUrl: { contains: '1U-N5hmS0mmpRGVqjJjZJQiJ0-qxCO257' } },
    include: { course: true }
  });

  if (!lesson) {
    console.error('Lesson not found!');
    return;
  }

  let student = await prisma.user.findFirst({
    where: { email: 'stream-student@test.com' }
  });

  if (!student) {
    student = await prisma.user.create({
      data: {
        email: 'stream-student@test.com',
        name: 'Stream Student',
        password: 'hashedpassword',
        role: 'ONLINE_STUDENT'
      }
    });
  }

  await prisma.courseEnrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: student.id,
        courseId: lesson.courseId
      }
    },
    update: {},
    create: {
      studentId: student.id,
      courseId: lesson.courseId
    }
  });

  const studentToken = jwt.sign(
    { userId: student.id, role: student.role, email: student.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`Student ID: ${student.id}`);
  console.log(`Lesson ID: ${lesson.id} (${lesson.title})`);
  console.log('Access token generated: <REDACTED_ACCESS_TOKEN>');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const networkResponses = [];

  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('Download the React DevTools') && !text.includes('Tailwind CSS') && !text.includes('favicon.ico')) {
      console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, text);
    }
  });

  page.on('pageerror', err => {
    console.error('[BROWSER PAGE ERROR]:', err.message);
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/stream') || url.includes('/video-ticket') || url.includes('/api/courses/lessons/')) {
      const sanitizedUrl = url.replace(/token=[^&]+/, 'token=<REDACTED_TICKET>');
      const headers = res.headers();
      const status = res.status();
      networkResponses.push({
        url: sanitizedUrl,
        status,
        contentType: headers['content-type'],
        contentRange: headers['content-range'],
        contentLength: headers['content-length'],
        acceptRanges: headers['accept-ranges']
      });
      console.log(`[NET RESP]: ${status} ${sanitizedUrl} | Type: ${headers['content-type']} | Range: ${headers['content-range'] || 'N/A'}`);
    }
  });

  try {
    // 1. Initialize localStorage with auth token and user profile
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate((token, user) => {
      localStorage.setItem('token', token);
      localStorage.setItem('edu-user', JSON.stringify(user));
    }, studentToken, { id: student.id, email: student.email, name: student.name, role: student.role, isActive: true });

    // 2. Navigate to Video Player Page
    const videoUrl = `http://localhost:5173/student/online/videos/${lesson.id}`;
    console.log(`\nNavigating to: ${videoUrl}`);
    await page.goto(videoUrl, { waitUntil: 'networkidle2' });

    // 3. Wait for video element
    console.log('Waiting for <video> element...');
    await page.waitForSelector('video', { timeout: 15000 });
    console.log('✅ <video> element present in DOM');

    // Wait 3 seconds for video metadata and initial buffer
    await new Promise(r => setTimeout(r, 3000));

    const initialVideoState = await page.evaluate(() => {
      const v = document.querySelector('video');
      if (!v) return { exists: false };
      return {
        exists: true,
        src: v.src ? v.src.replace(/token=[^&]+/, 'token=<REDACTED_TICKET>') : '',
        currentSrc: v.currentSrc ? v.currentSrc.replace(/token=[^&]+/, 'token=<REDACTED_TICKET>') : '',
        readyState: v.readyState,
        networkState: v.networkState,
        duration: v.duration,
        currentTime: v.currentTime,
        paused: v.paused,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        bufferedRanges: v.buffered.length > 0 ? `${v.buffered.start(0)} - ${v.buffered.end(0)}` : 'none',
        error: v.error ? { code: v.error.code, message: v.error.message } : null
      };
    });

    console.log('\n--- Initial Video State in Browser ---');
    console.log(JSON.stringify(initialVideoState, null, 2));

    // 4. Test Play
    console.log('\n--- Action: Play Video ---');
    const playResult = await page.evaluate(async () => {
      const v = document.querySelector('video');
      if (!v) return { error: 'No video element' };
      try {
        await v.play();
        return { success: true, paused: v.paused, currentTime: v.currentTime };
      } catch (e) {
        return { error: e.name + ': ' + e.message };
      }
    });
    console.log('Play Result:', playResult);

    // Let it play for 4 seconds
    console.log('Waiting 4 seconds for video playback...');
    await new Promise(r => setTimeout(r, 4000));

    const playingState = await page.evaluate(() => {
      const v = document.querySelector('video');
      if (!v) return null;
      return {
        currentTime: v.currentTime,
        duration: v.duration,
        paused: v.paused,
        readyState: v.readyState,
        bufferedRanges: v.buffered.length > 0 ? `${v.buffered.start(0)} - ${v.buffered.end(0)}` : 'none'
      };
    });
    console.log('\n--- Playing State (after 4s) ---');
    console.log(JSON.stringify(playingState, null, 2));

    // 5. Test Pause
    console.log('\n--- Action: Pause Video ---');
    await page.evaluate(() => {
      const v = document.querySelector('video');
      if (v) v.pause();
    });
    await new Promise(r => setTimeout(r, 1000));

    const pausedState = await page.evaluate(() => {
      const v = document.querySelector('video');
      return v ? { paused: v.paused, currentTime: v.currentTime } : null;
    });
    console.log('Paused State:', pausedState);

    // 6. Test Seek Forward (to 30s)
    console.log('\n--- Action: Seek Forward to 30s ---');
    await page.evaluate(() => {
      const v = document.querySelector('video');
      if (v) v.currentTime = 30;
    });
    await new Promise(r => setTimeout(r, 2500));

    const seekState = await page.evaluate(() => {
      const v = document.querySelector('video');
      return v ? {
        currentTime: v.currentTime,
        readyState: v.readyState,
        bufferedRanges: v.buffered.length > 0 ? `${v.buffered.start(0)} - ${v.buffered.end(0)}` : 'none'
      } : null;
    });
    console.log('State After Seek to 30s:', seekState);

    // 7. Resume Playback after seek
    console.log('\n--- Action: Resume Playback after Seek ---');
    await page.evaluate(async () => {
      const v = document.querySelector('video');
      if (v) await v.play();
    });
    await new Promise(r => setTimeout(r, 3000));

    const afterSeekPlayState = await page.evaluate(() => {
      const v = document.querySelector('video');
      return v ? {
        currentTime: v.currentTime,
        paused: v.paused,
        readyState: v.readyState
      } : null;
    });
    console.log('State After Resumed Playback:', afterSeekPlayState);

    // 8. Test Seek Backward (to 10s)
    console.log('\n--- Action: Seek Backward to 10s ---');
    await page.evaluate(() => {
      const v = document.querySelector('video');
      if (v) v.currentTime = 10;
    });
    await new Promise(r => setTimeout(r, 2500));

    const seekBackState = await page.evaluate(() => {
      const v = document.querySelector('video');
      return v ? {
        currentTime: v.currentTime,
        readyState: v.readyState,
        bufferedRanges: v.buffered.length > 0 ? `${v.buffered.start(0)} - ${v.buffered.end(0)}` : 'none'
      } : null;
    });
    console.log('State After Seek Backward to 10s:', seekBackState);

    console.log('\n=== ALL BROWSER NETWORK RESPONSES ===');
    console.log(JSON.stringify(networkResponses, null, 2));

    const streamResponses = networkResponses.filter(r => r.url.includes('/stream'));
    console.log(`\nTotal Stream Requests: ${streamResponses.length}`);
    const any502 = streamResponses.some(r => r.status === 502);
    const allValid = streamResponses.every(r => r.status === 206 || r.status === 200);

    console.log(`Any 502 Bad Gateway: ${any502 ? 'YES ❌' : 'NO ✅'}`);
    console.log(`All Stream Responses 206/200: ${allValid ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Video Played Successfully: ${playingState && playingState.currentTime > 0 ? 'YES ✅' : 'NO ❌'}`);

  } catch (err) {
    console.error('Browser Test Error:', err);
  } finally {
    await browser.close();
    await prisma.$disconnect();
    console.log('Browser closed.');
  }
}

runBrowserTest();
