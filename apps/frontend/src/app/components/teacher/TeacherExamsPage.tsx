import { useState, useEffect } from 'react';
import { Plus, Clock, Users, CheckCircle, Edit, Trash2, Eye, Shuffle, ShieldCheck, BarChart3 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

import { examApi } from '../../services/api';

const questionTypes = [
  { label: 'اختيار من متعدد (MCQ)', count: 15, color: 'bg-blue-100 text-blue-700' },
  { label: 'صح وخطأ', count: 8, color: 'bg-green-100 text-green-700' },
  { label: 'إجابة قصيرة', count: 5, color: 'bg-yellow-100 text-yellow-700' },
  { label: 'مسائل رياضية', count: 7, color: 'bg-purple-100 text-purple-700' },
];

export default function TeacherExamsPage() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'exams' | 'builder' | 'results'>('exams');
  const [showCreate, setShowCreate] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch exams related to courses (mocked route for exams)
      const res = await examApi.get('/');
      if (Array.isArray(res.data)) {
        const mapped = res.data.map((e: any) => ({
          id: e.id,
          title: e.title,
          subject: e.subject || 'عام',
          date: new Date(e.createdAt).toLocaleDateString('ar-EG'),
          duration: `${e.timeLimit || 60} دقيقة`,
          questions: e.questions?.length || 0,
          students: e.attempts?.length || 0,
          status: 'قادم',
          type: 'امتحان',
          antiCheat: e.antiCheat || false,
          randomize: e.randomize || false,
          avgScore: null,
        }));
        setExams(mapped);
      }
    } catch (err) {
      console.error(err);
      setError('فشل في جلب الامتحانات');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async () => {
    try {
      await courseApi.post('/exams', { title: 'امتحان جديد' });
      setShowCreate(false);
      fetchExams();
    } catch (err) {
      console.error('Create failed', err);
    }
  };

  const handleDelete = async (id: string) => {
    if(confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await courseApi.delete(`/exams/${id}`);
        setExams(e => e.filter(x => x.id !== id));
      } catch (err) {
        console.error('Delete failed', err);
      }
    }
  };

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  const statusColors: Record<string, string> = {
    'قادم': 'bg-blue-100 text-blue-700',
    'جاري': 'bg-green-100 text-green-700',
    'منتهي': 'bg-gray-100 text-gray-600',
  };

  const typeColors: Record<string, string> = {
    'امتحان': 'bg-purple-100 text-purple-700',
    'اختبار': 'bg-indigo-100 text-indigo-700',
    'واجب': 'bg-yellow-100 text-yellow-700',
    'امتحان نهائي': 'bg-red-100 text-red-700',
  };

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>الامتحانات والواجبات</h1>
          <p className={textSecondary}>إنشاء وإدارة الامتحانات مع نظام مكافحة الغش</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-gradient-to-l from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> إنشاء امتحان
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 mb-6 ${cardBg} border rounded-xl p-1 w-fit`}>
        {[
          { key: 'exams', label: 'الامتحانات والواجبات' },
          { key: 'builder', label: 'بنك الأسئلة' },
          { key: 'results', label: 'النتائج والتحليل' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'exams' | 'builder' | 'results')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-emerald-600 text-white' : `${textSecondary}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div className={`text-center py-8 ${textSecondary}`}>جاري تحميل البيانات...</div>}
      {error && <div className="text-center py-8 text-red-500 bg-red-50 rounded-xl mb-4 border border-red-200">{error}</div>}

      {activeTab === 'exams' && !loading && !error && (
        <div className="space-y-4">
          {exams.length === 0 && <div className={`text-center py-8 ${textSecondary}`}>لا يوجد امتحانات</div>}
          {exams.map((exam) => (
            <div key={exam.id} className={`${cardBg} border rounded-2xl p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`font-semibold ${textPrimary}`}>{exam.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[exam.type] || ''}`}>
                      {exam.type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[exam.status] || ''}`}>
                      {exam.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className={`flex items-center gap-1 ${textSecondary}`}>
                      <Clock className="w-4 h-4" /> {exam.duration}
                    </span>
                    <span className={`flex items-center gap-1 ${textSecondary}`}>
                      <Users className="w-4 h-4" /> {exam.students} طالب
                    </span>
                    <span className={`flex items-center gap-1 ${textSecondary}`}>
                      <CheckCircle className="w-4 h-4" /> {exam.questions} سؤال
                    </span>
                    <span className={textSecondary}>{exam.date}</span>
                  </div>
                  {/* Anti-cheat badges */}
                  <div className="flex gap-2 mt-3">
                    {exam.antiCheat && (
                      <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg border border-red-200">
                        <ShieldCheck className="w-3 h-3" /> مكافحة الغش
                      </span>
                    )}
                    {exam.randomize && (
                      <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg border border-blue-200">
                        <Shuffle className="w-3 h-3" /> أسئلة عشوائية
                      </span>
                    )}
                    {exam.avgScore && (
                      <span className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg border border-green-200">
                        <BarChart3 className="w-3 h-3" /> متوسط: {exam.avgScore}٪
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => alert('جاري العرض...')} className={`p-2 rounded-xl ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} text-blue-500 transition-colors`}>
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => alert('جاري التعديل...')} className={`p-2 rounded-xl ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${textSecondary} transition-colors`}>
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(exam.id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'builder' && (
        <div className={`${cardBg} border rounded-2xl p-8 text-center`}>
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className={`text-xl font-bold ${textPrimary} mb-2`}>بنك الأسئلة الذكي</h2>
          <p className={`${textSecondary} mb-6 max-w-md mx-auto`}>
            بنك يضم أكثر من ٢٠٠٠ سؤال في جميع مواضيع الرياضيات، مرتبة حسب الصعوبة والموضوع
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {questionTypes.map((qt, idx) => (
              <div key={idx} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4`}>
                <span className={`text-xs px-2 py-1 rounded-full ${qt.color}`}>{qt.label}</span>
                <p className={`text-2xl font-bold ${textPrimary} mt-3`}>{qt.count}</p>
                <p className={`text-xs ${textSecondary}`}>سؤال</p>
              </div>
            ))}
          </div>
          <button onClick={() => alert('ميزة بنك الأسئلة قيد التطوير')} className="bg-gradient-to-l from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90">
            إضافة أسئلة جديدة
          </button>
        </div>
      )}

      {activeTab === 'results' && (
        <div className={`${cardBg} border rounded-2xl p-8 text-center`}>
          <BarChart3 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${textPrimary} mb-2`}>تحليل النتائج</h2>
          <p className={`${textSecondary} mb-6`}>اختر امتحاناً لعرض تحليل مفصل للنتائج</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.filter(e => e.status === 'منتهي').length === 0 && <p className={textSecondary}>لا يوجد نتائج بعد.</p>}
            {exams.filter(e => e.status === 'منتهي').map((exam) => (
              <button key={exam.id} onClick={() => alert('عرض تقرير النتيجة')} className={`p-4 rounded-xl border ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} text-right transition-colors`}>
                <h3 className={`font-semibold ${textPrimary}`}>{exam.title}</h3>
                <p className={`text-sm ${textSecondary} mt-1`}>{exam.students} طالب • متوسط: {exam.avgScore}٪</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Exam Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 w-full max-w-lg shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-bold ${textPrimary} mb-6`}>إنشاء امتحان / واجب جديد</h2>
            <div className="space-y-4">
              <input
                placeholder="عنوان الامتحان"
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
              />
              <div className="grid grid-cols-2 gap-4">
                <select className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}>
                  <option>النوع</option>
                  <option>امتحان</option>
                  <option>اختبار</option>
                  <option>واجب</option>
                </select>
                <input
                  type="number"
                  placeholder="المدة (دقيقة)"
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
                />
              </div>
              <div className="space-y-3">
                <p className={`text-sm font-medium ${textPrimary}`}>الإعدادات المتقدمة:</p>
                {[
                  { label: 'تفعيل مكافحة الغش', desc: 'رصد الكاميرا والسلوك' },
                  { label: 'أسئلة عشوائية', desc: 'ترتيب مختلف لكل طالب' },
                  { label: 'التصحيح الفوري', desc: 'إظهار النتيجة بعد التسليم' },
                ].map((opt, idx) => (
                  <label key={idx} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{opt.label}</p>
                      <p className={`text-xs ${textSecondary}`}>{opt.desc}</p>
                    </div>
                    <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded" />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreateExam} className="flex-1 bg-gradient-to-l from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-medium hover:opacity-90">
                إنشاء الامتحان
              </button>
              <button onClick={() => setShowCreate(false)} className={`flex-1 py-3 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
