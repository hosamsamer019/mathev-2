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

    if (student.country && student.educationLevel && student.gradeLevel) {
      whereClause.country = student.country;
      whereClause.educationLevel = student.educationLevel;
      whereClause.gradeLevel = student.gradeLevel;
    } else if (student.academicLevel) {
      whereClause.academicLevel = student.academicLevel;
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
  } catch (error: any) {
    res.status(500).json({ message: 'Error enrolling in course', error: error.message });
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
        courseId: data.courseId
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
