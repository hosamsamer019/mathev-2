import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { z } from 'zod';
import { checkUserEnrollment } from '../utils/enrollment.js';
import { io } from '../index.js';

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
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
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
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
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

    const videoProgress = await db.videoProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId,
          lessonId
        }
      },
      update: {
        progress,
        ...(finalWatched ? { watched: true } : {}),
        lastTimestamp: lastTimestamp !== undefined ? lastTimestamp : undefined
      },
      create: {
        studentId,
        lessonId,
        progress,
        watched: finalWatched,
        lastTimestamp: lastTimestamp || 0,
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
