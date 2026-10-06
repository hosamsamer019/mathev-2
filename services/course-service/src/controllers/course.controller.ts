import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { z } from 'zod';
import { checkUserEnrollment } from '../utils/enrollment.js';
import { io } from '../socket.js';
import { generateVideoTicket } from '../services/videoToken.service.js';
import https from 'node:https';
import http from 'node:http';

const courseCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0).optional().default(0),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('PUBLISHED'),
  teacherId: z.string().uuid().optional(),
  academicLevel: z.enum(['PREP_1', 'PREP_2', 'PREP_3', 'SEC_1', 'SEC_2', 'SEC_3']).optional().nullable(),
  country: z.string().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable()
});

const courseUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  teacherId: z.string().uuid().optional(),
  academicLevel: z.enum(['PREP_1', 'PREP_2', 'PREP_3', 'SEC_1', 'SEC_2', 'SEC_3']).optional().nullable(),
  country: z.string().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable()
});

const lessonCreateSchema = z.object({
  title: z.string().min(3, 'Title is too short'),
  videoUrl: z.string().optional(),
  fileUrl: z.string().optional(),
  courseId: z.string().uuid('Invalid Course ID'),
  quizzes: z.array(z.object({
    timestampSec: z.number().min(0),
    question: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.string()
  })).optional()
});

const lessonUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  videoUrl: z.string().optional(),
  fileUrl: z.string().optional(),
  quizzes: z.array(z.object({
    id: z.string().uuid().optional(),
    timestampSec: z.number().min(0),
    question: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.string()
  })).optional()
});

