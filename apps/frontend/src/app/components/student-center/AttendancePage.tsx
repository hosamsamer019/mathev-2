import { useEffect, useState } from 'react';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';
import { userApi } from '../../services/api';

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      // Assuming userApi handles /api/users
      // Since attendance is /api/attendance, we can just use userApi but change baseURL or use a new attendanceApi.
      // Wait, let's use userApi and just change the URL path relative to the domain, or create attendanceApi.
      // To be safe, we'll fetch from standard userApi if it's on the same port, or use fetch.
      // I'll create a dedicated api instance in the file for simplicity or just use axios directly.
      const res = await userApi.get('http://localhost:4002/api/attendance/my-attendance');
      setAttendances(res.data || []);
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">سجل الحضور</h1>
        <p className="text-gray-600">تابع سجل حضورك في السنتر</p>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">سجل الأيام</h2>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">حاضر</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-700">غائب</span>
            </div>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-right py-4 px-6 font-medium text-gray-700">التاريخ</th>
              <th className="text-right py-4 px-6 font-medium text-gray-700">اليوم</th>
              <th className="text-right py-4 px-6 font-medium text-gray-700">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="text-center py-8 text-gray-500">جاري تحميل السجل...</td></tr>
            )}
            {!loading && attendances.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 text-gray-500">لا يوجد سجل حضور حالياً.</td></tr>
            )}
            {attendances.map((record) => (
              <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 text-gray-900">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span>{new Date(record.date).toLocaleDateString('ar-EG')}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-gray-600">
                  {new Date(record.date).toLocaleDateString('ar-EG', { weekday: 'long' })}
                </td>
                <td className="py-4 px-6">
                  {record.status === 'PRESENT' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      <CheckCircle className="w-4 h-4" /> حاضر
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                      <XCircle className="w-4 h-4" /> غائب
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
