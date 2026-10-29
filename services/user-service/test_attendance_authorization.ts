/**
 * Isolated Automated Regression Test Suite for AL-SADEN Attendance Authorization
 * Phase 4.3 — Zero Database / Pure In-Memory Synthetic Mocking
 */

// 1. Setup in-memory mock database BEFORE importing controller or database module
interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  gradeLevel?: string;
  educationLevel?: string;
}

interface MockCourse {
  id: string;
  title: string;
  teacherId: string;
}

interface MockEnrollment {
  id: string;
  studentId: string;
  courseId: string;
}

interface MockAttendance {
  id: string;
  studentId: string;
  date: Date;
  status: string;
  createdAt: Date;
}

const mockUsers: MockUser[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Teacher A', email: 'teacherA@test.local', role: 'TEACHER' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Teacher B', email: 'teacherB@test.local', role: 'TEACHER' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Admin Root', email: 'admin@test.local', role: 'ADMIN' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Parent User', email: 'parent@test.local', role: 'PARENT' },
  { id: '55555555-5555-5555-5555-555555555551', name: 'Student A1 (Online)', email: 'a1@test.local', role: 'ONLINE_STUDENT' },
  { id: '55555555-5555-5555-5555-555555555552', name: 'Student A2 (Center)', email: 'a2@test.local', role: 'CENTER_STUDENT' },
  { id: '66666666-6666-6666-6666-666666666661', name: 'Student B1 (Online)', email: 'b1@test.local', role: 'ONLINE_STUDENT' },
  { id: '77777777-7777-7777-7777-777777777771', name: 'Student Unenrolled', email: 'unenrolled@test.local', role: 'ONLINE_STUDENT' }
];

const mockCourses: MockCourse[] = [
  { id: 'course-a', title: 'Math 101 (Teacher A)', teacherId: '11111111-1111-1111-1111-111111111111' },
  { id: 'course-b', title: 'Physics 101 (Teacher B)', teacherId: '22222222-2222-2222-2222-222222222222' }
];

const mockEnrollments: MockEnrollment[] = [
  { id: 'enr-1', studentId: '55555555-5555-5555-5555-555555555551', courseId: 'course-a' },
  { id: 'enr-2', studentId: '55555555-5555-5555-5555-555555555552', courseId: 'course-a' },
  { id: 'enr-3', studentId: '66666666-6666-6666-6666-666666666661', courseId: 'course-b' }
];

let mockAttendanceList: MockAttendance[] = [];

function resetAttendanceList() {
  mockAttendanceList = [
    {
      id: 'att-rec-t1-1',
      studentId: '55555555-5555-5555-5555-555555555551',
      date: new Date('2026-10-29T00:00:00.000Z'),
      status: 'PRESENT',
      createdAt: new Date('2026-10-29T08:00:00.000Z')
    },
    {
      id: 'att-rec-t2-1',
      studentId: '66666666-6666-6666-6666-666666666661',
      date: new Date('2026-10-29T00:00:00.000Z'),
      status: 'ABSENT',
      createdAt: new Date('2026-10-29T09:00:00.000Z')
    }
  ];
}
resetAttendanceList();

