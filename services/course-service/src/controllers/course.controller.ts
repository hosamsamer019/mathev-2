import { Request, Response } from 'express';
import { z } from 'zod';
import { CourseService } from '../services/course.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const courseCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.number().nonnegative().default(0),
  isPremium: z.boolean().default(false),
  tenantId: z.string().optional()
});

const moduleCreateSchema = z.object({
  title: z.string().min(2),
  courseId: z.string()
});

const lessonCreateSchema = z.object({
  title: z.string().min(2),
  videoUrl: z.string().optional(),
  fileUrl: z.string().optional(),
  duration: z.number().int().nonnegative().default(0),
  moduleId: z.string()
});

const progressUpdateSchema = z.object({
  lessonId: z.string(),
  completed: z.boolean()
});

export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await CourseService.getCourses();
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
};

export const getCourseDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await CourseService.getCourseDetails(id);
    res.json(course);
  } catch (error: any) {
    if (error.message === 'Course not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error fetching course details', error: error.message });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const data = courseCreateSchema.parse(req.body);
    const course = await CourseService.createCourse(data);
    res.status(201).json(course);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

export const createModule = async (req: Request, res: Response) => {
  try {
    const data = moduleCreateSchema.parse(req.body);
    const module = await CourseService.addModule(data);
    res.status(201).json(module);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating module', error: error.message });
  }
};

export const createLesson = async (req: Request, res: Response) => {
  try {
    const data = lessonCreateSchema.parse(req.body);
    const lesson = await CourseService.addLesson(data);
    res.status(201).json(lesson);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating lesson', error: error.message });
  }
};

export const updateProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId, completed } = progressUpdateSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User unauthorized' });
    }

    const progress = await CourseService.updateLessonProgress(userId, lessonId, completed);
    res.json(progress);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error updating progress', error: error.message });
  }
};
