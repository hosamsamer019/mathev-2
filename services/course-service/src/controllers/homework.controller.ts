import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { checkUserEnrollment } from '../utils/enrollment.js';
import { io } from '../index.js';
import { sanitizeQuestionsForStudent } from './assessment.controller.js';

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

    const homeworks = await db.homework.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        _count: { select: { submissions: true } },
        course: { select: { title: true } },
        submissions: requesterRole.includes('STUDENT') ? { where: { studentId: req.user?.userId } } : false,
        Lesson: requesterRole.includes('STUDENT') ? {
          select: {
            progress: {
              where: { studentId: req.user?.userId }
            }
          }
        } : false
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const mappedHomeworks = homeworks.map((hw: any) => {
      let status = 'available';
      let score = null;
      if (hw.submissions && hw.submissions.length > 0) {
        status = 'completed';
        score = hw.submissions[0].grade;
      }
      let isLocked = false;
      if (hw.lessonId && hw.Lesson?.progress) {
        if (hw.Lesson.progress.length === 0 || !hw.Lesson.progress[0].watched) {
          isLocked = true;
        }
      }
      if (requesterRole !== 'ADMIN' && requesterRole !== 'TEACHER') {
        hw.questions = sanitizeQuestionsForStudent(hw.questions as any) as any;
      }
      const { submissions, Lesson, ...rest } = hw as any;
      return { ...rest, status, score, isLocked };
    });
    
    const total = await db.homework.count({ where: whereClause });
    
    res.json({
      data: mappedHomeworks,
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

    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN' && requesterRole !== 'TEACHER') {
      homeworks.forEach(hw => {
        hw.questions = sanitizeQuestionsForStudent(hw.questions as any) as any;
      });
    }

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

    if (homework.lessonId && req.user?.role?.toUpperCase().includes('STUDENT')) {
      const progress = await db.videoProgress.findUnique({
        where: {
          studentId_lessonId: {
            studentId: req.user.userId,
            lessonId: homework.lessonId
          }
        }
      });
      
      if (!progress || !progress.watched) {
        return res.status(403).json({ message: 'يجب إكمال مشاهدة فيديو الدرس قبل فتح الواجب', locked: true });
      }
    }

    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN' && requesterRole !== 'TEACHER') {
      homework.questions = sanitizeQuestionsForStudent(homework.questions as any) as any;
    }

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
    id: z.union([z.number(), z.string()]),
    text: z.string(),
    type: z.string(),
    options: z.array(z.string()).optional(),
    correct: z.any().optional(),
    generationLogic: z.any().optional(),
    solutionSteps: z.any().optional(),
    solutionExplanation: z.string().optional(),
    validationStatus: z.string().optional()
  })).optional(),
  lessonId: z.string().uuid().optional().nullable(),
  type: z.enum(['NORMAL', 'VIDEO_DEPENDENT']).optional().default('NORMAL'),
  openAt: z.string().optional().nullable(),
  closeAt: z.string().optional().nullable()
});

export const createHomework = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    const validatedData = createHomeworkSchema.parse(req.body);
    const { title, courseId, questions, lessonId, type, openAt, closeAt } = validatedData;
    
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (requesterRole !== 'ADMIN') {
      if (course.teacherId !== requesterId) {
        return res.status(403).json({ message: 'Forbidden: You do not own this course' });
      }
    }

    const homework = await db.homework.create({
      data: {
        title,
        courseId,
        questions: questions || [],
        lessonId,
        type: lessonId ? 'VIDEO_DEPENDENT' : type,
        openAt: openAt ? new Date(openAt) : null,
        closeAt: closeAt ? new Date(closeAt) : null,
        deadline: closeAt ? new Date(closeAt) : null
      }
    });
    
    // Mirror to unified Assessment table
    await db.assessment.create({
      data: {
        id: homework.id,
        title: homework.title,
        type: 'ASSIGNMENT',
        courseId: homework.courseId,
        lessonId: homework.lessonId,
        teacherId: course.teacherId,
        questions: homework.questions as any,
        openAt: homework.openAt,
        closeAt: homework.closeAt
      }
    });

    io.to(`course:${courseId}`).emit('homework_assigned', homework);

    // Notify enrolled students and their parents
    const { notifyCourseStudents } = await import('../utils/notification.helper.js');
    await notifyCourseStudents(courseId, 'واجب جديد', `تم نشر واجب جديد: ${title}`);

    res.status(201).json(homework);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating homework', error: error.message });
  }
};

