import { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, BookOpen, X, Loader2 } from 'lucide-react';
import { notificationApi } from '../../services/api';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'course' | string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const iconMap: Record<string, any> = {
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  warning: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  course: { icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
};

interface NotificationsPanelProps {
  onClose: () => void;
  isDark: boolean;
}

export default function NotificationsPanel({ onClose, isDark }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.get('');
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;
    try {
      await notificationApi.put(`/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className={`absolute top-full left-0 mt-2 w-80 rounded-2xl shadow-2xl border z-50 overflow-hidden ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-600" />
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>الإشعارات</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">لا توجد إشعارات حالياً</div>
        ) : notifications.map((notification) => {
          const { icon: Icon, color, bg } = iconMap[notification.type] || iconMap['info'];
          return (
            <div
              key={notification.id}
              onClick={() => markAsRead(notification.id, notification.read)}
              className={`px-4 py-3 flex items-start gap-3 border-b cursor-pointer transition-colors ${
                isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-50 hover:bg-gray-50'
              } ${!notification.read ? (isDark ? 'bg-indigo-900/10' : 'bg-indigo-50/50') : ''}`}
            >
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />
                  )}
                </div>
                <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {notification.message}
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {new Date(notification.createdAt).toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`px-4 py-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <button className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          عرض جميع الإشعارات
        </button>
      </div>
    </div>
  );
}
