import { Router } from 'express';
import { verifyToken, AuthRequest } from '../middlewares/auth.middleware.js';
import { getNotifications, markAsRead } from '../controllers/notification.controller.js';

const router = Router();

router.get('/', verifyToken, getNotifications);
router.put('/:id/read', verifyToken, markAsRead);

export default router;
