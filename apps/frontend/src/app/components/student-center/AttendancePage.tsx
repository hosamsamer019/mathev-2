import { useEffect, useState } from 'react';
import { userService } from '../../services/user.service';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function AttendancePage() {
  const { isDark } = useTheme();
  const [attendances, setAttendances] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalSessions: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    percentage: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await userService.getAttendance();
      if (res && res.data && Array.isArray(res.data)) {
        setAttendances(res.data);
        if (res.summary) setSummary(res.summary);
      } else if (Array.isArray(res)) {
        setAttendances(res);
        // Calculate fallback summary if API returns plain array
        const total = res.length;
        const present = res.filter((r: any) => r.status === 'PRESENT').length;
        const absent = res.filter((r: any) => r.status === 'ABSENT').length;
        const late = res.filter((r: any) => r.status === 'LATE').length;
        const pct = total > 0 ? Math.round(((present + late) / total) * 100) : null;
        setSummary({
          totalSessions: total,
          presentCount: present,
          absentCount: absent,
          lateCount: late,
          percentage: pct
        });
      } else {
        setAttendances([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch attendance', err);
      setError('فشل في تحميل سجل الحضور. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="p-4 sm:p-6 lg:p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-2`}>سجل الحضور والغياب</h1>
        <p className={textSecondary}>متابعة تفصيلية لحضورك في حصص ومحاضرات السنتر</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        <div className={`${cardBg} border rounded-2xl p-4 sm:p-5 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>إجمالي الحصص</span>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>{summary.totalSessions}</p>
        </div>

        <div className={`${cardBg} border rounded-2xl p-4 sm:p-5 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400 text-xs sm:text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            <span>حاضر</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{summary.presentCount}</p>
        </div>

        <div className={`${cardBg} border rounded-2xl p-4 sm:p-5 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium">
            <XCircle className="w-4 h-4" />
            <span>غائب</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{summary.absentCount}</p>
        </div>

        <div className={`${cardBg} border rounded-2xl p-4 sm:p-5 shadow-sm`}>
          <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-medium">
            <Clock className="w-4 h-4" />
            <span>متأخر</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.lateCount}</p>
        </div>

        <div className={`${cardBg} border rounded-2xl p-4 sm:p-5 shadow-sm col-span-2 sm:col-span-2 lg:col-span-1`}>
          <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400 text-xs sm:text-sm font-medium">
            <BarChart3 className="w-4 h-4" />
            <span>نسبة الحضور</span>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${summary.percentage !== null && summary.percentage >= 75 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {summary.percentage !== null ? `${summary.percentage}٪` : '—'}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={fetchAttendance}
            className="flex items-center gap-1 text-xs font-bold bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-3 py-1.5 rounded-lg hover:opacity-90"
          >
            <RefreshCw className="w-3.5 h-3.5" /> إعادة المحاولة
          </button>
        </div>
      )}

      {/* Attendance History Table */}
      <div className={`${cardBg} border rounded-2xl shadow-sm overflow-hidden`}>
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <h2 className={`text-lg font-bold ${textPrimary}`}>سجل الحصص والأيام</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" /> حاضر
            </span>
            <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg">
              <XCircle className="w-3.5 h-3.5" /> غائب
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5" /> متأخر
            </span>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-right">
            <thead>
              <tr className={`border-b border-gray-100 dark:border-gray-700 ${isDark ? 'bg-gray-750' : 'bg-gray-50/70'}`}>
                <th className="py-3.5 px-6 text-xs font-bold text-gray-600 dark:text-gray-300">التاريخ</th>
                <th className="py-3.5 px-6 text-xs font-bold text-gray-600 dark:text-gray-300">اليوم</th>
                <th className="py-3.5 px-6 text-xs font-bold text-gray-600 dark:text-gray-300">حالة الحضور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-gray-400 text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    جاري تحميل سجل الحضور...
                  </td>
                </tr>
              )}

              {!loading && !error && attendances.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-gray-400 text-sm">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    لا يوجد سجل حضور مسجل حتى الآن.
                  </td>
                </tr>
              )}

              {!loading && attendances.map((record) => {
                const recDate = new Date(record.date);
                return (
                  <tr key={record.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition-colors`}>
                    <td className="py-4 px-6 text-sm font-medium">
                      <div className="flex items-center gap-2.5 text-gray-900 dark:text-gray-100">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{isNaN(recDate.getTime()) ? '-' : recDate.toLocaleDateString('ar-EG')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-300">
                      {isNaN(recDate.getTime()) ? '-' : recDate.toLocaleDateString('ar-EG', { weekday: 'long' })}
                    </td>
                    <td className="py-4 px-6">
                      {record.status === 'PRESENT' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> حاضر
                        </span>
                      ) : record.status === 'LATE' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" /> متأخر
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
                          <XCircle className="w-3.5 h-3.5" /> غائب
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
