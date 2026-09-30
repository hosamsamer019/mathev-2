import { useEffect, useState, useRef } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, BookOpen, X, Loader2 } from 'lucide-react';
import { notificationService, Notification } from '../../services/notification.service';

const iconMap: Record<string, any> = {
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  warning: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  course: { icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
};

interface NotificationsPanelProps {
  onClose: () => void;
  isDark: boolean;
  onUnreadCountChange?: () => void;
}

export default function NotificationsPanel({ onClose, isDark, onUnreadCountChange }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        const trigger = (event.target as Element)?.closest('[aria-label="الإشعارات"]');
        if (trigger) return;
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('touchstart', handleClickOutside, { passive: true });
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications({ limit: 50 });
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
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n));
      onUnreadCountChange?.();
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      onUnreadCountChange?.();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={panelRef}
      className={`fixed top-16 end-3 sm:end-0 sm:absolute sm:top-full sm:mt-2 w-[min(calc(100vw-1.5rem),320px)] sm:w-80 md:w-84 rounded-2xl shadow-xl border z-50 overflow-hidden flex flex-col max-h-[min(38dvh,280px)] md:max-h-[min(48dvh,380px)] animate-in fade-in slide-in-from-top-1 duration-150 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className={`px-3.5 py-2.5 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>الإشعارات</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.2 rounded-full font-bold">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className={`text-[11px] px-2 py-0.5 rounded-md transition-colors font-medium ${isDark ? 'text-indigo-400 hover:bg-indigo-900/30' : 'text-indigo-600 hover:bg-indigo-50'}`}
            >
              تحديد الكل كمقروء
            </button>
          )}
          <button
            onClick={onClose}
            className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            aria-label="إغلاق الإشعارات"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications List with independent scrolling */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60 min-h-0">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">لا توجد إشعارات حالياً</div>
        ) : notifications.map((notification) => {
          const typeKey = notification.type || 'info';
          const { icon: Icon, color, bg } = iconMap[typeKey] || iconMap['info'];
          return (
            <div
              key={notification.id}
              onClick={() => markAsRead(notification.id, notification.read)}
              className={`px-3.5 py-2.5 flex items-start gap-2.5 cursor-pointer transition-colors ${
                isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
              } ${!notification.read ? (isDark ? 'bg-indigo-900/15' : 'bg-indigo-50/60') : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0" />
                  )}
                </div>
                <p className={`text-[11px] mt-0.5 line-clamp-2 leading-tight ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {notification.message}
                </p>
                <p className={`text-[9px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {new Date(notification.createdAt).toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`px-3.5 py-2 border-t flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
        <button
          onClick={onClose}
          className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}

