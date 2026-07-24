import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  
  // Admin (update password to 123456 so it matches frontend auto-fill)
  await db.user.update({
    where: { email: 'admin@edu.com' },
    data: { password: hash }
  });

  console.log('✅ Admin password updated to 123456 to match frontend defaults.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
