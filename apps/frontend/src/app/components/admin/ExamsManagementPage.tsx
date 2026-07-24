import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { examApi } from '../../services/api';

export default function ExamsManagementPage() {
  const [showModal, setShowModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({ title: '', courseId: '' });
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await examApi.get('/');
      setExams(res.data || []);
    } catch (err) {
      console.error('Failed to fetch exams', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await examApi.delete(`/${id}`);
        setExams(c => c.filter(x => x.id !== id));
        showToast('تم الحذف بنجاح', 'success');
      } catch (err) {
        console.error('Delete failed', err);
        showToast('فشل الحذف', 'error');
      }
    }
  };

  const handleSave = async () => {
    try {
      await examApi.post('/', formData);
      showToast('تمت الإضافة بنجاح', 'success');
      setShowModal(false);
      setFormData({ title: '', courseId: '' });
      fetchExams();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'حدث خطأ', 'error');
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
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة امتحان</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
                <td className="py-3 px-4 text-gray-900">{exam.title}</td>
                <td className="py-3 px-4 text-gray-600">{exam.course?.title || exam.courseId}</td>
                <td className="py-3 px-4 text-gray-600">{exam._count?.attempts || 0}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowQuestionModal(true)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      الأسئلة
                    </button>
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">إضافة امتحان جديد</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عنوان الامتحان</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">معرف الدورة (Course ID)</label>
                <input
                  type="text"
                  placeholder="Enter Course ID"
                  value={formData.courseId}
                  onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  حفظ
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">إدارة الأسئلة (سيتم الربط لاحقاً)</h2>
              <button onClick={() => setShowQuestionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
