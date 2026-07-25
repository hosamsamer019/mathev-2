import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await db.course.findMany({
      include: {
        lessons: { include: { quizzes: true } },
        _count: {
          select: { enrollments: true, lessons: true, exams: true, homeworks: true }
        }
      }
    });
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
};

export const getLessons = async (req: Request, res: Response) => {
  try {
    const lessons = await db.lesson.findMany({
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

export const getCourseDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await db.course.findUnique({
      where: { id },
      include: {
        lessons: true,
        exams: true,
        homeworks: true,
        teacher: { select: { id: true, name: true, email: true } }
      }
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching course details', error: error.message });
  }
};

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, teacherId } = req.body;
    const userId = req.user?.userId;

    // Default to the requesting user if no teacherId provided (assuming they are a teacher)
    const finalTeacherId = teacherId || userId;
    
    if (!finalTeacherId) {
       return res.status(400).json({ message: 'teacherId is required' });
    }

    const course = await db.course.create({
      data: {
        title,
        description,
        teacherId: finalTeacherId
      }
    });
    res.status(201).json(course);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

export const createLesson = async (req: Request, res: Response) => {
  try {
    const { title, videoUrl, pdfUrl, courseId, quizzes } = req.body;
    
    if (!title || !courseId) {
      return res.status(400).json({ message: 'title and courseId are required' });
    }

    // Verify the course exists
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Build quiz data only if valid quizzes are provided
    const validQuizzes = Array.isArray(quizzes) ? quizzes.filter((q: any) => 
      q.question && q.correctAnswer && q.timestampSec !== undefined
    ) : [];

    const lesson = await db.lesson.create({
      data: {
        title,
        videoUrl: videoUrl || null,
        pdfUrl: pdfUrl || null,
        courseId,
        ...(validQuizzes.length > 0 ? {
          quizzes: {
            create: validQuizzes.map((q: any) => ({
              timestampSec: Number(q.timestampSec) || 0,
              question: q.question,
              options: Array.isArray(q.options) ? q.options : [],
              correctAnswer: q.correctAnswer
            }))
          }
        } : {})
      },
      include: { quizzes: true }
    });
    res.status(201).json(lesson);
  } catch (error: any) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ message: 'Error creating lesson', error: error.message });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.course.delete({ where: { id } });
    res.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting course', error: error.message });
  }
};

export const deleteLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.lesson.delete({ where: { id } });
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
