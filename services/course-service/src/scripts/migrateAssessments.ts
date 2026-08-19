import { db } from '../../../../packages/database/src/index.js';

async function main() {
  console.log('Starting migration to Unified Assessment architecture...');

  // 1. Migrate Homeworks
  console.log('Migrating Homeworks...');
  const homeworks = await db.homework.findMany({ include: { submissions: true } });
  
  for (const hw of homeworks) {
    // Check if it already exists to be idempotent
    const existing = await db.assessment.findFirst({ where: { id: hw.id } });
    if (!existing) {
      await db.assessment.create({
        data: {
          id: hw.id,
          title: hw.title,
          type: 'ASSIGNMENT',
          courseId: hw.courseId,
          lessonId: hw.lessonId,
          teacherId: (await getCourseTeacherId(hw.courseId)),
          openAt: hw.openAt,
          closeAt: hw.closeAt ?? hw.deadline,
          durationMinutes: hw.duration,
          status: 'PUBLISHED',
          questions: hw.questions ?? [],
          createdAt: hw.createdAt,
          updatedAt: hw.updatedAt,
        }
      });
      console.log(`Migrated Homework: ${hw.id}`);
    }

    // Submissions -> AssessmentAttempt
    for (const sub of hw.submissions) {
      const existingAttempt = await db.assessmentAttempt.findFirst({ 
        where: { assessmentId: hw.id, studentId: sub.studentId } 
      });
      if (!existingAttempt) {
        await db.assessmentAttempt.create({
          data: {
            id: sub.id,
            assessmentId: hw.id,
            studentId: sub.studentId,
            status: sub.grade !== null ? 'GRADED' : 'SUBMITTED',
            startedAt: sub.createdAt,
            submittedAt: sub.updatedAt,
            score: sub.grade,
            answers: sub.answers ?? [],
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
          }
        });
        console.log(`Migrated Submission: ${sub.id}`);
      }
    }
  }

  // 2. Migrate Exams
  console.log('Migrating Exams...');
  const exams = await db.exam.findMany({ include: { attempts: true } });

  for (const ex of exams) {
    const existing = await db.assessment.findFirst({ where: { id: ex.id } });
    if (!existing) {
      await db.assessment.create({
        data: {
          id: ex.id,
          title: ex.title,
          type: 'EXAM',
          courseId: ex.courseId,
          teacherId: (await getCourseTeacherId(ex.courseId)),
          openAt: ex.startTime,
          closeAt: ex.endTime,
          durationMinutes: ex.duration,
          status: 'PUBLISHED',
          passingScore: ex.passingScore,
          showResult: ex.showResult,
          randomization: ex.randomization,
          requiresCamera: ex.requiresCamera,
          questions: ex.questions ?? [],
          createdAt: ex.createdAt,
          updatedAt: ex.updatedAt,
        }
      });
      console.log(`Migrated Exam: ${ex.id}`);
    }

    // ExamAttempts -> AssessmentAttempt
    for (const att of ex.attempts) {
      const existingAttempt = await db.assessmentAttempt.findFirst({ 
        where: { assessmentId: ex.id, studentId: att.studentId } 
      });
      if (!existingAttempt) {
        await db.assessmentAttempt.create({
          data: {
            id: att.id,
            assessmentId: ex.id,
            studentId: att.studentId,
            status: 'GRADED',
            startedAt: att.createdAt,
            submittedAt: att.createdAt,
            score: att.score,
            answers: att.answers ?? [],
            createdAt: att.createdAt,
            updatedAt: att.createdAt,
          }
        });
        console.log(`Migrated ExamAttempt: ${att.id}`);
      }
    }
  }

  console.log('Migration Complete.');
}

const teacherCache = new Map<string, string>();
async function getCourseTeacherId(courseId: string) {
  if (teacherCache.has(courseId)) return teacherCache.get(courseId)!;
  const course = await db.course.findUnique({ where: { id: courseId }, select: { teacherId: true } });
  if (course) {
    teacherCache.set(courseId, course.teacherId);
    return course.teacherId;
  }
  return 'unknown';
}

main().catch(console.error).finally(() => db.$disconnect());
