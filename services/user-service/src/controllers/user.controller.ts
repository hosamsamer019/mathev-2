import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { isValidAcademicProfile } from '@shared/utils';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getRisks = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN' && requesterRole !== 'TEACHER') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let courseWhere: any = {};
    if (requesterRole === 'TEACHER') {
      courseWhere = { teacherId: req.user?.userId };
    }

    const enrollments = await db.courseEnrollment.findMany({
      where: {
        course: courseWhere
      },
      include: {
        student: {
          include: {
            attendances: true
          }
        },
        course: {
          include: {
            lessons: { include: { progress: true } },
            exams: { include: { attempts: true } }
          }
        }
      }
    });

    const risks: any[] = [];
    const now = new Date();

    for (const enr of enrollments) {
      const student = enr.student;
      const course = enr.course;

      for (const lesson of course.lessons) {
        const progress = lesson.progress.find(p => p.studentId === student.id);
        if (progress && !progress.watched) {
          risks.push({
            studentId: student.id,
            studentName: student.name,
            courseId: course.id,
            courseName: course.title,
            type: 'VIDEO_INCOMPLETE',
            severity: 'متوسط',
            reason: `لم يكمل مشاهدة درس: ${lesson.title}`,
            relatedEntityId: lesson.id,
            relatedEntityType: 'LESSON',
            evaluatedDate: now,
            currentState: 'INCOMPLETE'
          });
        }
      }

      for (const exam of course.exams) {
        const attempt = exam.attempts.find(a => a.studentId === student.id);
        if (attempt && attempt.score < 50) {
          risks.push({
            studentId: student.id,
            studentName: student.name,
            courseId: course.id,
            courseName: course.title,
            type: 'LOW_EXAM_SCORE',
            severity: 'حرج',
            reason: `درجة منخفضة في امتحان: ${exam.title} (${Math.round(attempt.score)}%)`,
            relatedEntityId: exam.id,
            relatedEntityType: 'EXAM',
            evaluatedDate: now,
            currentState: 'FAILING'
          });
        }
      }

      const absences = student.attendances.filter(a => a.status === 'ABSENT').length;
      if (absences >= 3) {
        risks.push({
          studentId: student.id,
          studentName: student.name,
          courseId: course.id,
          courseName: course.title,
          type: 'HIGH_ABSENCE',
          severity: 'عالي',
          reason: `الغياب المتكرر (${absences} مرات)`,
          relatedEntityId: student.id,
          relatedEntityType: 'STUDENT',
          evaluatedDate: now,
          currentState: 'AT_RISK'
        });
      }
    }

    res.json(risks);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching risks', error: error.message });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    let whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole === 'TEACHER') {
      whereClause = {
        ...whereClause,
        enrollments: {
          some: {
            course: {
              teacherId: req.user?.userId
            }
          }
        }
      };
    } else if (requesterRole === 'PARENT') {
      whereClause = {
        ...whereClause,
        OR: [
          { id: req.user?.userId },
          { parentId: req.user?.userId }
        ]
      };
    } else if (requesterRole !== 'ADMIN') {
      // Students and others can only see their own record
      whereClause = {
        ...whereClause,
        id: req.user?.userId
      };
    }
    
    const [users, total] = await Promise.all([
      db.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          academicLevel: true,
          country: true,
          educationLevel: true,
          gradeLevel: true,
          language: true,
          parentId: true,
          centerGroupId: true,
          attendances: {
            select: { status: true }
          },
          submissions: {
            select: { grade: true }
          },
          examAttempts: {
            select: { score: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.user.count({ where: whereClause })
    ]);

    const mappedUsers = users.map(user => {
      let attendancePercentage = null;
      if (user.attendances && user.attendances.length > 0) {
        const presentCount = user.attendances.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
        attendancePercentage = Math.round((presentCount / user.attendances.length) * 100);
      }

      let homeworkScore = 0;
      if (user.submissions && user.submissions.length > 0) {
        const totalGrades = user.submissions.reduce((acc, curr) => acc + (curr.grade || 0), 0);
        homeworkScore = Math.round(totalGrades / user.submissions.length);
      }

      let examScore = 0;
      if (user.examAttempts && user.examAttempts.length > 0) {
        const totalScores = user.examAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
        examScore = Math.round(totalScores / user.examAttempts.length);
      }

      let avgScore = 0;
      const totalCount = (user.submissions?.length || 0) + (user.examAttempts?.length || 0);
      if (totalCount > 0) {
        const totalGrades = (user.submissions?.reduce((acc, curr) => acc + (curr.grade || 0), 0) || 0) + (user.examAttempts?.reduce((acc, curr) => acc + (curr.score || 0), 0) || 0);
        avgScore = Math.round(totalGrades / totalCount);
      }

      const { attendances, submissions, examAttempts, ...rest } = user;
      return { ...rest, attendancePercentage, homeworkScore, examScore, avgScore };
    });

    res.json({
      data: mappedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'TEACHER', 'ONLINE_STUDENT', 'CENTER_STUDENT', 'PARENT']),
  parentId: z.string().uuid().optional().nullable(),
  centerGroupId: z.string().uuid().optional().nullable(),
  parentName: z.string().optional().nullable(),
  parentEmail: z.string().email().optional().nullable(),
  parentPassword: z.string().min(6).optional().nullable(),
  childId: z.string().uuid().optional().nullable(),
  academicLevel: z.enum(['PREP_1', 'PREP_2', 'PREP_3', 'SEC_1', 'SEC_2', 'SEC_3']).optional().nullable(),
  country: z.string().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
  language: z.string().optional()
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'ONLINE_STUDENT', 'CENTER_STUDENT', 'PARENT']).optional(),
  parentId: z.string().uuid().optional().nullable(),
  childId: z.string().uuid().optional().nullable(),
  centerGroupId: z.string().uuid().optional().nullable(),
  academicLevel: z.enum(['PREP_1', 'PREP_2', 'PREP_3', 'SEC_1', 'SEC_2', 'SEC_3']).optional().nullable(),
  country: z.string().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
  language: z.string().optional()
});

