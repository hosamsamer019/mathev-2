import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Lock, CheckCircle, Clock } from 'lucide-react';
import { courseService } from '../../services/course.service';


export default function CourseDetailsPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState<any>({ title: 'جاري التحميل...', description: '' });
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    completionPercentage: 0
  });

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    courseService.getCourseDetails(courseId)
      .then((res) => {
        const data = res.data?.data ? res.data.data : res.data;
        if (data) {
          setCourse(data);
          const rawLessons = Array.isArray(data.lessons) ? data.lessons : [];
          if (rawLessons.length > 0) {
            const mappedLessons = rawLessons.map((l: any) => {
              const prog = Array.isArray(l.progress) ? l.progress[0] : (l.progress || null);
              const isCompleted = !!(
                l.completed ||
                prog?.watched ||
                prog?.status === 'COMPLETED' ||
                (prog?.progress && prog.progress >= 90)
              );
              return {
                id: l.id,
                title: l.title,
                duration: l.duration || 'غير محدد',
                completed: isCompleted,
                locked: false
              };
            });
            setLessons(mappedLessons);

            const total = typeof data.totalLessons === 'number' ? data.totalLessons : mappedLessons.length;
            const completed = typeof data.completedLessons === 'number'
              ? data.completedLessons
              : mappedLessons.filter((l: any) => l.completed).length;
            const pct = typeof data.completionPercentage === 'number'
              ? data.completionPercentage
              : (total > 0 ? Math.min(100, Math.max(0, Math.round((completed / total) * 100))) : 0);

            setStats({
              totalLessons: total,
              completedLessons: completed,
              completionPercentage: isNaN(pct) ? 0 : Math.min(100, Math.max(0, pct))
            });
          } else {
            setLessons([]);
            setStats({ totalLessons: 0, completedLessons: 0, completionPercentage: 0 });
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load course details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [courseId]);


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/student/center/courses')}
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-4"
        >
          ← العودة للدورات
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{course.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">{course.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
            {loading ? '-' : stats.totalLessons}
          </div>
          <div className="text-gray-600 dark:text-gray-400">إجمالي الدروس</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            {loading ? '-' : stats.completedLessons}
          </div>
          <div className="text-gray-600 dark:text-gray-400">الدروس المكتملة</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
            {loading ? '-' : `${stats.completionPercentage}%`}
          </div>
          <div className="text-gray-600 dark:text-gray-400">نسبة الإنجاز</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">قائمة الدروس</h2>

        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                lesson.locked
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 cursor-not-allowed'
                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer bg-white dark:bg-gray-800'
              }`}
              onClick={() => !lesson.locked && navigate(`/student/center/videos/${lesson.id}`)}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                lesson.completed
                  ? 'bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400'
                  : lesson.locked
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
              }`}>
                {lesson.completed ? (
                  <CheckCircle className="w-6 h-6" />
                ) : lesson.locked ? (
                  <Lock className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">{lesson.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <Clock className="w-4 h-4" />
                  <span>{lesson.duration}</span>
                  {lesson.completed && (
                    <span className="text-green-600 dark:text-green-400 mr-2">• مكتمل</span>
                  )}
                  {lesson.locked && (
                    <span className="text-gray-400 mr-2">• مقفل</span>
                  )}
                </div>
              </div>

              <div>
                {lesson.locked ? (
                  <span className="text-sm text-gray-400">مقفل</span>
                ) : (
                  <button className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600">
                    مشاهدة
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

