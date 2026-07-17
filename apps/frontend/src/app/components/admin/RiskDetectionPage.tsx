import { useState } from 'react';
import { AlertTriangle, Brain, TrendingDown, Phone, MessageCircle, Eye, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

const riskStudents = [
  {
    name: 'محمود عبدالرحمن',
    grade: 'ثانوي ٢',
    type: 'أونلاين',
    avg: 42,
    risk: 'حرج',
    riskScore: 92,
    reasons: ['غياب متكرر عن المنصة', 'أقل من ٥٠٪ في ٣ امتحانات', 'لم يسلم ٦ واجبات'],
    lastActivity: 'منذ ٥ أيام',
    trend: -12,
  },
  {
    name: 'كريم حسن',
    grade: 'ثانوي ١',
    type: 'أونلاين',
    avg: 48,
    risk: 'عالي',
    riskScore: 78,
    reasons: ['انخفاض مستمر في الدرجات', 'وقت دراسة أقل من المتوسط'],
    lastActivity: 'منذ يومين',
    trend: -8,
  },
  {
    name: 'نور محمد',
    grade: 'ثانوي ١',
    type: 'سنتر',
    avg: 55,
    risk: 'متوسط',
    riskScore: 58,
    reasons: ['تأخر في تسليم الواجبات', 'أداء ضعيف في مادة الهندسة'],
    lastActivity: 'أمس',
    trend: -3,
  },
  {
    name: 'لمياء أحمد',
    grade: 'ثانوي ٣',
    type: 'أونلاين',
    avg: 59,
    risk: 'متوسط',
    riskScore: 52,
    reasons: ['درجات متأرجحة', 'مشكلات في التفاضل'],
    lastActivity: 'اليوم',
    trend: -2,
  },
];

const riskBySubject = [
  { subject: 'التفاضل', count: 18 },
  { subject: 'الهندسة', count: 12 },
  { subject: 'الجبر', count: 8 },
  { subject: 'الإحصاء', count: 6 },
  { subject: 'المثلثات', count: 4 },
];

export default function RiskDetectionPage() {
  const { isDark } = useTheme();
  const [filter, setFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<typeof riskStudents[0] | null>(null);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const tooltipStyle = { background: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: 12 };

  const riskColors = {
    'حرج': { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700', border: 'border-red-200 dark:border-red-800' },
    'عالي': { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-700', border: 'border-orange-200' },
    'متوسط': { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-700', border: 'border-yellow-200' },
  };

  const filtered = filter === 'all' ? riskStudents : riskStudents.filter(s => s.risk === filter);

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>كشف الطلاب في خطر</h1>
            <p className={textSecondary}>نظام الذكاء الاصطناعي لاكتشاف حالات الخطر مبكراً والتدخل السريع</p>
          </div>
        </div>
      </div>

      {/* Risk Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إجمالي في خطر', value: riskStudents.length, color: 'from-red-500 to-orange-500', icon: AlertTriangle },
          { label: 'حالات حرجة', value: riskStudents.filter(s => s.risk === 'حرج').length, color: 'from-red-600 to-red-700', icon: AlertTriangle },
          { label: 'خطر عالي', value: riskStudents.filter(s => s.risk === 'عالي').length, color: 'from-orange-500 to-red-500', icon: TrendingDown },
          { label: 'خطر متوسط', value: riskStudents.filter(s => s.risk === 'متوسط').length, color: 'from-yellow-500 to-orange-400', icon: AlertTriangle },
        ].map((stat, idx) => (
          <div key={idx} className={`${cardBg} border rounded-2xl p-5`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-sm ${textSecondary}`}>{stat.label}</p>
            <p className={`text-2xl font-bold ${textPrimary} mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Risk by Subject */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>الخطر حسب المادة</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskBySubject} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis type="number" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <YAxis dataKey="subject" type="category" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} width={70} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} name="عدد الطلاب" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Analysis */}
        <div className={`lg:col-span-2 ${cardBg} border rounded-2xl p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h2 className={`font-bold ${textPrimary}`}>تحليل الذكاء الاصطناعي</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                title: '📉 أسباب الخطر الرئيسية',
                content: 'الغياب المتكرر هو العامل الأكبر (٦٥٪ من الحالات)، يليه انخفاض الدرجات المتتالي (٤٥٪)، ثم عدم تسليم الواجبات (٣٨٪)',
                color: 'bg-red-50 dark:bg-red-900/20 border-red-200',
              },
              {
                title: '💡 توصيات التدخل',
                content: 'يُنصح بالتواصل مع أولياء أمور الطلاب الحرجين خلال ٤٨ ساعة. تفعيل جلسات مراجعة مخصصة لمادة التفاضل.',
                color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200',
              },
              {
                title: '📊 توقع الأداء',
                content: 'إذا لم يُتدخل خلال أسبوعين، ٧٥٪ من هؤلاء الطلاب سيرسبون في الامتحان النهائي.',
                color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200',
              },
            ].map((analysis, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${analysis.color}`}>
                <p className={`font-semibold ${textPrimary} mb-1`}>{analysis.title}</p>
                <p className={`text-sm ${textSecondary}`}>{analysis.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'حرج', 'عالي', 'متوسط'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm transition-colors ${
              filter === f
                ? 'bg-red-500 text-white'
                : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'الكل' : `خطر ${f}`}
          </button>
        ))}
      </div>

      {/* Risk Students List */}
      <div className="space-y-4">
        {filtered.map((student, idx) => {
          const riskStyle = riskColors[student.risk as keyof typeof riskColors];
          return (
            <div key={idx} className={`${cardBg} border rounded-2xl p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold ${textPrimary}`}>{student.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${riskStyle.bg} ${riskStyle.text}`}>
                        خطر {student.risk}
                      </span>
                    </div>
                    <p className={`text-sm ${textSecondary} mb-2`}>{student.grade} • {student.type} • آخر نشاط: {student.lastActivity}</p>
                    
                    {/* Risk Score Bar */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-xs ${textSecondary}`}>مؤشر الخطر:</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${student.riskScore >= 80 ? 'bg-red-500' : student.riskScore >= 60 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                          style={{ width: `${student.riskScore}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${student.riskScore >= 80 ? 'text-red-600' : student.riskScore >= 60 ? 'text-orange-600' : 'text-yellow-600'}`}>
                        {student.riskScore}٪
                      </span>
                    </div>

                    {/* Reasons */}
                    <div className="flex flex-wrap gap-2">
                      {student.reasons.map((reason, rIdx) => (
                        <span key={rIdx} className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          ⚠️ {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className={`text-right mb-2`}>
                    <span className="text-2xl font-bold text-red-600">{student.avg}٪</span>
                    <p className="text-xs text-red-500 font-medium">{student.trend}٪ هذا الشهر</p>
                  </div>
                  <button className="flex items-center gap-1 bg-gradient-to-l from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90">
                    <Eye className="w-3 h-3" /> الملف
                  </button>
                  <button className="flex items-center gap-1 bg-gradient-to-l from-cyan-600 to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90">
                    <MessageCircle className="w-3 h-3" /> رسالة
                  </button>
                  <button className="flex items-center gap-1 border border-green-500 text-green-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50">
                    <Phone className="w-3 h-3" /> ولي الأمر
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
