import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const models = [
    'user',
    'course',
    'courseEnrollment',
    'lesson',
    'video',
    'videoProgress',
    'homework',
    'submission',
    'exam',
    'examAttempt',
    'question',
    'notification',
    'chatSession',
    'chatMessage',
    'payment',
    'attendance'
  ];

  for (const model of models) {
    try {
      // @ts-ignore
      const count = await prisma[model].count();
      console.log(`${model}: ${count} records`);
    } catch (e: any) {
      console.log(`${model}: ERROR - ${e.message}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
