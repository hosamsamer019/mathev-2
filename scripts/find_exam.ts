import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: 'packages/database/.env' });
const p = new PrismaClient();
p.exam.findMany({ select: { id: true, title: true }, where: { title: { contains: '3' } } })
  .then(exams => { console.log(JSON.stringify(exams)); return p.$disconnect(); });
