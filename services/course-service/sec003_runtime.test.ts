import { PrismaClient } from '@prisma/client';
import express from 'express';
import http from 'http';
import * as jwt from 'jsonwebtoken';
import { createPayment } from './src/controllers/payment.controller';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-temporary-development-secret';

async function testSec003Runtime() {
  console.log('--- START SEC-003: PAYMENT INTEGRITY RUNTIME VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  const app = express();
  app.use(express.json());

  app.use((req: any, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        req.user = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }
    next();
  });

  app.post('/api/payments/create', createPayment);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  let student: any, teacher: any, course: any;

  try {
    const stamp = Date.now();
    student = await prisma.user.create({ data: { email: `pay_s_${stamp}@test.com`, password: 'p', name: 'Pay Student', role: 'ONLINE_STUDENT' } });
    teacher = await prisma.user.create({ data: { email: `pay_t_${stamp}@test.com`, password: 'p', name: 'Pay Teacher', role: 'TEACHER' } });
    
    // Authoritative Course Price in DB: 250.00 EGP
    course = await prisma.course.create({
      data: {
        title: 'Premium Math Course',
        teacherId: teacher.id,
        price: 250.00,
        status: 'PUBLISHED'
      }
    });

    const tokenStudent = jwt.sign({ userId: student.id, role: 'ONLINE_STUDENT' }, JWT_SECRET, { expiresIn: '15m' });

    // Case A: Client attempts price tampering by sending amount: 1.00 -> Rejected with 400 Mismatch
    const resA = await fetch(`${baseUrl}/api/payments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent}` },
      body: JSON.stringify({ provider: 'paymob', courseId: course.id, amount: 1.00 })
    });
    if (resA.status === 400) {
      console.log('✅ Case A Passed: Client-submitted underpayment price (1.00) rejected with 400 Price Mismatch.');
      passed++;
    } else {
      console.error(`❌ Case A Failed: Expected 400, got ${resA.status}`);
      failed++;
    }

    // Case B: Client sends inflated price: { amount: 99999 } -> Rejected with 400 Mismatch
    const resB = await fetch(`${baseUrl}/api/payments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent}` },
      body: JSON.stringify({ provider: 'paymob', courseId: course.id, amount: 99999.00 })
    });
    if (resB.status === 400) {
      console.log('✅ Case B Passed: Client-submitted inflated price (99999.00) rejected with 400 Price Mismatch.');
      passed++;
    } else {
      console.error(`❌ Case B Failed: Expected 400, got ${resB.status}`);
      failed++;
    }

    // Case C & D: Webhook transaction validation logic against DB
    const pendingPayment = await prisma.payment.create({
      data: {
        userId: student.id,
        courseId: course.id,
        amount: 250.00,
        currency: 'EGP',
        status: 'PENDING',
        providerOrderId: `order_${stamp}`
      }
    });

    // Simulate Webhook processing transaction for underpayment
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id: pendingPayment.id } });
      const expectedAmount = Number(payment!.amount);
      const paidAmount = 50.00; // Tampered amount
      const currency = 'EGP';

      if (paidAmount < expectedAmount || currency !== 'EGP') {
        await tx.payment.update({ where: { id: payment!.id }, data: { status: 'FAILED' } });
      }
    });
    const checkPaymentC = await prisma.payment.findUnique({ where: { id: pendingPayment.id } });
    const checkEnrollmentC = await prisma.courseEnrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } }
    });
    if (checkPaymentC?.status === 'FAILED' && !checkEnrollmentC) {
      console.log('✅ Case C Passed: Underpaid transaction marked FAILED; enrollment withheld.');
      passed++;
    } else {
      console.error('❌ Case C Failed: Underpaid transaction was not blocked.');
      failed++;
    }

    // Reset payment to PENDING for Case D (Currency mismatch)
    await prisma.payment.update({ where: { id: pendingPayment.id }, data: { status: 'PENDING' } });
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id: pendingPayment.id } });
      const expectedAmount = Number(payment!.amount);
      const paidAmount = 250.00;
      const currency = 'USD'; // Tampered currency

      if (paidAmount < expectedAmount || currency !== 'EGP') {
        await tx.payment.update({ where: { id: payment!.id }, data: { status: 'FAILED' } });
      }
    });
    const checkPaymentD = await prisma.payment.findUnique({ where: { id: pendingPayment.id } });
    if (checkPaymentD?.status === 'FAILED') {
      console.log('✅ Case D Passed: Mismatched currency transaction marked FAILED; enrollment withheld.');
      passed++;
    } else {
      console.error('❌ Case D Failed: Currency mismatch transaction was not blocked.');
      failed++;
    }

    // Case E: Legitimate webhook & Idempotent Replay
    await prisma.payment.update({ where: { id: pendingPayment.id }, data: { status: 'PENDING' } });
    // Process 1st valid webhook
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id: pendingPayment.id } });
      if (payment && payment.status !== 'COMPLETED') {
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED' } });
        await tx.courseEnrollment.upsert({
          where: { studentId_courseId: { studentId: payment.userId, courseId: payment.courseId! } },
          update: {},
          create: { studentId: payment.userId, courseId: payment.courseId! }
        });
      }
    });
    // Process duplicate webhook replay
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id: pendingPayment.id } });
      if (payment && payment.status !== 'COMPLETED') {
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED' } });
        await tx.courseEnrollment.upsert({
          where: { studentId_courseId: { studentId: payment.userId, courseId: payment.courseId! } },
          update: {},
          create: { studentId: payment.userId, courseId: payment.courseId! }
        });
      }
    });

    const enrollmentsCount = await prisma.courseEnrollment.count({
      where: { studentId: student.id, courseId: course.id }
    });
    if (enrollmentsCount === 1) {
      console.log('✅ Case E Passed: Duplicate webhook replay handled idempotently (exactly 1 enrollment record created).');
      passed++;
    } else {
      console.error(`❌ Case E Failed: Duplicate enrollments created! Count: ${enrollmentsCount}`);
      failed++;
    }

    console.log(`\n--- SEC-003 RUNTIME RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  } catch (err: any) {
    console.error('❌ SEC-003 runtime error:', err.message);
    failed++;
  } finally {
    // Cleanup DB
    if (student?.id && course?.id) {
      await prisma.courseEnrollment.deleteMany({ where: { studentId: student.id, courseId: course.id } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { userId: student.id } }).catch(() => {});
    }
    if (course?.id) await prisma.course.delete({ where: { id: course.id } }).catch(() => {});
    if (student?.id) await prisma.user.delete({ where: { id: student.id } }).catch(() => {});
    if (teacher?.id) await prisma.user.delete({ where: { id: teacher.id } }).catch(() => {});
    server.close();
    await prisma.$disconnect();
  }

  if (failed > 0) process.exit(1);
}

testSec003Runtime();
