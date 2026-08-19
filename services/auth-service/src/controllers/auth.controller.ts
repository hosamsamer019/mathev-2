import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../../../packages/database/src/index.js';
import { sendEmail, buildPasswordResetEmail } from '../services/email.service.js';
import { isValidAcademicProfile } from '@shared/utils';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ONLINE_STUDENT', 'CENTER_STUDENT', 'TEACHER', 'ADMIN', 'PARENT']),
  country: z.string().optional(),
  educationLevel: z.string().optional(),
  gradeLevel: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.enum(['ONLINE_STUDENT', 'CENTER_STUDENT', 'TEACHER', 'ADMIN', 'PARENT'])
});

export const register = async (req: Request, res: Response) => {
  return res.status(403).json({ 
    message: 'Public registration is disabled. Please contact an administrator to create an account.' 
  });
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as any;

    const user = await db.user.findFirst({
      where: { 
        email: validatedData.email,
        role: validatedData.role as any
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

    if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      throw new Error('FATAL ERROR: JWT_SECRET or REFRESH_TOKEN_SECRET is not defined');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const jti = crypto.randomUUID();
    const refreshToken = jwt.sign(
      { userId: user.id, jti },
      process.env.REFRESH_TOKEN_SECRET,
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
        role: user.role,
        academicLevel: user.academicLevel,
        country: user.country,
        educationLevel: user.educationLevel,
        gradeLevel: user.gradeLevel,
        language: user.language
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
      where: { id: req.user?.userId },
      select: { id: true, name: true, email: true, role: true, academicLevel: true, country: true, educationLevel: true, gradeLevel: true, language: true, phone: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      ...user,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      throw new Error('FATAL ERROR: Secrets not defined');
    }

    const decoded: any = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await db.user.findUnique({ where: { id: decoded.userId } });

    if (!user) return res.status(401).json({ message: 'User not found' });

    // In a production environment with Redis, we would check if decoded.jti is in the blocklist here.
    // If it is, we would revoke all tokens for this user.
    // For now, we prepare the architecture by generating a new JTI and overwriting the cookie (Rotation).

    const newToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Shortened access token lifespan
    );

    const newJti = crypto.randomUUID();
    const newRefreshToken = jwt.sign(
      { userId: user.id, jti: newJti },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RESET FLOW
// ─────────────────────────────────────────────────────────────────────────────

// In-memory reset token store (use Redis in production for multi-instance)
// Token format: { email, hashedToken, expiresAt }
const resetTokenStore = new Map<string, { email: string; expiresAt: number }>();

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await db.user.findUnique({ where: { email } });

    // Always respond 200 — prevents email enumeration attacks
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    resetTokenStore.set(tokenHash, {
      email: user.email,
      expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
    });

    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${CLIENT_URL}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: 'إعادة تعيين كلمة المرور - Smart Math Platform',
      html: buildPasswordResetEmail(user.name, resetUrl)
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('forgotPassword error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = z.object({
      token: z.string().min(64),
      password: z.string().min(6)
    }).parse(req.body);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = resetTokenStore.get(tokenHash);

    if (!record || record.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Reset token is invalid or has expired.' });
    }

    const user = await db.user.findUnique({ where: { email: record.email } });
    if (!user) {
      return res.status(400).json({ message: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Invalidate the token after use
    resetTokenStore.delete(tokenHash);

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
