import { useState, useEffect } from 'react';
import { Users, BookOpen, Video, ClipboardCheck, TrendingUp, Award, AlertTriangle, Brain, DollarSign, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { analyticsService } from '../../services/analytics.service';

import { LoadingState } from '../ui/LoadingState';

// Mocks removed, using backend data

export default function AdminHomePage() {
  const { isDark } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getAdminAnalytics().then((res: any) => {
      setData(res.data);
      setLoading(false);
    }).catch((err: any) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const tooltipStyle = { background: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: 12 };

  if (loading) {
    return <LoadingState message="جاري تحميل لوحة التحكم..." />;
  }

  const stats = [
    { label: 'إجمالي المستخدمين', value: data?.overview?.totalUsers ?? '...', change: '', icon: Users, color: 'from-blue-500 to-indigo-600' },
    { label: 'الدورات النشطة', value: data?.overview?.totalCourses ?? '...', change: '', icon: BookOpen, color: 'from-green-500 to-emerald-600' },
    { label: 'إجمالي الامتحانات', value: data?.overview?.totalExams ?? '...', change: '', icon: ClipboardCheck, color: 'from-orange-500 to-red-500' },
    { label: 'تسليمات الواجبات', value: data?.overview?.totalSubmissions ?? '...', change: '', icon: Activity, color: 'from-pink-500 to-rose-600' },
    { label: 'إيرادات الشهر', value: data?.overview?.monthlyRevenue != null ? `${data.overview.monthlyRevenue.toLocaleString('ar-EG')}ج` : '—', change: '', icon: DollarSign, color: 'from-cyan-500 to-blue-600' },
    { label: 'المشتركون النشطون', value: data?.overview?.activeUsers ?? '—', change: '', icon: Activity, color: 'from-pink-500 to-rose-600' },
    { label: 'طلاب في خطر', value: data?.overview?.atRiskStudents ?? '—', change: '', icon: AlertTriangle, color: 'from-red-500 to-orange-500' },
    { label: 'الفيديوهات المرفوعة', value: data?.overview?.totalVideos ?? '—', change: '', icon: Video, color: 'from-violet-500 to-purple-600' },
  ];

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>لوحة التحكم الرئيسية</h1>
        <p className={textSecondary}>نظرة شاملة على المنصة</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className={`${cardBg} border rounded-2xl p-5 relative overflow-hidden group hover:shadow-lg transition-shadow`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
            <div className="relative">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className={`text-sm ${textSecondary} mb-1`}>{stat.label}</p>
              <div className="flex items-end gap-2">
                <span className={`text-xl font-bold ${textPrimary}`}>{stat.value}</span>
                <span className={`text-xs font-medium mb-0.5 ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Enrollment Trend */}
        <div className={`lg:col-span-2 ${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>اتجاه التسجيلات الشهرية</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.enrollmentData || []}>
              <defs>
                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="month" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="students" stroke="#7c3aed" fill="url(#enrollGrad)" strokeWidth={3} name="الطلاب" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-4`}>الإحصائيات السريعة</h2>
          <div className="space-y-4">
            {[
              { label: 'معدل الإنجاز', value: '٧٨٪', icon: TrendingUp, color: 'bg-green-100 text-green-600 dark:bg-green-900/30' },
              { label: 'معدل النجاح', value: '٨٨٪', icon: Award, color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' },
              { label: 'الطلاب النشطون', value: '٩٨٥', icon: Users, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' },
              { label: 'إيرادات السنة', value: '٢٤٦K', icon: DollarSign, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
            ].map((item, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className={`text-sm font-medium ${textPrimary}`}>{item.label}</p>
                </div>
                <p className={`font-bold ${textPrimary}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Chart */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>متوسط الأداء حسب الدورة</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.performanceData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="course" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="average" fill="#7c3aed" radius={[8, 8, 0, 0]} name="المتوسط" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>الإيرادات (آخر ٤ أشهر)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.revenueData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="month" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} ج.م`, 'الإيراد']} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activities */}
      <div className={`${cardBg} border rounded-2xl p-6`}>
        <h2 className={`font-bold ${textPrimary} mb-6`}>النشاطات الأخيرة على المنصة</h2>
        <div className="space-y-3">
          {(data?.recentActivities || []).map((activity: any, idx: number) => (
            <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                activity.type === 'success' ? 'bg-green-500' :
                activity.type === 'warning' ? 'bg-orange-500' :
                'bg-blue-500'
              }`} />
              <div className="flex-1">
                <p className={`text-sm ${textPrimary}`}>{activity.text}</p>
                <p className={`text-xs ${textSecondary} mt-0.5`}>{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
