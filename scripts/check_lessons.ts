import { db } from '../packages/database/src/index.js';

async function check() {
  try {
    const lessons = await db.lesson.findMany({
      select: {
        id: true,
        title: true,
        videoUrl: true,
        courseId: true,
      },
      take: 20
    });
    console.log('--- LESSONS IN DB ---');
    for (const l of lessons) {
      console.log(`Lesson ID: ${l.id} | Title: ${l.title} | VideoURL: ${l.videoUrl}`);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

check();
