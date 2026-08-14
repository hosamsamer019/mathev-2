const { PrismaClient } = require('./dist/index.js');
const util = require('util');

const prisma = new PrismaClient();

async function main() {
  console.log('=== QUESTION BANK DIAGNOSTIC ===');
  const questions = await prisma.questionBank.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total QuestionBank records found in sample: ${questions.length}`);
  
  for (const q of questions) {
    console.log(util.inspect({
      id: q.id,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      type: q.type,
      explanation: q.explanation
    }, { depth: null, colors: true }));
  }

  console.log('\n=== EXAM QUESTIONS DIAGNOSTIC ===');
  const exams = await prisma.exam.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    where: { questions: { not: null } }
  });

  console.log(`Total Exams found in sample: ${exams.length}`);
  for (const e of exams) {
    console.log(`Exam: ${e.id} - ${e.title}`);
    console.log(util.inspect(e.questions, { depth: null, colors: true }));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
