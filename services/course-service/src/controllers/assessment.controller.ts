import { Response } from 'express';
import { db, AttemptStatus } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { normalizeAnswer } from '../utils/answerNormalizer.js';

/**
 * Validates if the user is enrolled or authorized to access the course's assessment
 */
async function validateEnrollment(userId: string, role: string, courseId: string): Promise<string | null> {
  const upperRole = (role || '').toUpperCase();
  if (upperRole === 'ADMIN') return null;
  if (upperRole === 'TEACHER') {
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (course?.teacherId === userId) return null;
    return 'NOT_TEACHER';
  }
  if (upperRole.includes('STUDENT')) {
    const enrollment = await db.courseEnrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId } }
    });
    if (enrollment) return null;
    return 'NOT_ENROLLED';
  }
  return 'STUDENT_ROLE_REQUIRED';
}

/**
 * GET /api/assessments
 */
export const getAllAssessments = async (req: AuthRequest, res: Response) => {
  try {
    let whereClause: any = {};
    const { type, courseId } = req.query;
    
    if (type) whereClause.type = type;
    if (courseId) whereClause.courseId = courseId;
    
    if (req.user!.role === 'TEACHER') {
      whereClause.teacherId = req.user!.userId;
    }

    const assessments = await db.assessment.findMany({
      where: whereClause,
      include: { _count: { select: { attempts: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: assessments, total: assessments.length });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching assessments', error: error.message });
  }
};

/**
 * GET /api/assessments/:id
 */
export const getAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const assessment = await db.assessment.findUnique({
      where: { id: req.params.id }
    });
    if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
    
    const authError = await validateEnrollment(req.user!.userId, req.user!.role, assessment.courseId);
    if (authError) return res.status(403).json({ message: 'Unauthorized access', code: authError });

    res.json(assessment);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching assessment', error: error.message });
  }
};

/**
 * POST /api/assessments/:id/start
 */
export const startAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const assessmentId = req.params.id;
    const studentId = req.user!.userId;

    // Use Prisma transaction to prevent race conditions during start
    const result = await db.$transaction(async (tx) => {
      const assessment = await tx.assessment.findUnique({ where: { id: assessmentId } });
      if (!assessment) throw new Error('Assessment not found');
      
      const authError = await validateEnrollment(studentId, req.user!.role, assessment.courseId);
      if (authError) throw new Error(`AUTH_ERROR:${authError}`);

      const now = new Date();

      if (assessment.openAt && now < assessment.openAt) {
        throw new Error('ASSESSMENT_NOT_OPEN');
      }
      if (assessment.closeAt && now >= assessment.closeAt) {
        throw new Error('ASSESSMENT_CLOSED');
      }

      // 1. Check if attempt already exists
      const existingAttempt = await tx.assessmentAttempt.findUnique({
        where: { studentId_assessmentId: { studentId, assessmentId } }
      });

      if (existingAttempt) {
        if (existingAttempt.status === 'SUBMITTED' || existingAttempt.status === 'GRADED' || existingAttempt.status === 'TIME_EXPIRED') {
          throw new Error('ATTEMPT_ALREADY_FINISHED');
        }
        return { attempt: existingAttempt, isNew: false };
      }

      // 2. Create the ONE attempt
      let expiresAt = assessment.closeAt ?? null;
      if (assessment.durationMinutes) {
        const calculatedExpiresAt = new Date(now.getTime() + assessment.durationMinutes * 60000);
        if (!expiresAt || calculatedExpiresAt < expiresAt) {
          expiresAt = calculatedExpiresAt;
        }
      }

      const newAttempt = await tx.assessmentAttempt.create({
        data: {
          assessmentId,
          studentId,
          status: 'STARTED',
          startedAt: now,
          expiresAt,
          answers: []
        }
      });
      return { attempt: newAttempt, isNew: true };
    });

    res.json(result);
  } catch (error: any) {
    if (error.message === 'ASSESSMENT_NOT_OPEN') return res.status(403).json({ message: 'الاختبار غير متاح حتى الآن', code: 'ASSESSMENT_NOT_OPEN' });
    if (error.message === 'ASSESSMENT_CLOSED') return res.status(403).json({ message: 'انتهى موعد التسليم', code: 'ASSESSMENT_CLOSED' });
    if (error.message === 'ATTEMPT_ALREADY_FINISHED') return res.status(403).json({ message: 'تم التسليم — لا يمكن إعادة الدخول', code: 'ATTEMPT_ALREADY_FINISHED' });
    if (error.message.startsWith('AUTH_ERROR:')) {
      const code = error.message.split(':')[1];
      let message = 'Unauthorized';
      if (code === 'NOT_ENROLLED') message = 'Student is not enrolled in this assessment\'s course';
      if (code === 'STUDENT_ROLE_REQUIRED') message = 'Student role is required';
      return res.status(403).json({ message, code });
    }
    
    // P2002 is Prisma's unique constraint violation code
    if (error.code === 'P2002') {
       const attempt = await db.assessmentAttempt.findUnique({ where: { studentId_assessmentId: { studentId: req.user!.userId, assessmentId: req.params.id } } });
       if (attempt?.status === 'SUBMITTED' || attempt?.status === 'GRADED' || attempt?.status === 'TIME_EXPIRED') {
         return res.status(403).json({ message: 'تم التسليم — لا يمكن إعادة الدخول', code: 'ATTEMPT_ALREADY_FINISHED' });
       }
       return res.json({ attempt, isNew: false });
    }

    res.status(500).json({ message: 'Error starting assessment', error: error.message });
  }
};

