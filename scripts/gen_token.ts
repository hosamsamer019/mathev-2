import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: 'packages/database/.env' });

// Generate a JWT token directly, bypassing the auth service login
const p = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function main() {
  const admin = await p.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true, role: true } });
  if (!admin) throw new Error('No admin user found');
  
  const token = jwt.sign(
    { userId: admin.id, role: admin.role, email: admin.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  console.log('ADMIN_TOKEN=' + token);
  console.log('ADMIN_EMAIL=' + admin.email);
  await p.$disconnect();
}
main();
