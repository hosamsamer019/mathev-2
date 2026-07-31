import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redis: Redis | null = null;

try {
  redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 1 });
  redis.on('error', (err) => {
    console.error('Redis connection error in Auth service:', err.message);
    redis = null;
  });
} catch (error) {
  console.error('Failed to initialize Redis in Auth service');
}

// Fallback in-memory store if Redis is unavailable
const fallbackStore = new Map<string, { count: number; resetTime: number }>();

export const loginRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  // In development/test environments, bypass rate limiting to not block automated tests
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `rate-limit:auth:${ip}`;
  const limit = 5; // 5 requests per 15 minutes
  const windowMs = 15 * 60 * 1000;

  try {
    if (redis) {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }
      
      if (current > limit) {
        return res.status(429).json({ message: 'Too many login attempts, please try again later.' });
      }
    } else {
      const now = Date.now();
      let record = fallbackStore.get(key);
      
      if (!record || record.resetTime < now) {
        record = { count: 1, resetTime: now + windowMs };
      } else {
        record.count += 1;
      }
      
      fallbackStore.set(key, record);
      
      if (record.count > limit) {
        return res.status(429).json({ message: 'Too many login attempts, please try again later.' });
      }
    }
    
    next();
  } catch (error) {
    // Failsafe: allow request if rate limiter fails internally
    console.error('Rate limiter error:', error);
    next();
  }
};