export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    let whereClause: any = {};
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole === 'TEACHER') {
      whereClause = { teacherId: req.user?.userId };
    } else if (requesterRole === 'ONLINE_STUDENT' || requesterRole === 'CENTER_STUDENT') {
      whereClause = { enrollments: { some: { studentId: req.user?.userId } } };
    }
    
    const courses = await db.course.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        lessons: { include: { quizzes: true } },
        teacher: { select: { id: true, name: true, email: true } },
        _count: {
          select: { enrollments: true, lessons: true, exams: true, homeworks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const total = await db.course.count({ where: whereClause });
    
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

export const getAvailableCourses = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const studentId = req.user?.userId;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const student = await db.user.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: 'User not found' });

    const whereClause: any = {
      status: 'PUBLISHED',
      enrollments: {
        none: { studentId }
      }
    };

    const orConditions: any[] = [];
    
    if (student.country && student.educationLevel && student.gradeLevel) {
      orConditions.push({
        country: student.country,
        educationLevel: student.educationLevel,
        gradeLevel: student.gradeLevel
      });
      const reverseMap: Record<string, Record<string, string>> = {
        'MIDDLE': { 'FIRST_GRADE': 'PREP_1', 'SECOND_GRADE': 'PREP_2', 'THIRD_GRADE': 'PREP_3' },
        'SECONDARY': { 'FIRST_GRADE': 'SEC_1', 'SECOND_GRADE': 'SEC_2', 'THIRD_GRADE': 'SEC_3' }
      };
      const mappedAcLevel = reverseMap[student.educationLevel]?.[student.gradeLevel];
      if (mappedAcLevel) {
        orConditions.push({ academicLevel: mappedAcLevel });
      }
      orConditions.push({ category: student.gradeLevel });
    }

    if (student.academicLevel) {
      orConditions.push({ academicLevel: student.academicLevel });
      const levelMap: Record<string, { edu: string, grade: string }> = {
        'PREP_1': { edu: 'MIDDLE', grade: 'FIRST_GRADE' },
        'PREP_2': { edu: 'MIDDLE', grade: 'SECOND_GRADE' },
        'PREP_3': { edu: 'MIDDLE', grade: 'THIRD_GRADE' },
        'SEC_1': { edu: 'SECONDARY', grade: 'FIRST_GRADE' },
        'SEC_2': { edu: 'SECONDARY', grade: 'SECOND_GRADE' },
        'SEC_3': { edu: 'SECONDARY', grade: 'THIRD_GRADE' }
      };
      const mapped = levelMap[student.academicLevel];
      if (mapped) {
        orConditions.push({
          educationLevel: mapped.edu,
          gradeLevel: mapped.grade
        });
        orConditions.push({ category: mapped.grade });
      }
    }

    if (orConditions.length > 0) {
      whereClause.OR = orConditions;
    }

    const courses = await db.course.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        teacher: { select: { id: true, name: true } },
        _count: { select: { lessons: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await db.course.count({ where: whereClause });

    res.json({
      data: courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching available courses', error: error.message });
  }
};

export const enrollCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id: courseId } = req.params;
    const studentId = req.user?.userId;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const student = await db.user.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.status !== 'PUBLISHED') return res.status(403).json({ message: 'Course is not published' });

    if (student.country && student.educationLevel && student.gradeLevel && course.country && course.educationLevel && course.gradeLevel) {
      if (student.country !== course.country || student.educationLevel !== course.educationLevel || student.gradeLevel !== course.gradeLevel) {
        return res.status(403).json({ message: 'Academic level mismatch. You cannot enroll in this course.' });
      }
    } else if (student.academicLevel && course.academicLevel && student.academicLevel !== course.academicLevel) {
      return res.status(403).json({ message: 'Academic level mismatch. You cannot enroll in this course.' });
    }

    const existingEnrollment = await db.courseEnrollment.findFirst({
      where: { courseId, studentId }
    });
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Note: For paid courses, payment logic would go here.
    // Assuming enrollment is free or handled manually for now.
    
    const enrollment = await db.courseEnrollment.create({
      data: {
        courseId,
        studentId
      }
    });

    res.status(201).json({ message: 'Enrolled successfully', enrollment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const postLessonEvents = async (req: AuthRequest, res: Response) => {
  try {
    const { id: lessonId } = req.params;
    const { eventType, playedSeconds, progress, lastTimestamp } = req.body;
    const studentId = req.user?.userId;

    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    
    const isEnrolled = await checkUserEnrollment(req.user, lesson.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Forbidden' });

    let videoProgress = await db.videoProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } }
    });

    if (!videoProgress) {
      videoProgress = await db.videoProgress.create({
        data: {
          studentId,
          lessonId,
          status: 'NOT_STARTED',
        }
      });
    }

    const updates: any = { updatedAt: new Date() };
    const historyToResolve: any[] = [];
    const now = new Date();

    if (progress !== undefined) updates.progress = progress;
    if (lastTimestamp !== undefined) updates.lastTimestamp = lastTimestamp;

    if (eventType === 'LESSON_OPENED') {
      if (videoProgress.status === 'NOT_STARTED') {
        updates.status = 'LESSON_OPENED';
      }
      if (!videoProgress.firstOpenedAt) updates.firstOpenedAt = now;
      updates.lastActivityAt = now;
      
      if (videoProgress.currentRiskCode === 'NOT_OPENED_3_DAYS') {
        historyToResolve.push({ code: 'NOT_OPENED_3_DAYS', resolution: 'LESSON_OPENED' });
      }
    } 
    else if (eventType === 'VIDEO_PLAYING') {
      if (!videoProgress.firstActivityAt) updates.firstActivityAt = now;
      if (!videoProgress.firstOpenedAt) updates.firstOpenedAt = now;
      if (videoProgress.status === 'NOT_STARTED' || videoProgress.status === 'LESSON_OPENED') {
        updates.status = 'IN_PROGRESS';
      }
      
      // Session logic: if last activity was > 30 mins ago
      const thirtyMins = 30 * 60 * 1000;
      if (!videoProgress.lastActivityAt || (now.getTime() - videoProgress.lastActivityAt.getTime() > thirtyMins)) {
        updates.watchSessionsCount = videoProgress.watchSessionsCount + 1;
      }
      
      updates.lastActivityAt = now;

      if (videoProgress.currentRiskCode === 'NOT_STARTED_3_DAYS') {
        historyToResolve.push({ code: 'NOT_STARTED_3_DAYS', resolution: 'VIDEO_STARTED' });
      }
      if (videoProgress.currentRiskCode === 'ABANDONED_VIDEO') {
        historyToResolve.push({ code: 'ABANDONED_VIDEO', resolution: 'VIDEO_RESUMED' });
      }
    }
    else if (eventType === 'VIDEO_PAUSED') {
      updates.lastActivityAt = now;
    }
    else if (eventType === 'VIDEO_PROGRESS_TICK') {
      if (playedSeconds) {
        updates.totalWatchTimeSec = videoProgress.totalWatchTimeSec + playedSeconds;
      }
      updates.lastActivityAt = now;
      updates.lastProgressUpdateAt = now;
      if (videoProgress.status === 'NOT_STARTED' || videoProgress.status === 'LESSON_OPENED') {
        updates.status = 'IN_PROGRESS';
      }
    }
    else if (eventType === 'VIDEO_COMPLETED') {
      updates.status = 'COMPLETED';
      updates.watched = true;
      if (!videoProgress.completedAt) updates.completedAt = now;
      updates.completionSource = 'VIDEO_PLAYER';
      updates.lastActivityAt = now;
    }
    else if (eventType === 'QUIZ_SUBMITTED') {
      updates.lastActivityAt = now;
      if (videoProgress.currentRiskCode === 'NOT_OPENED_3_DAYS') {
        historyToResolve.push({ code: 'NOT_OPENED_3_DAYS', resolution: 'QUIZ_SUBMITTED' });
      }
    }

    if (historyToResolve.length > 0) {
      updates.currentRiskLevel = 'NONE';
      updates.currentRiskCode = null;
      
      for (const res of historyToResolve) {
        await db.studentRiskHistory.updateMany({
          where: { 
            studentId, 
            lessonId, 
            riskCode: res.code,
            resolvedAt: null
          },
          data: {
            resolvedAt: now,
            resolutionCode: res.resolution
          }
        });
      }
    }

    const updatedProgress = await db.videoProgress.update({
      where: { studentId_lessonId: { studentId, lessonId } },
      data: updates
    });

    return res.json({ message: 'Event processed', progress: updatedProgress });
  } catch (error: any) {
    console.error('Post event error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const confirmTeacherCompletion = async (req: AuthRequest, res: Response) => {
  try {
    const { id: lessonId } = req.params;
    const { studentId } = req.body;
    
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    let videoProgress = await db.videoProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } }
    });

    if (!videoProgress) {
      videoProgress = await db.videoProgress.create({
        data: {
          studentId,
          lessonId,
          status: 'COMPLETED',
          watched: true,
          completedAt: new Date(),
          completionSource: 'TEACHER_CONFIRMED'
        }
      });
    } else {
      videoProgress = await db.videoProgress.update({
        where: { studentId_lessonId: { studentId, lessonId } },
        data: {
          status: 'COMPLETED',
          watched: true,
          completedAt: videoProgress.completedAt || new Date(),
          completionSource: 'TEACHER_CONFIRMED'
        }
      });
    }
    
    return res.json({ message: 'Completion confirmed', progress: videoProgress });
  } catch (error) {
    console.error('Teacher confirm error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStudentVideoAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const analytics = await db.videoProgress.findMany({
      where: { studentId },
      include: {
        lesson: {
          include: { course: true }
        },
        riskHistory: {
          orderBy: { detectedAt: 'desc' }
        }
      }
    });
    return res.json({ analytics });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return res.status(500).json({ message: 'Internal server error' });
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

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const lessons = await db.lesson.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        course: { select: { title: true } },
        // Removed deep quizzes include for list view to save memory
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const total = await db.lesson.count({ where: whereClause });
    
    res.json({
      data: lessons,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching lessons', error: error.message });
  }
};

