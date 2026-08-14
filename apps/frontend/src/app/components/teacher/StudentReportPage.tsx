import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { analyticsService } from '../../services/analytics.service';
import { ArrowRight, BookOpen, CheckCircle, Clock, Video, Loader2, AlertCircle } from 'lucide-react';

export default function StudentReportPage() {
  const { isDark } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  useEffect(() => {
    if (id) {
      fetchReport(id);
    }
  }, [id]);

  const fetchReport = async (studentId: string) => {
    try {
      setLoading(true);
      const res = await analyticsService.getStudentReport(studentId);
      setReport(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل التقرير');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-emerald-600 hover:underline mb-6">
          <ArrowRight className="w-5 h-5" /> رجوع
        </button>
        <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center min-h-[300px] ${isDark ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
          <AlertCircle className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-bold">{error || 'لم يتم العثور على التقرير'}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-emerald-600 hover:underline mb-6">
        <ArrowRight className="w-5 h-5" /> رجوع للطلاب
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {report.name ? report.name.charAt(0) : 'ط'}
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>{report.name || 'طالب غير معروف'}</h1>
          <p className={textSecondary}>{report.email} • {report.role === 'ONLINE_STUDENT' ? 'أونلاين' : 'سنتر'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exams */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h2 className={`text-lg font-bold ${textPrimary}`}>الامتحانات ({report.examAttempts?.length || 0})</h2>
          </div>
          {report.examAttempts?.length > 0 ? (
            <div className="space-y-3">
              {report.examAttempts.map((attempt: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-100 bg-gray-50'} flex justify-between items-center`}>
                  <div>
                    <p className={`font-medium ${textPrimary}`}>{attempt.exam?.title || 'امتحان'}</p>
                    <p className={`text-xs ${textSecondary}`}>{attempt.exam?.course?.title}</p>
                  </div>
                  <span className={`font-bold px-2 py-1 rounded-lg text-sm ${attempt.score >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {attempt.score}٪
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${textSecondary}`}>لم يقدم أي امتحانات بعد.</p>
          )}
        </div>

        {/* Homework */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className={`text-lg font-bold ${textPrimary}`}>الواجبات المسلمة ({report.submissions?.length || 0})</h2>
          </div>
          {report.submissions?.length > 0 ? (
            <div className="space-y-3">
              {report.submissions.map((sub: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-100 bg-gray-50'} flex justify-between items-center`}>
                  <div>
                    <p className={`font-medium ${textPrimary}`}>{sub.homework?.title || 'واجب'}</p>
                    <p className={`text-xs ${textSecondary}`}>{sub.homework?.course?.title}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${sub.grade ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {sub.grade !== null ? `${sub.grade} درجة` : 'في انتظار التقييم'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${textSecondary}`}>لم يسلم أي واجبات بعد.</p>
          )}
        </div>

        {/* Video Progress */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-5 h-5 text-purple-600" />
            <h2 className={`text-lg font-bold ${textPrimary}`}>الفيديوهات المشاهدة ({report.videoProgress?.length || 0})</h2>
          </div>
          {report.videoProgress?.length > 0 ? (
            <div className="space-y-3">
              {report.videoProgress.map((vp: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <p className={`font-medium ${textPrimary} truncate`}>{vp.lesson?.title || 'درس'}</p>
                    <span className={`font-bold text-sm ${textPrimary}`}>{vp.progress}٪</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${vp.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${textSecondary}`}>لم يشاهد أي فيديوهات بعد.</p>
          )}
        </div>

        {/* Attendance */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-600" />
            <h2 className={`text-lg font-bold ${textPrimary}`}>سجل الحضور ({report.attendances?.length || 0})</h2>
          </div>
          {report.attendances?.length > 0 ? (
            <div className="space-y-3">
              {report.attendances.map((att: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-100 bg-gray-50'} flex justify-between items-center`}>
                  <p className={`text-sm ${textPrimary}`}>{new Date(att.date).toLocaleDateString('ar-EG')}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${att.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {att.status === 'PRESENT' ? 'حاضر' : 'غائب'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${textSecondary}`}>لا يوجد سجل حضور.</p>
          )}
        </div>
      </div>
    </div>
  );
}
