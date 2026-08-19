import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: { videoUrl: { not: null } },
    include: { course: true }
  });
  console.log(`CourseId: ${lesson?.course?.id}`);
  console.log(`LessonId: ${lesson?.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
