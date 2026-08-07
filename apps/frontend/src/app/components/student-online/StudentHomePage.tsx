import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, ClipboardCheck, TrendingUp, Clock } from 'lucide-react';
import { courseService } from '../../services/course.service';
import { analyticsService } from '../../services/analytics.service';
import { useTheme } from '../../contexts/ThemeContext';

export default function StudentHomePage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [continueWatching, setContinueWatching] = useState<any>(null);
  const [stats, setStats] = useState({ coursesEnrolled: 0, lessonsCompleted: 0, examsCompleted: 0, averageScore: 0 });
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, coursesRes] = await Promise.all([
          analyticsService.getStudentOverview(),
          courseService.getCourses()
        ]);

        const overview = overviewRes.data;
        setStats({
          coursesEnrolled: overview?.coursesEnrolled || 0,
          lessonsCompleted: overview?.lessonsCompleted || 0,
          examsCompleted: overview?.examsCompleted || 0,
          averageScore: overview?.overallRate || 0
        });

        const courses = coursesRes.data.data ? coursesRes.data.data : Array.isArray(coursesRes.data) ? coursesRes.data : [];
        setRecentCourses(courses.slice(0, 4));

        // Find the last lesson with progress (continue watching)
        if (overview?.lastWatchedLesson) {
          setContinueWatching(overview.lastWatchedLesson);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'دورات مسجلة', value: stats.coursesEnrolled, icon: BookOpen, color: 'from-blue-500 to-indigo-600' },
    { label: 'دروس مكتملة', value: stats.lessonsCompleted, icon: Play, color: 'from-green-500 to-emerald-600' },
    { label: 'امتحانات مجتازة', value: stats.examsCompleted, icon: ClipboardCheck, color: 'from-orange-500 to-red-500' },
    { label: 'المعدل العام', value: `${stats.averageScore}%`, icon: TrendingUp, color: 'from-violet-500 to-purple-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      {/* Continue Watching Hero */}
      {continueWatching && (
        <div
          onClick={() => navigate(`/student/online/videos/${continueWatching.lessonId}`)}
          className="relative mb-8 rounded-2xl overflow-hidden cursor-pointer group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 to-blue-600/80 z-10" />
          <div className="relative z-20 p-8 flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
            <div className="flex-1">
              <p className="text-white/80 text-sm font-medium mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4" /> أكمل المشاهدة
              </p>
              <h2 className="text-xl font-bold text-white">{continueWatching.lessonTitle}</h2>
              <p className="text-white/70 text-sm mt-1">{continueWatching.courseName}</p>
              {/* Progress bar */}
              <div className="mt-3 w-full max-w-xs h-1.5 bg-white/20 rounded-full">
                <div className="h-full bg-white rounded-full" style={{ width: `${continueWatching.progress || 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, idx) => (
          <div key={idx} className={`${cardBg} border rounded-2xl p-5 relative overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
            <div className="relative">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className={`text-sm ${textSecondary} mb-1`}>{stat.label}</p>
              <span className={`text-xl font-bold ${textPrimary}`}>{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Courses */}
      <div className="mb-8">
        <h2 className={`text-lg font-bold ${textPrimary} mb-4`}>الدورات الأخيرة</h2>
        {recentCourses.length === 0 ? (
          <div className={`${cardBg} border rounded-2xl p-8 text-center`}>
            <BookOpen className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
            <p className={`font-medium ${textPrimary}`}>لا توجد دورات مسجلة بعد</p>
            <button
              onClick={() => navigate('/student/online/courses')}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-medium"
            >
              استعرض الدورات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentCourses.map((course) => (
              <div
                key={course.id}
                className={`${cardBg} border rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow`}
                onClick={() => navigate(`/student/online/courses/${course.id}`)}
              >
                <div className="h-32 bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-white/60" />
                </div>
                <div className="p-4">
                  <h3 className={`font-semibold text-sm ${textPrimary} line-clamp-2`}>{course.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
