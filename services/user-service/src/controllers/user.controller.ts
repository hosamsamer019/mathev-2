import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    let whereClause = {};
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole === 'TEACHER') {
      whereClause = {
        enrollments: {
          some: {
            course: {
              teacherId: req.user?.userId
            }
          }
        }
      };
    }
    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        parentId: true,
        centerGroupId: true,
        attendances: {
          select: { status: true }
        }
      }
    });

    const mappedUsers = users.map(user => {
      let attendancePercentage = null;
      if (user.attendances && user.attendances.length > 0) {
        const presentCount = user.attendances.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
        attendancePercentage = Math.round((presentCount / user.attendances.length) * 100);
      }
      const { attendances, ...rest } = user;
      return { ...rest, attendancePercentage };
    });

    res.json(mappedUsers);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'TEACHER', 'ONLINE_STUDENT', 'CENTER_STUDENT', 'PARENT']),
  parentId: z.string().uuid().optional().nullable(),
  centerGroupId: z.string().uuid().optional().nullable(),
  parentName: z.string().optional().nullable(),
  parentEmail: z.string().email().optional().nullable(),
  parentPassword: z.string().min(6).optional().nullable()
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'ONLINE_STUDENT', 'CENTER_STUDENT', 'PARENT']).optional(),
  parentId: z.string().uuid().optional().nullable(),
  centerGroupId: z.string().uuid().optional().nullable()
});

const sanitizeUser = (user: any) => {
  const { password, ...rest } = user;
  return rest;
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    const { name, email, password, role, parentId, centerGroupId, parentName, parentEmail, parentPassword } = validatedData;
    
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
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
        role,
        ...(resolvedParentId ? { parent: { connect: { id: resolvedParentId } } } : {}),
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

    const validatedData = updateUserSchema.parse(req.body);
    const { name, email, role, parentId, centerGroupId, password } = validatedData;
    
    let updateData: any = {
      name,
      email,
      ...(requesterRole === 'ADMIN' && role ? { role } : {}),
      ...(role === 'PARENT' && parentId ? { children: { connect: { id: parentId } } } : {}),
      ...(role === 'CENTER_STUDENT' && centerGroupId ? { centerGroup: { connect: { id: centerGroupId } } } : {}),
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
        createdAt: true
      }
    });
    res.json(children);
  } catch (error: any) {
    console.error('Error fetching parent children:', error);
    res.status(500).json({ message: 'Error fetching children', error: error.message });
  }
};
