import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface VideoTicketPayload {
  userId: string;
  lessonId: string;
  purpose: 'video-stream';
}

export function generateVideoTicket(params: { userId: string; lessonId: string; expiresInSeconds?: number }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');

  const payload: VideoTicketPayload = {
    userId: params.userId,
    lessonId: params.lessonId,
    purpose: 'video-stream',
  };

  return jwt.sign(payload, secret, {
    expiresIn: params.expiresInSeconds !== undefined ? params.expiresInSeconds : 14400, // 4 hours viewing session ticket
  });
}

export function verifyVideoTicket(ticket: string, expectedLessonId: string): { userId: string; lessonId: string } | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || !ticket) return null;

  try {
    const decoded = jwt.verify(ticket, secret) as any;
    if (decoded.purpose !== 'video-stream') {
      return null;
    }
    if (decoded.lessonId !== expectedLessonId) {
      return null;
    }
    return {
      userId: decoded.userId,
      lessonId: decoded.lessonId,
    };
  } catch (err) {
    return null;
  }
}
