import { useState, useEffect } from 'react';
import {
  Users, BookOpen, ClipboardCheck, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Star, BarChart3, ArrowUpRight, Brain, Eye, Loader2, Activity
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingState } from '../ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const analyticsApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/analytics' });
analyticsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


export default function TeacherHomePage() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [overview, setOverview] = useState<any>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    fetchOverview();
    const intervalId = setInterval(fetchOverview, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchOverview = async () => {
    try {
      if (!user) return;
      setLoading(true);
      const res = await analyticsApi.get(`/teacher/${user.id}/overview`);
      setOverview(res.data);
      
      const riskRes = await analyticsApi.get('/risk');
      setAtRiskStudents(riskRes.data.riskStudents || []);
    } catch (err) {
      console.error('Failed to fetch teacher overview', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message={t('loading')} />;
  }

  const summaryStats = overview || { totalStudents: 0, activeStudents: 0, totalCourses: 0, avgExamScore: 0 };

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>{t('welcome')} أ. {user?.name}! 👋</h1>
        <p className={textSecondary}>{new Intl.DateTimeFormat(language === 'ARABIC' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())} - {t('summary')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('students'), value: summaryStats.totalStudents, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: t('activeStudents'), value: summaryStats.activeStudents, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: t('courses'), value: summaryStats.totalCourses, icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: t('exams'), value: summaryStats.avgExamScore + '%', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((stat, idx) => (
          <div key={idx} className={`${cardBg} border rounded-2xl p-5 relative overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
            <div className="relative">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className={`text-sm ${textSecondary} mb-1`}>{stat.label}</p>
              <div className="flex items-end gap-2">
                <span className={`text-2xl font-bold ${textPrimary}`}>{stat.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly Activity Chart */}
        <div className={`lg:col-span-2 ${cardBg} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`font-bold ${textPrimary}`}>نشاط الطلاب هذا الأسبوع</h2>
            <div className="flex gap-2">
              {['week', 'month'].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    selectedPeriod === p
                      ? 'bg-emerald-600 text-white'
                      : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {p === 'week' ? 'أسبوعي' : 'شهري'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={overview?.weeklyProgress || []}>
              <defs>
                <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="centerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="day" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
              <RechartsTooltip contentStyle={{ background: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: 12 }} />
              <Area type="monotone" dataKey="online" stroke="#10b981" fill="url(#onlineGrad)" strokeWidth={2} name="أونلاين" />
              <Area type="monotone" dataKey="center" stroke="#3b82f6" fill="url(#centerGrad)" strokeWidth={2} name="سنتر" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className={`text-sm ${textSecondary}`}>طلاب أونلاين</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className={`text-sm ${textSecondary}`}>طلاب سنتر</span>
            </div>
          </div>
        </div>

        {/* Distribution Pie */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>توزيع مستويات الطلاب</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={overview?.distributionData || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {(overview?.distributionData || []).map((entry: any, index: number) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value: any) => [`${value}%`, 'النسبة']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {(overview?.distributionData || []).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className={`text-xs ${textSecondary}`}>{item.name}</span>
                </div>
                <span className={`text-xs font-bold ${textPrimary}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Subject Performance */}
        <div className={`lg:col-span-2 ${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>أداء الطلاب حسب المادة</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={overview?.subjectPerformance || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <YAxis dataKey="subject" type="category" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} width={100} />
              <RechartsTooltip contentStyle={{ background: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: 12 }} />
              <Bar dataKey="avg" fill="#10b981" radius={[0, 6, 6, 0]} name="المتوسط" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activities */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-4`}>النشاطات الأخيرة</h2>
          <div className="space-y-4">
            {(overview?.recentActivities || []).map((activity: any, idx: number) => (
              <div key={idx} className={`flex items-start gap-3 pb-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} last:border-0 last:pb-0`}>
                <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
                  <activity.icon className={`w-4 h-4 ${activity.color}`} />
                </div>
                <div>
                  <p className={`text-sm ${textPrimary}`}>{activity.text}</p>
                  <p className={`text-xs ${textSecondary} mt-0.5`}>{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-Risk Students */}
      <div className={`${cardBg} border rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className={`font-bold ${textPrimary}`}>طلاب يحتاجون متابعة عاجلة</h2>
              <p className={`text-sm ${textSecondary}`}>اكتشف الذكاء الاصطناعي هؤلاء الطلاب في خطر</p>
            </div>
          </div>
          <button className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium">
            عرض الكل <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {atRiskStudents.length === 0 ? (
            <p className={`col-span-3 text-center text-sm ${textSecondary} py-8`}>لا يوجد طلاب متعثرين حالياً</p>
          ) : atRiskStudents.slice(0, 3).map((student, idx) => (
            <div key={idx} className={`p-4 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${textPrimary}`}>{student.name}</p>
                    <p className={`text-xs ${textSecondary}`}>{student.grade}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  student.risk === 'عالي' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {student.risk}
                </span>
              </div>
              <div className={`flex items-center justify-between text-sm ${textSecondary}`}>
                <span>{student.reasons?.[0] || 'أداء ضعيف'}</span>
                <span className="font-bold text-red-500">{student.avg}٪</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${student.riskScore}%` }} />
              </div>
              <button className="mt-3 w-full text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center justify-center gap-1 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors">
                <Eye className="w-3 h-3" /> عرض الملف
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
