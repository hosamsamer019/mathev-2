import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { checkUserEnrollment } from '../utils/enrollment.js';

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

    const exams = await db.exam.findMany({
      where: whereClause,
      include: {
        _count: { select: { attempts: true } },
        course: { select: { title: true } }
      }
    });
    res.json(exams);
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
      include: { attempts: true }
    });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const isEnrolled = await checkUserEnrollment(req.user, exam.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });

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
  questions: z.array(z.object({
    id: z.number(),
    text: z.string(),
    type: z.string(),
    options: z.array(z.string()).optional(),
    correct: z.any().optional()
  })).optional()
});

export const createExam = async (req: Request, res: Response) => {
  try {
    const validatedData = createExamSchema.parse(req.body);
    const { title, courseId, duration, questions, requiresCamera } = validatedData;
    const exam = await db.exam.create({
      data: {
        title,
        courseId,
        duration: duration || 60,
        questions: questions || [],
        requiresCamera: requiresCamera || false
      }
    });
    res.status(201).json(exam);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating exam', error: error.message });
  }
};

export const startAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const exam = await db.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

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

    const attempt = await db.examAttempt.create({
      data: {
        studentId: userId,
        examId,
        score: calculatedScore,
        answers: answers || []
      }
    });
    // Return score so frontend can read res.data.score
    res.json({ success: true, score: calculatedScore, attempt });
  } catch (error: any) {
    res.status(400).json({ message: 'Error submitting exam', error: error.message });
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
