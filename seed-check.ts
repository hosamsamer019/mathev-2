import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users.`);
  
  const existing = await prisma.user.findUnique({ where: { email: 'test_student_migration@example.com' } });
  if (!existing) {
    console.log('Creating test user...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Student Migration',
        email: 'test_student_migration@example.com',
        password: hashedPassword,
        role: 'ONLINE_STUDENT'
      }
    });
    console.log(`Created user: ${testUser.email}`);
  } else {
    console.log(`Test user already exists: ${existing.email}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
