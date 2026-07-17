import { Bell, CheckCircle, AlertCircle, Info, BookOpen, X } from 'lucide-react';

interface Notification {
  id: number;
  type: 'success' | 'warning' | 'info' | 'course';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: 'success',
    title: 'تم تصحيح الواجب',
    message: 'تم تصحيح واجب الجبر وحصلت على 90/100',
    time: 'منذ 5 دقائق',
    read: false,
  },
  {
    id: 2,
    type: 'warning',
    title: 'امتحان قادم',
    message: 'امتحان التفاضل والتكامل غداً الساعة 10:00 صباحاً',
    time: 'منذ ساعة',
    read: false,
  },
  {
    id: 3,
    type: 'info',
    title: 'فيديو جديد',
    message: 'تم رفع فيديو جديد: المعادلات التفاضلية',
    time: 'منذ 3 ساعات',
    read: false,
  },
  {
    id: 4,
    type: 'course',
    title: 'دورة جديدة',
    message: 'دورة الإحصاء التطبيقي متاحة الآن',
    time: 'أمس',
    read: true,
  },
  {
    id: 5,
    type: 'success',
    title: 'إنجاز جديد!',
    message: 'حصلت على شارة "المتفوق" في امتحان الهندسة',
    time: 'أمس',
    read: true,
  },
];

const iconMap = {
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
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

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
        {MOCK_NOTIFICATIONS.map((notification) => {
          const { icon: Icon, color, bg } = iconMap[notification.type];
          return (
            <div
              key={notification.id}
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
                  {notification.time}
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
