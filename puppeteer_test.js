const puppeteer = require('puppeteer');

(async () => {
  console.log("Starting Puppeteer Runtime Verification...");
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:\\Users\\Hossam\\.cache\\puppeteer\\chrome\\win64-151.0.7922.47\\chrome-win64\\chrome.exe'
  });
  const page = await browser.newPage();
  
  // Set viewport to a standard desktop size
  await page.setViewport({ width: 1280, height: 800 });

  console.log("1. Navigating to login page...");
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  
  console.log("2. Logging in as student_test2@edu.com...");
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', 'student_test2@edu.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  console.log("3. Navigating to the test course/lesson...");
  const courseLink = 'http://localhost:5173/student-online/courses/4dff8eba-2209-482a-87d0-8b8126f7eb76/lessons/846279b7-d6b6-4c08-b165-c766ae7d22d9';
  await page.goto(courseLink, { waitUntil: 'networkidle2' });
  
  console.log("5. Interacting with the video player page...");
  
  // Wait for the YouTube player iframe to load
  await page.waitForSelector('iframe');
  
  // Wait for the exposed refs to become available
  await page.waitForFunction('window._testPlayerRef && window._testPlayerRef.current');
  
  console.log("Refs exposed successfully. Waiting for video to start playing natively...");
  
  // Polling to wait until the video is actually playing and has tracked some time
  await page.waitForFunction(() => {
     if (window._testPlayerRef && window._testPlayerRef.current) {
         return window._testPlayerRef.current.getCurrentTime() > 5; // Watched 5 seconds
     }
     return false;
  }, { timeout: 30000 });
  
  // Let it play for a bit to establish maxWatchedTime
  console.log("Video is playing. Waiting to reach ~15 seconds of watched time...");
  
  await page.waitForFunction(() => {
     return window._testMaxTimeRef && window._testMaxTimeRef.current > 15;
  }, { timeout: 30000 });
  
  const currentMax = await page.evaluate(() => window._testMaxTimeRef.current);
  console.log(`Established max watched time: ${currentMax}`);
  
  console.log("6. Testing backward progress-bar seeking to 10s...");
  // Click on the custom progress bar to seek backward
  // The progress bar is the flex-1 element inside the controls
  await page.evaluate(() => {
     // Force a programmatic seek for testing purposes since clicking via puppeteer on relative coordinates is flaky
     const targetTime = 10; 
     const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
     // We will just invoke the component's internal logic by simulating the exact offsetX
     const progressBar = document.querySelector('.bg-gray-700.cursor-pointer');
     if (progressBar) {
         const width = progressBar.clientWidth;
         const duration = window._testPlayerRef.current.getDuration();
         const offsetX = (targetTime / duration) * width;
         
         // Mock offsetX
         Object.defineProperty(clickEvent, 'offsetX', { get: () => offsetX });
         progressBar.dispatchEvent(clickEvent);
     }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  const timeAfterBackward = await page.evaluate(() => window._testPlayerRef.current.getCurrentTime());
  console.log(`Time after backward seek: ${timeAfterBackward} (Expected ~10)`);
  
  console.log("7. Testing forward seeking within maxWatchedTime (to 14s)...");
  await page.evaluate(() => {
     const targetTime = 14; 
     const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
     const progressBar = document.querySelector('.bg-gray-700.cursor-pointer');
     if (progressBar) {
         const width = progressBar.clientWidth;
         const duration = window._testPlayerRef.current.getDuration();
         const offsetX = (targetTime / duration) * width;
         Object.defineProperty(clickEvent, 'offsetX', { get: () => offsetX });
         progressBar.dispatchEvent(clickEvent);
     }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  const timeAfterForward = await page.evaluate(() => window._testPlayerRef.current.getCurrentTime());
  console.log(`Time after forward seek: ${timeAfterForward} (Expected ~14)`);
  
  console.log("8. Testing forward seeking beyond maxWatchedTime (to 30s)...");
  
  // Capture alert
  let alertTriggered = false;
  let alertMessage = "";
  page.on('dialog', async dialog => {
      alertTriggered = true;
      alertMessage = dialog.message();
      await dialog.accept();
  });
  
  await page.evaluate(() => {
     const targetTime = 30; 
     const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
     const progressBar = document.querySelector('.bg-gray-700.cursor-pointer');
     if (progressBar) {
         const width = progressBar.clientWidth;
         const duration = window._testPlayerRef.current.getDuration();
         const offsetX = (targetTime / duration) * width;
         Object.defineProperty(clickEvent, 'offsetX', { get: () => offsetX });
         progressBar.dispatchEvent(clickEvent);
     }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  const timeAfterBlocked = await page.evaluate(() => window._testPlayerRef.current.getCurrentTime());
  console.log(`Alert triggered: ${alertTriggered}, Message: ${alertMessage}`);
  console.log(`Time after blocked seek: ${timeAfterBlocked} (Expected to remain near max watched time)`);
  
  console.log("9. Testing -10s and +10s buttons...");
  const beforeMinus = await page.evaluate(() => window._testPlayerRef.current.getCurrentTime());
  await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const minusBtn = btns.find(b => b.innerHTML.includes('-10'));
      if (minusBtn) minusBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const afterMinus = await page.evaluate(() => window._testPlayerRef.current.getCurrentTime());
  console.log(`Time before -10: ${beforeMinus}, After -10: ${afterMinus}`);
  
  await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const plusBtn = btns.find(b => b.innerHTML.includes('+10'));
      if (plusBtn) plusBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const afterPlus = await page.evaluate(() => window._testPlayerRef.current.getCurrentTime());
  console.log(`Time after +10: ${afterPlus}`);
  
  await browser.close();
  console.log("Tests completed successfully!");
})();
