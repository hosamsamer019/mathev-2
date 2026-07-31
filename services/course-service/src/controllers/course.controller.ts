import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { z } from 'zod';
import { checkUserEnrollment } from '../utils/enrollment.js';
import { io } from '../index.js';

const courseCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.string().optional()
});

const lessonCreateSchema = z.object({
  title: z.string().min(2),
  videoUrl: z.string().optional(),
  fileUrl: z.string().optional(),
  duration: z.number().int().nonnegative().default(0),
  moduleId: z.string().optional(),
  courseId: z.string()
});

export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    let whereClause: any = {};
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole === 'TEACHER') {
      whereClause = { teacherId: req.user?.userId };
    } else if (requesterRole === 'ONLINE_STUDENT' || requesterRole === 'CENTER_STUDENT') {
      whereClause = { enrollments: { some: { studentId: req.user?.userId } } };
    }
    
    const [courses, total] = await Promise.all([
      db.course.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          lessons: { include: { quizzes: true } },
          _count: {
            select: { enrollments: true, lessons: true, exams: true, homeworks: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.course.count({ where: whereClause })
    ]);
    
    res.json({
      data: courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
};

export const getLessons = async (req: AuthRequest, res: Response) => {
  try {
    let whereClause: any = {};
    const requesterRole = (req.user?.role || '').toUpperCase();
    
    if (requesterRole === 'TEACHER') {
      whereClause = { course: { teacherId: req.user?.userId } };
    } else if (requesterRole === 'ONLINE_STUDENT' || requesterRole === 'CENTER_STUDENT') {
      whereClause = { course: { enrollments: { some: { studentId: req.user?.userId } } } };
    }

    const lessons = await db.lesson.findMany({
      where: whereClause,
      include: {
        course: { select: { title: true } },
        quizzes: true
      }
    });
    res.json(lessons);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching lessons', error: error.message });
  }
};

export const getLessonDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await db.lesson.findUnique({
      where: { id },
      include: {
        course: true,
        quizzes: true
      }
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    
    // Auth check
    const isEnrolled = await checkUserEnrollment(req.user, lesson.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });
    
    res.json(lesson);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching lesson details', error: error.message });
  }
};

export const getCourseDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const course = await db.course.findUnique({
      where: { id },
      include: {
        lessons: { include: { quizzes: true } }
      }
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Auth check (Admins and course owner teachers can view without enrollment)
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;
    if (requesterRole !== 'ADMIN' && course.teacherId !== requesterId) {
      const isEnrolled = await checkUserEnrollment(req.user, id);
      if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching course details', error: error.message });
  }
};

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const data = courseCreateSchema.parse(req.body);
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });
    const course = await db.course.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        teacherId
      }
    });
    io.emit('course_created', course);
    res.status(201).json(course);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const data = lessonCreateSchema.parse(req.body);
    const lesson = await db.lesson.create({
      data: {
        title: data.title,
        videoUrl: data.videoUrl,
        pdfUrl: data.fileUrl, // mapped from fileUrl in schema
        courseId: data.courseId
      }
    });
    io.to(`course:${lesson.courseId}`).emit('lesson_created', lesson);
    res.status(201).json(lesson);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    res.status(500).json({ message: 'Error creating lesson', error: error.message });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    const course = await db.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (requesterRole !== 'ADMIN' && course.teacherId !== requesterId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.course.delete({ where: { id } });
    io.to(`course:${id}`).emit('course_deleted', id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting course', error: error.message });
  }
};

export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    const lesson = await db.lesson.findUnique({
      where: { id },
      include: { course: true }
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    if (requesterRole !== 'ADMIN' && lesson.course.teacherId !== requesterId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.lesson.delete({ where: { id } });
    io.to(`course:${lesson.courseId}`).emit('lesson_deleted', id);
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting lesson', error: error.message });
  }
};

export const updateVideoProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { id: lessonId } = req.params;
    const { progress, watched, lastTimestamp } = req.body;
    const studentId = req.user?.userId;

    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const videoProgress = await db.videoProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId,
          lessonId
        }
      },
      update: {
        progress,
        watched: watched !== undefined ? watched : undefined,
        lastTimestamp: lastTimestamp !== undefined ? lastTimestamp : undefined
      },
      create: {
        studentId,
        lessonId,
        progress,
        watched: watched || false,
        lastTimestamp: lastTimestamp || 0
      }
    });

    res.json(videoProgress);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating video progress', error: error.message });
  }
};

export const getVideoAnalytics = async (req: Request, res: Response) => {
  try {
    const { id: lessonId } = req.params;
    const analytics = await db.videoProgress.findMany({
      where: { lessonId },
      include: {
        student: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching video analytics', error: error.message });
  }
};

export const submitLessonQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { id: lessonId, quizId } = req.params;
    const { answer } = req.body;
    
    const quiz = await db.lessonQuiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz || quiz.lessonId !== lessonId) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const passed = quiz.correctAnswer === answer;
    const score = passed ? 100 : 0;

    res.json({ score, passed });
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting quiz', error: error.message });
  }
};
