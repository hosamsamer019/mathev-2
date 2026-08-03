import { useState } from 'react';
import { Target, Brain, ChevronLeft, CheckCircle, Clock, Star, TrendingUp, Zap, BookOpen, Lock, Play } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

const skillsData = [
  { skill: 'الجبر', level: 85 },
  { skill: 'الهندسة', level: 70 },
  { skill: 'التفاضل', level: 60 },
  { skill: 'التكامل', level: 45 },
  { skill: 'الإحصاء', level: 80 },
  { skill: 'المثلثات', level: 75 },
];

const radarData = skillsData.map(s => ({ subject: s.skill, A: s.level }));

const learningPath = [
  {
    stage: 1,
    title: 'أساسيات الجبر',
    status: 'completed',
    score: 92,
    items: ['المعادلات الخطية', 'المتراجحات', 'الأعداد الصحيحة'],
  },
  {
    stage: 2,
    title: 'الجبر المتقدم',
    status: 'current',
    score: 78,
    items: ['المعادلات التربيعية', 'المصفوفات', 'المتعددات الحدية'],
  },
  {
    stage: 3,
    title: 'الهندسة التحليلية',
    status: 'locked',
    score: null,
    items: ['المستقيمات والمنحنيات', 'الأقماع المقطوعة', 'المتجهات'],
  },
  {
    stage: 4,
    title: 'حساب التفاضل',
    status: 'locked',
    score: null,
    items: ['النهايات', 'المشتقات', 'التطبيقات'],
  },
  {
    stage: 5,
    title: 'حساب التكامل',
    status: 'locked',
    score: null,
    items: ['التكامل غير المحدد', 'التكامل المحدد', 'التطبيقات'],
  },
];

const progressHistory = [
  { week: 'أسبوع ١', score: 65 },
  { week: 'أسبوع ٢', score: 70 },
  { week: 'أسبوع ٣', score: 68 },
  { week: 'أسبوع ٤', score: 75 },
  { week: 'أسبوع ٥', score: 80 },
  { week: 'أسبوع ٦', score: 78 },
  { week: 'أسبوع ٧', score: 85 },
];

const recommendations = [
  {
    type: 'video',
    title: 'شرح المعادلات التربيعية - مثال عملي',
    reason: 'بناءً على أدائك في الواجب الأخير',
    duration: '١٢ دقيقة',
    priority: 'عالية',
    icon: Play,
    color: 'from-red-500 to-orange-500',
  },
  {
    type: 'exercise',
    title: 'تمارين مكثفة على المصفوفات',
    reason: 'نقطة ضعف محددة في آخر اختبار',
    duration: '٢٠ دقيقة',
    priority: 'عالية',
    icon: Zap,
    color: 'from-yellow-500 to-orange-500',
  },
  {
    type: 'review',
    title: 'مراجعة المتعددات الحدية',
    reason: 'لاستكمال المرحلة الحالية',
    duration: '١٥ دقيقة',
    priority: 'متوسطة',
    icon: BookOpen,
    color: 'from-blue-500 to-indigo-600',
  },
];