/**
 * PUT /api/assessments/:id/attempt/answers
 */
export const saveAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const assessmentId = req.params.id;
    const studentId = req.user!.userId;
    const { answers } = req.body;

    const attempt = await db.assessmentAttempt.findUnique({
      where: { studentId_assessmentId: { studentId, assessmentId } }
    });

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (['SUBMITTED', 'GRADED', 'TIME_EXPIRED'].includes(attempt.status)) {
      return res.status(403).json({ message: 'Cannot save, attempt already finished' });
    }

    const now = new Date();
    if (attempt.expiresAt && now >= attempt.expiresAt) {
      await db.assessmentAttempt.update({
        where: { id: attempt.id },
        data: { status: 'TIME_EXPIRED', submittedAt: now }
      });
      return res.status(403).json({ message: 'انتهى وقت المحاولة', code: 'TIME_EXPIRED' });
    }

    const updated = await db.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        answers,
        status: 'IN_PROGRESS',
        updatedAt: now
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Error saving answers', error: error.message });
  }
};

/**
 * POST /api/assessments/:id/attempt/submit
 */
export const submitAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const assessmentId = req.params.id;
    const studentId = req.user!.userId;
    const { answers: finalAnswers } = req.body;

    const result = await db.$transaction(async (tx) => {
      const attempt = await tx.assessmentAttempt.findUnique({
        where: { studentId_assessmentId: { studentId, assessmentId } },
        include: { assessment: true }
      });

      if (!attempt) throw new Error('Attempt not found');
      
      if (['SUBMITTED', 'GRADED', 'TIME_EXPIRED'].includes(attempt.status)) {
        return attempt; // Idempotent
      }

      const now = new Date();
      let status: AttemptStatus = 'SUBMITTED';
      if (attempt.expiresAt && now >= attempt.expiresAt) {
        status = 'TIME_EXPIRED';
      }

      const answersToSave = finalAnswers || attempt.answers;

      // Grade if possible
      let score = 0;
      let totalPoints = 0;
      const questions = attempt.assessment.questions as any[] || [];
      
      questions.forEach((q) => {
        const studentAns = (answersToSave as any[])?.find(a => String(a.questionId) === String(q.id));
        const rawStudentAnswer = studentAns?.answer ?? studentAns?.selectedOption ?? null;
        
        const normalizedStudentAnswer = normalizeAnswer(q, rawStudentAnswer);
        const normalizedCorrectAnswer = normalizeAnswer(q, q.correct !== undefined ? q.correct : q.correctAnswer);
        
        if (normalizedCorrectAnswer !== null && normalizedCorrectAnswer !== undefined) {
           const maxPts = q.points || 1;
           totalPoints += maxPts;
           
           if (normalizedStudentAnswer !== null && String(normalizedStudentAnswer) === String(normalizedCorrectAnswer)) {
             score += maxPts;
           }
        }
      });
      
      const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
      
      // If passingScore is defined, it might be GRADED immediately
      if (status !== 'TIME_EXPIRED') {
        status = 'GRADED';
      }

      const updated = await tx.assessmentAttempt.update({
        where: { id: attempt.id },
        data: {
          status,
          submittedAt: now,
          answers: answersToSave,
          score,
          totalPoints,
          percentage
        }
      });
      return updated;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting assessment', error: error.message });
  }
};

