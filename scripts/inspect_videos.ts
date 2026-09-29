import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      videoUrl: true,
      course: { select: { id: true, title: true } },
      quizzes: true,
    }
  });
  console.log(`Total lessons in DB: ${lessons.length}`);
  for (const l of lessons) {
    console.log(`- Lesson: "${l.title}" (ID: ${l.id}) | Course: "${l.course.title}" | videoUrl: ${l.videoUrl}`);
  }

  const videoProgress = await prisma.videoProgress.findMany({
    take: 10,
    include: {
      student: { select: { id: true, name: true, role: true } },
      lesson: { select: { id: true, title: true } }
    }
  });
  console.log(`\nExisting VideoProgress entries count: ${videoProgress.length}`);
  for (const vp of videoProgress) {
    console.log(`- Student: ${vp.student.name} (${vp.student.role}) | Lesson: "${vp.lesson.title}" | progress: ${vp.progress}% | lastTimestamp: ${vp.lastTimestamp}s | watched: ${vp.watched} | status: ${vp.status}`);
  }
}

main().finally(() => prisma.$disconnect());
