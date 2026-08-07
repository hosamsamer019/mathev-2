import { notificationApi } from './api';

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
}

export const notificationService = {
  getNotifications: (params?: { page?: number; limit?: number }) =>
    notificationApi.get<Notification[]>('/', { params }),

  markAsRead: (id: string) =>
    notificationApi.put(`/${id}/read`),

  markAllAsRead: () =>
    notificationApi.put('/read-all'),
};
