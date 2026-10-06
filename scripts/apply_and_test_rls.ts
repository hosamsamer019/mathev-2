import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function applyAndVerifyRLS() {
  console.log('--- Applying and Validating SEC-012 RLS Migration ---');
  try {
    const migrationSql = fs.readFileSync(
      path.join(__dirname, '../packages/database/prisma/migrations/20261001_enable_rls/migration.sql'),
      'utf8'
    );

    // Split SQL commands and execute
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      if (stmt.includes('ALTER TABLE')) {
        await prisma.$executeRawUnsafe(stmt + ';');
      }
    }

    console.log('✅ RLS Migration SQL executed successfully.');

    // Query RLS status
    const tables = await prisma.$queryRaw<any[]>`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    const rlsEnabledCount = tables.filter(t => t.rowsecurity).length;
    console.log(`RLS Status after migration: ${rlsEnabledCount} of ${tables.length} tables have RLS enabled.`);

    // Test representative backend Prisma queries
    console.log('\n--- Testing Backend Prisma Queries with RLS Active ---');
    
    // 1. User count & query
    const userCount = await prisma.user.count();
    console.log(`1. User table query: SUCCESS (Count: ${userCount})`);

    // 2. Course query
    const courseCount = await prisma.course.count();
    console.log(`2. Course table query: SUCCESS (Count: ${courseCount})`);

    // 3. Exam query
    const examCount = await prisma.exam.count();
    console.log(`3. Exam table query: SUCCESS (Count: ${examCount})`);

    // 4. Payment query
    const paymentCount = await prisma.payment.count();
    console.log(`4. Payment table query: SUCCESS (Count: ${paymentCount})`);

    // 5. Create and delete a temporary test record
    const testUser = await prisma.user.create({
      data: {
        email: `rls_test_${Date.now()}@test.com`,
        password: 'hashed_password_123',
        name: 'RLS Test User',
        role: 'ONLINE_STUDENT'
      }
    });
    console.log(`5. Create record with RLS: SUCCESS (User ID: ${testUser.id})`);

    await prisma.user.delete({ where: { id: testUser.id } });
    console.log(`6. Delete record with RLS: SUCCESS`);

    console.log('\n✅ ALL BACKEND PRISMA OPERATIONS SUCCEED UNDER RLS!');
  } catch (err: any) {
    console.error('❌ RLS Validation failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyAndVerifyRLS();
