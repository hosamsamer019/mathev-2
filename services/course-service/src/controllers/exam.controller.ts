import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { checkUserEnrollment } from '../utils/enrollment.js';
import { io } from '../index.js';
import { normalizeExamQuestions } from '../utils/question.helper.js';

export const getAllExams = async (req: AuthRequest, res: Response) => {
  try {
    let whereClause: any = {};
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole === 'TEACHER') {
      whereClause = { course: { teacherId: req.user?.userId } };
    } else if (requesterRole.includes('STUDENT')) {
      whereClause = {
        course: {
          enrollments: {
            some: { studentId: req.user?.userId }
          }
        }
      };
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const exams = await db.exam.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        _count: { select: { attempts: true } },
        course: { select: { title: true } },
        attempts: requesterRole.includes('STUDENT') ? { where: { studentId: req.user?.userId } } : false
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const mappedExams = exams.map(exam => {
      let status = 'available';
      let score = null;
      if (exam.attempts && exam.attempts.length > 0) {
        status = 'completed';
        score = exam.attempts[0].score;
      }
      const { attempts, ...rest } = exam as any;
      return { ...rest, status, score };
    });
    
    const total = await db.exam.count({ where: whereClause });
    
    res.json({
      data: mappedExams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching exams', error: error.message });
  }
};

export const getExamsByCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    
    const isEnrolled = await checkUserEnrollment(req.user, courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });

    const exams = await db.exam.findMany({
      where: { courseId },
      include: {
        _count: { select: { attempts: true } }
      }
    });
    res.json(exams);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching exams', error: error.message });
  }
};

export const getExamDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await db.exam.findUnique({
      where: { id },
      include: { 
        attempts: {
          include: { 
            student: { select: { name: true, email: true } },
            ExamViolation: true
          }
        }
      }
    });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    if (exam.attempts) {
      exam.attempts = exam.attempts.map((attempt: any) => {
        const { ExamViolation, ...rest } = attempt;
        return {
          ...rest,
          violations: ExamViolation || []
        };
      }) as any;
    }

    const isEnrolled = await checkUserEnrollment(req.user, exam.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });

    // Normalize questions before processing
    try {
      exam.questions = normalizeExamQuestions(exam.questions, exam.id) as any;
    } catch (normErr: any) {
      console.error(`[EXAM DATA ERROR]`, normErr.message);
      // Return 500 so it doesn't fail silently
      return res.status(500).json({ message: 'Exam data is corrupted', error: normErr.message });
    }

    // Randomize and secure questions for students
    if (req.user?.role?.toUpperCase().includes('STUDENT')) {
      if (exam.randomization) {
        const crypto = await import('crypto');
        const questionsCopy = [...(exam.questions as any[])];
        for (let i = questionsCopy.length - 1; i > 0; i--) {
          const j = crypto.randomInt(0, i + 1);
          [questionsCopy[i], questionsCopy[j]] = [questionsCopy[j], questionsCopy[i]];
        }
        exam.questions = questionsCopy as any;
      }
      exam.questions = (exam.questions as any[]).map((q: any) => {
        const { correctAnswer, ...rest } = q;
        return rest;
      }) as any;
    }

    res.json(exam);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching exam', error: error.message });
  }
};

import { z } from 'zod';

const createExamSchema = z.object({
  title: z.string().min(2),
  courseId: z.string().uuid(),
  duration: z.number().min(5).optional(),
  requiresCamera: z.boolean().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  randomization: z.boolean().optional(),
  passingScore: z.number().optional(),
  questions: z.array(z.object({
    id: z.union([z.number(), z.string()]),
    text: z.string(),
    type: z.string(),
    options: z.array(z.string()).optional(),
    correct: z.any().optional()
  })).optional()
});

export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    const validatedData = createExamSchema.parse(req.body);
    const { title, courseId, duration, questions, requiresCamera, startTime, endTime, randomization, passingScore } = validatedData;
    
    if (requesterRole !== 'ADMIN') {
      const course = await db.course.findUnique({ where: { id: courseId } });
      if (!course) return res.status(404).json({ message: 'Course not found' });
      if (course.teacherId !== requesterId) {
        return res.status(403).json({ message: 'Forbidden: You do not own this course' });
      }
    }

    const exam = await db.exam.create({
      data: {
        title,
        courseId,
        duration: duration || 60,
        questions: questions || [],
        requiresCamera: requiresCamera || false,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        randomization: randomization || false,
        passingScore: passingScore || 50
      }
    });
    io.to(`course:${courseId}`).emit('exam_created', exam);
    
    // Notify enrolled students and their parents
    const { notifyCourseStudents } = await import('../utils/notification.helper.js');
    await notifyCourseStudents(courseId, 'امتحان جديد', `تم نشر امتحان جديد: ${title}`);

    res.status(201).json(exam);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating exam', error: error.message });
  }
};