const sanitizeUser = (user: any) => {
  const { password, ...rest } = user;
  return rest;
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (!requesterRole) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validatedData = createUserSchema.parse(req.body);
    const { name, email, password, role, parentId, centerGroupId, parentName, parentEmail, parentPassword, childId, academicLevel, country, educationLevel, gradeLevel, language } = validatedData;
    
    // Authorization Check
    if (role === 'ADMIN' || role === 'TEACHER') {
      if (requesterRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Only admins can create ADMIN or TEACHER accounts' });
      }
    } else {
      if (requesterRole !== 'ADMIN' && requesterRole !== 'TEACHER') {
        return res.status(403).json({ message: 'Insufficient permissions to create accounts' });
      }
    }
    
    if (['ONLINE_STUDENT', 'CENTER_STUDENT'].includes(role as any)) {
      if (!isValidAcademicProfile(country, educationLevel, gradeLevel)) {
        return res.status(400).json({ message: 'Invalid or incomplete academic profile for student.' });
      }
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let resolvedParentId = parentId;

    if (parentName && parentEmail && parentPassword) {
      const existingParent = await db.user.findUnique({ where: { email: parentEmail } });
      if (existingParent) {
        resolvedParentId = existingParent.id;
      } else {
        const hashedParentPassword = await bcrypt.hash(parentPassword, 10);
        const newParent = await db.user.create({
          data: {
            name: parentName,
            email: parentEmail,
            password: hashedParentPassword,
            role: 'PARENT'
          }
        });
        resolvedParentId = newParent.id;
      }
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any,
        academicLevel: academicLevel as any,
        country: (country || null) as any,
        educationLevel: (educationLevel || null) as any,
        gradeLevel: (gradeLevel || null) as any,
        ...(language ? { language } : {}),
        ...(resolvedParentId ? { parent: { connect: { id: resolvedParentId } } } : {}),
        ...(childId ? { children: { connect: { id: childId } } } : {}),
        ...(role === 'CENTER_STUDENT' && centerGroupId ? { centerGroup: { connect: { id: centerGroupId } } } : {}),
      }
    });

    res.status(201).json({ message: 'User created successfully', user: sanitizeUser(user) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(400).json({ message: 'البيانات المرتبطة غير موجودة (مثل: معرف السنتر أو معرف ولي الأمر خاطئ)' });
    }
    console.error('CRITICAL: Error creating user', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;

    if (requesterRole !== 'ADMIN' && requesterId !== id) {
      return res.status(403).json({ message: 'Insufficient permissions to update this user' });
    }

    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const validatedData = updateUserSchema.parse(req.body);
    const { name, email, role, parentId, centerGroupId, password, childId, academicLevel, country, educationLevel, gradeLevel, language } = validatedData;
    
    if (['ONLINE_STUDENT', 'CENTER_STUDENT'].includes((role || existingUser.role) as any)) {
      const c = country !== undefined ? country : existingUser.country;
      const el = educationLevel !== undefined ? educationLevel : existingUser.educationLevel;
      const gl = gradeLevel !== undefined ? gradeLevel : existingUser.gradeLevel;
      if (!isValidAcademicProfile(c, el, gl)) {
        return res.status(400).json({ message: 'Invalid or incomplete academic profile for student.' });
      }
    }

    const updateData: any = {
      name,
      email,
      role,
      academicLevel,
      country,
      educationLevel,
      gradeLevel,
      language,
      ...(requesterRole === 'ADMIN' && role ? { role } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(childId !== undefined ? { children: { connect: { id: childId } } } : {}),
      ...(centerGroupId !== undefined ? { centerGroupId } : {}),
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Clean up undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const user = await db.user.update({
      where: { id },
      data: updateData
    });

    res.json({ message: 'User updated successfully', user: sanitizeUser(user) });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(400).json({ message: 'البيانات المرتبطة غير موجودة (مثل: معرف السنتر أو معرف ولي الأمر خاطئ)' });
    }
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }
    const { id } = req.params;
    await db.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

export const getParentChildren = async (req: any, res: Response) => {
  try {
    const parentId = req.user.userId;
    const children = await db.user.findMany({
      where: { parentId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        academicLevel: true,
        country: true,
        educationLevel: true,
        gradeLevel: true,
        createdAt: true
      }
    });
    res.json(children);
  } catch (error: any) {
    console.error('Error fetching parent children:', error);
    res.status(500).json({ message: 'Error fetching children', error: error.message });
  }
};
