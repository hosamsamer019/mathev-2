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
    const roleFilter = req.query.role as string;

    let whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (roleFilter) {
      whereClause.role = roleFilter;
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
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
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
  parentPhone: z.string().optional().nullable(),
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
  parentName: z.string().optional().nullable(),
  parentEmail: z.string().email().optional().nullable(),
  parentPassword: z.string().min(6).optional().nullable(),
  parentPhone: z.string().optional().nullable(),
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
    const { name, email, password, role, parentId, centerGroupId, parentName, parentEmail, parentPassword, parentPhone, childId, academicLevel, country, educationLevel, gradeLevel, language } = validatedData;
    
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
    
    const user = await db.$transaction(async (tx) => {
      let resolvedParentId = parentId;

      if (parentName && parentEmail && parentPassword) {
        const existingParent = await tx.user.findUnique({ where: { email: parentEmail } });
        if (existingParent) {
          resolvedParentId = existingParent.id;
        } else {
          const hashedParentPassword = await bcrypt.hash(parentPassword, 10);
          const newParent = await tx.user.create({
            data: {
              name: parentName,
              email: parentEmail,
              password: hashedParentPassword,
              phone: parentPhone || null,
              role: 'PARENT'
            }
          });
          resolvedParentId = newParent.id;
        }
      }

      const newUser = await tx.user.create({
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

      return newUser;
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
    const { name, email, role, parentId, centerGroupId, password, childId, academicLevel, country, educationLevel, gradeLevel, language, parentName, parentEmail, parentPassword, parentPhone } = validatedData;
    
    // Strict Academic Profile Authorization check
    if (requesterRole !== 'ADMIN') {
      const forbiddenFields = ['country', 'educationLevel', 'gradeLevel', 'academicLevel'];
      const hasForbiddenField = forbiddenFields.some(field => Object.prototype.hasOwnProperty.call(req.body, field));
      if (hasForbiddenField) {
        return res.status(403).json({ message: 'Only administrators can modify the academic profile' });
      }
    }
    
    if (['ONLINE_STUDENT', 'CENTER_STUDENT'].includes((role || existingUser.role) as any)) {
      const c = country !== undefined ? country : existingUser.country;
      const el = educationLevel !== undefined ? educationLevel : existingUser.educationLevel;
      const gl = gradeLevel !== undefined ? gradeLevel : existingUser.gradeLevel;
      if (!isValidAcademicProfile(c, el, gl)) {
        return res.status(400).json({ message: 'Invalid or incomplete academic profile for student.' });
      }
    }

    const user = await db.$transaction(async (tx) => {
      const userToUpdate = await tx.user.findUnique({
        where: { id },
        include: { parent: true }
      });
      if (!userToUpdate) throw new Error('User not found');

      let resolvedParentId = parentId;

      if (parentName && parentEmail) {
        const existingParent = await tx.user.findFirst({
          where: { email: parentEmail }
        });

        if (existingParent) {
          const parentUpdateData: any = {
            name: parentName,
            phone: parentPhone || existingParent.phone
          };
          if (parentPassword) {
            parentUpdateData.password = await bcrypt.hash(parentPassword, 10);
          }
          await tx.user.update({
            where: { id: existingParent.id },
            data: parentUpdateData
          });
          resolvedParentId = existingParent.id;
        } else {
          const hashedParentPassword = await bcrypt.hash(parentPassword || '123456', 10);
          const newParent = await tx.user.create({
            data: {
              name: parentName,
              email: parentEmail,
              password: hashedParentPassword,
              phone: parentPhone || null,
              role: 'PARENT'
            }
          });
          resolvedParentId = newParent.id;
        }
      } else if (userToUpdate.parentId && (parentName || parentPhone)) {
        const parentUpdateData: any = {};
        if (parentName) parentUpdateData.name = parentName;
        if (parentPhone) parentUpdateData.phone = parentPhone;
        if (parentPassword) parentUpdateData.password = await bcrypt.hash(parentPassword, 10);
        
        await tx.user.update({
          where: { id: userToUpdate.parentId },
          data: parentUpdateData
        });
      }

      const updateData: any = {
        name,
        email,
        academicLevel,
        country,
        educationLevel,
        gradeLevel,
        language,
        ...(requesterRole === 'ADMIN' && role ? { role } : {}),
        ...(centerGroupId !== undefined ? { centerGroupId } : {}),
      };

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      if (resolvedParentId === null || resolvedParentId === '') {
        updateData.parentId = null;
      } else if (resolvedParentId) {
        updateData.parentId = resolvedParentId;
      }

      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      const updated = await tx.user.update({
        where: { id },
        data: updateData
      });
      return updated;
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

const getTargetUserIds = async (
  req: AuthRequest,
  payload: { userIds?: string[], selectAll?: boolean, search?: string, role?: string, excludedIds?: string[] }
): Promise<string[]> => {
  if (payload.selectAll) {
    let whereClause: any = {};
    if (payload.search) {
      whereClause.OR = [
        { name: { contains: payload.search, mode: 'insensitive' } },
        { email: { contains: payload.search, mode: 'insensitive' } }
      ];
    }
    if (payload.role) {
      whereClause.role = payload.role;
    }

    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN') {
      throw new Error('Only admins can perform bulk selection');
    }

    const excludedIds = Array.isArray(payload.excludedIds) ? payload.excludedIds : [];
    
    whereClause.id = { notIn: [req.user?.userId, ...excludedIds].filter(Boolean) as string[] };

    const matchingUsers = await db.user.findMany({
      where: whereClause,
      select: { id: true }
    });
    return matchingUsers.map(u => u.id);
  } else {
    const ids = Array.isArray(payload.userIds) ? payload.userIds : [];
    return ids.filter(id => id !== req.user?.userId);
  }
};

export const getDeletionImpact = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can perform this action' });
    }

    const targetUserIds = await getTargetUserIds(req, req.body);
    if (targetUserIds.length === 0) {
      return res.status(400).json({ message: 'No users to delete' });
    }

    const impact = {
      users: 0,
      teachers: 0,
      courses: 0,
      enrollments: 0,
      examAttempts: 0,
      payments: 0,
      submissions: 0,
      attendances: 0,
      emails: [] as string[]
    };

    const users = await db.user.findMany({
      where: { id: { in: targetUserIds } },
      select: {
        role: true,
        email: true,
        _count: {
          select: {
            taughtCourses: true,
            enrollments: true,
            examAttempts: true,
            payments: true,
            submissions: true,
            attendances: true,
          }
        }
      }
    });

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      impact.users++;
      if (u.role === 'TEACHER') impact.teachers++;
      impact.courses += u._count.taughtCourses;
      impact.enrollments += u._count.enrollments;
      impact.examAttempts += u._count.examAttempts;
      impact.payments += u._count.payments;
      impact.submissions += u._count.submissions;
      impact.attendances += u._count.attendances;
      
      if (impact.emails.length < 10) {
        impact.emails.push(u.email);
      }
    }

    res.json(impact);
  } catch (error: any) {
    res.status(500).json({ message: 'Error calculating impact', error: error.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }
    const { id } = req.params;
    
    await db.$transaction(async (tx) => {
        if (id === req.user?.userId) {
            throw new Error('Cannot delete your own account');
        }
        
        const user = await tx.user.findUnique({ where: { id }, select: { role: true } });
        if (!user) throw new Error('User not found');
        
        if (user.role === 'ADMIN') {
            const totalAdmins = await tx.user.count({ where: { role: 'ADMIN' } });
            if (totalAdmins <= 1) throw new Error('Cannot delete the last remaining admin account');
        }
        
        await tx.user.updateMany({
            where: { parentId: id },
            data: { parentId: null }
        });
        
        await tx.user.delete({ where: { id } });
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

export const bulkDeleteUsers = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }
    
    const targetUserIds = await getTargetUserIds(req, req.body);
    if (targetUserIds.length === 0) {
      return res.status(400).json({ message: 'No users to delete' });
    }
    
    let deletedCount = 0;
    
    await db.$transaction(async (tx) => {
        const usersToDelete = await tx.user.findMany({
            where: { id: { in: targetUserIds } },
            select: { id: true, role: true }
        });
        
        const adminCountToDelete = usersToDelete.filter(u => u.role === 'ADMIN').length;
        if (adminCountToDelete > 0) {
            const totalAdmins = await tx.user.count({ where: { role: 'ADMIN' } });
            if (totalAdmins <= adminCountToDelete) {
                throw new Error('Cannot delete the last remaining admin account(s)');
            }
        }
        
        await tx.user.updateMany({
            where: { parentId: { in: targetUserIds } },
            data: { parentId: null }
        });
        
        const result = await tx.user.deleteMany({
            where: { id: { in: targetUserIds } }
        });
        
        deletedCount = result.count;
    });
    
    res.json({ message: 'Users deleted successfully', count: deletedCount });
  } catch (error: any) {
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error deleting users', error: error.message });
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
