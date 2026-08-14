import { useState, useEffect } from 'react';
import { TrendingUp, Clock, CheckCircle, BookOpen, Bell, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { userService } from '../../services/user.service';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import { notificationService } from '../../services/notification.service';

export default function ParentHomePage() {
  const { isDark } = useTheme();
  const [children, setChildren] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const [res, notifRes] = await Promise.all([
        userService.getChildren(),
        notificationService.getNotifications({ limit: 5 })
      ]);
      setChildren(Array.isArray(res) ? res : []);
      setNotifications(Array.isArray(notifRes.data) ? notifRes.data : []);
    } catch (err) {
      console.error('Failed to fetch children', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="جاري تحميل بيانات الأبناء..." />;
  }

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>أهلاً بك في بوابة ولي الأمر</h1>
        <p className={textSecondary}>تابع أداء وتقدم أبنائك عبر المنصة</p>
      </div>

      {children.length === 0 ? (
        <EmptyState message="لا يوجد أبناء مرتبطين بحسابك بعد" subMessage="يرجى التواصل مع الإدارة لربط حسابات أبنائك" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {children.map((child, idx) => (
            <div key={idx} className={`${cardBg} border rounded-2xl p-6 hover:shadow-lg transition-all`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {child.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className={`font-bold ${textPrimary} text-lg`}>{child.name}</h3>
                    <p className={`text-sm ${textSecondary}`}>{child.email}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <a href="/parent/children" className="text-cyan-600 hover:text-cyan-700 text-sm font-medium flex items-center gap-1">
                  عرض التقرير المفصل
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notifications */}
      <div className={`${cardBg} border rounded-2xl p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-cyan-600" />
          <h2 className={`font-bold ${textPrimary}`}>التنبيهات الأخيرة</h2>
        </div>
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className={`p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20`}>
              <p className={`text-sm font-medium ${textPrimary}`}>لا توجد إشعارات جديدة</p>
              <p className={`text-xs ${textSecondary} mt-1`}>الآن</p>
            </div>
          ) : (
            notifications.slice(0, 5).map((notif: any) => (
              <div key={notif.id} className={`p-4 rounded-xl border ${notif.read ? (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100') : (isDark ? 'bg-cyan-900/20 border-cyan-800' : 'bg-cyan-50 border-cyan-100')} transition-colors`}>
                <h3 className={`font-medium ${textPrimary}`}>{notif.title}</h3>
                <p className={`text-sm ${textSecondary} mt-1`}>{notif.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(notif.createdAt).toLocaleDateString('ar-EG')} - {new Date(notif.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
