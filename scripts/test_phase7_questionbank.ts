import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Phase 7: QuestionBank Functional Test ---');

  // Retrieve
  const allQs = await prisma.questionBank.findMany();
  console.log(`Retrieved ${allQs.length} questions from QuestionBank.`);

  if (allQs.length !== 44) {
    throw new Error(`Expected 44, got ${allQs.length}`);
  }

  // Filter
  const someTeacher = allQs[0].creatorId;
  const filtered = await prisma.questionBank.findMany({ where: { creatorId: someTeacher }});
  console.log(`Filtered by creatorId ${someTeacher}: ${filtered.length} questions found.`);

  // Edit
  const firstId = allQs[0].id;
  const oldTopic = allQs[0].topic;
  await prisma.questionBank.update({
    where: { id: firstId },
    data: { topic: 'EDITED_TOPIC_TEST' }
  });
  console.log(`Edited question ${firstId} topic to 'EDITED_TOPIC_TEST'`);

  // Restore edit
  await prisma.questionBank.update({
    where: { id: firstId },
    data: { topic: oldTopic }
  });
  console.log(`Restored question ${firstId} topic to '${oldTopic}'`);

  console.log('✅ QuestionBank specific tests passed.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
