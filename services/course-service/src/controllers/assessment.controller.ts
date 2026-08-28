import { Request, Response } from 'express';
import { db, AttemptStatus } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { normalizeAnswer } from '../utils/answerNormalizer.js';

export function sanitizeQuestionsForStudent(questions: any[] | null | undefined): any[] {
  if (!Array.isArray(questions)) return [];
  return questions.map(q => {
    const {
      correct,
      correctAnswer,
      generationLogic,
      solutionSteps,
      solutionExplanation,
      validationStatus,
      ...safeQuestion
    } = q;
    return safeQuestion;
  });
}

/**
 * Validates if the user is enrolled or authorized to access the course's assessment
 */
async function validateEnrollment(userId: string, role: string, courseId?: string, isGuest = false, assessmentId?: string): Promise<string | null> {
  const upperRole = (role || '').toUpperCase();
  if (upperRole === 'ADMIN') return null;
  if (upperRole === 'TEACHER') {
    if (!courseId) return null;
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (course?.teacherId === userId) return null;
    return 'NOT_TEACHER';
  }
  if ((isGuest || upperRole === 'EXTERNAL_STUDENT') && assessmentId) {
    const assessment = await db.assessment.findUnique({ where: { id: assessmentId } });
    if (assessment?.allowExternalStudents) return null;
    return 'GUEST_NOT_ALLOWED';
  }
  if (upperRole.includes('STUDENT')) {
    if (!courseId) return null;
    const enrollment = await db.courseEnrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId } }
    });
    if (enrollment) return null;

    if (assessmentId) {
      const assessment = await db.assessment.findUnique({ where: { id: assessmentId } });
      if (assessment?.allowExternalStudents) return null;
    }

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (course && (course.price === 0 || !course.price)) {
      try {
        await db.courseEnrollment.create({
          data: { studentId: userId, courseId }
        });
        return null;
      } catch (e) {
        return null;
      }
    }

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

    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      assessments.forEach(a => {
        a.questions = sanitizeQuestionsForStudent(a.questions as any);
      });
    }

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
    
    const isExternalOrGuest = !!(req.user?.isGuest || req.user?.isExternalStudent || req.user?.role === 'EXTERNAL_STUDENT');
    const authError = await validateEnrollment(req.user?.userId || 'external', req.user?.role || '', assessment.courseId, isExternalOrGuest, assessment.id);
    if (authError) return res.status(403).json({ message: 'Unauthorized access', code: authError });

    if (req.user!.role !== 'TEACHER' && req.user!.role !== 'ADMIN') {
      assessment.questions = sanitizeQuestionsForStudent(assessment.questions as any);
    }

    res.json(assessment);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching assessment', error: error.message });
  }
};

export function getSecureClientIp(req: any): string {
  const remoteAddress = req.socket?.remoteAddress || '';
  const isLoopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress);

  if (isLoopback) {
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp && typeof cfIp === 'string') return cfIp;

    const realIp = req.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') return realIp;

    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor && typeof forwardedFor === 'string') {
      const parts = forwardedFor.split(',');
      const clientIp = parts[0].trim();
      if (clientIp) return clientIp;
    }
  }

  return req.ip || remoteAddress || '127.0.0.1';
}

/**
 * POST /api/assessments/:id/start
 */
