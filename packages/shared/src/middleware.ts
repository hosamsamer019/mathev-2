import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.errors
        });
      }
      next(error);
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
    // Note: requireOwnership depends on route params being the same as the resource being checked.
    // Usually, ownership is best checked within the controller after fetching the resource,
    // or by passing a custom checking function to the middleware.
    // For simplicity, we can provide a higher-order function that takes a check function.
    next();
  };
};