function sanitizeQuizzesForStudent(quizzes: any[]): any[] {
  if (!Array.isArray(quizzes)) return [];
  return quizzes.map(q => {
    const { correctAnswer, ...rest } = q;
    return rest;
  });
}

export const getLessonDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await db.lesson.findUnique({
      where: { id },
      include: {
        course: true,
        quizzes: true,
        progress: req.user?.role?.toUpperCase().includes('STUDENT') ? {
          where: { studentId: req.user?.userId }
        } : false
      }
    });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    
    // Auth check
    const isEnrolled = await checkUserEnrollment(req.user, lesson.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });
    
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN' && requesterRole !== 'TEACHER') {
      lesson.quizzes = sanitizeQuizzesForStudent(lesson.quizzes);
    }

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

    if (requesterRole === 'ONLINE_STUDENT' || requesterRole === 'CENTER_STUDENT') {
      const student = await db.user.findUnique({ where: { id: requesterId } });
      if (student?.country && student.educationLevel && student.gradeLevel && course.country && course.educationLevel && course.gradeLevel) {
        if (student.country !== course.country || student.educationLevel !== course.educationLevel || student.gradeLevel !== course.gradeLevel) {
          return res.status(403).json({ message: 'Academic level mismatch. You cannot view this course.' });
        }
      } else if (student?.academicLevel && course.academicLevel && student.academicLevel !== course.academicLevel) {
        return res.status(403).json({ message: 'Academic level mismatch. You cannot view this course.' });
      }
      const isEnrolled = await checkUserEnrollment(req.user, id);
      if (!isEnrolled) return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    if (requesterRole !== 'ADMIN' && requesterRole !== 'TEACHER') {
      course.lessons = course.lessons.map((lesson: any) => ({
        ...lesson,
        quizzes: sanitizeQuizzesForStudent(lesson.quizzes)
      }));
    }

    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching course details', error: error.message });
  }
};

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const data = courseCreateSchema.parse(req.body);
    const requesterRole = (req.user?.role || '').toUpperCase();
    
    let teacherId = req.user?.userId;
    if (requesterRole === 'ADMIN' && data.teacherId) {
      teacherId = data.teacherId;
    }

    if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });

    // Explicit teacher existence/role validation
    const teacher = await db.user.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      return res.status(400).json({ message: 'المعلم غير موجود' }); // Teacher not found
    }
    if (teacher.role !== 'TEACHER' && teacher.role !== 'ADMIN') {
      return res.status(403).json({ message: 'المستخدم ليس معلماً' }); // User is not a teacher
    }

    const course = await db.course.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        price: data.price,
        status: data.status,
        teacherId,
        academicLevel: data.academicLevel as any,
        country: (data.country || null) as any,
        educationLevel: (data.educationLevel || null) as any,
        gradeLevel: (data.gradeLevel || null) as any
      }
    });
    io.emit('course_created', course);
    res.status(201).json(course);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    if (error.code === 'P2003') {
      return res.status(400).json({ message: 'البيانات المرتبطة غير صحيحة (مثل: المعلم غير موجود)' });
    }
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