export const startAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const assessmentId = req.params.id;
    const isExternal = req.user?.isExternalStudent;

    if (isExternal) {
      const attempt = await db.externalExamAttempt.findUnique({
        where: { accessSessionId: req.user?.externalSessionId }
      });
      if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
      if (['SUBMITTED', 'GRADED', 'TIME_EXPIRED', 'CHEATING'].includes(attempt.status)) {
        return res.status(403).json({ message: 'تم التسليم — لا يمكن إعادة الدخول', code: 'ATTEMPT_ALREADY_FINISHED' });
      }

      const now = new Date();
      const assessment = await db.assessment.findUnique({ where: { id: assessmentId } });
      let expiresAt = attempt.expiresAt || assessment?.closeAt || null;
      if (!attempt.expiresAt && assessment?.durationMinutes) {
        const calculatedExpiresAt = new Date(now.getTime() + assessment.durationMinutes * 60000);
        if (!expiresAt || calculatedExpiresAt < expiresAt) {
          expiresAt = calculatedExpiresAt;
        }
      }

      const updated = await db.externalExamAttempt.update({
        where: { id: attempt.id },
        data: {
          status: attempt.status === 'STARTED' ? 'IN_PROGRESS' : attempt.status,
          ...(expiresAt ? { expiresAt } : {}),
          updatedAt: now
        }
      });
      return res.json({ attempt: updated, isNew: false });
    }

    const studentId = req.user!.userId;

    // Use Prisma transaction to prevent race conditions during start
    const result = await db.$transaction(async (tx) => {
      const assessment = await tx.assessment.findUnique({ where: { id: assessmentId } });
      if (!assessment) throw new Error('Assessment not found');
      
      const authError = await validateEnrollment(studentId, req.user!.role, assessment.courseId, req.user!.isGuest, assessment.id);
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

      const clientIp = getSecureClientIp(req);
      const userAgent = req.headers['user-agent'] || null;

      const newAttempt = await tx.assessmentAttempt.create({
        data: {
          assessmentId,
          studentId,
          status: 'STARTED',
          startedAt: now,
          expiresAt,
          answers: [],
          ipAddress: clientIp,
          userAgent: userAgent
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
    const { answers } = req.body;
    const isExternal = req.user?.isExternalStudent;

    let attempt: any;
    if (isExternal) {
      attempt = await db.externalExamAttempt.findUnique({
        where: { accessSessionId: req.user?.externalSessionId }
      });
    } else {
      const studentId = req.user!.userId;
      attempt = await db.assessmentAttempt.findUnique({
        where: { studentId_assessmentId: { studentId, assessmentId } }
      });
    }

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (['SUBMITTED', 'GRADED', 'TIME_EXPIRED', 'CHEATING'].includes(attempt.status) || attempt.cheatingDetected) {
      return res.status(403).json({ message: 'Cannot save, attempt already finished or terminated' });
    }

    const now = new Date();
    if (attempt.expiresAt && now >= attempt.expiresAt) {
      if (isExternal) {
        await db.externalExamAttempt.update({
          where: { id: attempt.id },
          data: { status: 'TIME_EXPIRED', submittedAt: now }
        });
      } else {
        await db.assessmentAttempt.update({
          where: { id: attempt.id },
          data: { status: 'TIME_EXPIRED', submittedAt: now }
        });
      }
      return res.status(403).json({ message: 'انتهى وقت المحاولة', code: 'EXAM_TIME_EXPIRED' });
    }

    let updated;
    if (isExternal) {
      updated = await db.externalExamAttempt.update({
        where: { id: attempt.id },
        data: {
          answers,
          status: 'IN_PROGRESS',
          updatedAt: now
        }
      });
    } else {
      updated = await db.assessmentAttempt.update({
        where: { id: attempt.id },
        data: {
          answers,
          status: 'IN_PROGRESS',
          updatedAt: now
        }
      });
    }

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
    const { answers: finalAnswers } = req.body;
    const isExternal = req.user?.isExternalStudent;

    const result = await db.$transaction(async (tx) => {
      let attempt: any;
      if (isExternal) {
        attempt = await tx.externalExamAttempt.findUnique({
          where: { accessSessionId: req.user?.externalSessionId },
          include: { assessment: true }
        });
      } else {
        const studentId = req.user!.userId;
        attempt = await tx.assessmentAttempt.findUnique({
          where: { studentId_assessmentId: { studentId, assessmentId } },
          include: { assessment: true }
        });
      }

      if (!attempt) throw new Error('Attempt not found');
      
      if (attempt.status === 'CHEATING' || attempt.cheatingDetected) {
        throw new Error('CHEATING_LOCKOUT');
      }
      // For external students: idempotently return the existing finalized attempt
      // so the frontend can recover the result screen after auto-submit fires.
      if (['SUBMITTED', 'GRADED', 'TIME_EXPIRED'].includes(attempt.status)) {
        if (isExternal) return attempt;
        throw new Error('ATTEMPT_ALREADY_FINISHED');
      }

      const now = new Date();

      // For external students: attempt.expiresAt is authoritative — no grace period.
      // For registered students: allow a 2-minute grace on closeAt for network latency.
      if (isExternal) {
        if (attempt.expiresAt && now > attempt.expiresAt) {
          // If already finished, return existing result idempotently
          if (['SUBMITTED', 'GRADED', 'TIME_EXPIRED', 'CHEATING'].includes(attempt.status)) {
            return attempt;
          }
          // Not yet finalized — auto-finalize as TIME_EXPIRED
          const autoResult = await tx.externalExamAttempt.update({
            where: { id: attempt.id },
            data: {
              status: 'TIME_EXPIRED',
              submittedAt: now,
              cheatingReason: 'AUTO_SUBMITTED_TIME_EXPIRED'
            }
          });
          return autoResult;
        }
      } else {
        if (attempt.assessment.closeAt && now > attempt.assessment.closeAt) {
          if (now.getTime() - attempt.assessment.closeAt.getTime() > 120000) {
            throw new Error('ASSESSMENT_CLOSED');
          }
        }
      }

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

      let updated;
      if (isExternal) {
        updated = await tx.externalExamAttempt.update({
          where: { id: attempt.id },
          data: {
            status,
            submittedAt: now,
            answers: answersToSave,
            score,
            percentage
          }
        });
      } else {
        updated = await tx.assessmentAttempt.update({
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
      }
      return updated;
    });

    res.json(result);
  } catch (error: any) {
    if (error.message === 'CHEATING_LOCKOUT') {
      return res.status(403).json({ message: 'Cannot submit, cheating attempt has been locked' });
    }
    if (error.message === 'ATTEMPT_ALREADY_FINISHED') {
      return res.status(403).json({ message: 'تم التسليم مسبقاً ولا يمكن التعديل', code: 'ATTEMPT_ALREADY_FINISHED' });
    }
    if (error.message === 'ASSESSMENT_CLOSED') {
      return res.status(403).json({ message: 'انتهى موعد تسليم التقييم', code: 'ASSESSMENT_CLOSED' });
    }
    res.status(500).json({ message: 'Error submitting assessment', error: error.message });
  }
};

/**
 * GET /api/assessments/:id/attempts/:attemptId/review
 */
export const getAssessmentReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id: assessmentId, attemptId } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    let attempt: any = await db.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        student: { select: { id: true, name: true } },
        assessment: { select: { id: true, title: true, type: true, totalPoints: true, teacherId: true, questions: true } }
      }
    });

    let isExternalAttempt = false;
    if (!attempt) {
      const extAttempt = await db.externalExamAttempt.findUnique({
        where: { id: attemptId },
        include: {
          assessment: { select: { id: true, title: true, type: true, totalPoints: true, teacherId: true, questions: true } }
        }
      });
      if (extAttempt) {
        isExternalAttempt = true;
        attempt = {
          ...extAttempt,
          studentId: 'external',
          student: { id: 'external', name: extAttempt.studentName }
        };
      }
    }

    if (!attempt || attempt.assessmentId !== assessmentId) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Security Authorization
    let authorized = false;
    const isRequesterExternal = req.user?.isExternalStudent;

    if (role === 'ADMIN') {
      authorized = true;
    } else if (role === 'TEACHER') {
      if (attempt.assessment.teacherId === userId) authorized = true;
    } else if (isRequesterExternal) {
      if (attempt.accessSessionId === req.user?.externalSessionId) authorized = true;
    } else if (role === 'PARENT' && !isExternalAttempt) {
      const parentRel = await db.user.findFirst({
        where: { id: userId, children: { some: { id: attempt.studentId } } }
      });
      if (parentRel) authorized = true;
    } else if (role?.includes('STUDENT') && !isExternalAttempt) {
      if (attempt.studentId === userId) authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Block reviews on active attempts for students/parents/guests/external
    if (role !== 'ADMIN' && role !== 'TEACHER') {
      if (!['SUBMITTED', 'GRADED', 'TIME_EXPIRED', 'CHEATING'].includes(attempt.status)) {
        return res.status(403).json({ message: 'Forbidden: Review is not available for active attempts.' });
      }
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
        percentage: attempt.percentage,
        ...((role === 'ADMIN' || (role === 'TEACHER' && attempt.assessment.teacherId === userId)) ? { ipAddress: attempt.ipAddress, userAgent: attempt.userAgent } : {})
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
          include: { student: { select: { id: true, name: true, email: true, phone: true, isGuest: true } } },
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

    const { type, title, courseId, lessonId, durationMinutes, openAt, closeAt, passingScore, questions, showResult, randomization, requiresCamera, allowExternalStudents } = req.body;

    const examAccessCode = allowExternalStudents ? generateExamAccessCode() : null;

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
        allowExternalStudents: !!allowExternalStudents,
        examAccessCode
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

    const { title, durationMinutes, openAt, closeAt, passingScore, questions, showResult, randomization, requiresCamera, allowExternalStudents, allowedIps, regenerateCode, revokeCode } = req.body;

    let examAccessCode = undefined;
    if (revokeCode) {
      examAccessCode = null;
    } else if (regenerateCode) {
      examAccessCode = generateExamAccessCode();
    } else if (allowExternalStudents && !assessment.examAccessCode) {
      examAccessCode = generateExamAccessCode();
    }

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
        allowExternalStudents: allowExternalStudents !== undefined ? !!allowExternalStudents : undefined,
        allowedIps: allowedIps !== undefined ? (allowedIps || null) : undefined,
        examAccessCode
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

export function generateExamAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${segment()}-${segment()}-${segment()}`;
}

export const reportAssessmentViolation = async (req: AuthRequest, res: Response) => {
  try {
    const assessmentId = req.params.id;
    const { type } = req.body;
    const isExternal = req.user?.isExternalStudent;

    const result = await db.$transaction(async (tx) => {
      let attempt: any;
      if (isExternal) {
        attempt = await tx.externalExamAttempt.findUnique({
          where: { accessSessionId: req.user?.externalSessionId }
        });
      } else {
        const studentId = req.user!.userId;
        attempt = await tx.assessmentAttempt.findUnique({
          where: { studentId_assessmentId: { studentId, assessmentId } }
        });
      }

      if (!attempt) throw new Error('Attempt not found');
      if (['SUBMITTED', 'GRADED', 'TIME_EXPIRED', 'CHEATING'].includes(attempt.status) || attempt.cheatingDetected) {
        throw new Error('ATTEMPT_ALREADY_FINISHED_OR_LOCKED');
      }

      // Validate violation type — VISIBILITY_VISIBLE is informational and never increments count
      const COUNTING_TYPES = ['TAB_SWITCH', 'WINDOW_BLUR', 'VISIBILITY_HIDDEN'];
      const INFO_TYPES = ['VISIBILITY_VISIBLE'];
      const ALL_VALID_TYPES = [...COUNTING_TYPES, 'VISIBILITY_VISIBLE', 'UNKNOWN'];
      const resolvedType = ALL_VALID_TYPES.includes(type) ? type : 'UNKNOWN';
      const isCountingViolation = COUNTING_TYPES.includes(resolvedType);

      const currentViolations = Array.isArray(attempt.violations) ? attempt.violations : [];
      const updatedViolations = [...currentViolations, { type: resolvedType, timestamp: new Date() }];

      // Only increment counter for counting violations
      const nextViolationCount = isCountingViolation ? attempt.violationCount + 1 : attempt.violationCount;

      let updatedStatus = attempt.status;
      let score = attempt.score;
      let percentage = attempt.percentage;
      let cheatingDetected: boolean = attempt.cheatingDetected;
      let cheatingReason = attempt.cheatingReason;
      let cheatingDetectedAt = attempt.cheatingDetectedAt;

      if (nextViolationCount >= 3) {
        updatedStatus = 'CHEATING';
        score = 0;
        percentage = 0;
        cheatingDetected = true;
        cheatingReason = `تم رصد مغادرة بيئة الامتحان أكثر من الحد المسموح به (${type})`;
        cheatingDetectedAt = new Date();
      }

      let updatedAttempt;
      if (isExternal) {
        updatedAttempt = await tx.externalExamAttempt.update({
          where: { id: attempt.id },
          data: {
            violationCount: nextViolationCount,
            violations: updatedViolations,
            status: updatedStatus as any,
            score,
            percentage,
            cheatingDetected,
            cheatingReason,
            cheatingDetectedAt,
            submittedAt: updatedStatus === 'CHEATING' ? new Date() : attempt.submittedAt
          }
        });
      } else {
        updatedAttempt = await tx.assessmentAttempt.update({
          where: { id: attempt.id },
          data: {
            violationCount: nextViolationCount,
            violations: updatedViolations,
            status: updatedStatus as any,
            score,
            percentage,
            cheatingDetected,
            cheatingReason,
            cheatingDetectedAt,
            submittedAt: updatedStatus === 'CHEATING' ? new Date() : attempt.submittedAt
          }
        });
      }

      return updatedAttempt;
    });

    res.json({
      violationCount: result.violationCount,
      status: result.status,
      isDisqualified: result.status === 'CHEATING'
    });

  } catch (error: any) {
    console.error('reportAssessmentViolation error:', error);
    if (error.message === 'ATTEMPT_ALREADY_FINISHED_OR_LOCKED') {
      return res.status(403).json({ message: 'Cannot report violation, attempt already finished or terminated' });
    }
    res.status(500).json({ message: 'Error reporting violation', error: error.message });
  }
};

/**
 * GET /api/assessments/teacher/external-results/:id
 */
export const getExternalResults = async (req: AuthRequest, res: Response) => {
  try {
    const assessment = await db.assessment.findUnique({
      where: { id: req.params.id }
    });

    if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
    if (req.user!.role !== 'ADMIN' && assessment.teacherId !== req.user!.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const attempts = await db.externalExamAttempt.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(attempts);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching external results', error: error.message });
  }
};

/**
 * GET /api/assessments/admin/external-attempts
 */
export const getAllExternalAttempts = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const attempts = await db.externalExamAttempt.findMany({
      include: {
        assessment: {
          select: { title: true, courseId: true, teacher: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(attempts);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching all external attempts', error: error.message });
  }
};
