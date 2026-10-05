import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../../../packages/database/src/index.js';
import { sendEmail, buildPasswordResetEmail } from '../services/email.service.js';
import { isValidAcademicProfile, blocklistToken, isTokenBlocklisted, setPasswordResetToken, getPasswordResetEmail, deletePasswordResetToken } from '@shared/utils';

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

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string().min(6, 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف')
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

    // Short-lived access token (15 minutes)
    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
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
  try {
    const token = req.cookies?.refreshToken;
    if (token && process.env.REFRESH_TOKEN_SECRET) {
      try {
        const decoded: any = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        if (decoded?.jti) {
          const remainingSecs = Math.max(60, Math.floor(((decoded.exp || 0) * 1000 - Date.now()) / 1000));
          await blocklistToken(decoded.jti, remainingSecs);
        }
      } catch {
        // Token already invalid or expired
      }
    }
  } catch (err) {
    console.error('Logout token blocklist error:', err);
  }
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
    if (!decoded?.userId) return res.status(401).json({ message: 'Invalid token' });

    // Check if token JTI is blocklisted in Redis
    if (decoded.jti && (await isTokenBlocklisted(decoded.jti))) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Refresh token has been revoked' });
    }

    const user = await db.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ message: 'User not found' });

    // Invalidate old JTI upon rotation
    if (decoded.jti) {
      const remainingSecs = Math.max(60, Math.floor(((decoded.exp || 0) * 1000 - Date.now()) / 1000));
      await blocklistToken(decoded.jti, remainingSecs);
    }

    const newToken = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
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

    // Store token in Redis (or memory fallback) with 1 hour expiration
    await setPasswordResetToken(tokenHash, user.email, 3600);

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
    const email = await getPasswordResetEmail(tokenHash);

    if (!email) {
      return res.status(400).json({ message: 'Reset token is invalid or has expired.' });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Invalidate the token after single use
    await deletePasswordResetToken(tokenHash);

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export function getSecureClientIp(req: Request): string {
  const remoteAddress = req.socket?.remoteAddress || '';
  const isLoopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress);

  if (isLoopback) {
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp && typeof cfIp === 'string') return cfIp;

    const realIp = req.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') return realIp;

    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor && typeof forwardedFor === 'string') {
      const parts = forwardedFor.split(',');
      const clientIp = parts[0].trim();
      if (clientIp) return clientIp;
    }
  }

  return req.ip || remoteAddress || '127.0.0.1';
}

export const validateGuestExamCode = async (req: Request, res: Response) => {
  try {
    const parsed = z.object({
      name: z.string().trim().min(2, 'الاسم يجب أن يكون ثنائياً على الأقل'),
      phone: z.string().trim().optional().nullable(),
      code: z.string().trim().optional(),
      examCode: z.string().trim().optional()
    }).refine(data => Boolean(data.code || data.examCode), {
      message: 'كود الدخول مطلوب'
    }).parse(req.body);

    const inputCode = (parsed.code || parsed.examCode || '').trim().toUpperCase();

    // Query Assessment by Exam Code
    const assessment = await db.assessment.findUnique({
      where: { examAccessCode: inputCode }
    });

    if (!assessment || !assessment.allowExternalStudents) {
      return res.status(404).json({ message: 'كود الدخول غير صحيح أو غير متاح حالياً للطلاب الخارجيين' });
    }

    const now = new Date();
    if (assessment.openAt && now < new Date(assessment.openAt)) {
      return res.status(400).json({
        message: 'الامتحان لم يبدأ بعد',
        code: 'ASSESSMENT_NOT_OPEN',
        openAt: assessment.openAt
      });
    }
    if (assessment.closeAt && now >= new Date(assessment.closeAt)) {
      return res.status(400).json({
        message: 'لقد انتهى وقت صلاحية كود الامتحان',
        code: 'ASSESSMENT_CLOSED',
        closeAt: assessment.closeAt
      });
    }
    if (assessment.status !== 'PUBLISHED') {
      return res.status(400).json({ message: 'هذا الامتحان غير متاح حالياً' });
    }

    const studentName = parsed.name.trim();
    const studentPhone = parsed.phone ? parsed.phone.trim() : null;

    // Check if external attempt already exists
    let attempt = await db.externalExamAttempt.findFirst({
      where: {
        assessmentId: assessment.id,
        studentName,
        phone: studentPhone
      }
    });

    if (attempt) {
      if (['SUBMITTED', 'GRADED', 'TIME_EXPIRED', 'CHEATING'].includes(attempt.status) || attempt.cheatingDetected) {
        return res.status(403).json({ message: 'لقد قمت بتسليم هذا الامتحان بالفعل' });
      }
    } else {
      // Create new external exam attempt
      const sessionUuid = crypto.randomUUID();
      attempt = await db.externalExamAttempt.create({
        data: {
          assessmentId: assessment.id,
          studentName,
          phone: studentPhone,
          accessSessionId: sessionUuid,
          status: 'STARTED',
          answers: []
        }
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    // Sign scoped Guest JWT
    const token = jwt.sign(
      { 
        isExternalStudent: true, 
        assessmentId: assessment.id, 
        externalSessionId: attempt.accessSessionId,
        role: 'EXTERNAL_STUDENT'
      },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    res.json({
      token,
      assessmentId: assessment.id,
      user: {
        id: 'external',
        name: attempt.studentName,
        email: 'external@alsaden.com',
        role: 'EXTERNAL_STUDENT',
        isGuest: true
      }
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Guest validation error:', error);
    res.status(500).json({ message: 'حدث خطأ في معالجة طلبك، يرجى المحاولة مرة أخرى لاحقاً' });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'غير مصرح لك بإجراء هذه العملية' });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Invalidate refresh token session in Redis / JTI if present
    try {
      const token = req.cookies?.refreshToken;
      if (token && process.env.REFRESH_TOKEN_SECRET) {
        try {
          const decoded: any = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
          if (decoded?.jti) {
            const remainingSecs = Math.max(60, Math.floor(((decoded.exp || 0) * 1000 - Date.now()) / 1000));
            await blocklistToken(decoded.jti, remainingSecs);
          }
        } catch {
          // Token already invalid or expired
        }
      }
    } catch (err) {
      console.error('Password change token blocklist error:', err);
    }

    res.clearCookie('refreshToken');

    return res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('changePassword error:', error);
    return res.status(500).json({ message: 'حدث خطأ في الخادم أثناء تغيير كلمة المرور' });
  }
};

