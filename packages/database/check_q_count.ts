import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const qCount = await prisma.question.count();
  const qbCount = await prisma.questionBank.count();
  console.log('Questions:', qCount);
  console.log('QuestionBank:', qbCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
