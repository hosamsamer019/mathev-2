import { Router } from 'express';
import { 
  login, 
  register, 
  getMe, 
  logout, 
  refreshToken, 
  forgotPassword, 
  resetPassword, 
  changePassword,
  loginSchema, 
  registerSchema, 
  changePasswordSchema,
  validateGuestExamCode 
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { loginRateLimiter, registerRateLimiter, passwordResetLimiter, passwordChangeLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '@shared/utils';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'OK', service: 'Auth Service', timestamp: new Date().toISOString() }));
router.post('/register', registerRateLimiter, validate(registerSchema), register);
router.post('/login', loginRateLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.get('/me', verifyToken, getMe);
router.post('/change-password', verifyToken, passwordChangeLimiter, validate(changePasswordSchema), changePassword);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/external-exam', loginRateLimiter, validateGuestExamCode);

export default router;

