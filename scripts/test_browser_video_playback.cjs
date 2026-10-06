const puppeteer = require('puppeteer');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runBrowserTest() {
  console.log('=== STARTING BROWSER VIDEO PLAYBACK TEST ===');

  // 1. Ensure user has known password '123456'
  const hashedPassword = await bcrypt.hash('123456', 10);
  const student = await prisma.user.upsert({
    where: { email: 'stream-student@test.com' },
    update: { password: hashedPassword, role: 'ONLINE_STUDENT' },
    create: {
      email: 'stream-student@test.com',
      name: 'Stream Student',
      password: hashedPassword,
      role: 'ONLINE_STUDENT'
    }
  });

  const lesson = await prisma.lesson.findFirst({
    where: { videoUrl: { contains: '1U-N5hmS0mmpRGVqjJjZJQiJ0-qxCO257' } }
  });

  if (!lesson) {
    console.error('Lesson not found!');
    return;
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

  console.log(`Student ready: ${student.email}`);
  console.log(`Lesson ID: ${lesson.id}`);

  // 2. Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const networkLogs = [];

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('[BROWSER PAGE ERROR]:', err.message);
  });

  page.on('request', req => {
    if (req.url().includes('/api/') || req.url().includes('/stream')) {
      const sanitizedUrl = req.url().replace(/token=[^&]+/, 'token=<REDACTED_TICKET>');
      // console.log(`[REQ]: ${req.method()} ${sanitizedUrl}`);
    }
  });

  page.on('response', async res => {
    if (res.url().includes('/stream') || res.url().includes('/video-ticket') || res.url().includes('/api/courses')) {
      const sanitizedUrl = res.url().replace(/token=[^&]+/, 'token=<REDACTED_TICKET>');
      const headers = res.headers();
      const status = res.status();
      networkLogs.push({
        url: sanitizedUrl,
        status,
        contentType: headers['content-type'],
        contentRange: headers['content-range'],
        contentLength: headers['content-length'],
        acceptRanges: headers['accept-ranges']
      });
      console.log(`[RESP]: ${status} ${sanitizedUrl} [Type: ${headers['content-type']}, Range: ${headers['content-range'] || 'none'}, Len: ${headers['content-length'] || 'unknown'}]`);
    }
  });

  try {
    // 3. Login
    console.log('\n--- Navigating to Login ---');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

    // Fill login form
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'stream-student@test.com');
    await page.type('input[type="password"]', '123456');

    // Click submit
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    console.log('Login successful, current URL:', page.url());

    // 4. Navigate to Video Player Page
    console.log(`\n--- Navigating to Video Player (/student/online/videos/${lesson.id}) ---`);
    await page.goto(`http://localhost:5173/student/online/videos/${lesson.id}`, { waitUntil: 'networkidle2' });

    // Wait for video element
    console.log('Waiting for <video> element...');
    await page.waitForSelector('video', { timeout: 15000 });

    console.log('Found <video> element. Evaluating video state...');

    // Wait for video readyState or metadata
    await page.waitForFunction(() => {
      const v = document.querySelector('video');
      return v && v.readyState >= 1; // HAVE_METADATA or more
    }, { timeout: 15000 }).catch(e => console.log('Wait for readyState timeout/warning:', e.message));

    const videoState = await page.evaluate(() => {
      const v = document.querySelector('video');
      if (!v) return { exists: false };
      return {
        exists: true,
        src: v.src ? v.src.replace(/token=[^&]+/, 'token=<REDACTED_TICKET>') : '',
        readyState: v.readyState,
        networkState: v.networkState,
        duration: v.duration,
        currentTime: v.currentTime,
        paused: v.paused,
        error: v.error ? { code: v.error.code, message: v.error.message } : null,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight
      };
    });

    console.log('\n--- Initial Video Element State ---');
    console.log(JSON.stringify(videoState, null, 2));

    // Test Playback
    console.log('\n--- Attempting Playback ---');
    const playResult = await page.evaluate(async () => {
      const v = document.querySelector('video');
      if (!v) return { error: 'No video element' };
      try {
        await v.play();
        return { success: true, paused: v.paused, currentTime: v.currentTime };
      } catch (err) {
        return { error: err.name + ': ' + err.message };
      }
    });
    console.log('Play Result:', playResult);

    // Let it play for 3 seconds
    console.log('Waiting 3 seconds for playback progress...');
    await new Promise(r => setTimeout(r, 3000));

    const afterPlayState = await page.evaluate(() => {
      const v = document.querySelector('video');
      if (!v) return { exists: false };
      return {
        currentTime: v.currentTime,
        paused: v.paused,
        readyState: v.readyState,
        bufferedLength: v.buffered.length,
        bufferedEnd: v.buffered.length > 0 ? v.buffered.end(0) : 0
      };
    });
    console.log('\n--- State After 3s Playback ---');
    console.log(JSON.stringify(afterPlayState, null, 2));

    // Test Pause
    console.log('\n--- Testing Pause ---');
    await page.evaluate(() => {
      const v = document.querySelector('video');
      if (v) v.pause();
    });
    await new Promise(r => setTimeout(r, 500));

    // Test Seek
    console.log('\n--- Testing Seek to 60s ---');
    await page.evaluate(() => {
      const v = document.querySelector('video');
      if (v) v.currentTime = 60;
    });
    await new Promise(r => setTimeout(r, 2000));

    const seekState = await page.evaluate(() => {
      const v = document.querySelector('video');
      if (!v) return null;
      return {
        currentTime: v.currentTime,
        readyState: v.readyState,
        bufferedLength: v.buffered.length
      };
    });
    console.log('State After Seek to 60s:', seekState);

    // Resume play after seek
    console.log('\n--- Resuming Playback After Seek ---');
    await page.evaluate(async () => {
      const v = document.querySelector('video');
      if (v) await v.play();
    });
    await new Promise(r => setTimeout(r, 3000));

    const finalState = await page.evaluate(() => {
      const v = document.querySelector('video');
      if (!v) return null;
      return {
        currentTime: v.currentTime,
        paused: v.paused,
        readyState: v.readyState
      };
    });
    console.log('Final Playback State:', finalState);

    console.log('\n=== NETWORK LOGS SUMMARY ===');
    console.log(JSON.stringify(networkLogs, null, 2));

  } catch (err) {
    console.error('Browser Test Error:', err);
  } finally {
    await browser.close();
    await prisma.$disconnect();
    console.log('Browser closed.');
  }
}

runBrowserTest();
