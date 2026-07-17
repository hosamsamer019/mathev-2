import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('123456', 10);

  // 1. Create a Default Tenant (Center)
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'smart-math' },
    update: {},
    create: {
      name: 'منصة معلم الرياضيات',
      slug: 'smart-math'
    }
  });

  // 2. Create Test Accounts
  const users: { name: string; email: string; role: UserRole }[] = [
    { name: 'المدير العام', email: 'admin@edu.com', role: UserRole.admin },
    { name: 'أ. محمد إبراهيم', email: 'teacher@edu.com', role: UserRole.teacher },
    { name: 'أحمد محمد', email: 'student@edu.com', role: UserRole.student_online },
    { name: 'سارة علي', email: 'parent@edu.com', role: UserRole.parent }
  ];

  for (const userData of users) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password,
        tenantId: tenant.id,
        isActive: true
      }
    });
  }

  console.log('✅ Database seeded with default test accounts!');
  console.log('🔑 Password for all accounts: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
