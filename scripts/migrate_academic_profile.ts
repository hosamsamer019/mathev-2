import { PrismaClient, AcademicLevel, CountryCode, EducationLevel, GradeLevel } from '@prisma/client';

const prisma = new PrismaClient();

// Legacy mapping based on previous rules
const legacyMap: Record<AcademicLevel, { country: CountryCode, educationLevel: EducationLevel, gradeLevel: GradeLevel }> = {
  PREP_1: { country: 'EG', educationLevel: 'PREPARATORY', gradeLevel: 'PREPARATORY_1' },
  PREP_2: { country: 'EG', educationLevel: 'PREPARATORY', gradeLevel: 'PREPARATORY_2' },
  PREP_3: { country: 'EG', educationLevel: 'PREPARATORY', gradeLevel: 'PREPARATORY_3' },
  SEC_1: { country: 'EG', educationLevel: 'SECONDARY', gradeLevel: 'SECONDARY_1' },
  SEC_2: { country: 'EG', educationLevel: 'SECONDARY', gradeLevel: 'SECONDARY_2' },
  SEC_3: { country: 'EG', educationLevel: 'SECONDARY', gradeLevel: 'SECONDARY_3' },
};

async function migrateUsers() {
  console.log('Migrating Users...');
  const users = await prisma.user.findMany({
    where: { academicLevel: { not: null } }
  });

  let migrated = 0;
  let alreadyComplete = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.country && user.educationLevel && user.gradeLevel) {
      alreadyComplete++;
      continue;
    }

    if (user.academicLevel && legacyMap[user.academicLevel]) {
      await prisma.user.update({
        where: { id: user.id },
        data: legacyMap[user.academicLevel]
      });
      migrated++;
    } else {
      skipped++;
    }
  }

  console.log(`Users:\n  ${migrated} migrated\n  ${alreadyComplete} already complete\n  ${skipped} skipped`);
}

async function migrateCourses() {
  console.log('Migrating Courses...');
  const courses = await prisma.course.findMany({
    where: { academicLevel: { not: null } }
  });

  let migrated = 0;
  let alreadyComplete = 0;
  let skipped = 0;

  for (const course of courses) {
    if (course.country && course.educationLevel && course.gradeLevel) {
      alreadyComplete++;
      continue;
    }

    if (course.academicLevel && legacyMap[course.academicLevel]) {
      await prisma.course.update({
        where: { id: course.id },
        data: legacyMap[course.academicLevel]
      });
      migrated++;
    } else {
      skipped++;
    }
  }

  console.log(`Courses:\n  ${migrated} migrated\n  ${alreadyComplete} already complete\n  ${skipped} skipped`);
}

async function migrateQuestionBank() {
  console.log('Migrating QuestionBank...');
  const questions = await prisma.questionBank.findMany({
    where: { academicLevel: { not: null } }
  });

  let migrated = 0;
  let alreadyComplete = 0;
  let skipped = 0;

  for (const q of questions) {
    if (q.country && q.educationLevel && q.gradeLevel) {
      alreadyComplete++;
      continue;
    }

    if (q.academicLevel && legacyMap[q.academicLevel]) {
      await prisma.questionBank.update({
        where: { id: q.id },
        data: legacyMap[q.academicLevel]
      });
      migrated++;
    } else {
      skipped++;
    }
  }

  console.log(`QuestionBank:\n  ${migrated} migrated\n  ${alreadyComplete} already complete\n  ${skipped} skipped`);
}

async function main() {
  console.log('Starting data migration...');
  await migrateUsers();
  await migrateCourses();
  await migrateQuestionBank();
  console.log('Data migration complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