// Mock Prisma Client Implementation
const mockPrismaClient: any = {
  user: {
    findFirst: async (args: any) => {
      const { where } = args || {};
      const user = mockUsers.find(u => {
        if (where.id && u.id !== where.id) return false;
        if (where.role?.in && !where.role.in.includes(u.role)) return false;

        // Check enrollment relation
        if (where.enrollments?.some?.course?.teacherId) {
          const reqTeacherId = where.enrollments.some.course.teacherId;
          const userEnrolledCourseIds = mockEnrollments
            .filter(e => e.studentId === u.id)
            .map(e => e.courseId);
          const teachesAny = mockCourses.some(
            c => c.teacherId === reqTeacherId && userEnrolledCourseIds.includes(c.id)
          );
          if (!teachesAny) return false;
        }

        return true;
      });
      return user || null;
    },
    findUnique: async (args: any) => {
      const { where } = args || {};
      return mockUsers.find(u => u.id === where.id) || null;
    }
  },
  attendance: {
    findUnique: async (args: any) => {
      const { where } = args || {};
      return mockAttendanceList.find(a => a.id === where.id) || null;
    },
    findFirst: async (args: any) => {
      const { where } = args || {};
      return mockAttendanceList.find(a => {
        if (where.studentId && a.studentId !== where.studentId) return false;
        if (where.date?.gte && a.date < where.date.gte) return false;
        if (where.date?.lte && a.date > where.date.lte) return false;
        return true;
      }) || null;
    },
    findMany: async (args: any) => {
      const { where } = args || {};
      return mockAttendanceList
        .filter(a => {
          if (where.date?.gte && a.date < where.date.gte) return false;
          if (where.date?.lte && a.date > where.date.lte) return false;

          if (where.student) {
            const student = mockUsers.find(u => u.id === a.studentId);
            if (!student) return false;
            if (where.student.role?.in && !where.student.role.in.includes(student.role)) return false;

            if (where.student.enrollments?.some?.course?.teacherId) {
              const reqTeacherId = where.student.enrollments.some.course.teacherId;
              const studentEnrolledCourseIds = mockEnrollments
                .filter(e => e.studentId === student.id)
                .map(e => e.courseId);
              const teaches = mockCourses.some(
                c => c.teacherId === reqTeacherId && studentEnrolledCourseIds.includes(c.id)
              );
              if (!teaches) return false;
            }
          }
          return true;
        })
        .map(a => {
          const student = mockUsers.find(u => u.id === a.studentId);
          return {
            ...a,
            student: student
              ? {
                  id: student.id,
                  name: student.name,
                  email: student.email,
                  role: student.role,
                  gradeLevel: student.gradeLevel,
                  educationLevel: student.educationLevel
                }
              : null
          };
        });
    },
    create: async (args: any) => {
      const { data } = args;
      const newRec: MockAttendance = {
        id: `att-mock-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        studentId: data.studentId,
        date: data.date,
        status: data.status,
        createdAt: new Date()
      };
      mockAttendanceList.push(newRec);
      return newRec;
    },
    update: async (args: any) => {
      const { where, data } = args;
      const rec = mockAttendanceList.find(a => a.id === where.id);
      if (!rec) throw new Error('Record not found');
      if (data.status) rec.status = data.status;
      if (data.date) rec.date = data.date;
      return rec;
    },
    delete: async (args: any) => {
      const { where } = args;
      const idx = mockAttendanceList.findIndex(a => a.id === where.id);
      if (idx === -1) throw new Error('Record not found');
      const [deleted] = mockAttendanceList.splice(idx, 1);
      return deleted;
    }
  },
  notification: {
    create: async () => ({ id: 'notif-mock-1' })
  }
};

// Inject mock client into global before loading controller
(globalThis as any).prismaGlobal = mockPrismaClient;

// Import attendance controller dynamically to ensure injected mock is bound before evaluation
const {
  markAttendance,
  bulkMarkAttendance,
  getAttendanceByDate,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getStudentAttendanceById,
  getAttendancePercentage
} = await import('./src/controllers/attendance.controller.ts');

// Helper to construct synthetic Express Request/Response objects
function createSyntheticReqRes(reqData: {
  user?: { userId: string; role: string; email: string };
  body?: any;
  params?: any;
  query?: any;
}) {
  const req: any = {
    user: reqData.user,
    body: reqData.body || {},
    params: reqData.params || {},
    query: reqData.query || {}
  };

  let statusCode = 200;
  let jsonResponse: any = null;

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (payload: any) => {
      jsonResponse = payload;
      return res;
    }
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getBody: () => jsonResponse
  };
}

async function runRegressionTestSuite() {
  console.log('================================================================');
  console.log(' AL-SADEN Phase 4.3 — Attendance Authorization Regression Suite');
  console.log(' Isolated In-Memory Mock Testing (No DB / No Network)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, details?: any) {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passed++;
    } else {
      console.error(`FAIL: ${testName}`);
      if (details) console.error('  Details:', details);
      failed++;
    }
  }

  const TEACHER_A_USER = { userId: '11111111-1111-1111-1111-111111111111', role: 'TEACHER', email: 'teacherA@test.local' };
  const TEACHER_B_USER = { userId: '22222222-2222-2222-2222-222222222222', role: 'TEACHER', email: 'teacherB@test.local' };
  const ADMIN_USER = { userId: '33333333-3333-3333-3333-333333333333', role: 'ADMIN', email: 'admin@test.local' };
  const PARENT_USER = { userId: '44444444-4444-4444-4444-444444444444', role: 'PARENT', email: 'parent@test.local' };

  const STUDENT_T1_ONLINE = '55555555-5555-5555-5555-555555555551';
  const STUDENT_T1_CENTER = '55555555-5555-5555-5555-555555555552';
  const STUDENT_T2_ONLINE = '66666666-6666-6666-6666-666666666661';
  const STUDENT_UNENROLLED = '77777777-7777-7777-7777-777777777771';
  const NONEXISTENT_STUDENT = '99999999-9999-9999-9999-999999999999';

  // ---------------------------------------------------------------------------
  // Test 1: Authorized teacher reads attendance for own enrolled students
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      query: { date: '2026-10-29' }
    });
    await getAttendanceByDate(ctx.req, ctx.res);
    const body = ctx.getBody();
    assert(
      'Test 1: Authorized teacher reads attendance for own enrolled students',
      ctx.getStatus() === 200 &&
      body.count === 1 &&
      body.data[0].studentId === STUDENT_T1_ONLINE,
      { status: ctx.getStatus(), body }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 2: Authorized teacher saves attendance for own enrolled students (single mark)
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      body: {
        studentId: STUDENT_T1_CENTER,
        status: 'LATE',
        date: '2026-10-29'
      }
    });
    await markAttendance(ctx.req, ctx.res);
    assert(
      'Test 2: Authorized teacher saves single attendance for own enrolled student',
      ctx.getStatus() === 201 && ctx.getBody().status === 'LATE',
      { status: ctx.getStatus(), body: ctx.getBody() }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 3: Authorized teacher deletes own authorized attendance record
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      params: { id: 'att-rec-t1-1' }
    });
    await deleteAttendanceRecord(ctx.req, ctx.res);
    assert(
      'Test 3: Authorized teacher deletes own authorized attendance record',
      ctx.getStatus() === 200 && ctx.getBody().id === 'att-rec-t1-1',
      { status: ctx.getStatus(), body: ctx.getBody() }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 4: Teacher A cannot read Teacher B\'s students\' attendance
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      query: { date: '2026-10-29' }
    });
    await getAttendanceByDate(ctx.req, ctx.res);
    const body = ctx.getBody();
    const leakedTeacherBStudent = body.data.some((r: any) => r.studentId === STUDENT_T2_ONLINE);
    assert(
      'Test 4: Teacher A date-query does NOT return Teacher B students attendance',
      ctx.getStatus() === 200 && !leakedTeacherBStudent,
      { leakedTeacherBStudent, body }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 5: Teacher A cannot save attendance for Teacher B\'s students (single mark)
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      body: {
        studentId: STUDENT_T2_ONLINE,
        status: 'PRESENT',
        date: '2026-10-29'
      }
    });
    await markAttendance(ctx.req, ctx.res);
    assert(
      'Test 5: Teacher A cannot save attendance for Teacher B student (returns 404)',
      ctx.getStatus() === 404,
      { status: ctx.getStatus(), body: ctx.getBody() }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 6: Teacher A cannot delete Teacher B\'s attendance record
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      params: { id: 'att-rec-t2-1' } // belongs to Teacher B's student
    });
    await deleteAttendanceRecord(ctx.req, ctx.res);
    assert(
      'Test 6: Teacher A cannot delete Teacher B attendance record (returns 403 Forbidden)',
      ctx.getStatus() === 403,
      { status: ctx.getStatus(), body: ctx.getBody() }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 7: Registered but unenrolled student is rejected for teacher operations
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      body: {
        studentId: STUDENT_UNENROLLED,
        status: 'PRESENT',
        date: '2026-10-29'
      }
    });
    await markAttendance(ctx.req, ctx.res);
    assert(
      'Test 7: Registered but unenrolled student rejected for teacher operations (returns 404)',
      ctx.getStatus() === 404,
      { status: ctx.getStatus(), body: ctx.getBody() }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 8: Non-student accounts (ADMIN, TEACHER, PARENT) cannot be attendance targets
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const nonStudentTargets = [
      { id: ADMIN_USER.userId, label: 'ADMIN target' },
      { id: TEACHER_B_USER.userId, label: 'TEACHER target' },
      { id: PARENT_USER.userId, label: 'PARENT target' }
    ];

    let allRejected = true;
    for (const target of nonStudentTargets) {
      const ctx = createSyntheticReqRes({
        user: ADMIN_USER, // even ADMIN cannot mark attendance for non-students
        body: {
          studentId: target.id,
          status: 'PRESENT',
          date: '2026-10-29'
        }
      });
      await markAttendance(ctx.req, ctx.res);
      if (ctx.getStatus() !== 404) {
        allRejected = false;
        console.error(`  Failure on target ${target.label}: expected 404, got ${ctx.getStatus()}`);
      }
    }
    assert(
      'Test 8: ADMIN, TEACHER, and PARENT accounts cannot be attendance targets (rejected 404)',
      allRejected
    );
  }

  // ---------------------------------------------------------------------------
  // Test 9: Nonexistent students and records handled correctly (404)
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctxMark = createSyntheticReqRes({
      user: TEACHER_A_USER,
      body: {
        studentId: NONEXISTENT_STUDENT,
        status: 'PRESENT',
        date: '2026-10-29'
      }
    });
    await markAttendance(ctxMark.req, ctxMark.res);

    const ctxDelete = createSyntheticReqRes({
      user: TEACHER_A_USER,
      params: { id: 'nonexistent-rec-uuid' }
    });
    await deleteAttendanceRecord(ctxDelete.req, ctxDelete.res);

    assert(
      'Test 9: Nonexistent student and record IDs return 404',
      ctxMark.getStatus() === 404 && ctxDelete.getStatus() === 404,
      { markStatus: ctxMark.getStatus(), deleteStatus: ctxDelete.getStatus() }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 10: Missing authentication rejected (401 Unauthorized)
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: undefined, // unauthenticated
      body: {
        studentId: STUDENT_T1_ONLINE,
        status: 'PRESENT'
      }
    });
    await markAttendance(ctx.req, ctx.res);
    assert(
      'Test 10: Missing authentication rejected with 401 Unauthorized',
      ctx.getStatus() === 401,
      { status: ctx.getStatus(), body: ctx.getBody() }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 11: Bulk save validates every target student rather than authorizing only the first
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      body: {
        date: '2026-10-29',
        records: [
          { studentId: STUDENT_T1_ONLINE, status: 'PRESENT' }, // Authorized
          { studentId: STUDENT_T2_ONLINE, status: 'PRESENT' }  // Unauthorized
        ]
      }
    });
    await bulkMarkAttendance(ctx.req, ctx.res);
    assert(
      'Test 11: Bulk save validates every target student (payload with unauthorized second student rejected)',
      ctx.getStatus() === 403,
      { status: ctx.getStatus(), body: ctx.getBody() }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 12: Mixed bulk requests follow explicit policy (atomic reject with 403)
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const initialCount = mockAttendanceList.length;
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      body: {
        date: '2026-10-29',
        records: [
          { studentId: STUDENT_T1_ONLINE, status: 'PRESENT' },
          { studentId: STUDENT_UNENROLLED, status: 'PRESENT' }
        ]
      }
    });
    await bulkMarkAttendance(ctx.req, ctx.res);
    const postCount = mockAttendanceList.length;

    assert(
      'Test 12: Mixed bulk save atomically rejects with 403 and creates zero records',
      ctx.getStatus() === 403 && postCount === initialCount,
      { status: ctx.getStatus(), postCount, initialCount }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 13: Phase 4.1 response contract (success, count, data, and records)
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      body: {
        date: '2026-10-29',
        records: [
          { studentId: STUDENT_T1_ONLINE, status: 'PRESENT' },
          { studentId: STUDENT_T1_CENTER, status: 'LATE' }
        ]
      }
    });
    await bulkMarkAttendance(ctx.req, ctx.res);
    const body = ctx.getBody();
    assert(
      'Test 13: Successful bulk save preserves Phase 4.1 contract (data and records mapped)',
      ctx.getStatus() === 200 &&
      body.success === true &&
      body.count === 2 &&
      Array.isArray(body.data) &&
      body.data.length === 2 &&
      Array.isArray(body.records) &&
      body.records.length === 2,
      { status: ctx.getStatus(), body }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 14: ADMIN platform-wide management for valid students (regardless of course)
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: ADMIN_USER,
      body: {
        date: '2026-10-29',
        records: [
          { studentId: STUDENT_T1_ONLINE, status: 'PRESENT' },
          { studentId: STUDENT_T2_ONLINE, status: 'ABSENT' }
        ]
      }
    });
    await bulkMarkAttendance(ctx.req, ctx.res);
    const body = ctx.getBody();
    assert(
      'Test 14: ADMIN can manage attendance platform-wide for all valid students',
      ctx.getStatus() === 200 && body.success === true && body.count === 2,
      { status: ctx.getStatus(), body }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 15: Teacher A cannot update Teacher B\'s student attendance record
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      params: { id: 'att-rec-t2-1' }, // belongs to Teacher B's student
      body: { status: 'LATE' }
    });
    await updateAttendanceRecord(ctx.req, ctx.res);
    assert(
      'Test 15: Teacher A cannot update Teacher B attendance record (returns 403 Forbidden)',
      ctx.getStatus() === 403,
      { status: ctx.getStatus(), body: ctx.getBody() }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 16: Teacher A cannot read attendance history of Teacher B\'s student
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      params: { studentId: STUDENT_T2_ONLINE }
    });
    await getStudentAttendanceById(ctx.req, ctx.res);
    assert(
      'Test 16: Teacher A cannot read attendance history for Teacher B student (returns 403 Forbidden)',
      ctx.getStatus() === 403,
      { status: ctx.getStatus(), body: ctx.getBody() }
    );
  }

  // ---------------------------------------------------------------------------
  // Test 17: Teacher A cannot read attendance percentage of Teacher B\'s student
  // ---------------------------------------------------------------------------
  {
    resetAttendanceList();
    const ctx = createSyntheticReqRes({
      user: TEACHER_A_USER,
      params: { studentId: STUDENT_T2_ONLINE }
    });
    await getAttendancePercentage(ctx.req, ctx.res);
    assert(
      'Test 17: Teacher A cannot read attendance percentage for Teacher B student (returns 403 Forbidden)',
      ctx.getStatus() === 403,
      { status: ctx.getStatus(), body: ctx.getBody() }
    );
  }

  console.log('\n================================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTestSuite().catch(err => {
  console.error('Fatal error executing attendance authorization tests:', err);
  process.exit(1);
});
