import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../../../packages/database/src/index.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['student_online', 'student_center', 'teacher', 'admin', 'parent'])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.enum(['student_online', 'student_center', 'teacher', 'admin', 'parent'])
});

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body) as any;
    
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    const newUser = await db.user.create({
      data: {
        ...validatedData,
        password: hashedPassword
      }
    });

    res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body) as any;
    
    const user = await db.user.findFirst({
      where: { 
        email: validatedData.email,
        role: validatedData.role
      }
    });

    if (!user) {
      return res.status(401).json({ 
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET || 'refresh_secret',
      { expiresIn: '7d' }
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('🔥 CRITICAL LOGIN ERROR:', error.message);
    res.status(500).json({ message: 'Internal server error', detail: error.message });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, role: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
