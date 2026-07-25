import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import bcrypt from 'bcryptjs';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        parentId: true,
        centerGroupId: true,
      }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, parentId, centerGroupId, parentName, parentEmail, parentPassword } = req.body;
    
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

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(400).json({ message: 'البيانات المرتبطة غير موجودة (مثل: معرف السنتر أو معرف ولي الأمر خاطئ)' });
    }
    console.error('CRITICAL: Error creating user', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, parentId, centerGroupId, password } = req.body;
    
    let updateData: any = {
      name,
      email,
      role,
      ...(role === 'PARENT' && parentId ? { children: { connect: { id: parentId } } } : {}),
      ...(role === 'CENTER_STUDENT' && centerGroupId ? { centerGroup: { connect: { id: centerGroupId } } } : {}),
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData
    });

    res.json({ message: 'User updated successfully', user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(400).json({ message: 'البيانات المرتبطة غير موجودة (مثل: معرف السنتر أو معرف ولي الأمر خاطئ)' });
    }
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
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
