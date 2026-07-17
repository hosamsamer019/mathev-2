import { useState } from 'react';
import {
  Search, Filter, Plus, MoreVertical, TrendingUp, TrendingDown,
  Minus, Eye, MessageCircle, AlertTriangle, CheckCircle, Users, Download
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const students = [
  { id: 1, name: 'أحمد محمد علي', grade: 'ثانوي ٢', type: 'أونلاين', avg: 88, status: 'ممتاز', trend: 'up', lastActive: 'اليوم', homework: 95, exams: 82, attendance: 98 },
  { id: 2, name: 'سارة خالد حسن', grade: 'ثانوي ٣', type: 'سنتر', avg: 76, status: 'جيد جداً', trend: 'stable', lastActive: 'أمس', homework: 80, exams: 74, attendance: 90 },
  { id: 3, name: 'محمود عبدالرحمن', grade: 'ثانوي ٢', type: 'أونلاين', avg: 45, status: 'في خطر', trend: 'down', lastActive: 'منذ ٣ أيام', homework: 40, exams: 48, attendance: 60 },
  { id: 4, name: 'فاطمة إبراهيم', grade: 'ثانوي ١', type: 'سنتر', avg: 92, status: 'ممتاز', trend: 'up', lastActive: 'اليوم', homework: 98, exams: 90, attendance: 100 },
  { id: 5, name: 'كريم عمر', grade: 'ثانوي ٣', type: 'أونلاين', avg: 62, status: 'جيد', trend: 'up', lastActive: 'اليوم', homework: 65, exams: 60, attendance: 75 },
  { id: 6, name: 'نور محمد', grade: 'ثانوي ١', type: 'أونلاين', avg: 55, status: 'ضعيف', trend: 'down', lastActive: 'منذ أسبوع', homework: 50, exams: 58, attendance: 55 },
  { id: 7, name: 'عمر حسام', grade: 'ثانوي ٢', type: 'سنتر', avg: 84, status: 'جيد جداً', trend: 'up', lastActive: 'أمس', homework: 88, exams: 82, attendance: 95 },
  { id: 8, name: 'ليلى أحمد', grade: 'ثانوي ٣', type: 'سنتر', avg: 71, status: 'جيد', trend: 'stable', lastActive: 'اليوم', homework: 75, exams: 68, attendance: 85 },
];

const statusConfig: Record<string, { color: string; bg: string; icon: React.ComponentType<{className?: string}> }> = {
  'ممتاز': { color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
  'جيد جداً': { color: 'text-blue-700', bg: 'bg-blue-100', icon: TrendingUp },
  'جيد': { color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Minus },
  'ضعيف': { color: 'text-orange-700', bg: 'bg-orange-100', icon: TrendingDown },
  'في خطر': { color: 'text-red-700', bg: 'bg-red-100', icon: AlertTriangle },
};

export default function TeacherStudentsPage() {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<typeof students[0] | null>(null);

  const filtered = students.filter(s =>
    s.name.includes(search) &&
    (filter === 'all' || s.type === filter || s.status === filter)
  );

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>إدارة الطلاب</h1>
          <p className={textSecondary}>متابعة أداء وتقدم جميع طلابك</p>
        </div>
        <div className="flex gap-3">
          <button className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} text-sm transition-colors`}>
            <Download className="w-4 h-4" /> تصدير Excel
          </button>
          <button className="flex items-center gap-2 bg-gradient-to-l from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> إضافة طالب
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إجمالي الطلاب', value: students.length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'أونلاين', value: students.filter(s => s.type === 'أونلاين').length, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'سنتر', value: students.filter(s => s.type === 'سنتر').length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'في خطر', value: students.filter(s => s.status === 'في خطر' || s.status === 'ضعيف').length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map((stat, idx) => (
          <div key={idx} className={`${cardBg} border rounded-xl p-4`}>
            <p className={`text-sm ${textSecondary}`}>{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className={`${cardBg} border rounded-2xl p-4 mb-6`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 ${textSecondary}`} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الطالب..."
              className={`w-full pr-10 pl-4 py-2.5 rounded-xl text-sm border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'أونلاين', label: 'أونلاين' },
              { key: 'سنتر', label: 'سنتر' },
              { key: 'في خطر', label: 'في خطر' },
              { key: 'ممتاز', label: 'ممتاز' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                  filter === f.key
                    ? 'bg-emerald-600 text-white'
                    : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <tr>
                {['الطالب', 'الصف / النوع', 'المتوسط', 'الواجبات', 'الامتحانات', 'الحضور', 'الحالة', 'الاتجاه', 'إجراءات'].map((h) => (
                  <th key={h} className={`px-4 py-3 text-right text-xs font-semibold ${textSecondary} whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((student) => {
                const status = statusConfig[student.status];
                return (
                  <tr
                    key={student.id}
                    className={`transition-colors ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} cursor-pointer`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${textPrimary}`}>{student.name}</p>
                          <p className={`text-xs ${textSecondary}`}>{student.lastActive}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className={`text-sm ${textPrimary}`}>{student.grade}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${student.type === 'أونلاين' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {student.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${student.avg >= 80 ? 'text-green-600' : student.avg >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {student.avg}٪
                        </span>
                      </div>
                      <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-1 mt-1">
                        <div
                          className={`h-1 rounded-full ${student.avg >= 80 ? 'bg-green-500' : student.avg >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${student.avg}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm ${textPrimary}`}>{student.homework}٪</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm ${textPrimary}`}>{student.exams}٪</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm ${student.attendance >= 80 ? 'text-green-600' : 'text-red-600'}`}>{student.attendance}٪</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.bg} ${status.color}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {student.trend === 'up' ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : student.trend === 'down' ? (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      ) : (
                        <Minus className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button className={`p-1.5 rounded-lg ${textSecondary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div
            className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 w-full max-w-lg shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>{selectedStudent.name}</h2>
                <p className={textSecondary}>{selectedStudent.grade} • {selectedStudent.type}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'المتوسط العام', value: `${selectedStudent.avg}٪`, color: 'text-indigo-600' },
                { label: 'الواجبات', value: `${selectedStudent.homework}٪`, color: 'text-green-600' },
                { label: 'الامتحانات', value: `${selectedStudent.exams}٪`, color: 'text-blue-600' },
              ].map((stat, idx) => (
                <div key={idx} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-3 text-center`}>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  <p className={`text-xs ${textSecondary}`}>{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button className="flex-1 bg-gradient-to-l from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-medium hover:opacity-90 flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> عرض التفاصيل
              </button>
              <button className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <MessageCircle className="w-4 h-4" /> مراسلة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