export const updateExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    const validatedData = createExamSchema.parse(req.body);
    const { title, courseId, duration, questions, requiresCamera, startTime, endTime, randomization, passingScore } = validatedData;
    
    // Ensure the exam exists
    const existing = await db.exam.findUnique({ where: { id }, include: { course: true } });
    if (!existing) return res.status(404).json({ message: 'Exam not found' });

    if (requesterRole !== 'ADMIN' && existing.course.teacherId !== requesterId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this exam' });
    }

    // If they are changing the courseId, verify they own the new course too
    if (existing.courseId !== courseId && requesterRole !== 'ADMIN') {
       const newCourse = await db.course.findUnique({ where: { id: courseId } });
       if (!newCourse) return res.status(404).json({ message: 'New course not found' });
       if (newCourse.teacherId !== requesterId) {
         return res.status(403).json({ message: 'Forbidden: You do not own the target course' });
       }
    }

    const updateData = {
      title,
      courseId,
      duration: duration || 60,
      questions: questions || [],
      requiresCamera: requiresCamera || false,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      randomization: randomization || false,
      passingScore: passingScore || 50
    };

    const updatedExam = await db.exam.update({
      where: { id },
      data: updateData
    });

    io.to(`course:${updatedExam.courseId}`).emit('exam_updated', updatedExam);

    // Notify enrolled students and their parents
    const { notifyCourseStudents } = await import('../utils/notification.helper.js');
    await notifyCourseStudents(updatedExam.courseId, 'تحديث امتحان', `تم تحديث الامتحان: ${updatedExam.title}`);

    res.json(updatedExam);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error updating exam', error: error.message });
  }
};

export const startAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const exam = await db.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const now = new Date();
    if (exam.startTime && now < exam.startTime) {
      return res.status(400).json({ message: 'Exam has not started yet' });
    }
    if (exam.endTime && now > exam.endTime) {
      return res.status(400).json({ message: 'Exam has already ended' });
    }

    const isEnrolled = await checkUserEnrollment(req.user, exam.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });

    const attempt = await db.examAttempt.create({
      data: {
        studentId: userId,
        examId,
        score: 0
      }
    });
    res.status(201).json(attempt);
  } catch (error: any) {
    res.status(400).json({ message: 'Error starting exam', error: error.message });
  }
};

export const submitAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    const { answers } = req.body; 
    
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Load exam and correct answers from database
    const exam = await db.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const now = new Date();
    if (exam.endTime && now > exam.endTime) {
       // Allow a small grace period for network latency (e.g., 2 minutes)
       if (now.getTime() - exam.endTime.getTime() > 120000) {
         return res.status(400).json({ message: 'Exam window has closed' });
       }
    }

    const isEnrolled = await checkUserEnrollment(req.user, exam.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });

    let calculatedScore = 0;
    const questions = Array.isArray(exam.questions) ? exam.questions : [];
    
    if (questions.length > 0 && Array.isArray(answers)) {
      let correctCount = 0;
      for (const ans of answers) {
        const q: any = questions.find((q: any) => q.id === ans.questionId);
        // Using 'correct' as the answer index key, as expected by the frontend
        if (q && q.correct !== undefined && ans.selectedOption === q.correct) {
          correctCount++;
        }
      }
      calculatedScore = (correctCount / questions.length) * 100;
    }

    // Find the latest attempt to update, or create a new one
    const existingAttempt = await db.examAttempt.findFirst({
      where: { studentId: userId, examId },
      orderBy: { createdAt: 'desc' }
    });

    if (existingAttempt) {
      const startedAt = existingAttempt.createdAt;
      const elapsedMinutes = (now.getTime() - startedAt.getTime()) / 60000;
      // If they exceeded duration + 5 minutes grace period, cap score or reject
      if (elapsedMinutes > exam.duration + 5) {
         return res.status(400).json({ message: 'Time limit exceeded' });
      }
    }

    let attempt;
    if (existingAttempt) {
      attempt = await db.examAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          score: calculatedScore,
          answers: answers || []
        }
      });
    } else {
      attempt = await db.examAttempt.create({
        data: {
          studentId: userId,
          examId,
          score: calculatedScore,
          answers: answers || []
        }
      });
    }
    
    // Notify teacher of submission
    const { notifyTeacher } = await import('../utils/notification.helper.js');
    await notifyTeacher(exam.courseId, 'تسليم امتحان', `قام الطالب بتسليم امتحان: ${exam.title}`);

    res.json({ success: true, score: calculatedScore, attempt });
  } catch (error: any) {
    res.status(400).json({ message: 'Error submitting exam', error: error.message });
  }
};

export const syncAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    const { answers } = req.body;
    
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const existingAttempt = await db.examAttempt.findFirst({
      where: { studentId: userId, examId },
      orderBy: { createdAt: 'desc' }
    });

    if (existingAttempt) {
      await db.examAttempt.update({
        where: { id: existingAttempt.id },
        data: { answers: answers || [] }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: 'Error syncing exam attempt', error: error.message });
  }
};

export const reportViolation = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    const { type } = req.body;
    
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const attempt = await db.examAttempt.findFirst({
      where: { studentId: userId, examId },
      orderBy: { createdAt: 'desc' },
      include: { ExamViolation: true }
    });

    if (!attempt) return res.status(404).json({ message: 'No active attempt found' });

    const crypto = await import('crypto');
    await db.examViolation.create({
      data: {
        id: crypto.randomUUID(),
        attemptId: attempt.id,
        type: type || 'UNKNOWN'
      }
    });

    // If 2 or more violations, disqualify
    if (attempt.ExamViolation.length >= 1) { // They just got their 2nd violation (1 + 1 new)
      await db.examAttempt.update({
        where: { id: attempt.id },
        data: { score: 0 }
      });
      return res.status(403).json({ message: 'Disqualified due to multiple violations' });
    }

    res.json({ success: true, message: 'Violation recorded' });
  } catch (error: any) {
    res.status(400).json({ message: 'Error reporting violation', error: error.message });
  }
};

export const deleteExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    const exam = await db.exam.findUnique({
      where: { id },
      include: { course: true }
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (requesterRole !== 'ADMIN' && exam.course.teacherId !== requesterId) {
      return res.status(403).json({ message: 'Insufficient permissions to delete this exam' });
    }

    await db.exam.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting exam', error: error.message });
  }
};