export const updateCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = courseUpdateSchema.parse(req.body);
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    const course = await db.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (requesterRole !== 'ADMIN' && course.teacherId !== requesterId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (requesterRole === 'ADMIN' && data.teacherId) {
      const teacher = await db.user.findUnique({ where: { id: data.teacherId } });
      if (!teacher) {
        return res.status(400).json({ message: 'المعلم غير موجود' });
      }
      if (teacher.role !== 'TEACHER' && teacher.role !== 'ADMIN') {
        return res.status(403).json({ message: 'المستخدم ليس معلماً' });
      }
    }

    const updatedCourse = await db.course.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.academicLevel !== undefined && { academicLevel: data.academicLevel as any }),
        ...(data.country !== undefined && { country: data.country as any }),
        ...(data.educationLevel !== undefined && { educationLevel: data.educationLevel as any }),
        ...(data.gradeLevel !== undefined && { gradeLevel: data.gradeLevel as any }),
        ...(requesterRole === 'ADMIN' && data.teacherId && { teacherId: data.teacherId })
      }
    });

    res.json(updatedCourse);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    if (error.code === 'P2003') {
      return res.status(400).json({ message: 'البيانات المرتبطة غير صحيحة (مثل: المعلم غير موجود)' });
    }
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
};

export const createLesson = async (req: AuthRequest, res: Response) => {
  try {
    const data = lessonCreateSchema.parse(req.body);
    
    // Authorization Check: Does the teacher own this course?
    const course = await db.course.findUnique({
      where: { id: data.courseId }
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN' && course.teacherId !== req.user?.userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this course' });
    }

    const lesson = await db.lesson.create({
      data: {
        title: data.title,
        videoUrl: data.videoUrl,
        pdfUrl: data.fileUrl, // mapped from fileUrl in schema
        courseId: data.courseId,
        ...(data.quizzes && data.quizzes.length > 0 && {
          quizzes: {
            create: data.quizzes.map(q => ({
              timestampSec: q.timestampSec,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer
            }))
          }
        })
      }
    });
    io.to(`course:${lesson.courseId}`).emit('lesson_created', lesson);
    
    const { notifyCourseStudents } = await import('../utils/notification.helper.js');
    await notifyCourseStudents(lesson.courseId, 'درس جديد', `تمت إضافة درس جديد: ${lesson.title}`);

    res.status(201).json(lesson);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    res.status(500).json({ message: 'Error creating lesson', error: error.message });
  }
};

