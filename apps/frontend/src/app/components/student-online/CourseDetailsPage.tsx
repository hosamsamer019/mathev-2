import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Play, Lock, CheckCircle, Clock } from 'lucide-react';
import { courseApi } from '../../services/api';

const DEFAULT_LESSONS = [
  { id: '1', title: 'مقدمة في الجبر', duration: '15:30', completed: true, locked: false },
  { id: '2', title: 'العمليات الحسابية الأساسية', duration: '20:15', completed: true, locked: false },
  { id: '3', title: 'المعادلات الخطية', duration: '25:45', completed: true, locked: false },
  { id: '4', title: 'حل المعادلات', duration: '18:20', completed: false, locked: false },
  { id: '5', title: 'المتباينات', duration: '22:10', completed: false, locked: false },
  { id: '6', title: 'الدوال', duration: '30:00', completed: false, locked: true },
];

export default function CourseDetailsPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState<any>({ title: 'الجبر - الصف الأول الثانوي', description: 'تعلم أساسيات الجبر والمعادلات الرياضية' });
  const [lessons, setLessons] = useState<any[]>(DEFAULT_LESSONS);

  useEffect(() => {
    if (!courseId) return;
    courseApi.get(`/${courseId}`)
      .then((res) => {
        if (res.data) {
          setCourse(res.data);
          if (res.data.lessons && res.data.lessons.length > 0) {
            const mappedLessons = res.data.lessons.map((l: any) => ({
              id: l.id,
              title: l.title,
              duration: l.duration || 'غير محدد',
              completed: false, // Could be determined by progress tracking later
              locked: false
            }));
            setLessons(mappedLessons);
          } else {
            setLessons([]);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load course details:', err);
      });
  }, [courseId]);


  return (
    <div className="p-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/student/online/courses')}
          className="text-indigo-600 hover:text-indigo-800 mb-4"
        >
          ← العودة للدورات
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
        <p className="text-gray-600">{course.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="text-3xl font-bold text-indigo-600 mb-2">24</div>
          <div className="text-gray-600">إجمالي الدروس</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="text-3xl font-bold text-green-600 mb-2">16</div>
          <div className="text-gray-600">الدروس المكتملة</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="text-3xl font-bold text-orange-600 mb-2">65%</div>
          <div className="text-gray-600">نسبة الإنجاز</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">قائمة الدروس</h2>

        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                lesson.locked
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-indigo-500 cursor-pointer'
              }`}
              onClick={() => !lesson.locked && navigate(`/student/online/videos/${lesson.id}`)}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                lesson.completed
                  ? 'bg-green-100 text-green-600'
                  : lesson.locked
                  ? 'bg-gray-200 text-gray-400'
                  : 'bg-indigo-100 text-indigo-600'
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
                <h3 className="font-medium text-gray-900">{lesson.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Clock className="w-4 h-4" />
                  <span>{lesson.duration}</span>
                  {lesson.completed && (
                    <span className="text-green-600 mr-2">• مكتمل</span>
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
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
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
