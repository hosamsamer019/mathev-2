import { Router } from 'express';
import { login, register, getMe, logout, refreshToken, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/register', loginRateLimiter, register);
router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.get('/me', verifyToken, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
