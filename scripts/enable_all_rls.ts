import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableAllRLS() {
  const tables = [
    'User', 'CenterGroup', 'UserSession', 'Course', 'CourseEnrollment',
    'Lesson', 'LessonQuiz', 'VideoProgress', 'VideoUpload', 'Assessment',
    'AssessmentAttempt', 'ExternalExamAttempt', 'TemporaryAsset', 'Exam',
    'ExamAttempt', 'ExamViolation', 'Homework', 'Submission', 'QuestionBank',
    'StudentRiskHistory', 'Attendance', 'Payment', 'Notification', 'ChatSession',
    'ChatMessage', 'SavedMathSolution', 'DailyPlatformStats'
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`RLS Enabled on "${table}"`);
    } catch (err: any) {
      console.error(`Error on "${table}":`, err.message);
    }
  }

  const check = await prisma.$queryRaw<any[]>`
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `;
  const enabled = check.filter(t => t.rowsecurity).length;
  console.log(`\nFinal Check: ${enabled} of ${check.length} tables have RLS enabled.`);
  await prisma.$disconnect();
}

enableAllRLS();
