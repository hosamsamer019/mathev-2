import { Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { z } from 'zod';

const createNotificationSchema = z.object({
  recipientId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.string().default('info'),
  metadata: z.any().optional(),
  expiresAt: z.string().datetime().optional()
});

/**
 * GET /api/notifications
 * List current authenticated user's notifications (persisted, filtered by expiration, ordered by newest)
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const now = new Date();
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const unreadOnly = req.query.unread === 'true';

    const whereClause: any = {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    };

    if (unreadOnly) {
      whereClause.read = false;
    }

    const notifications = await db.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns real unread notification count for the authenticated user
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const now = new Date();
    const unreadCount = await db.notification.count({
      where: {
        userId,
        read: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      }
    });

    res.json({ unreadCount });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching unread notification count', error: error.message });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read (with IDOR protection and readAt timestamp)
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    
    // Strict IDOR check: Users can only mark their own notifications as read
    if (notification.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden: Cannot access another user\'s notification' });
    }

    const now = new Date();
    const updated = await db.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: notification.readAt || now
      }
    });

    res.json({ message: 'Marked as read', notification: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all unread notifications for the authenticated user as read
 */
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const now = new Date();
    const result = await db.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true,
        readAt: now
      }
    });

    res.json({ message: 'All notifications marked as read', count: result.count });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
};

/**
 * POST /api/notifications
 * Create a new notification (for system/admin or authorized users)
 */
export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    const requesterId = req.user?.userId;
    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    const validated = createNotificationSchema.parse(req.body);
    const targetUserId = validated.recipientId || validated.userId || requesterId;

    // RBAC: Only Admin or Teacher can create notifications for other users
    if (targetUserId !== requesterId && requesterRole !== 'ADMIN' && requesterRole !== 'TEACHER') {
      return res.status(403).json({ message: 'Forbidden: Cannot create notifications for other users' });
    }

    const notification = await db.notification.create({
      data: {
        userId: targetUserId,
        title: validated.title,
        message: validated.message,
        type: validated.type,
        metadata: validated.metadata || null,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null
      }
    });

    res.status(201).json(notification);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
};

