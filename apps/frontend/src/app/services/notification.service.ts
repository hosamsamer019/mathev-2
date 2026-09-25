import { notificationApi } from './api';

export interface Notification {
  id: string;
  userId?: string;
  title?: string;
  message: string;
  read: boolean;
  readAt?: string | null;
  type?: 'success' | 'warning' | 'info' | 'course' | string;
  metadata?: any;
  expiresAt?: string | null;
  createdAt: string;
}

export const notificationService = {
  getNotifications: (params?: { limit?: number; unread?: boolean }) =>
    notificationApi.get<Notification[]>('/', { params }),

  getUnreadCount: () =>
    notificationApi.get<{ unreadCount: number }>('/unread-count'),

  markAsRead: (id: string) =>
    notificationApi.put(`/${id}/read`),

  markAllAsRead: () =>
    notificationApi.put('/read-all'),

  createNotification: (data: {
    recipientId?: string;
    userId?: string;
    title: string;
    message: string;
    type?: string;
    metadata?: any;
    expiresAt?: string;
  }) => notificationApi.post<Notification>('/', data),
};

