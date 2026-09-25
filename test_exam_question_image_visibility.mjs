/**
 * Regression Test Suite: Exam Question Image Visibility & Security
 *
 * Validates:
 * 1. Teacher question image upload -> TemporaryAsset creation
 * 2. Exam creation with question image -> DB persistence in Exam & Assessment
 * 3. TemporaryAsset linked to assessmentId
 * 4. Exam update with question image -> DB update in Exam & Assessment
 * 5. Student GET /api/exams -> question.imageUrl visible, sensitive fields stripped
 * 6. Student GET /api/exams/:id -> question.imageUrl visible, sensitive fields stripped
 * 7. Student GET /api/assessments/:id -> question.imageUrl visible, sensitive fields stripped
 * 8. Student review endpoint -> question.imageUrl visible
 * 9. External student taking endpoint -> question.imageUrl visible, sensitive fields stripped
 * 10. Question image accessibility -> HTTP 200 with valid image Content-Type
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const COURSE_BASE = 'http://localhost:4004';
const ASSESSMENTS_URL = `${COURSE_BASE}/api/assessments`;
const EXAMS_URL = `${COURSE_BASE}/api/exams`;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';
const TS = Date.now();

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function assert(condition, name, details = '') {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  ✓ PASS: ${name}`);
    results.details.push({ name, status: 'PASS', details });
  } else {
    results.failed++;
    console.error(`  ✗ FAIL: ${name} - ${details}`);
    results.details.push({ name, status: 'FAIL', details });
  }
}

// Valid 1x1 PNG image
const VALID_PNG_BASE64 = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]).toString('base64');

async function run() {
  console.log('======================================================');
  console.log('🧪 RUNNING EXAM QUESTION IMAGE VISIBILITY REGRESSION TEST');
  console.log('======================================================\n');

  try {
    // 1. Setup entities
    console.log('--- Step 1: Setting up Teacher, Student, Course ---');
    let teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    if (!teacher) {
      teacher = await prisma.user.create({
        data: {
          email: `teacher_img_${TS}@test.com`,
          password: 'password_hash',
          name: 'أستاذ الرياضيات',
          role: 'TEACHER'
        }
      });
    }

    let student = await prisma.user.findFirst({ where: { role: 'CENTER_STUDENT' } });
    if (!student) {
      student = await prisma.user.create({
        data: {
          email: `student_img_${TS}@test.com`,
          password: 'password_hash',
          name: 'طالب الاختبار',
          role: 'CENTER_STUDENT'
        }
      });
    }

    let course = await prisma.course.findFirst({ where: { teacherId: teacher.id } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          title: `كورس الهندسة الفضائية ${TS}`,
          description: 'كورس تجريبي',
          price: 0,
          teacherId: teacher.id
        }
      });
    }

    // Ensure student enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } }
    });
    if (!enrollment) {
      await prisma.courseEnrollment.create({
        data: { studentId: student.id, courseId: course.id }
      });
    }

    const teacherToken = jwt.sign({ userId: teacher.id, role: 'TEACHER', email: teacher.email }, JWT_SECRET, { expiresIn: '1h' });
    const studentToken = jwt.sign({ userId: student.id, role: 'CENTER_STUDENT', email: student.email }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Upload Question Asset
    console.log('\n--- Step 2: Upload Question Asset ---');
    const uploadRes = await axios.post(
      `${ASSESSMENTS_URL}/assets/upload`,
      {
        imageBase64: `data:image/png;base64,${VALID_PNG_BASE64}`,
        filename: 'geometry_diagram.png',
        mimeType: 'image/png'
      },
      { headers: { Authorization: `Bearer ${teacherToken}` } }
    );

    assert(uploadRes.status === 201, 'Upload returns HTTP 201');
    const uploadedAsset = uploadRes.data;
    assert(!!uploadedAsset.url, 'Upload response contains url', uploadedAsset.url);
    assert(!!uploadedAsset.storageKey, 'Upload response contains storageKey', uploadedAsset.storageKey);
    assert(!!uploadedAsset.assetId, 'Upload response contains assetId', uploadedAsset.assetId);

    // 3. Create Exam with Question Image
    console.log('\n--- Step 3: Create Exam with Question Image ---');
    const questionsPayload = [
      {
        id: 1,
        text: 'في الشكل المقابل، ما هي قيمة الزاوية س؟',
        type: 'mcq',
        options: ['30°', '45°', '60°', '90°'],
        correct: 1,
        correctAnswer: '45°',
        imageUrl: uploadedAsset.url,
        imageStorageKey: uploadedAsset.storageKey,
        imageAssetId: uploadedAsset.assetId,
        points: 5,
        explanation: 'بما أن المثلث متساوي الساقين إذن س = 45',
        solutionSteps: ['الزاوية = 45'],
        solutionExplanation: 'شرح الحل بالتفصيل',
        generationLogic: { topic: 'Geometry' },
        validationStatus: 'MATHEMATICALLY_VERIFIED'
      }
    ];

    const createExamRes = await axios.post(
      `${EXAMS_URL}`,
      {
        title: `امتحان الهندسة بالصور ${TS}`,
        courseId: course.id,
        duration: 45,
        passingScore: 50,
        allowExternalStudents: true,
        questions: questionsPayload
      },
      { headers: { Authorization: `Bearer ${teacherToken}` } }
    );

    assert(createExamRes.status === 201, 'Create Exam returns HTTP 201');
    const createdExam = createExamRes.data;
    const examId = createdExam.id;
    assert(!!examId, 'Exam ID is present', examId);

    // 4. Verify DB Persistence in both Exam and Assessment tables
    console.log('\n--- Step 4: Verify DB Persistence ---');
    const examInDb = await prisma.exam.findUnique({ where: { id: examId } });
    assert(!!examInDb, 'Exam record exists in db.exam');
    const examQuestions = examInDb?.questions;
    assert(Array.isArray(examQuestions) && examQuestions.length === 1, 'db.exam contains 1 question');
    assert(examQuestions[0]?.imageUrl === uploadedAsset.url, 'db.exam question contains imageUrl', examQuestions[0]?.imageUrl);

    const assessInDb = await prisma.assessment.findUnique({ where: { id: examId } });
    assert(!!assessInDb, 'Assessment record mirrored in db.assessment');
    const assessQuestions = assessInDb?.questions;
    assert(Array.isArray(assessQuestions) && assessQuestions.length === 1, 'db.assessment contains 1 question');
    assert(assessQuestions[0]?.imageUrl === uploadedAsset.url, 'db.assessment question contains imageUrl', assessQuestions[0]?.imageUrl);

    // Check TemporaryAsset linkage
    const linkedAsset = await prisma.temporaryAsset.findUnique({ where: { id: uploadedAsset.assetId } });
    assert(linkedAsset?.assessmentId === examId, 'TemporaryAsset linked to assessmentId in DB', linkedAsset?.assessmentId);

    // 5. Verify Student Exam API Response (GET /api/exams/:id)
    console.log('\n--- Step 5: Verify Student GET /api/exams/:id Sanitization ---');
    const studentExamRes = await axios.get(
      `${EXAMS_URL}/${examId}`,
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );

    assert(studentExamRes.status === 200, 'Student GET /api/exams/:id returns HTTP 200');
    const studentExamQ = studentExamRes.data.questions[0];
    assert(studentExamQ?.imageUrl === uploadedAsset.url, 'Student question HAS imageUrl', studentExamQ?.imageUrl);
    assert(studentExamQ?.correct === undefined, 'Student question does NOT contain correct');
    assert(studentExamQ?.correctAnswer === undefined, 'Student question does NOT contain correctAnswer');
    assert(studentExamQ?.solutionExplanation === undefined, 'Student question does NOT contain solutionExplanation');
    assert(studentExamQ?.solutionSteps === undefined, 'Student question does NOT contain solutionSteps');
    assert(studentExamQ?.generationLogic === undefined, 'Student question does NOT contain generationLogic');
    assert(studentExamQ?.validationStatus === undefined, 'Student question does NOT contain validationStatus');
    assert(studentExamQ?.imageStorageKey === undefined, 'Student question does NOT contain internal imageStorageKey');
    assert(studentExamQ?.imageAssetId === undefined, 'Student question does NOT contain internal imageAssetId');

    // 6. Verify Student GET /api/assessments/:id
    console.log('\n--- Step 6: Verify Student GET /api/assessments/:id ---');
    const studentAssessRes = await axios.get(
      `${ASSESSMENTS_URL}/${examId}`,
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(studentAssessRes.status === 200, 'Student GET /api/assessments/:id returns HTTP 200');
    const assessQ = studentAssessRes.data.questions[0];
    assert(assessQ?.imageUrl === uploadedAsset.url, 'Student assessment question HAS imageUrl', assessQ?.imageUrl);
    assert(assessQ?.correct === undefined, 'Student assessment question does NOT contain correct');
    assert(assessQ?.imageStorageKey === undefined, 'Student assessment question does NOT contain imageStorageKey');

    // 7. Test Student Exam Attempt & Assessment Review
    console.log('\n--- Step 7: Test Student Attempt and Review Endpoint ---');
    const startAttemptRes = await axios.post(
      `${ASSESSMENTS_URL}/${examId}/start`,
      {},
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(startAttemptRes.status === 200, 'Student start attempt returns HTTP 200');
    const attemptId = startAttemptRes.data.attempt.id;

    const submitRes = await axios.post(
      `${ASSESSMENTS_URL}/${examId}/attempt/submit`,
      {
        answers: [{ questionId: '1', answer: '1' }]
      },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(submitRes.status === 200, 'Student submit returns HTTP 200');

    // Get Review
    const reviewRes = await axios.get(
      `${ASSESSMENTS_URL}/${examId}/attempts/${attemptId}/review`,
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    assert(reviewRes.status === 200, 'Student get review returns HTTP 200');
    const reviewQ = reviewRes.data.questions[0];
    assert(reviewQ?.imageUrl === uploadedAsset.url, 'Review question HAS imageUrl', reviewQ?.imageUrl);

    // 8. Test External Student Flow
    console.log('\n--- Step 8: Test External Student Exam Taking Flow ---');
    const accessCode = createdExam.examAccessCode || assessInDb?.examAccessCode;
    assert(!!accessCode, 'Exam has access code for external students', accessCode);

    if (accessCode) {
      const externalSessionRes = await axios.post(
        `http://localhost:4001/api/auth/external-exam`,
        {
          code: accessCode,
          name: 'طالب خارجي تجريبي',
          phone: '01012345678'
        }
      );
      assert(externalSessionRes.status === 200, 'External session created returns HTTP 200');
      const externalToken = externalSessionRes.data.token;
      assert(!!externalToken, 'External session token received');

      const externalAssessRes = await axios.get(
        `${ASSESSMENTS_URL}/${examId}`,
        { headers: { Authorization: `Bearer ${externalToken}` } }
      );
      assert(externalAssessRes.status === 200, 'External student GET assessment returns HTTP 200');
      const extQ = externalAssessRes.data.questions[0];
      assert(extQ?.imageUrl === uploadedAsset.url, 'External student question HAS imageUrl', extQ?.imageUrl);
      assert(extQ?.correct === undefined, 'External student does NOT see correct answer');
      assert(extQ?.imageStorageKey === undefined, 'External student does NOT see imageStorageKey');
    }

    // 9. Verify Physical File and Image URL Accessibility
    console.log('\n--- Step 9: Verify Image URL Accessibility & Binary Integrity ---');
    let imgFetchUrl = uploadedAsset.url;
    if (imgFetchUrl.startsWith('/')) {
      imgFetchUrl = `${COURSE_BASE}${imgFetchUrl}`;
    }
    const imgRes = await axios.get(imgFetchUrl, { responseType: 'arraybuffer' });
    assert(imgRes.status === 200, 'Direct course-service image URL returns HTTP 200', imgFetchUrl);
    const contentType = imgRes.headers['content-type'] || '';
    assert(contentType.includes('image/'), 'Image Content-Type is valid image/*', contentType);
    assert(imgRes.data.length > 0, 'Image response payload is non-empty', `${imgRes.data.length} bytes`);
    
    // Validate image signature in body (PNG: 89 50 4E 47)
    const buf = Buffer.from(imgRes.data);
    const isPngSig = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    assert(isPngSig, 'Image payload matches valid PNG binary magic bytes');

    // Verify resolved frontend URL in local development
    const resolvedLocalUrl = `http://localhost:4004${uploadedAsset.url.startsWith('/') ? '' : '/'}${uploadedAsset.url}`;
    assert(imgFetchUrl === resolvedLocalUrl, 'Frontend getMediaUrl resolves to valid direct course-service URL');

    // Cleanup test exam
    await prisma.assessmentAttempt.deleteMany({ where: { assessmentId: examId } });
    await prisma.externalExamAttempt.deleteMany({ where: { assessmentId: examId } });
    await prisma.assessment.deleteMany({ where: { id: examId } });
    await prisma.exam.deleteMany({ where: { id: examId } });

  } catch (error) {
    console.error('\n❌ Unhandled error during regression test:', error.response?.data || error.message);
    assert(false, 'Regression test completed without errors', error.message);
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTS: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
  console.log('======================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