export const updateLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = lessonUpdateSchema.parse(req.body);
    
    const lesson = await db.lesson.findUnique({
      where: { id },
      include: { course: true }
    });

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN' && lesson.course.teacherId !== req.user?.userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this lesson' });
    }

    const updatedLesson = await db.lesson.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.fileUrl !== undefined && { pdfUrl: data.fileUrl })
      }
    });

    if (data.quizzes) {
      const existingQuizzes = await db.lessonQuiz.findMany({ where: { lessonId: id } });
      const newQuizIds = data.quizzes.filter(q => q.id).map(q => q.id);
      
      const quizzesToDelete = existingQuizzes.filter(q => !newQuizIds.includes(q.id));
      
      if (quizzesToDelete.length > 0) {
        await db.lessonQuiz.deleteMany({
          where: { id: { in: quizzesToDelete.map(q => q.id) } }
        });
      }
      
      for (const q of data.quizzes) {
        if (q.id) {
           await db.lessonQuiz.update({
             where: { id: q.id },
             data: {
               timestampSec: q.timestampSec,
               question: q.question,
               options: q.options,
               correctAnswer: q.correctAnswer
             }
           });
        } else {
           await db.lessonQuiz.create({
             data: {
               lessonId: id,
               timestampSec: q.timestampSec,
               question: q.question,
               options: q.options,
               correctAnswer: q.correctAnswer
             }
           });
        }
      }
    }

    res.json(updatedLesson);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    res.status(500).json({ message: 'Error updating lesson', error: error.message });
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

    // Verify enrollment
    const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    
    const isEnrolled = await checkUserEnrollment(req.user, lesson.courseId);
    if (!isEnrolled) return res.status(403).json({ message: 'Forbidden: You are not enrolled in this course' });

    // Strict Completion Validation
    let finalWatched = false;
    if (watched) {
      const allQuizzes = await db.lessonQuiz.findMany({ where: { lessonId } });
      const currentProgress = await db.videoProgress.findUnique({
        where: { studentId_lessonId: { studentId, lessonId } }
      });
      const answeredQuizzes = Array.isArray(currentProgress?.answeredQuizzes) ? currentProgress?.answeredQuizzes as string[] : [];
      const allAnswered = allQuizzes.every(q => answeredQuizzes.includes(q.id));
      if (allAnswered) {
        finalWatched = true;
      }
    }

    const now = new Date();
    const videoProgress = await db.videoProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId,
          lessonId
        }
      },
      update: {
        ...(progress !== undefined ? { progress } : {}),
        ...(finalWatched ? {
          watched: true,
          status: 'COMPLETED',
          completedAt: now,
          completionSource: 'VIDEO_PLAYER'
        } : (progress && progress > 0 ? { status: 'IN_PROGRESS' } : {})),
        ...(lastTimestamp !== undefined ? { lastTimestamp } : {}),
        lastActivityAt: now,
        lastProgressUpdateAt: now,
        updatedAt: now
      },
      create: {
        studentId,
        lessonId,
        progress: progress || 0,
        watched: finalWatched,
        status: finalWatched ? 'COMPLETED' : (progress && progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'),
        completedAt: finalWatched ? now : null,
        completionSource: finalWatched ? 'VIDEO_PLAYER' : 'NONE',
        lastTimestamp: lastTimestamp || 0,
        firstOpenedAt: now,
        firstActivityAt: now,
        lastActivityAt: now,
        lastProgressUpdateAt: now,
        answeredQuizzes: []
      }
    });

    res.json(videoProgress);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating video progress', error: error.message });
  }
};

