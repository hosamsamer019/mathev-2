import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || '4685c8216cff4502cea1cf993d197d0dcbe6704215d2e2d29055b1e8fec1e02b';

function generateAdminToken(adminId: string) {
  return jwt.sign({ userId: adminId, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
}

async function runAudit() {
  console.log("--- Starting E2E Functional Audit Phase 5 ---");
  
  // 1. Find an admin to act as
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error("No ADMIN found in DB to perform actions.");
    return;
  }
  const token = generateAdminToken(admin.id);
  const api = axios.create({
    baseURL: 'http://localhost:4002/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  try {
    // 2. Create Teacher
    const teacherRes = await api.post('/users/users', {
      name: 'Audit Teacher',
      email: 'teacher@audit.com',
      password: 'password123',
      role: 'TEACHER'
    });
    console.log("Teacher creation API response:", teacherRes.status);
    const teacherId = teacherRes.data.user.id;

    // Verify DB
    const dbTeacher = await prisma.user.findUnique({ where: { id: teacherId } });
    console.log("Teacher in DB:", !!dbTeacher);

    // 3. Create Student with Parent
    const studentRes = await api.post('/users/users', {
      name: 'Audit Student',
      email: 'student@audit.com',
      password: 'password123',
      role: 'ONLINE_STUDENT',
      parentName: 'Audit Parent',
      parentEmail: 'parent@audit.com',
      parentPassword: 'password123'
    });
    console.log("Student+Parent creation API response:", studentRes.status);
    const studentId = studentRes.data.user.id;

    // Verify DB relation
    const dbStudent = await prisma.user.findUnique({ where: { id: studentId }, include: { parent: true } });
    console.log("Student in DB:", !!dbStudent);
    console.log("Parent relation in DB:", !!dbStudent?.parent);
    
    // Verify Parent visibility
    const parentToken = jwt.sign({ userId: dbStudent?.parent?.id, role: 'PARENT' }, JWT_SECRET, { expiresIn: '1h' });
    const parentApi = axios.create({ baseURL: 'http://localhost:4002/api', headers: { Authorization: `Bearer ${parentToken}` } });
    
    // As parent, get users (should only see child)
    const getChildrenRes = await parentApi.get(`/users/users`);
    console.log("Parent fetched children:", getChildrenRes.data.data.length === 1 && getChildrenRes.data.data[0].id === studentId);

    // Clean up
    await prisma.user.deleteMany({
      where: { email: { in: ['teacher@audit.com', 'student@audit.com', 'parent@audit.com'] } }
    });
    console.log("Audit test data cleaned up.");

  } catch (error: any) {
    console.error("Phase 5 Audit Error:", error?.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
