import { useState, useEffect } from 'react';
import { Play, FileText, CheckCircle, Clock, XCircle, TrendingUp, BookOpen, Award, Loader2, Calendar, UserCheck } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { userService } from '../../services/user.service';
import { analyticsService } from '../../services/analytics.service';

export default function ParentChildrenPage() {
  const { isDark } = useTheme();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildIdx, setSelectedChildIdx] = useState(0);
  const [childData, setChildData] = useState<any>(null);
  const [childAttendance, setChildAttendance] = useState<{ records: any[]; summary: any } | null>(null);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (children.length > 0) {
      fetchChildAnalytics(children[selectedChildIdx].id);
    }
  }, [selectedChildIdx, children]);

  const fetchChildren = async () => {
    try {
      const res = await userService.getChildren();
      setChildren(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch children', err);
    } finally {
      if (children.length === 0) setLoading(false);
    }
  };

  const fetchChildAnalytics = async (childId: string) => {
    setLoading(true);
    try {
      const [analyticsRes, attendanceRes] = await Promise.all([
        analyticsService.getParentChildOverview(childId).catch(() => null),
        userService.getStudentAttendanceById(childId).catch(() => null)
      ]);

      if (analyticsRes && analyticsRes.data) {
        setChildData(analyticsRes.data);
      }

      if (attendanceRes) {
        setChildAttendance({
          records: attendanceRes.data || [],
          summary: attendanceRes.summary || null
        });
      } else {
        setChildAttendance(null);
      }
    } catch (err) {
      console.error('Failed to fetch child analytics or attendance', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && children.length === 0) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <Loader2 className="w-12 h-12 text-cyan-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>متابعة أبنائي</h1>
        <p className={textSecondary}>تابع تقدم وأداء كل ابن/ابنة على المنصة</p>
      </div>

      {children.length === 0 ? (
        <div className={`text-center py-12 ${cardBg} rounded-2xl border`}>
          <p className={textSecondary}>لا يوجد أبناء مرتبطين بحسابك بعد.</p>
        </div>
      ) : (
        <>
          {/* Child Selector */}
          <div className="flex gap-3 mb-8">
            {children.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildIdx(idx)}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${
                  selectedChildIdx === idx
                    ? 'bg-gradient-to-l from-cyan-600 to-blue-600 text-white border-transparent shadow-lg'
                    : isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${selectedChildIdx === idx ? 'bg-white/20' : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'}`}>
                  {c.name.charAt(0)}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{c.name}</p>
                  <p className={`text-xs ${selectedChildIdx === idx ? 'text-cyan-100' : textSecondary}`}>{c.email}</p>
                </div>
              </button>
            ))}
          </div>

          {loading ? (
             <div className="flex justify-center items-center py-12">
               <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
             </div>
          ) : childData && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'المتوسط العام', value: `${childData.overview.overallRate}٪`, icon: Award, color: 'from-indigo-500 to-purple-600' },
                  { label: 'الامتحانات المكتملة', value: childData.overview.examsCompleted, icon: TrendingUp, color: 'from-cyan-500 to-blue-600' },
                  { label: 'الواجبات المكتملة', value: childData.overview.homeworksCompleted, icon: CheckCircle, color: 'from-green-500 to-emerald-600' },
                  { label: 'المرتبة', value: childData.overview.rank || '-', icon: Award, color: 'from-orange-500 to-red-500' },
                ].map((stat, idx) => (
                  <div key={idx} className={`${cardBg} border rounded-2xl p-5`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-sm ${textSecondary}`}>{stat.label}</p>
                    <p className={`text-2xl font-bold ${textPrimary} mt-1`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Activities */}
              <div className={`${cardBg} border rounded-2xl p-6 mb-6`}>
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-5 h-5 text-cyan-600" />
                  <h2 className={`text-lg font-bold ${textPrimary}`}>الأنشطة الأخيرة</h2>
                </div>
                <div className="space-y-4">
                  {childData.recent.slice(0, 5).map((act: any, idx: number) => (
                    <div key={idx} className={`p-4 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'} flex justify-between items-center`}>
                      <div>
                        <h3 className={`font-bold ${textPrimary}`}>{act.title}</h3>
                        <p className={`text-sm ${textSecondary} mt-1`}>{act.type} • {act.date}</p>
                      </div>
                      <div className={`text-left px-4 py-2 rounded-lg font-bold ${act.score >= 90 ? 'bg-green-100 text-green-700' : act.score >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {act.score}%
                      </div>
                    </div>
                  ))}
                  {childData.recent.length === 0 && (
                     <p className={textSecondary}>لا توجد أنشطة مسجلة لهذا الطالب بعد.</p>
                  )}
                </div>
              </div>

              {/* Attendance Records */}
              <div className={`${cardBg} border rounded-2xl p-6 mb-6`}>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <h2 className={`text-lg font-bold ${textPrimary}`}>سجل الحضور والغياب</h2>
                  </div>
                  {childAttendance?.summary && (
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-green-600 font-bold bg-green-50 dark:bg-green-950/40 px-2.5 py-1 rounded-lg">
                        حاضر: {childAttendance.summary.presentCount}
                      </span>
                      <span className="text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
                        متأخر: {childAttendance.summary.lateCount}
                      </span>
                      <span className="text-red-600 font-bold bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg">
                        غائب: {childAttendance.summary.absentCount}
                      </span>
                      {childAttendance.summary.percentage !== null && (
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                          النسبة: {childAttendance.summary.percentage}٪
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {childAttendance && childAttendance.records.length > 0 ? (
                  <div className="space-y-2.5">
                    {childAttendance.records.slice(0, 5).map((rec: any) => {
                      const recDate = new Date(rec.date);
                      return (
                        <div
                          key={rec.id}
                          className={`p-3.5 rounded-xl border ${
                            isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'
                          } flex justify-between items-center`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className={`text-sm font-bold ${textPrimary}`}>
                                {isNaN(recDate.getTime()) ? '-' : recDate.toLocaleDateString('ar-EG')}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {isNaN(recDate.getTime()) ? '-' : recDate.toLocaleDateString('ar-EG', { weekday: 'long' })}
                              </p>
                            </div>
                          </div>

                          <div>
                            {rec.status === 'PRESENT' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                                <CheckCircle className="w-3.5 h-3.5" /> حاضر
                              </span>
                            ) : rec.status === 'LATE' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold">
                                <Clock className="w-3.5 h-3.5" /> متأخر
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
                                <XCircle className="w-3.5 h-3.5" /> غائب
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={textSecondary}>لا يوجد سجل حضور مسجل لهذا الطالب بعد.</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
