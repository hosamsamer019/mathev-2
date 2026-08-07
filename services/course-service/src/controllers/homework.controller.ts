import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { checkUserEnrollment } from '../utils/enrollment.js';
import { io } from '../index.js';

export const getAllHomeworks = async (req: AuthRequest, res: Response) => {
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

    const [homeworks, total] = await Promise.all([
      db.homework.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          _count: { select: { submissions: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.homework.count({ where: whereClause })
    ]);
    
    res.json({
      data: homeworks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching all homeworks', error: error.message });
  }
};

export const getHomeworksByCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    
    const isEnrolled = await checkUserEnrollment(req.user, courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });

    const homeworks = await db.homework.findMany({
      where: { courseId },
      include: {
        _count: { select: { submissions: true } }
      }
    });
    res.json(homeworks);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching homeworks', error: error.message });
  }
};

export const getHomeworkDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const homework = await db.homework.findUnique({
      where: { id },
      include: { submissions: true }
    });
    if (!homework) return res.status(404).json({ message: 'Homework not found' });

    const isEnrolled = await checkUserEnrollment(req.user, homework.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });

    res.json(homework);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching homework details', error: error.message });
  }
};

import { z } from 'zod';

const createHomeworkSchema = z.object({
  title: z.string().min(2),
  courseId: z.string().uuid(),
  questions: z.array(z.object({
    id: z.number(),
    text: z.string(),
    type: z.string(),
    options: z.array(z.string()).optional(),
    correct: z.any().optional()
  })).optional()
});

export const createHomework = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    const validatedData = createHomeworkSchema.parse(req.body);
    const { title, courseId, questions } = validatedData;
    
    if (requesterRole !== 'ADMIN') {
      const course = await db.course.findUnique({ where: { id: courseId } });
      if (!course) return res.status(404).json({ message: 'Course not found' });
      if (course.teacherId !== requesterId) {
        return res.status(403).json({ message: 'Forbidden: You do not own this course' });
      }
    }

    const homework = await db.homework.create({
      data: {
        title,
        courseId,
        questions: questions || []
      }
    });
    io.to(`course:${courseId}`).emit('homework_assigned', homework);
    res.status(201).json(homework);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating homework', error: error.message });
  }
};

export const submitHomework = async (req: AuthRequest, res: Response) => {
  try {
    const { id: homeworkId } = req.params;
    const userId = req.user?.userId;
    const { answers, grade: clientGrade, url } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User unauthorized' });
    }

    // Load homework and correct answers from database
    const homework = await db.homework.findUnique({ where: { id: homeworkId } });
    if (!homework) return res.status(404).json({ message: 'Homework not found' });

    const isEnrolled = await checkUserEnrollment(req.user, homework.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });

    let calculatedGrade = 0;
    const questions = Array.isArray(homework.questions) ? homework.questions : [];
    
    if (questions.length > 0 && Array.isArray(answers)) {
      let correctCount = 0;
      for (const ans of answers) {
        const q: any = questions.find((q: any) => q.id === ans.questionId);
        if (q && q.correct !== undefined && ans.selectedOption === q.correct) {
          correctCount++;
        }
      }
      calculatedGrade = (correctCount / questions.length) * 100;
    }

    const submission = await db.submission.create({
      data: {
        studentId: userId,
        homeworkId,
        grade: calculatedGrade || clientGrade || 0,
        url: url || null,
        answers: answers || []
      }
    });

    await db.notification.create({
      data: {
        userId: userId,
        title: 'تم تصحيح الواجب',
        message: `تم تقييم أدائك في ${homework.title} وحصلت على ${calculatedGrade || clientGrade || 0}%`,
        type: 'success'
      }
    });
    
    io.to(`course:${homework.courseId}`).emit('homework_submitted', submission);
    res.status(201).json({ ...submission, score: calculatedGrade });
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting homework', error: error.message });
  }
};

export const deleteHomework = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    const homework = await db.homework.findUnique({
      where: { id },
      include: { course: true }
    });

    if (!homework) {
      return res.status(404).json({ message: 'Homework not found' });
    }

    if (requesterRole !== 'ADMIN' && homework.course.teacherId !== requesterId) {
      return res.status(403).json({ message: 'Insufficient permissions to delete this homework' });
    }

    await db.homework.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting homework', error: error.message });
  }
};

export const getStudentSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { id: homeworkId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const submission = await db.submission.findFirst({
      where: { homeworkId, studentId: userId },
      orderBy: { createdAt: 'desc' }
    });
    
    // Some frontend components might expect just the object, others `{ submission: object }`
    // Based on common patterns in this app, returning the object directly or null is safest.
    res.json(submission || null);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching submission', error: error.message });
  }
};

export const addQuestion = async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Stub for addQuestion' });
};