const updateHomeworkSchema = z.object({
  title: z.string().min(2).optional(),
  questions: z.array(z.object({
    id: z.union([z.number(), z.string()]),
    text: z.string(),
    type: z.string(),
    options: z.array(z.string()).optional(),
    correct: z.any().optional(),
    generationLogic: z.any().optional(),
    solutionSteps: z.any().optional(),
    solutionExplanation: z.string().optional(),
    validationStatus: z.string().optional()
  })).optional(),
  lessonId: z.string().uuid().optional().nullable(),
  type: z.enum(['NORMAL', 'VIDEO_DEPENDENT']).optional(),
  openAt: z.string().optional().nullable(),
  closeAt: z.string().optional().nullable()
});

export const updateHomework = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    const validatedData = updateHomeworkSchema.parse(req.body);
    const { title, questions, lessonId, type, openAt, closeAt } = validatedData;
    
    const homework = await db.homework.findUnique({ where: { id } });
    if (!homework) return res.status(404).json({ message: 'Homework not found' });

    if (requesterRole !== 'ADMIN') {
      const course = await db.course.findUnique({ where: { id: homework.courseId } });
      if (!course) return res.status(404).json({ message: 'Course not found' });
      if (course.teacherId !== requesterId) {
        return res.status(403).json({ message: 'Forbidden: You do not own this course' });
      }
    }

    const updatedHomework = await db.homework.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(questions && { questions }),
        ...(lessonId !== undefined && { lessonId }),
        ...(type !== undefined && { type }),
        ...(openAt !== undefined && { openAt: openAt ? new Date(openAt) : null }),
        ...(closeAt !== undefined && { 
           closeAt: closeAt ? new Date(closeAt) : null, 
           deadline: closeAt ? new Date(closeAt) : null 
        })
      }
    });

    // Mirror to unified Assessment table
    try {
      await db.assessment.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(lessonId !== undefined && { lessonId }),
          ...(questions && { questions }),
          ...(openAt !== undefined && { openAt: openAt ? new Date(openAt) : null }),
          ...(closeAt !== undefined && { closeAt: closeAt ? new Date(closeAt) : null })
        }
      });
    } catch (err) {
      // Ignore if it doesn't exist in Assessment yet for some reason
    }

    res.json(updatedHomework);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error updating homework', error: error.message });
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

    const now = new Date();
    const effectiveCloseAt = homework.closeAt || homework.deadline;
    if (effectiveCloseAt && now > effectiveCloseAt) {
      if (now.getTime() - effectiveCloseAt.getTime() > 120000) { // 2 minute grace period
        return res.status(403).json({ message: 'انتهى موعد تسليم الواجب', code: 'ASSESSMENT_CLOSED' });
      }
    }

    const existingSubmission = await db.submission.findFirst({
      where: { homeworkId, studentId: userId }
    });
    if (existingSubmission) {
      return res.status(400).json({ message: 'لقد قمت بتسليم هذا الواجب مسبقاً' });
    }

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

    const gradeToSave = questions.length > 0 ? calculatedGrade : (clientGrade || 0);

    const submission = await db.submission.create({
      data: {
        studentId: userId,
        homeworkId,
        grade: gradeToSave,
        url: url || null,
        answers: answers || []
      }
    });

    // Notify teacher of submission
    const { notifyTeacher } = await import('../utils/notification.helper.js');
    await notifyTeacher(homework.courseId, 'تسليم واجب', `قام الطالب بتسليم واجب: ${homework.title}`);
    
    // The previous implementation sent a notification to the student, we'll keep that but also we could notify parent. 
    // Wait, the Student sees the score instantly, notifying the Parent of the score is better!
    const student = await db.user.findUnique({ where: { id: userId } });
    if (student?.parentId) {
      await db.notification.create({
        data: {
          userId: student.parentId,
          title: 'إشعار لولي الأمر: تم تصحيح الواجب',
          message: `تم تقييم أداء طالبك في ${homework.title} وحصل على ${calculatedGrade || clientGrade || 0}%`,
          type: 'success'
        }
      });
    }

    // Keep student notification
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
