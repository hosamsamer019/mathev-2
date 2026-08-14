import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: 'packages/database/.env' });
const p = new PrismaClient();
p.user.findMany({ 
  where: { role: { in: ['ADMIN', 'TEACHER'] } },
  select: { email: true, role: true, id: true },
  take: 10
}).then(users => {
  console.log('Users found:');
  users.forEach(u => console.log(`  ${u.role}: ${u.email}`));
  return p.$disconnect();
});
