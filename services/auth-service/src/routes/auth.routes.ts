import { Router } from 'express';
import { login, register, getMe, logout, refreshToken, forgotPassword, resetPassword, loginSchema, registerSchema } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { loginRateLimiter, registerRateLimiter, passwordResetLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '@shared/utils';

const router = Router();

router.post('/register', registerRateLimiter, validate(registerSchema), register);
router.post('/login', loginRateLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.get('/me', verifyToken, getMe);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);

export default router;
