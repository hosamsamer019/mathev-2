import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Search, Save, X, Database, Brain, Loader2 } from 'lucide-react';
import { questionApi, aiApi } from '../../services/api';

export default function TeacherQuestionBankPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [tagFilter, setTagFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    tag: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Generation State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiForm, setAiForm] = useState({ topic: '', difficulty: 'متوسط', count: 5 });
  const [generatedQuestions, setGeneratedQuestions] = useState<any[] | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [tagFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await questionApi.get('/', { params: { tag: tagFilter } });
      setQuestions(res.data.data ? res.data.data : Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error(err);
      setError('فشل في جلب بنك الأسئلة');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ text: '', options: ['', '', '', ''], correctAnswer: 0, tag: '' });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (q: any) => {
    setEditingId(q.id);
    setFormData({
      text: q.text,
      options: q.options || ['', '', '', ''],
      correctAnswer: q.correctAnswer || 0,
      tag: q.tag || ''
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟ لن يؤثر ذلك على الامتحانات السابقة.')) return;
    try {
      await questionApi.delete(`/${id}`);
      fetchQuestions();
    } catch (err) {
      alert('فشل في الحذف');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.text.trim()) errors.text = 'يرجى كتابة نص السؤال';
    formData.options.forEach((opt, i) => {
      if (!opt.trim()) errors[`opt_${i}`] = 'يرجى كتابة هذا الخيار';
    });
    if (formData.correctAnswer < 0 || formData.correctAnswer >= formData.options.length) {
      errors.correctAnswer = 'يرجى تحديد الإجابة الصحيحة';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      if (editingId) {
        await questionApi.put(`/${editingId}`, formData);
      } else {
        await questionApi.post('/', formData);
      }
      setShowForm(false);
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const errs: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          if (e.path && e.path.length > 0) errs[e.path[0]] = e.message;
        });
        setFormErrors(errs);
      } else {
        alert(err.response?.data?.message || 'فشل في الحفظ');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOption = (index: number, val: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = val;
    setFormData({ ...formData, options: newOptions });
  };

  const handleGenerate = async () => {
    if (!aiForm.topic.trim()) {
      setAiError('يرجى كتابة الموضوع');
      return;
    }
    try {
      setAiLoading(true);
      setAiError(null);
      const res = await aiApi.post('/generate-questions', aiForm);
      setGeneratedQuestions(res.data.questions);
    } catch (err: any) {
      console.error(err);
      setAiError(err.response?.data?.message || 'فشل في توليد الأسئلة');
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

  const handleSaveGenerated = async () => {
    if (!generatedQuestions) return;
    try {
      setAiLoading(true);
      // Save all one by one (or could bulk if endpoint supported it)
      for (const q of generatedQuestions) {
        await questionApi.post('/', {
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          tag: aiForm.topic // Automatically tag with the topic used for generation
        });
      }
      setShowAiModal(false);
      setGeneratedQuestions(null);
      fetchQuestions();
    } catch (err) {
      alert('فشل في حفظ بعض الأسئلة');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-600" />
            بنك الأسئلة
          </h1>
          <p className="text-gray-600">إدارة أسئلتك الخاصة لاستخدامها لاحقاً في الامتحانات</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setAiForm({ topic: '', difficulty: 'متوسط', count: 5 });
              setGeneratedQuestions(null);
              setAiError(null);
              setShowAiModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-sm"
          >
            <Brain className="w-5 h-5" />
            <span>توليد ذكي (AI)</span>
          </button>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة سؤال يدوياً</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-4 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="تصفية حسب الوسم (Tag)..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full pr-12 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-right"
            />
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? 'تعديل السؤال' : 'إنشاء سؤال جديد'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نص السؤال</label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className={`w-full px-4 py-3 border ${formErrors.text ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-indigo-500`}
                  rows={3}
                  placeholder="أدخل نص السؤال هنا..."
                />
                {formErrors.text && <p className="text-red-500 text-xs mt-1">{formErrors.text}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوسم (Tag) - اختياري</label>
                <div className="relative">
                  <Tag className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    placeholder="مثال: جبر، هندسة، الباب الأول..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">الخيارات والإجابة الصحيحة</label>
                {formData.options.map((opt, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formData.correctAnswer === i}
                      onChange={() => setFormData({ ...formData, correctAnswer: i })}
                      className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`الخيار ${i + 1}`}
                        className={`w-full px-4 py-2 border ${formErrors[`opt_${i}`] ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-indigo-500`}
                      />
                      {formErrors[`opt_${i}`] && <p className="text-red-500 text-xs mt-1">{formErrors[`opt_${i}`]}</p>}
                    </div>
                  </div>
                ))}
                {formErrors.correctAnswer && <p className="text-red-500 text-xs mt-1">{formErrors.correctAnswer}</p>}
                {formErrors.global && <p className="text-red-500 text-xs mt-1">{formErrors.global}</p>}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-4 justify-end bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2"
              >
                {isSubmitting ? 'جاري الحفظ...' : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>حفظ السؤال</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                توليد أسئلة بالذكاء الاصطناعي
              </h2>
              <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {!generatedQuestions ? (
                <>
                  <div className="bg-purple-50 text-purple-800 p-4 rounded-xl text-sm mb-6 border border-purple-100">
                    أدخل موضوع الدرس ومستوى الصعوبة، وسيقوم المساعد الذكي بتوليد أسئلة اختيار من متعدد لك.
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الموضوع / الدرس</label>
                    <input
                      type="text"
                      value={aiForm.topic}
                      onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                      placeholder="مثال: المعادلات التربيعية، نظرية فيثاغورس..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">مستوى الصعوبة</label>
                      <select
                        value={aiForm.difficulty}
                        onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="سهل">سهل</option>
                        <option value="متوسط">متوسط</option>
                        <option value="صعب">صعب</option>
                        <option value="تحدي">تحدي</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">عدد الأسئلة (الحد الأقصى 20)</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={aiForm.count}
                        onChange={(e) => setAiForm({ ...aiForm, count: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  {aiError && <p className="text-red-500 text-sm">{aiError}</p>}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm border border-green-200">
                    تم التوليد بنجاح! يرجى مراجعة الأسئلة وتعديلها إذا لزم الأمر قبل حفظها في البنك.
                  </div>
                  {generatedQuestions.map((q, qIndex) => (
                    <div key={qIndex} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => {
                          const updated = [...generatedQuestions];
                          updated[qIndex].text = e.target.value;
                          setGeneratedQuestions(updated);
                        }}
                        className="w-full px-4 py-2 mb-3 border border-gray-300 rounded-lg font-bold"
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
                              className={`w-full px-3 py-1.5 border rounded-md text-sm ${q.correctAnswer === optIndex ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white'}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-4 justify-end bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                إلغاء
              </button>
              
              {!generatedQuestions ? (
                <button
                  onClick={handleGenerate}
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
                  onClick={handleSaveGenerated}
                  disabled={aiLoading}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>حفظ في البنك</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-6 rounded-xl text-center">{error}</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
          <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد أسئلة</h3>
          <p className="text-gray-500">بنك الأسئلة الخاص بك فارغ، أو لا توجد أسئلة تطابق بحثك.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {questions.map((q) => (
            <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {q.tag && (
                      <span className="bg-indigo-50 text-indigo-700 text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {q.tag}
                      </span>
                    )}
                    <span className="text-gray-400 text-sm">أضيف في {new Date(q.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 leading-relaxed">{q.text}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options.map((opt: string, idx: number) => (
                      <div key={idx} className={`p-3 rounded-lg border text-sm ${idx === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-800 font-medium' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                        {idx + 1}. {opt}
                        {idx === q.correctAnswer && <span className="mr-2 text-green-600">(الإجابة الصحيحة)</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleEdit(q)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
