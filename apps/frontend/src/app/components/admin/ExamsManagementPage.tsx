import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, ExternalLink, Copy, Check } from 'lucide-react';
import { examService } from '../../services/exam.service';
import { courseService } from '../../services/course.service';
import { MathContent } from '../ui/MathContent';

export default function ExamsManagementPage() {
  const [showModal, setShowModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [selectedExamDetails, setSelectedExamDetails] = useState<any>(null);
  
  // Question Management State
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [questionForm, setQuestionForm] = useState<{ text: string, type: string, options: string[], correct: any }>({ text: '', type: 'multiple_choice', options: ['', '', '', ''], correct: 0 });
  const [exams, setExams] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [externalAttempts, setExternalAttempts] = useState<any[]>([]);
  const [attemptsTab, setAttemptsTab] = useState<'registered'|'external'>('registered');

  // Form State
  const [formData, setFormData] = useState<any>({ 
    title: '', courseId: '', duration: 60, passingScore: 50, randomization: false, startTime: '', endTime: '', allowExternalStudents: false, allowedIps: ''
  });
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchExams();
    fetchCourses();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCourses = async () => {
    try {
      const res = await courseService.getCourses();
      const courseList = res.data?.data ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setCourses(courseList);
    } catch (err) {
      console.error('Failed to fetch courses', err);
    }
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await examService.getExams();
      setExams(res.data.data ? res.data.data : Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('Failed to fetch exams', err);
      if (err.response?.status === 403) {
        showToast('غير مصرح لك بعرض الامتحانات', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await examService.deleteExam(id);
        setExams(c => c.filter(x => x.id !== id));
        showToast('تم الحذف بنجاح', 'success');
      } catch (err: any) {
        console.error('Delete failed', err);
        if (err.response?.status === 403) {
          showToast('غير مصرح لك بحذف هذا الامتحان', 'error');
        } else {
          showToast('فشل الحذف', 'error');
        }
      }
    }
  };

  const handleEdit = (exam: any) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title || '',
      courseId: exam.courseId || (courses.length > 0 ? courses[0].id : ''),
      duration: exam.duration || 60,
      passingScore: exam.passingScore || 50,
      randomization: exam.randomization || false,
      startTime: exam.startTime ? new Date(exam.startTime).toISOString().slice(0, 16) : '',
      endTime: exam.endTime ? new Date(exam.endTime).toISOString().slice(0, 16) : '',
      allowExternalStudents: exam.allowExternalStudents || false,
      allowedIps: exam.allowedIps || ''
    });
    setValidationErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setValidationErrors({});

      const errors: Record<string, string> = {};
      if (!formData.title || !formData.title.trim()) {
        errors.title = 'عنوان الامتحان مطلوب';
      }
      if (!formData.courseId || !formData.courseId.trim()) {
        errors.courseId = 'يرجى اختيار الدورة';
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        showToast('يرجى ملء الحقول المطلوبة', 'error');
        setIsSaving(false);
        return;
      }

      const payload = {
        ...formData,
        duration: Number(formData.duration) || 60,
        passingScore: Number(formData.passingScore) || 50,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : null,
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
        allowExternalStudents: Boolean(formData.allowExternalStudents),
        allowedIps: formData.allowedIps?.trim() || null
      };

      if (editingExam) {
        await examService.updateExam(editingExam.id, payload);
        showToast('تم التعديل بنجاح', 'success');
      } else {
        await examService.createExam(payload);
        showToast('تمت إضافة الامتحان بنجاح', 'success');
      }
      setShowModal(false);
      setEditingExam(null);
      setFormData({ title: '', courseId: courses.length > 0 ? courses[0].id : '', duration: 60, passingScore: 50, randomization: false, startTime: '', endTime: '', allowExternalStudents: false, allowedIps: '' });
      fetchExams();
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          if (e.path && e.path.length > 0) {
            errors[e.path[0]] = e.message;
          }
        });
        setValidationErrors(errors);
        showToast('يرجى مراجعة الحقول المطلوبة', 'error');
      } else {
        showToast(err.response?.data?.message || 'حدث خطأ أثناء الحفظ', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewAttempts = async (id: string) => {
    try {
      setLoading(true);
      const [detailsRes, externalRes] = await Promise.all([
        examService.getExamDetails(id),
        examService.getExternalResults(id).catch(() => ({ data: [] }))
      ]);
      setSelectedExamDetails(detailsRes.data);
      setExternalAttempts(Array.isArray(externalRes.data) ? externalRes.data : []);
      setAttemptsTab('registered');
      setShowAttemptsModal(true);
    } catch (err: any) {
      showToast('فشل في جلب تفاصيل الامتحان', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQuestions = async (exam: any) => {
    setSelectedExamDetails(exam);
    try {
      setLoading(true);
      const res = await examService.getExamDetails(exam.id);
      // Prisma JSON field may return as array, object, or null – normalize to array
      const rawQuestions = res.data?.questions;
      const normalized: any[] = Array.isArray(rawQuestions)
        ? rawQuestions
        : rawQuestions && typeof rawQuestions === 'object'
        ? Object.values(rawQuestions)
        : [];
      setExamQuestions(normalized);
      setShowQuestionModal(true);
    } catch (err: any) {
      showToast('فشل في جلب الأسئلة', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleSaveQuestion = async () => {
    if (!questionForm.text) {
      showToast('نص السؤال مطلوب', 'error');
      return;
    }
    const newQ = {
      id: editingQuestion ? editingQuestion.id : Date.now().toString(),
      text: questionForm.text,
      type: questionForm.type,
      options: questionForm.type === 'multiple_choice' ? questionForm.options.filter(o => o) : undefined,
      correct: questionForm.type === 'multiple_choice' ? questionForm.options[questionForm.correct] : questionForm.correct
    };

    const updatedQuestions = editingQuestion 
      ? examQuestions.map(q => q.id === editingQuestion.id ? newQ : q)
      : [...examQuestions, newQ];

    try {
      setIsSaving(true);
      // Backend updateExam Zod schema requires title and courseId along with questions
      const updatePayload = {
        title: selectedExamDetails.title,
        courseId: selectedExamDetails.courseId,
        duration: selectedExamDetails.duration || 60,
        requiresCamera: selectedExamDetails.requiresCamera || false,
        randomization: selectedExamDetails.randomization || false,
        passingScore: selectedExamDetails.passingScore || 50,
        questions: updatedQuestions
      };
      await examService.updateExam(selectedExamDetails.id, updatePayload);
      setExamQuestions(updatedQuestions);
      setEditingQuestion(null);
      setQuestionForm({ text: '', type: 'multiple_choice', options: ['', '', '', ''], correct: 0 });

      showToast('تم حفظ السؤال بنجاح', 'success');
    } catch (err) {
      showToast('فشل في حفظ السؤال', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    const updatedQuestions = examQuestions.filter(q => q.id !== qId);
    try {
      setIsSaving(true);
      const deletePayload = {
        title: selectedExamDetails.title,
        courseId: selectedExamDetails.courseId,
        duration: selectedExamDetails.duration || 60,
        requiresCamera: selectedExamDetails.requiresCamera || false,
        randomization: selectedExamDetails.randomization || false,
        passingScore: selectedExamDetails.passingScore || 50,
        questions: updatedQuestions
      };
      await examService.updateExam(selectedExamDetails.id, deletePayload);
      setExamQuestions(updatedQuestions);
      showToast('تم حذف السؤال بنجاح', 'success');
    } catch (err) {
      showToast('فشل في حذف السؤال', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 relative">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} z-50`}>
          {toast.message}
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة الامتحانات</h1>
          <p className="text-gray-600">إنشاء وإدارة الامتحانات</p>
        </div>
        <button
          onClick={() => {
            setEditingExam(null);
            setFormData({
              title: '',
              courseId: courses.length > 0 ? courses[0].id : '',
              duration: 60,
              passingScore: 50,
              randomization: false,
              startTime: '',
              endTime: '',
              allowExternalStudents: false,
              allowedIps: ''
            });
            setValidationErrors({});
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة امتحان</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-right py-3 px-4 font-medium text-gray-700">عنوان الامتحان</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">الدورة</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">المحاولات</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="text-center py-8 text-gray-500">جاري تحميل البيانات...</td></tr>}
            {!loading && exams.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-500">لا يوجد امتحانات</td></tr>}
            
            {exams.map((exam) => (
              <tr key={exam.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-900">
                  <div className="font-semibold">{exam.title}</div>
                  {exam.allowExternalStudents && exam.examAccessCode && (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded font-mono font-bold">
                        كود: {exam.examAccessCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/external-exam?code=${exam.examAccessCode}`;
                          navigator.clipboard.writeText(link);
                          showToast('تم نسخ رابط الامتحان الخارجي', 'success');
                        }}
                        className="text-[11px] bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        نسخ الرابط
                      </button>
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-600">{exam.course?.title || exam.courseId}</td>
                <td className="py-3 px-4 text-gray-600">{exam._count?.attempts || 0}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewAttempts(exam.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      عرض المحاولات
                    </button>
                    <button
                      onClick={() => handleOpenQuestions(exam)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      الأسئلة
                    </button>
                    <button 
                      onClick={() => handleEdit(exam)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="تعديل الامتحان"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(exam.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{editingExam ? 'تعديل امتحان' : 'إضافة امتحان جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الامتحان *</label>
                <input
                  type="text"
                  placeholder="مثال: امتحان التفاضل والتكامل الشامل"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className={`w-full px-4 py-2 border ${validationErrors?.title ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500`}
                />
                {validationErrors?.title && <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدورة (الكورس) *</label>
                {courses.length > 0 ? (
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                    className={`w-full px-4 py-2 border ${validationErrors?.courseId ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 bg-white`}
                  >
                    <option value="">-- اختر الدورة التعليمية --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="أدخل معرف الدورة (Course ID)"
                    value={formData.courseId}
                    onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                    className={`w-full px-4 py-2 border ${validationErrors?.courseId ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500`}
                  />
                )}
                {validationErrors?.courseId && <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.courseId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">مدة الامتحان (دقائق)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 60})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">درجة النجاح (%)</label>
                  <input
                    type="number"
                    value={formData.passingScore}
                    onChange={(e) => setFormData({...formData, passingScore: parseInt(e.target.value) || 50})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">وقت البدء (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">وقت الانتهاء (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="randomization"
                  checked={formData.randomization}
                  onChange={(e) => setFormData({...formData, randomization: e.target.checked})}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="randomization" className="text-sm font-medium text-gray-700">ترتيب أسئلة عشوائي</label>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="allowExternalStudents"
                  checked={formData.allowExternalStudents}
                  onChange={(e) => setFormData({...formData, allowExternalStudents: e.target.checked})}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="allowExternalStudents" className="text-sm font-medium text-gray-700">السماح للطلاب الخارجيين بالدخول</label>
              </div>

              {formData.allowExternalStudents && (
                <div className="mt-3 space-y-3">
                  {editingExam?.examAccessCode && (
                    <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200">
                      <span className="text-xs text-purple-800 font-semibold block mb-1">كود دخول ورابط الامتحان الخارجي:</span>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono font-bold text-purple-700 text-lg tracking-wider">{editingExam.examAccessCode}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(editingExam.examAccessCode);
                              showToast('تم نسخ كود الامتحان بنجاح', 'success');
                            }}
                            className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 font-bold transition-colors"
                          >
                            نسخ الكود
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const link = `${window.location.origin}/external-exam?code=${editingExam.examAccessCode}`;
                              navigator.clipboard.writeText(link);
                              showToast('تم نسخ رابط الامتحان بنجاح', 'success');
                            }}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-bold transition-colors"
                          >
                            نسخ الرابط
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono break-all bg-white/80 p-1.5 rounded border border-purple-100">
                        {window.location.origin}/external-exam?code={editingExam.examAccessCode}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuestionModal && selectedExamDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">إدارة أسئلة امتحان: {selectedExamDetails.title}</h2>
              <button onClick={() => { setShowQuestionModal(false); setEditingQuestion(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold mb-4">{editingQuestion ? 'تعديل سؤال' : 'إضافة سؤال جديد'}</h3>
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium mb-1">نص السؤال</label>
                    <textarea 
                      value={questionForm.text} 
                      onChange={e => setQuestionForm({...questionForm, text: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">نوع السؤال</label>
                    <select 
                      value={questionForm.type}
                      onChange={e => setQuestionForm({...questionForm, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500"
                    >
                      <option value="multiple_choice">اختيار من متعدد</option>
                      <option value="true_false">صح أو خطأ</option>
                      <option value="text">مقال قصير</option>
                    </select>
                  </div>
                  {questionForm.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium mb-1">الخيارات (اختر الإجابة الصحيحة)</label>
                      {questionForm.options.map((opt, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input 
                            type="radio" 
                            name="correctOption" 
                            checked={questionForm.correct === i} 
                            onChange={() => setQuestionForm({...questionForm, correct: i})} 
                          />
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={e => {
                              const newOpts = [...questionForm.options];
                              newOpts[i] = e.target.value;
                              setQuestionForm({...questionForm, options: newOpts});
                            }}
                            placeholder={`خيار ${i+1}`}
                            className="flex-1 px-3 py-1 border border-gray-300 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {questionForm.type === 'true_false' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">الإجابة الصحيحة</label>
                      <select 
                        value={questionForm.correct as any} 
                        onChange={e => setQuestionForm({...questionForm, correct: e.target.value === 'true' ? true : false})}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      >
                        <option value="true">صح</option>
                        <option value="false">خطأ</option>
                      </select>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleSaveQuestion} disabled={isSaving} className="flex-1 bg-purple-600 text-white py-2 rounded">
                      {isSaving ? 'جاري الحفظ...' : 'حفظ السؤال'}
                    </button>
                    {editingQuestion && (
                       <button onClick={() => { setEditingQuestion(null); setQuestionForm({ text: '', type: 'multiple_choice', options: ['', '', '', ''], correct: 0 }); }} className="bg-gray-300 text-gray-800 py-2 px-4 rounded">
                         إلغاء التعديل
                       </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">الأسئلة الحالية ({examQuestions.length})</h3>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {examQuestions.length === 0 && <p className="text-gray-500">لا يوجد أسئلة مضافة</p>}
                  {examQuestions.map((q, idx) => (
                    <div key={q.id} className="p-3 bg-white border border-gray-200 rounded shadow-sm relative group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-gray-500">سؤال {idx + 1}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <button onClick={() => { 
                            setEditingQuestion(q);
                            setQuestionForm({
                              text: q.text,
                              type: q.type || 'multiple_choice',
                              options: q.options || ['', '', '', ''],
                              correct: q.type === 'multiple_choice' ? (q.options ? q.options.indexOf(q.correct) : 0) : q.correct
                            });
                          }} className="text-blue-500 hover:text-blue-700">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-900 font-medium">
                        <MathContent content={q.text || ''} />
                      </p>
                      <span className="text-xs text-gray-500 mt-1 inline-block">النوع: {q.type === 'multiple_choice' ? 'اختيارات' : q.type === 'true_false' ? 'صح/خطأ' : 'نصي'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAttemptsModal && selectedExamDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">محاولات الطلاب: {selectedExamDetails.title}</h2>
              <button onClick={() => setShowAttemptsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-5 border-b border-gray-200">
              <button
                onClick={() => setAttemptsTab('registered')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  attemptsTab === 'registered'
                    ? 'border-purple-600 text-purple-700 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                طلاب مسجلون ({selectedExamDetails.attempts?.length || 0})
              </button>
              <button
                onClick={() => setAttemptsTab('external')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  attemptsTab === 'external'
                    ? 'border-orange-500 text-orange-700 bg-orange-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                طلاب خارجيون ({externalAttempts.length})
              </button>
            </div>

            {/* Registered Students Tab */}
            {attemptsTab === 'registered' && (
              selectedExamDetails.attempts?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">لا توجد محاولات حتى الآن.</p>
              ) : (
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-700 text-sm font-semibold">
                      <th className="py-3 px-4">الطالب</th>
                      <th className="py-3 px-4">الدرجة</th>
                      <th className="py-3 px-4">التاريخ</th>
                      <th className="py-3 px-4">المخالفات / حالة الغش</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedExamDetails.attempts?.map((attempt: any) => (
                      <tr key={attempt.id} className="border-b hover:bg-gray-50 text-gray-700 text-sm">
                        <td className="py-3 px-4">
                          <div className="font-semibold">{attempt.student?.name || 'غير معروف'}</div>
                          {attempt.student?.phone && (
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{attempt.student.phone}</div>
                          )}
                          {attempt.ipAddress && (
                            <div className="text-xs text-purple-600 font-mono mt-1">IP: {attempt.ipAddress}</div>
                          )}
                          {attempt.userAgent && (
                            <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]" title={attempt.userAgent}>
                              {attempt.userAgent}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {attempt.status === 'CHEATING' ? (
                            <span className="text-red-600">0% (ملغى للغش)</span>
                          ) : (
                            <span className="text-indigo-600">{Math.round(attempt.percentage || 0)}%</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {new Date(attempt.createdAt).toLocaleString('ar-EG')}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium">
                          {attempt.status === 'CHEATING' ? (
                            <div className="text-red-600 font-bold">
                              <div>رصد غش ({attempt.violationCount} مخالفات)</div>
                              {attempt.cheatingReason && (
                                <div className="text-xs font-normal text-red-500 mt-1 max-w-xs">{attempt.cheatingReason}</div>
                              )}
                            </div>
                          ) : attempt.violationCount > 0 ? (
                            <span className="text-yellow-600 font-bold">{attempt.violationCount} مخالفات</span>
                          ) : (
                            <span className="text-green-600">لا يوجد</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* External Students Tab */}
            {attemptsTab === 'external' && (
              externalAttempts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">لا توجد محاولات من طلاب خارجيين حتى الآن.</p>
              ) : (
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b bg-orange-50 text-gray-700 text-sm font-semibold">
                      <th className="py-3 px-4">الاسم</th>
                      <th className="py-3 px-4">الهاتف</th>
                      <th className="py-3 px-4">IP المُرصود</th>
                      <th className="py-3 px-4">الدرجة</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {externalAttempts.map((attempt: any) => (
                      <tr key={attempt.id} className="border-b hover:bg-orange-50 text-gray-700 text-sm">
                        <td className="py-3 px-4">
                          <div className="font-semibold">{attempt.studentName}</div>
                          {attempt.userAgent && (
                            <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[180px]" title={attempt.userAgent}>
                              {attempt.userAgent}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-gray-500">{attempt.phone || '—'}</td>
                        <td className="py-3 px-4">
                          {attempt.ipAddress ? (
                            <span className="text-xs text-orange-700 font-mono bg-orange-100 px-1.5 py-0.5 rounded">{attempt.ipAddress}</span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          {attempt.status === 'CHEATING' ? (
                            <span className="text-red-600">0% (ملغى)</span>
                          ) : (
                            <span className="text-indigo-600">{Math.round(attempt.percentage || 0)}%</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            attempt.status === 'GRADED' ? 'bg-green-100 text-green-800' :
                            attempt.status === 'CHEATING' ? 'bg-red-100 text-red-800' :
                            attempt.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {attempt.status === 'GRADED' ? 'تم التصحيح' :
                             attempt.status === 'CHEATING' ? 'ملغى (غش)' :
                             attempt.status === 'SUBMITTED' ? 'مُسلَّم' :
                             attempt.status === 'IN_PROGRESS' ? 'جارٍ' :
                             attempt.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {new Date(attempt.createdAt).toLocaleString('ar-EG')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