export const getVideoAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { id: lessonId } = req.params;

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true }
    });

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN' && lesson.course.teacherId !== req.user?.userId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this course' });
    }

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

    if (passed) {
      const studentId = req.user?.userId;
      if (studentId) {
        const progress = await db.videoProgress.findUnique({
          where: { studentId_lessonId: { studentId, lessonId } }
        });
        const answered = Array.isArray(progress?.answeredQuizzes) ? [...(progress.answeredQuizzes as string[])] : [];
        if (!answered.includes(quizId)) {
          answered.push(quizId);
          await db.videoProgress.upsert({
            where: { studentId_lessonId: { studentId, lessonId } },
            update: { answeredQuizzes: answered },
            create: { studentId, lessonId, answeredQuizzes: answered }
          });
        }
      }
    }

    res.json({ score, passed });
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting quiz', error: error.message });
  }
};

export const getUploads = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    const userId = req.user?.userId;
    
    let whereClause: any = {};
    if (requesterRole !== 'ADMIN') {
      whereClause = { userId };
    }

    const uploads = await db.videoUpload.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(uploads);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching uploads', error: error.message });
  }
};

const driveSessionCache = new Map<string, { directUrl: string; cookies: string; expiresAt: number }>();

function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const idMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                  url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return idMatch ? idMatch[1] : null;
}

function isAllowedGoogleStreamUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:') return false;
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Check for IP literal addresses or localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }

    // Explicitly allow legitimate Google Drive / Google content domains only
    const allowedExactHosts = [
      'drive.google.com',
      'docs.google.com',
      'drive.usercontent.google.com',
      'video.google.com'
    ];
    if (allowedExactHosts.includes(hostname)) return true;

    // Check *.googleusercontent.com or *.drive.google.com with strict subdomain dot
    if (hostname.endsWith('.googleusercontent.com') || hostname.endsWith('.drive.google.com') || hostname.endsWith('.docs.google.com')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function fetchHttps(targetUrl: string, headers: Record<string, string> = {}, maxRedirects = 5): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    if (!isAllowedGoogleStreamUrl(targetUrl)) {
      return reject(new Error('SSRF_BLOCKED: Untrusted or non-whitelisted streaming target URL.'));
    }

    https.get(targetUrl, { headers }, (res) => {
      const isRedirect = res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode);
      if (isRedirect && res.headers.location && maxRedirects > 0) {
        res.resume(); // discard redirected response body
        const nextUrl = new URL(res.headers.location, targetUrl).toString();

        if (!isAllowedGoogleStreamUrl(nextUrl)) {
          return reject(new Error('SSRF_BLOCKED: Redirected to untrusted destination.'));
        }

        let newHeaders = { ...headers };
        if (res.headers['set-cookie']) {
          const extraCookies = res.headers['set-cookie'].map((c: string) => c.split(';')[0]).join('; ');
          const currentCookies = newHeaders['Cookie'] || '';
          newHeaders['Cookie'] = currentCookies ? `${currentCookies}; ${extraCookies}` : extraCookies;
        }

        fetchHttps(nextUrl, newHeaders, maxRedirects - 1).then(resolve).catch(reject);
      } else {
        resolve(res);
      }
    }).on('error', reject);
  });
}

function readBodyText(stream: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    stream.on('data', chunk => data += chunk);
    stream.on('end', () => resolve(data));
    stream.on('error', reject);
  });
}