export default function AdaptiveLearningPage() {
  const { isDark } = useTheme();
  const [activeStage, setActiveStage] = useState<number | null>(null);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const tooltipStyle = { background: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: 12 };

  const completedStages = learningPath.filter(s => s.status === 'completed').length;
  const overallProgress = Math.round((completedStages / learningPath.length) * 100);

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center">
            <Target className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>مسار التعلم التكيفي</h1>
            <p className={textSecondary}>خطة دراسية مخصصة بالذكاء الاصطناعي بناءً على مستواك</p>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-gradient-to-l from-blue-600 to-cyan-600 rounded-3xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-32 -translate-y-32" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <p className="text-cyan-200 text-sm mb-1">إجمالي تقدمك في المنهج</p>
            <h2 className="text-4xl font-bold text-white mb-4">{overallProgress}٪</h2>
            <div className="w-full bg-white/20 rounded-full h-3 mb-4">
              <div className="bg-white h-3 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-white text-lg font-bold">{completedStages}</p>
                <p className="text-cyan-200 text-xs">مراحل مكتملة</p>
              </div>
              <div>
                <p className="text-white text-lg font-bold">{learningPath.length - completedStages}</p>
                <p className="text-cyan-200 text-xs">مراحل متبقية</p>
              </div>
              <div>
                <p className="text-white text-lg font-bold">٢٨</p>
                <p className="text-cyan-200 text-xs">يوم للإنهاء</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-yellow-400" />
              <p className="text-white font-semibold text-sm">تقييم الذكاء الاصطناعي</p>
            </div>
            <p className="text-cyan-100 text-sm">مستواك ممتاز في الجبر! الخطوة التالية هي الهندسة التحليلية. تقدير وقت الإتمام: ٢٨ يوم بأداء متواصل.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Skill Radar */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-4`}>خريطة المهارات</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={isDark ? '#374151' : '#e5e7eb'} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <Radar dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {skillsData.map((skill, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className={`text-xs w-16 flex-shrink-0 ${textSecondary}`}>{skill.skill}</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${skill.level}%` }} />
                </div>
                <span className={`text-xs font-bold w-8 ${textPrimary}`}>{skill.level}٪</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Chart */}
        <div className={`lg:col-span-2 ${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-4`}>تطور الأداء الأسبوعي</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={progressHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="week" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <YAxis domain={[50, 100]} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 5 }} name="الدرجة" />
            </LineChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {[
              { label: 'أفضل أسبوع', value: '٨٥٪', color: 'text-green-600' },
              { label: 'المتوسط', value: '٧٤٪', color: 'text-blue-600' },
              { label: 'الاتجاه', value: '↑ محسّن', color: 'text-cyan-600' },
            ].map((stat, idx) => (
              <div key={idx} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-3 text-center`}>
                <p className={`font-bold ${stat.color}`}>{stat.value}</p>
                <p className={`text-xs ${textSecondary}`}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Learning Path */}
      <div className={`${cardBg} border rounded-2xl p-6 mb-6`}>
        <h2 className={`font-bold ${textPrimary} mb-6`}>مسار التعلم المخصص</h2>
        <div className="space-y-3">
          {learningPath.map((stage, idx) => (
            <div key={stage.stage}>
              <button
                onClick={() => stage.status !== 'locked' && setActiveStage(activeStage === stage.stage ? null : stage.stage)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-right ${
                  stage.status === 'locked'
                    ? `opacity-50 cursor-not-allowed ${isDark ? 'border-gray-700' : 'border-gray-200'}`
                    : stage.status === 'current'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                {/* Stage Icon */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  stage.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                  stage.status === 'current' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {stage.status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : stage.status === 'current' ? (
                    <Target className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Lock className="w-6 h-6 text-gray-400" />
                  )}
                </div>

                {/* Stage Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${
                      stage.status === 'completed' ? 'text-green-600' :
                      stage.status === 'current' ? 'text-blue-600' :
                      textSecondary
                    }`}>
                      المرحلة {stage.stage}
                    </span>
                    {stage.status === 'current' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full animate-pulse">جارية الآن</span>
                    )}
                  </div>
                  <h3 className={`font-semibold ${textPrimary}`}>{stage.title}</h3>
                  <p className={`text-sm ${textSecondary}`}>{stage.items.join(' • ')}</p>
                </div>

                {/* Score / Status */}
                <div className="flex-shrink-0 text-left">
                  {stage.score !== null ? (
                    <div className="text-right">
                      <p className={`text-xl font-bold ${stage.score >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {stage.score}٪
                      </p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < Math.floor(stage.score! / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                  ) : stage.status !== 'locked' ? (
                    <ChevronLeft className={`w-5 h-5 ${textSecondary} transition-transform ${activeStage === stage.stage ? 'rotate-90' : ''}`} />
                  ) : null}
                </div>
              </button>

              {/* Expanded Stage Details */}
              {activeStage === stage.stage && stage.status === 'current' && (
                <div className={`mx-4 p-4 rounded-b-2xl border border-t-0 ${isDark ? 'border-gray-700 bg-gray-700/30' : 'border-gray-100 bg-gray-50'}`}>
                  <h4 className={`font-semibold ${textPrimary} mb-3`}>المحتوى المتاح</h4>
                  <div className="space-y-2">
                    {stage.items.map((item, iIdx) => (
                      <div key={iIdx} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-white'} border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-blue-500" />
                          <span className={`text-sm ${textPrimary}`}>{item}</span>
                        </div>
                        <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">
                          ابدأ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className={`${cardBg} border rounded-2xl p-6`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className={`font-bold ${textPrimary}`}>توصيات الذكاء الاصطناعي لليوم</h2>
            <p className={`text-sm ${textSecondary}`}>مبنية على أدائك في آخر ٧ أيام</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((rec, idx) => (
            <div key={idx} className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-2xl p-5 border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${rec.color} flex items-center justify-center mb-4`}>
                <rec.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className={`font-semibold ${textPrimary} mb-2`}>{rec.title}</h3>
              <p className={`text-xs ${textSecondary} mb-3`}>{rec.reason}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs flex items-center gap-1 ${textSecondary}`}>
                  <Clock className="w-3 h-3" /> {rec.duration}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${rec.priority === 'عالية' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {rec.priority}
                </span>
              </div>
              <button className={`w-full mt-3 py-2 rounded-xl text-sm font-medium bg-gradient-to-l ${rec.color} text-white hover:opacity-90`}>
                ابدأ الآن
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
