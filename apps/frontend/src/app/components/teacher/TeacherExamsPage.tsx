import { useState, useEffect } from 'react';
import { Plus, Clock, Users, CheckCircle, Edit, Trash2, Eye, Shuffle, ShieldCheck, BarChart3, Brain, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

import { examApi, courseApi, homeworkApi, questionApi, aiApi } from '../../services/api';

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
  const [courses, setCourses] = useState<any[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('امتحان');
  const [newDuration, setNewDuration] = useState('');
  const [newCourseId, setNewCourseId] = useState('');
  const [newRequiresCamera, setNewRequiresCamera] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Question Bank Picker state
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankTagFilter, setBankTagFilter] = useState('');
  const [selectedBankQuestions, setSelectedBankQuestions] = useState<Set<string>>(new Set());

  // AI Generation State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiForm, setAiForm] = useState({ topic: '', difficulty: 'متوسط', count: 5 });
  const [generatedQuestions, setGeneratedQuestions] = useState<any[] | null>(null);
  const [saveToBank, setSaveToBank] = useState(false);

  useEffect(() => {
    if (showBankPicker) {
      fetchBankQuestions();
    }
  }, [showBankPicker, bankTagFilter]);

  const fetchBankQuestions = async () => {
    try {
      const res = await questionApi.get('/', { params: { tag: bankTagFilter } });
      setBankQuestions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch bank questions', err);
    }
  };

  const handleAddFromBank = () => {
    const toAdd = bankQuestions
      .filter(q => selectedBankQuestions.has(q.id))
      .map(q => ({
        text: q.text,
        options: q.options,
        correct: q.correctAnswer
      }));
    setQuestions([...questions, ...toAdd]);
    setShowBankPicker(false);
    setSelectedBankQuestions(new Set());
  };

  const toggleBankQuestion = (id: string) => {
    const newSet = new Set(selectedBankQuestions);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedBankQuestions(newSet);
  };

  useEffect(() => {
    fetchExams();
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await courseApi.get('/');
      setCourses(res.data || []);
      if (res.data && res.data.length > 0) {
        setNewCourseId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch courses', err);
    }
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await examApi.get('/');
      if (Array.isArray(res.data)) {
        const mapped = res.data.map((e: any) => ({
          id: e.id,
          title: e.title,
          subject: e.subject || 'عام',
          date: new Date(e.createdAt).toLocaleDateString('ar-EG'),
          duration: `${e.duration || 60} دقيقة`,
          questions: Array.isArray(e.questions) ? e.questions.length : 0,
          students: e._count?.attempts || 0,
          status: 'قادم',
          type: 'امتحان',
          antiCheat: e.requiresCamera || false,
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
    setFormErrors({});
    if (!newTitle.trim()) {
      setFormErrors({ title: 'يرجى كتابة عنوان الامتحان' });
      return;
    }
    if (!newCourseId) {
      setFormErrors({ courseId: 'يرجى اختيار الكورس' });
      return;
    }
    // Validation for questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return setFormErrors({ global: `السؤال ${i+1} ليس له نص` });
      if (q.options.some((opt: string) => !opt.trim())) return setFormErrors({ global: `جميع خيارات السؤال ${i+1} مطلوبة` });
      if (q.correct === null || q.correct === undefined) return setFormErrors({ global: `يجب اختيار الإجابة الصحيحة للسؤال ${i+1}` });
    }
    try {
      setIsSubmitting(true);
      const payload = { 
        title: newTitle,
        type: newType,
        courseId: newCourseId,
        duration: parseInt(newDuration) || 60,
        requiresCamera: newRequiresCamera,
        questions: questions.map((q, i) => ({
          id: i + 1,
          text: q.text,
          type: 'mcq',
          options: q.options,
          correct: q.correct
        }))
      };

      if (newType === 'واجب') {
        await homeworkApi.post('/', payload);
      } else {
        await examApi.post('/', payload);
      }
      
      setShowCreate(false);
      setNewTitle('');
      setNewDuration('');
      setNewRequiresCamera(false);
      setQuestions([]);
      fetchExams();
    } catch (err: any) {
      console.error('Create failed', err);
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          errors[e.path[0]] = e.message;
        });
        setFormErrors(errors);
      } else {
        setFormErrors({ global: 'حدث خطأ أثناء الإنشاء' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await examApi.delete(`/${id}`);
        setExams(e => e.filter(x => x.id !== id));
      } catch (err) {
        console.error('Delete failed', err);
      }
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correct: 0 }]);
  };

  const updateQuestion = (index: number, field: string, value: any, optIndex?: number) => {
    const updated = [...questions];
    if (field === 'options' && optIndex !== undefined) {
      updated[index].options[optIndex] = value;
    } else {
      updated[index][field] = value;
    }
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleGenerateQuestions = async () => {
    if (!aiForm.topic.trim()) {
      setAiError('يرجى كتابة موضوع الأسئلة');
      return;
    }
    try {
      setAiLoading(true);
      setAiError(null);
      const res = await aiApi.post('/generate-questions', aiForm);
      if (res.data?.questions) {
        setGeneratedQuestions(res.data.questions);
      } else {
        setAiError('تنسيق غير متوقع من الخادم');
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.response?.data?.message || 'حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpdateGeneratedOption = (qIndex: number, optIndex: number, val: string) => {
    if (!generatedQuestions) return;
    const updated = [...generatedQuestions];
    updated[qIndex].options[optIndex] = val;
    setGeneratedQuestions(updated);
  };

  const handleAppendGeneratedQuestions = async () => {
    if (!generatedQuestions) return;
    try {
      setAiLoading(true);
      
      if (saveToBank) {
        for (const q of generatedQuestions) {
          await questionApi.post('/', {
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            tag: aiForm.topic
          });
        }
      }

      // Map generated questions to form format
      const newFormQuestions = generatedQuestions.map(q => ({
        text: q.text,
        options: q.options,
        correct: q.correctAnswer
      }));

      setQuestions(prev => [...prev, ...newFormQuestions]);
      setShowAiModal(false);
      setGeneratedQuestions(null);
      setSaveToBank(false);
      
      // If bank was updated, fetch it in background
      if (saveToBank) fetchBankQuestions();
    } catch (err) {
      alert('فشل في حفظ بعض الأسئلة في بنك الأسئلة. تمت الإضافة للنموذج فقط.');
      const newFormQuestions = generatedQuestions.map(q => ({
        text: q.text,
        options: q.options,
        correct: q.correctAnswer
      }));
      setQuestions(prev => [...prev, ...newFormQuestions]);
      setShowAiModal(false);
    } finally {
      setAiLoading(false);
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowCreate(false)}>
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 w-full max-w-3xl shadow-2xl my-8`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-bold ${textPrimary} mb-6`}>إنشاء امتحان / واجب جديد</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <input
                  placeholder="عنوان الامتحان"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${formErrors.title ? 'border-red-500' : (isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200')} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
                />
                {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
              </div>
              <div className="space-y-1">
                {courses.length === 0 ? (
                  <div className={`p-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm text-center`}>
                    أنشئ كورس أولاً لتمكن من إضافة امتحانات أو واجبات
                  </div>
                ) : (
                  <select
                    value={newCourseId}
                    onChange={e => setNewCourseId(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${formErrors.courseId ? 'border-red-500' : (isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200')} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
                  >
                    <option value="" disabled>اختر الكورس</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                )}
                {formErrors.courseId && <p className="text-red-500 text-xs mt-1">{formErrors.courseId}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select 
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
                >
                  <option value="امتحان">امتحان</option>
                  <option value="اختبار">اختبار</option>
                  <option value="واجب">واجب</option>
                </select>
                <div className="space-y-1">
                  <input
                    type="number"
                    placeholder="المدة (دقيقة)"
                    value={newDuration}
                    onChange={e => setNewDuration(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${formErrors.duration ? 'border-red-500' : (isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200')} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
                  />
                  {formErrors.duration && <p className="text-red-500 text-xs mt-1">{formErrors.duration}</p>}
                </div>
              </div>
              
              <div className="border-t border-b py-4 my-4 border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto pr-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-bold ${textPrimary}`}>أسئلة الامتحان (MCQ)</h3>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setAiForm({ topic: '', difficulty: 'متوسط', count: 5 });
                      setGeneratedQuestions(null);
                      setAiError(null);
                      setShowAiModal(true);
                    }} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-purple-200 flex items-center gap-1">
                      <Brain className="w-4 h-4" /> توليد ذكي (AI)
                    </button>
                    <button onClick={() => setShowBankPicker(true)} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-indigo-200">
                      اختر من البنك
                    </button>
                    <button onClick={addQuestion} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-emerald-200">
                      + إضافة سؤال
                    </button>
                  </div>
                </div>
                {questions.length === 0 && <p className={`text-sm text-center py-4 ${textSecondary}`}>لا يوجد أسئلة مضافة بعد</p>}
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between mb-3">
                      <span className={`font-semibold ${textPrimary}`}>السؤال {qIndex + 1}</span>
                      <button onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      placeholder="نص السؤال"
                      value={q.text}
                      onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
                      className={`w-full mb-3 px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} text-sm`}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      {q.options.map((opt: string, oIndex: number) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={q.correct === oIndex}
                            onChange={() => updateQuestion(qIndex, 'correct', oIndex)}
                            className="w-4 h-4 text-emerald-600"
                          />
                          <input
                            placeholder={`خيار ${oIndex + 1}`}
                            value={opt}
                            onChange={e => updateQuestion(qIndex, 'options', e.target.value, oIndex)}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} text-sm`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className={`text-sm font-medium ${textPrimary}`}>الإعدادات المتقدمة:</p>
                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>تفعيل مكافحة الغش</p>
                    <p className={`text-xs ${textSecondary}`}>رصد الكاميرا والسلوك</p>
                  </div>
                  <input type="checkbox" checked={newRequiresCamera} onChange={(e) => setNewRequiresCamera(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                </label>
                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>أسئلة عشوائية</p>
                    <p className={`text-xs ${textSecondary}`}>ترتيب مختلف لكل طالب</p>
                  </div>
                  <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded" />
                </label>
                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>التصحيح الفوري</p>
                    <p className={`text-xs ${textSecondary}`}>إظهار النتيجة بعد التسليم</p>
                  </div>
                  <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded" />
                </label>
              </div>
              {formErrors.global && <p className="text-red-500 text-sm text-center">{formErrors.global}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleCreateExam} 
                disabled={isSubmitting || courses.length === 0}
                className="flex-1 bg-gradient-to-l from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الامتحان'}
              </button>
              <button onClick={() => setShowCreate(false)} className={`flex-1 py-3 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Bank Picker Modal */}
      {showBankPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${textPrimary}`}>اختيار أسئلة من البنك</h2>
              <button onClick={() => setShowBankPicker(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <Eye className="w-5 h-5 hidden" /> {/* Placeholder for close icon visually, using simple 'X' */}
                <span>✕</span>
              </button>
            </div>
            <div className={`p-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
              <input
                type="text"
                placeholder="تصفية بالوسم (Tag)..."
                value={bankTagFilter}
                onChange={(e) => setBankTagFilter(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-indigo-500`}
              />
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {bankQuestions.length === 0 ? (
                <p className={`text-center py-8 ${textSecondary}`}>لا يوجد أسئلة مطابقة</p>
              ) : (
                bankQuestions.map(q => (
                  <label key={q.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${selectedBankQuestions.has(q.id) ? (isDark ? 'bg-indigo-900/30 border-indigo-500' : 'bg-indigo-50 border-indigo-200') : (isDark ? 'bg-gray-750 border-gray-700' : 'bg-white border-gray-200')}`}>
                    <input
                      type="checkbox"
                      checked={selectedBankQuestions.has(q.id)}
                      onChange={() => toggleBankQuestion(q.id)}
                      className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <p className={`font-semibold ${textPrimary}`}>{q.text}</p>
                        {q.tag && <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg">{q.tag}</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {q.options.map((opt: string, i: number) => (
                          <span key={i} className={i === q.correctAnswer ? 'text-emerald-600 font-medium' : textSecondary}>
                            {i + 1}. {opt} {i === q.correctAnswer && '✓'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className={`p-4 border-t flex gap-3 justify-end ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
              <button onClick={() => setShowBankPicker(false)} className={`px-4 py-2 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} hover:opacity-80`}>
                إلغاء
              </button>
              <button 
                onClick={handleAddFromBank}
                disabled={selectedBankQuestions.size === 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                إضافة ({selectedBankQuestions.size}) أسئلة
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${textPrimary}`}>
                <Brain className="w-6 h-6 text-purple-600" />
                توليد أسئلة بالذكاء الاصطناعي
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {!generatedQuestions ? (
                <>
                  <div className="grid gap-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>الموضوع أو المادة</label>
                      <input
                        type="text"
                        placeholder="مثال: الجبر الخطي، المعادلات التربيعية..."
                        value={aiForm.topic}
                        onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>مستوى الصعوبة</label>
                      <select
                        value={aiForm.difficulty}
                        onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                      >
                        <option value="سهل">سهل</option>
                        <option value="متوسط">متوسط</option>
                        <option value="صعب">صعب</option>
                        <option value="تحدي">تحدي</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>عدد الأسئلة (الحد الأقصى 20)</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={aiForm.count}
                        onChange={(e) => setAiForm({ ...aiForm, count: parseInt(e.target.value) || 1 })}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                      />
                    </div>
                  </div>
                  {aiError && <p className="text-red-500 text-sm mt-4">{aiError}</p>}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm border border-green-200">
                    تم التوليد بنجاح! راجع الأسئلة أو قم بتعديلها قبل إضافتها للامتحان.
                  </div>
                  {generatedQuestions.map((q, qIndex) => (
                    <div key={qIndex} className={`p-4 border rounded-xl ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => {
                          const updated = [...generatedQuestions];
                          updated[qIndex].text = e.target.value;
                          setGeneratedQuestions(updated);
                        }}
                        className={`w-full px-4 py-2 mb-3 border rounded-lg font-bold ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt: string, optIndex: number) => (
                          <div key={optIndex} className="flex gap-2 items-center">
                            <input
                              type="radio"
                              name={`ai-q-${qIndex}`}
                              checked={q.correctAnswer === optIndex}
                              onChange={() => {
                                const updated = [...generatedQuestions];
                                updated[qIndex].correctAnswer = optIndex;
                                setGeneratedQuestions(updated);
                              }}
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateGeneratedOption(qIndex, optIndex, e.target.value)}
                              className={`w-full px-3 py-1.5 border rounded-md text-sm ${q.correctAnswer === optIndex ? (isDark ? 'border-green-600 bg-green-900/30' : 'border-green-400 bg-green-50') : (isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300')}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer ${isDark ? 'bg-gray-750 border-gray-700 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                    <input type="checkbox" checked={saveToBank} onChange={(e) => setSaveToBank(e.target.checked)} className="w-5 h-5 text-purple-600 rounded" />
                    <div>
                      <p className={`font-medium ${textPrimary}`}>حفظ الأسئلة في بنك الأسئلة أيضاً</p>
                      <p className={`text-xs ${textSecondary}`}>حتى تتمكن من إعادة استخدامها لاحقاً</p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className={`p-6 border-t flex gap-4 justify-end rounded-b-2xl ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
              <button
                onClick={() => setShowAiModal(false)}
                className={`px-6 py-2 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`}
              >
                إلغاء
              </button>
              
              {!generatedQuestions ? (
                <button
                  onClick={handleGenerateQuestions}
                  disabled={aiLoading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري التوليد...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      <span>توليد الأسئلة</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleAppendGeneratedQuestions}
                  disabled={aiLoading}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري الإضافة...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>إضافة للامتحان</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