async function getDriveDirectSession(fileId: string) {
  const cached = driveSessionCache.get(fileId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const initUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  const initialRes = await fetchHttps(initUrl, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }, 0);

  let cookies = initialRes.headers['set-cookie']
    ? initialRes.headers['set-cookie'].map((c: string) => c.split(';')[0]).join('; ')
    : '';

  let html = await readBodyText(initialRes);

  const uuidMatch = typeof html === 'string' ? html.match(/name="uuid"\s+value="([^"]+)"/) : null;
  const uuid = uuidMatch ? uuidMatch[1] : '';
  const confirmMatch = typeof html === 'string' ? html.match(/name="confirm"\s+value="([^"]+)"/) : null;
  const confirm = confirmMatch ? confirmMatch[1] : 't';

  const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirm}${uuid ? '&uuid=' + uuid : ''}`;
  const session = {
    directUrl,
    cookies,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes cache
  };
  driveSessionCache.set(fileId, session);
  return session;
}

function normalizeRangeHeader(clientRange?: string, chunkSize: number = 2 * 1024 * 1024): string {
  if (!clientRange) {
    return `bytes=0-${chunkSize - 1}`;
  }
  const match = clientRange.trim().match(/^bytes=(\d+)-(\d*)$/);
  if (!match) {
    return `bytes=0-${chunkSize - 1}`;
  }
  const start = parseInt(match[1], 10);
  if (isNaN(start) || start < 0) {
    return `bytes=0-${chunkSize - 1}`;
  }
  if (match[2] && match[2].length > 0) {
    const end = parseInt(match[2], 10);
    if (!isNaN(end) && end >= start) {
      const maxChunk = 5 * 1024 * 1024;
      if (end - start + 1 > maxChunk) {
        return `bytes=${start}-${start + maxChunk - 1}`;
      }
      return `bytes=${start}-${end}`;
    }
  }
  return `bytes=${start}-${start + chunkSize - 1}`;
}

export const generateLessonVideoTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await db.lesson.findUnique({
      where: { id },
      include: { course: true }
    });

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check enrollment
    const isEnrolled = await checkUserEnrollment(req.user, lesson.courseId);
    if (!isEnrolled) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    const ticket = generateVideoTicket({
      userId: req.user!.userId,
      lessonId: id,
      expiresInSeconds: 14400 // 4 hours viewing session
    });

    res.json({ ticket });
  } catch (error: any) {
    res.status(500).json({ message: 'Error generating video ticket', error: error.message });
  }
};

export const streamLessonVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const lesson = await db.lesson.findUnique({
      where: { id },
      include: { course: true }
    });

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check enrollment
    const isEnrolled = await checkUserEnrollment(req.user, lesson.courseId);
    if (!isEnrolled) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    if (!lesson.videoUrl) {
      return res.status(404).json({ message: 'No video attached to this lesson' });
    }

    // Handle Google Drive Video with Native Range Streaming
    const driveFileId = extractDriveFileId(lesson.videoUrl);
    if (driveFileId && (lesson.videoUrl.includes('drive.google.com') || lesson.videoUrl.includes('docs.google.com'))) {
      const upstreamRange = normalizeRangeHeader(req.headers.range);

      let session = await getDriveDirectSession(driveFileId);
      let upstreamStream = await fetchHttps(session.directUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': session.cookies,
        'Range': upstreamRange
      });

      // If upstream returned error or HTML confirmation warning (e.g. session expired), clear cache and retry
      const isHtmlResponse = upstreamStream.headers['content-type']?.includes('text/html');
      if (isHtmlResponse || (upstreamStream.statusCode && upstreamStream.statusCode >= 400)) {
        driveSessionCache.delete(driveFileId);
        session = await getDriveDirectSession(driveFileId);
        upstreamStream = await fetchHttps(session.directUrl, {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': session.cookies,
          'Range': upstreamRange
        });
      }

      // If upstream is still HTML or error (e.g. Quota exceeded / Access Denied), do not pipe HTML to <video>
      if (upstreamStream.headers['content-type']?.includes('text/html') || (upstreamStream.statusCode && upstreamStream.statusCode >= 400)) {
        return res.status(502).json({
          message: 'تعذر تشغيل الفيديو من المصدر الخارجي (تم تجاوز حد التحميل أو المصدر غير متاح حالياً).',
          error: 'UPSTREAM_MEDIA_UNAVAILABLE'
        });
      }

      res.status(upstreamStream.statusCode || 206);
      res.setHeader('Content-Type', upstreamStream.headers['content-type'] || 'video/mp4');
      if (upstreamStream.headers['content-length']) res.setHeader('Content-Length', upstreamStream.headers['content-length']);
      if (upstreamStream.headers['content-range']) res.setHeader('Content-Range', upstreamStream.headers['content-range']);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      upstreamStream.on('error', (err) => {
        console.error('Upstream media stream error:', err.message);
        if (!res.headersSent) {
          res.status(502).json({ message: 'Stream error', error: err.message });
        } else {
          res.end();
        }
      });

      req.on('close', () => {
        upstreamStream.destroy();
      });

      upstreamStream.pipe(res);
      return;
    }

    // Direct / Hosted / Cloudflare R2 / Upload video
    return res.redirect(lesson.videoUrl);
  } catch (error: any) {
    console.error('streamLessonVideo Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error streaming video', error: error.message });
    }
  }
};

