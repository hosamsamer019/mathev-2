import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification
} from '../controllers/notification.controller.js';

const router = Router();

router.get('/unread-count', verifyToken, getUnreadCount);
router.get('/', verifyToken, getNotifications);
router.post('/', verifyToken, createNotification);
router.put('/read-all', verifyToken, markAllAsRead);
router.patch('/read-all', verifyToken, markAllAsRead);
router.put('/:id/read', verifyToken, markAsRead);
router.patch('/:id/read', verifyToken, markAsRead);

export default router;
