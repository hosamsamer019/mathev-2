import { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock } from 'lucide-react';
import { courseApi, homeworkApi } from '../../services/api';

export default function HomeworkPage() {
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeworkApi.get('/')
      .then(res => setHomeworks(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الواجبات</h1>
        <p className="text-gray-600">قم بحل الواجبات في المواعيد المحددة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && <div className="col-span-3 text-center py-8 text-gray-500">جاري تحميل الواجبات...</div>}
        {!loading && homeworks.length === 0 && <div className="col-span-3 text-center py-8 text-gray-500">لا توجد واجبات حالياً</div>}
        {homeworks.map((hw) => (
          <div key={hw.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                hw.status === 'completed' || hw.status === 'done' ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                {hw.status === 'completed' || hw.status === 'done' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <FileText className="w-6 h-6 text-yellow-600" />
                )}
              </div>
              {hw.score && (
                <div className="text-2xl font-bold text-green-600">{hw.score}%</div>
              )}
            </div>

            <h3 className="font-bold text-gray-900 mb-2">{hw.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Clock className="w-4 h-4" />
              <span>الموعد: {hw.deadline}</span>
            </div>

            <div className={`px-3 py-1 rounded-full text-sm inline-block ${
              hw.status === 'completed' || hw.status === 'done'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {hw.status === 'completed' || hw.status === 'done' ? 'مكتمل' : 'قيد الانتظار'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
