import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { courseApi } from '../../services/api';

export default function CoursesManagementPage() {
  const [showModal, setShowModal] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({ title: '', description: '', teacherId: '' });
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await courseApi.get('/');
      setCourses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch courses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await courseApi.delete(`/${id}`);
        setCourses(c => c.filter(x => x.id !== id));
        showToast('تم الحذف بنجاح', 'success');
      } catch (err) {
        console.error('Delete failed', err);
        showToast('فشل الحذف', 'error');
      }
    }
  };

  const handleSave = async () => {
    try {
      await courseApi.post('/courses', formData);
      showToast('تمت الإضافة بنجاح', 'success');
      setShowModal(false);
      setFormData({ title: '', description: '', teacherId: '' });
      fetchCourses();
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة الدورات</h1>
          <p className="text-gray-600">إنشاء وتعديل الدورات التعليمية</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة دورة</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && <div className="col-span-3 text-center py-8 text-gray-500">جاري تحميل الدورات...</div>}
        {!loading && courses.length === 0 && <div className="col-span-3 text-center py-8 text-gray-500">لا توجد دورات حالياً</div>}
        {courses.map((course) => (
          <div key={course.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-lg">{course.title}</h3>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">الوصف: {course.description}</p>
              <p className="text-sm text-gray-600">عدد الدروس: {course._count?.lessons || 0}</p>
              <p className="text-sm text-gray-600">عدد الطلاب: {course._count?.enrollments || 0}</p>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                <Edit className="w-4 h-4" />
                <span>تعديل</span>
              </button>
              <button onClick={() => handleDelete(course.id)} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
                <Trash2 className="w-4 h-4" />
                <span>حذف</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">إضافة دورة جديدة</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عنوان الدورة</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">معرف المعلم (Teacher ID)</label>
                <input
                  type="text"
                  placeholder="Enter Teacher ID"
                  value={formData.teacherId}
                  onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
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
    </div>
  );
}
