import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { courseApi, homeworkApi } from '../../services/api';

const DEFAULT_HOMEWORKS = [
  { id: '1', title: 'واجب الجبر - الأسبوع الأول', course: 'الجبر', questions: 10, deadline: '2026-04-25', status: 'نشط' },
  { id: '2', title: 'واجب المعادلات', course: 'الجبر', questions: 8, deadline: '2026-04-30', status: 'نشط' },
];

export default function HomeworkManagementPage() {
  const [showModal, setShowModal] = useState(false);
  const [homeworks, setHomeworks] = useState<any[]>(DEFAULT_HOMEWORKS);

  useEffect(() => {
    homeworkApi.get('/')
      .then(res => {
        const data = res.data.data ? res.data.data : Array.isArray(res.data) ? res.data : [];
        if (data.length > 0) {
          const mapped = data.map((hw: any) => ({
            id: hw.id,
            title: hw.title,
            course: hw.course?.title || 'غير محدد',
            questions: hw.questions?.length || 0,
            deadline: new Date(hw.deadline).toLocaleDateString(),
            status: hw.status === 'active' ? 'نشط' : 'مسودة'
          }));
          setHomeworks(mapped);
        } else {
          setHomeworks([]);
        }
      })
      .catch(err => console.error('Error fetching admin homeworks', err));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة الواجبات</h1>
          <p className="text-gray-600">إنشاء وإدارة الواجبات المنزلية</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة واجب</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-right py-3 px-4 font-medium text-gray-700">عنوان الواجب</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">الدورة</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">عدد الأسئلة</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">الموعد النهائي</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">الحالة</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {homeworks.map((hw) => (
              <tr key={hw.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-900">{hw.title}</td>
                <td className="py-3 px-4 text-gray-600">{hw.course}</td>
                <td className="py-3 px-4 text-gray-600">{hw.questions}</td>
                <td className="py-3 px-4 text-gray-600">{hw.deadline}</td>
                <td className="py-3 px-4">
                  <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    {hw.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded">
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
              <h2 className="text-2xl font-bold text-gray-900">إضافة واجب جديد</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عنوان الواجب</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الدورة</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option>الجبر</option>
                  <option>الهندسة</option>
                  <option>حساب المثلثات</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الموعد النهائي</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
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
