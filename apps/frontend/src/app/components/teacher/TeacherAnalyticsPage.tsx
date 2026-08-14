import { useState, useEffect } from 'react';
import { TrendingUp, Brain, Download, Calendar, AlertTriangle, Award, Target } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  Radar, AreaChart, Area, ScatterChart, Scatter, Cell
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsService } from '../../services/analytics.service';

const monthlyTrend = [
  { month: 'سبتمبر', avg: 68, passed: 75, failed: 25 },
  { month: 'أكتوبر', avg: 72, passed: 80, failed: 20 },
  { month: 'نوفمبر', avg: 75, passed: 83, failed: 17 },
  { month: 'ديسمبر', avg: 71, passed: 78, failed: 22 },
  { month: 'يناير', avg: 78, passed: 87, failed: 13 },
  { month: 'فبراير', avg: 82, passed: 90, failed: 10 },
  { month: 'مارس', avg: 79, passed: 88, failed: 12 },
  { month: 'أبريل', avg: 84, passed: 92, failed: 8 },
];

const subjectRadar = [
  { subject: 'الجبر', A: 85, B: 70 },
  { subject: 'الهندسة', A: 76, B: 65 },
  { subject: 'التفاضل', A: 71, B: 60 },
  { subject: 'الإحصاء', A: 88, B: 75 },
  { subject: 'المثلثات', A: 82, B: 68 },
];

const homeworkCompletion = [
  { week: 'أسبوع ١', completed: 92, missed: 8 },
  { week: 'أسبوع ٢', completed: 88, missed: 12 },
  { week: 'أسبوع ٣', completed: 95, missed: 5 },
  { week: 'أسبوع ٤', completed: 85, missed: 15 },
  { week: 'أسبوع ٥', completed: 90, missed: 10 },
  { week: 'أسبوع ٦', completed: 93, missed: 7 },
];

const predictions = [
  { name: 'أحمد محمد', current: 88, predicted: 92, trend: '+4', risk: 'منخفض' },
  { name: 'سارة خالد', current: 76, predicted: 80, trend: '+4', risk: 'منخفض' },
  { name: 'محمود عبدالرحمن', current: 45, predicted: 38, trend: '-7', risk: 'عالي' },
  { name: 'فاطمة إبراهيم', current: 92, predicted: 95, trend: '+3', risk: 'منخفض' },
  { name: 'كريم عمر', current: 62, predicted: 68, trend: '+6', risk: 'متوسط' },
];

export default function TeacherAnalyticsPage() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      analyticsService.getTeacherAnalytics(user.id)
        .then(res => setAnalyticsData(res.data))
        .catch(err => console.error('Failed to fetch analytics', err));
    }
  }, [user]);

  const defaultData = {
    kpis: [
      { label: 'إجمالي الطلاب', value: '٠', change: '+٠' },
      { label: 'متوسط الدرجات', value: '٠٪', change: '+٠' },
      { label: 'الدورات النشطة', value: '٠', change: '+٠' },
      { label: 'طلاب في خطر', value: '٠', change: '٠' },
    ],
    monthlyTrend,
    subjectRadar,
    homeworkCompletion,
    predictions
  };

  const displayData = analyticsData ? {
    kpis: [
      { label: 'إجمالي الطلاب', value: analyticsData.totalStudents?.toString() || '٠', change: '+٠' },
      { label: 'متوسط الدرجات', value: `${analyticsData.averageScore || 0}٪`, change: '+٠' },
      { label: 'الدورات النشطة', value: analyticsData.totalCourses?.toString() || '٠', change: '+٠' },
      { label: 'طلاب في خطر', value: analyticsData.strugglingStudents?.toString() || '٠', change: '٠' },
    ],
    monthlyTrend,
    subjectRadar, // Should ideally map subjectPerformance here, but keeping default layout
    homeworkCompletion,
    predictions
  } : defaultData;

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const tooltipStyle = { background: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: 12 };

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>التحليلات والتقارير</h1>
          <p className={textSecondary}>رؤى عميقة مدعومة بالذكاء الاصطناعي لأداء طلابك</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-700">
            {['month', 'quarter', 'year'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : `${textSecondary}`
                }`}
              >
                {p === 'month' ? 'شهر' : p === 'quarter' ? 'ربع' : 'سنة'}
              </button>
            ))}
          </div>
          <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'} hover:bg-gray-50 dark:hover:bg-gray-700`}>
            <Download className="w-4 h-4" /> تصدير PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: displayData.kpis[0].label, value: displayData.kpis[0].value, change: displayData.kpis[0].change, icon: Award, color: 'from-green-500 to-emerald-600' },
          { label: displayData.kpis[1].label, value: displayData.kpis[1].value, change: displayData.kpis[1].change, icon: TrendingUp, color: 'from-blue-500 to-indigo-600' },
          { label: displayData.kpis[2].label, value: displayData.kpis[2].value, change: displayData.kpis[2].change, icon: Target, color: 'from-purple-500 to-violet-600' },
          { label: displayData.kpis[3].label, value: displayData.kpis[3].value, change: displayData.kpis[3].change, icon: AlertTriangle, color: 'from-orange-500 to-red-500' },
        ].map((kpi, idx) => (
          <div key={idx} className={`${cardBg} border rounded-2xl p-5`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}>
              <kpi.icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-sm ${textSecondary}`}>{kpi.label}</p>
            <div className="flex items-end gap-2 mt-1">
              <span className={`text-2xl font-bold ${textPrimary}`}>{kpi.value}</span>
              <span className={`text-sm font-medium mb-0.5 ${kpi.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Trend */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>اتجاه الأداء الشهري</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={displayData.monthlyTrend}>
              <defs>
                <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="month" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <YAxis domain={[50, 100]} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="avg" stroke="#10b981" fill="url(#avgGrad)" strokeWidth={3} name="المتوسط" />
              <Line type="monotone" dataKey="passed" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="نسبة النجاح" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Radar - Subjects */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>المقارنة بين المواد (رادار)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={displayData.subjectRadar}>
              <PolarGrid stroke={isDark ? '#374151' : '#e5e7eb'} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <Radar name="الفصل الحالي" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Radar name="الفصل الماضي" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Homework Completion */}
      <div className={`${cardBg} border rounded-2xl p-6 mb-6`}>
        <h2 className={`font-bold ${textPrimary} mb-6`}>معدل إنجاز الواجبات الأسبوعي</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={displayData.homeworkCompletion}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
            <XAxis dataKey="week" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} name="مكتمل" />
            <Bar dataKey="missed" fill="#ef4444" radius={[6, 6, 0, 0]} name="غائب" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Predictions */}
      <div className={`${cardBg} border rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className={`font-bold ${textPrimary}`}>توقعات الذكاء الاصطناعي</h2>
            <p className={`text-sm ${textSecondary}`}>توقع أداء الطلاب في الفصل القادم</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                {['الطالب', 'الدرجة الحالية', 'الدرجة المتوقعة', 'التغيير', 'مستوى الخطر'].map((h) => (
                  <th key={h} className={`py-3 px-4 text-right text-xs font-semibold ${textSecondary}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.predictions.map((p: any, idx: number) => (
                <tr key={idx} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} last:border-0`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <span className={`text-sm font-medium ${textPrimary}`}>{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-bold ${textPrimary}`}>{p.current}٪</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-bold ${p.predicted > p.current ? 'text-green-600' : 'text-red-600'}`}>
                      {p.predicted}٪
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-bold ${p.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                      {p.trend}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      p.risk === 'عالي' ? 'bg-red-100 text-red-700' :
                      p.risk === 'متوسط' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {p.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