/**
 * GET /api/assessments/:id/attempts/:attemptId/review
 */
export const getAssessmentReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id: assessmentId, attemptId } = req.params;
    const userId = req.user!.userId;
    const role = req.user!.role;

    const attempt = await db.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        student: { select: { id: true, name: true } },
        assessment: { select: { id: true, title: true, type: true, totalPoints: true, teacherId: true, questions: true } }
      }
    });

    if (!attempt || attempt.assessmentId !== assessmentId) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Security Authorization
    let authorized = false;
    if (role === 'ADMIN') {
      authorized = true;
    } else if (role === 'TEACHER') {
      // Basic check: Ensure teacher owns the assessment (or course logic if added later)
      if (attempt.assessment.teacherId === userId) authorized = true;
      // You may add course enrollment check here if required
    } else if (role === 'PARENT') {
      // Check if student is parent's child
      const parentRel = await db.user.findFirst({
        where: { id: userId, children: { some: { id: attempt.studentId } } }
      });
      if (parentRel) authorized = true;
    } else {
      // STUDENT
      if (attempt.studentId === userId) authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Format Response
    const rawQuestions = (attempt.assessment.questions as any[]) || [];
    const studentAnswers = (attempt.answers as any[]) || [];

    const isTeacherOrAdmin = role === 'TEACHER' || role === 'ADMIN';

    const questionsReview = rawQuestions.map((q) => {
      const sAns = studentAnswers.find(a => String(a.questionId) === String(q.id));
      
      const rawStudentAnswer = sAns?.answer ?? sAns?.selectedOption ?? null;
      const studentAnswer = normalizeAnswer(q, rawStudentAnswer);
      const correctAnswer = normalizeAnswer(q, q.correct !== undefined ? q.correct : q.correctAnswer);
      
      const maxPts = q.points || 1;
      
      const isCorrect = studentAnswer !== null && studentAnswer !== undefined && studentAnswer !== "" && String(studentAnswer) === String(correctAnswer);
      const pointsEarned = isCorrect ? maxPts : 0;

      const reviewQ: any = {
        id: q.id,
        questionText: q.questionText || q.text,
        mathExpression: q.mathExpression || null,
        diagram: q.diagram || null,
        given: q.given || null,
        required: q.required || null,
        options: q.options || [],
        studentAnswer: studentAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        pointsEarned: pointsEarned,
        points: maxPts,
        solutionSteps: q.solutionSteps || [],
        solutionExplanation: q.solutionExplanation || null,
      };

      // Only include generationLogic and validationStatus for Teacher/Admin
      if (isTeacherOrAdmin) {
        reviewQ.validationStatus = q.validationStatus || null;
        reviewQ.generationLogic = q.generationLogic || null;
      }

      return reviewQ;
    });

    res.json({
      assessment: {
        id: attempt.assessment.id,
        title: attempt.assessment.title,
        type: attempt.assessment.type,
        totalPoints: attempt.assessment.totalPoints
      },
      student: attempt.student,
      attempt: {
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
        totalPoints: attempt.totalPoints,
        percentage: attempt.percentage
      },
      questions: questionsReview
    });

  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching review', error: error.message });
  }
};


/**
 * GET /api/assessments/teacher/results/:id
 */
