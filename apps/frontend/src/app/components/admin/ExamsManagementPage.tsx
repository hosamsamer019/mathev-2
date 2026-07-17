import { useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';

export default function ExamsManagementPage() {
  const [showModal, setShowModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  const exams = [
    { id: 1, title: 'امتحان الجبر - الشهر الأول', course: 'الجبر', questions: 15, duration: 30, status: 'نشط' },
    { id: 2, title: 'امتحان الهندسة', course: 'الهندسة', questions: 20, duration: 45, status: 'مسودة' },
  ];

  return (
    <div className="p-8">
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
              <th className="text-right py-3 px-4 font-medium text-gray-700">عدد الأسئلة</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">المدة (دقيقة)</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">الحالة</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <tr key={exam.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-900">{exam.title}</td>
                <td className="py-3 px-4 text-gray-600">{exam.course}</td>
                <td className="py-3 px-4 text-gray-600">{exam.questions}</td>
                <td className="py-3 px-4 text-gray-600">{exam.duration}</td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    exam.status === 'نشط'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {exam.status}
                  </span>
                </td>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">مدة الامتحان (بالدقائق)</label>
                <input
                  type="number"
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

      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">إدارة الأسئلة</h2>
              <button onClick={() => setShowQuestionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <button className="w-full mb-6 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700">
              <Plus className="w-5 h-5" />
              <span>إضافة سؤال جديد</span>
            </button>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">السؤال 1: ما هو حل المعادلة x + 5 = 10؟</h3>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <input type="radio" name="q1" />
                    <label className="text-gray-700">x = 3</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="q1" checked />
                    <label className="text-gray-700">x = 5 ✓</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="q1" />
                    <label className="text-gray-700">x = 10</label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    تعديل
                  </button>
                  <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                    حذف
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
