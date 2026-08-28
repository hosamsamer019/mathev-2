import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    email: string;
    isGuest?: boolean;
    guestAssessmentId?: string;
    isExternalStudent?: boolean;
    assessmentId?: string;
    externalSessionId?: string;
  };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    req.user = decoded;

    // Enforce guest access scope
    if (decoded.isGuest && decoded.guestAssessmentId) {
      const isAssessmentsEndpoint = req.baseUrl === '/api/assessments' || req.originalUrl.startsWith('/api/assessments');
      const isExamsEndpoint = req.baseUrl === '/api/exams' || req.originalUrl.startsWith('/api/exams');
      const targetId = decoded.guestAssessmentId;
      const isMatchingAssessment = targetId && (req.originalUrl.includes(targetId) || req.params?.id === targetId || req.params?.assessmentId === targetId);
      
      if ((!isAssessmentsEndpoint && !isExamsEndpoint) || !isMatchingAssessment) {
        return res.status(403).json({ message: 'Forbidden: Guest accounts have strictly scoped exam access.' });
      }
    }

    // Enforce external student access scope
    if (decoded.isExternalStudent) {
      const isAssessmentsEndpoint = req.baseUrl === '/api/assessments' || req.originalUrl.startsWith('/api/assessments');
      const isExamsEndpoint = req.baseUrl === '/api/exams' || req.originalUrl.startsWith('/api/exams');
      const targetId = decoded.assessmentId || decoded.guestAssessmentId;
      const isMatchingAssessment = targetId && (req.originalUrl.includes(targetId) || req.params?.id === targetId || req.params?.assessmentId === targetId);
      
      if ((!isAssessmentsEndpoint && !isExamsEndpoint) || !isMatchingAssessment) {
        return res.status(403).json({ message: 'Forbidden: External student accounts have strictly scoped exam access.' });
      }
    }

    next();
  } catch (error) {
    console.error('verifyToken Error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const checkRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = (req.user?.role || '').toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());
    
    if (!req.user || !userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Permission denied. Insufficient role.' });
    }
    next();
  };
};
