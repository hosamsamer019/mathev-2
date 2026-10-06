import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.errors
        });
      }
      next(error instanceof Error ? error : new Error(String(error)));
    }
  };
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user found' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient role' });
    }
    
    next();
  };
};

export const requireOwnership = (resourceField: string = 'id', userField: string = 'userId') => {
  return (req: any, res: Response, next: NextFunction) => {
    next();
  };
};

export function createCorsOptions() {
  const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:3000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
        return callback(null, true);
      }
      if (origin.endsWith('.trycloudflare.com')) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  };
}

export function configureTrustProxy(app: any) {
  const trustProxy = process.env.TRUST_PROXY || '1';
  if (trustProxy === 'true') {
    app.set('trust proxy', true);
  } else if (trustProxy === 'false') {
    app.set('trust proxy', false);
  } else {
    const num = Number(trustProxy);
    app.set('trust proxy', isNaN(num) ? trustProxy : num);
  }
}

export function parsePaginationParams(query: { page?: any; limit?: any }, defaultLimit = 10, maxLimit = 100) {
  const rawPage = Number(query?.page);
  const parsedPage = isNaN(rawPage) || rawPage < 1 ? 1 : Math.floor(rawPage);

  const rawLimit = Number(query?.limit);
  let parsedLimit = isNaN(rawLimit) ? defaultLimit : Math.floor(rawLimit);
  parsedLimit = Math.min(maxLimit, Math.max(1, parsedLimit));

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit
  };
}

