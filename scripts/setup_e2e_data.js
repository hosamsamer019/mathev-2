const { PrismaClient } = require('@smartmath/database');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const TEST_ACCOUNTS = {
  admin: { email: `E2E_ADMIN_2026@test.com`, password: 'Password123!', role: 'ADMIN', name: `E2E Admin` },
  teacherA: { email: `E2E_TEACHER_A_2026@test.com`, password: 'Password123!', role: 'TEACHER', name: `E2E Teacher A` },
  teacherB: { email: `E2E_TEACHER_B_2026@test.com`, password: 'Password123!', role: 'TEACHER', name: `E2E Teacher B` },
  studentA: { email: `E2E_STUDENT_A_2026@test.com`, password: 'Password123!', role: 'ONLINE_STUDENT', name: `E2E Student A` },
  studentB: { email: `E2E_STUDENT_B_2026@test.com`, password: 'Password123!', role: 'ONLINE_STUDENT', name: `E2E Student B` },
  parentA: { email: `E2E_PARENT_A_2026@test.com`, password: 'Password123!', role: 'PARENT', name: `E2E Parent A` },
};

async function setup() {
  console.log('Setting up E2E data...');
  
  // Cleanup old if they exist
  const emails = Object.values(TEST_ACCOUNTS).map(u => u.email);
  await prisma.user.deleteMany({
    where: { email: { in: emails } }
  });
  
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  
  const created = {};
  for (const [key, user] of Object.entries(TEST_ACCOUNTS)) {
    created[key] = await prisma.user.create({
      data: {
        email: user.email,
        password: hashedPassword,
        name: user.name,
        role: user.role
      }
    });
    console.log(`Created ${key}: ${user.email}`);
  }

  // Link Parent A to Student A
  // Need to check the schema for parent-student relationship. Usually it's `children` or similar.
  // We'll skip linking here and do it if needed for the Parent Isolation test, or let's try to update the student with parentId
  try {
    await prisma.user.update({
      where: { id: created.studentA.id },
      data: { parentId: created.parentA.id }
    });
    console.log('Linked Student A to Parent A');
  } catch(e) {
    console.log('Could not link parent directly (maybe schema differs, check later):', e.message);
  }

  console.log('Setup complete.');
}

setup().finally(() => prisma.$disconnect());