export const getAssessmentResults = async (req: AuthRequest, res: Response) => {
  try {
    const assessment = await db.assessment.findUnique({
      where: { id: req.params.id },
      include: {
        attempts: {
          include: { student: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
    if (req.user!.role !== 'ADMIN' && assessment.teacherId !== req.user!.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(assessment.attempts);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching results', error: error.message });
  }
};

/**
 * GET /api/assessments/teacher/students/:studentId
 */
export const getStudentAssessments = async (req: AuthRequest, res: Response) => {
  try {
    // Basic auth check: Admin or Teacher can view. (A production app would verify the teacher actually teaches this student)
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'TEACHER') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const attempts = await db.assessmentAttempt.findMany({
      where: { studentId: req.params.studentId },
      include: { assessment: { select: { title: true, type: true, totalPoints: true, passingScore: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(attempts);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching student assessments', error: error.message });
  }
};

/**
 * GET /api/assessments/parent/children/:studentId
 */
export const getParentChildAssessments = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'PARENT') return res.status(403).json({ message: 'Forbidden' });

    // Validate ownership
    const parentUser = await db.user.findFirst({
      where: { id: req.user!.userId, children: { some: { id: req.params.studentId } } }
    });

    if (!parentUser) {
      return res.status(403).json({ message: 'Forbidden: Student is not your child' });
    }

    const attempts = await db.assessmentAttempt.findMany({
      where: { studentId: req.params.studentId },
      include: { assessment: { select: { title: true, type: true, totalPoints: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(attempts);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching child assessments', error: error.message });
  }
};

/**
 * POST /api/assessments
 * Create a new assessment
 */
export const createAssessment = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'TEACHER') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { type, title, courseId, lessonId, durationMinutes, openAt, closeAt, passingScore, questions, showResult, randomization, requiresCamera } = req.body;

    const assessment = await db.assessment.create({
      data: {
        title,
        type,
        courseId,
        lessonId,
        teacherId: req.user!.userId,
        durationMinutes: durationMinutes || null,
        openAt: openAt ? new Date(openAt) : null,
        closeAt: closeAt ? new Date(closeAt) : null,
        passingScore: passingScore || null,
        questions: questions || [],
        showResult: showResult ?? true,
        randomization: randomization ?? false,
        requiresCamera: requiresCamera ?? false,
        status: 'PUBLISHED',
      }
    });

    res.status(201).json(assessment);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating assessment', error: error.message });
  }
};

/**
 * PUT /api/assessments/:id
 * Update an assessment
 */
export const updateAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const assessment = await db.assessment.findUnique({ where: { id } });

    if (!assessment) return res.status(404).json({ message: 'Not found' });
    if (req.user!.role !== 'ADMIN' && assessment.teacherId !== req.user!.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { title, durationMinutes, openAt, closeAt, passingScore, questions, showResult, randomization, requiresCamera } = req.body;

    const updated = await db.assessment.update({
      where: { id },
      data: {
        title,
        durationMinutes: durationMinutes !== undefined ? durationMinutes : undefined,
        openAt: openAt !== undefined ? (openAt ? new Date(openAt) : null) : undefined,
        closeAt: closeAt !== undefined ? (closeAt ? new Date(closeAt) : null) : undefined,
        passingScore: passingScore !== undefined ? passingScore : undefined,
        questions: questions !== undefined ? questions : undefined,
        showResult: showResult !== undefined ? showResult : undefined,
        randomization: randomization !== undefined ? randomization : undefined,
        requiresCamera: requiresCamera !== undefined ? requiresCamera : undefined,
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating assessment', error: error.message });
  }
};

/**
 * DELETE /api/assessments/:id
 * Delete an assessment
 */
export const deleteAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const assessment = await db.assessment.findUnique({ where: { id } });

    if (!assessment) return res.status(404).json({ message: 'Not found' });
    if (req.user!.role !== 'ADMIN' && assessment.teacherId !== req.user!.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await db.assessment.delete({ where: { id } });
    res.json({ message: 'Assessment deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting assessment', error: error.message });
  }
};
