import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Video, FileText, Lock, CheckCircle } from 'lucide-react';
import { courseService } from '../../services/course.service';
import { useSocket } from '../../contexts/SocketContext';

// Mocks removed

export default function CoursesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'my_courses' | 'available_courses'>('my_courses');
  const [courses, setCourses] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [enrolling, setEnrolling] = useState<string|null>(null);

  const fetchCourses = () => {
    courseService.getCourses()
      .then((res) => {
        const data = res.data.data ? res.data.data : Array.isArray(res.data) ? res.data : [];
        if (data.length > 0) {
          const mapped = data.map((c: any) => ({
            id: c.id,
            title: c.title,
            category: c.category,
            progress: 0,
            lessons: c._count?.lessons || 0,
            completed: 0,
            thumbnail: c.thumbnail || 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400&h=250&fit=crop',
            locked: false
          }));
          setCourses(mapped);
        } else {
          setCourses([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load courses from API:', err);
        setError('فشل تحميل الدورات من الخادم.');
      });

    courseService.getAvailableCourses()
      .then((res) => {
        const data = res.data.data ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setAvailableCourses(data);
      })
      .catch((err) => console.error('Failed to load available courses', err))
      .finally(() => setLoading(false));
  };

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrolling(courseId);
      await courseService.enrollCourse(courseId);
      fetchCourses();
      setActiveTab('my_courses');
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل التسجيل في الدورة');
    } finally {
      setEnrolling(null);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const { socket } = useSocket();
  
  // Realtime Socket fallback with reliable Vercel-compatible polling
  useEffect(() => {
    // 10 second polling interval
    const intervalId = setInterval(() => {
      fetchCourses();
    }, 10000);

    if (socket) {
      const handleSync = () => fetchCourses();
      socket.on('course_created', handleSync);
      socket.on('course_updated', handleSync);
      socket.on('course_deleted', handleSync);
      
      return () => {
        clearInterval(intervalId);
        socket.off('course_created', handleSync);
        socket.off('course_updated', handleSync);
        socket.off('course_deleted', handleSync);
      };
    }

    return () => clearInterval(intervalId);
  }, [socket]);
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الدورات</h1>
        <p className="text-gray-600">تصفح الدورات المتاحة وتابع تقدمك</p>
      </div>
      
      <div className="flex gap-4 border-b border-gray-200 mb-8">
        <button 
          onClick={() => setActiveTab('my_courses')}
          className={`pb-4 px-2 font-medium text-lg ${activeTab === 'my_courses' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          دوراتي
        </button>
        <button 
          onClick={() => setActiveTab('available_courses')}
          className={`pb-4 px-2 font-medium text-lg ${activeTab === 'available_courses' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          تصفح الدورات
        </button>
      </div>

      {loading && <div className="text-center py-8 text-gray-500">جاري تحميل الدورات...</div>}
      {error && <div className="text-center py-8 text-red-500 bg-red-50 rounded-xl mb-4">{error}</div>}
      
      {!loading && !error && activeTab === 'my_courses' && courses.length === 0 && <div className="text-center py-8 text-gray-500">لا توجد دورات متاحة حالياً.</div>}

      {!loading && !error && activeTab === 'my_courses' && courses.length > 0 && (
        <div className="space-y-12">
          {Object.entries(courses.reduce((acc, course) => {
            const cat = course.category || 'عام';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(course);
            return acc;
          }, {} as Record<string, any[]>)).map(([category, categoryCourses]: [string, any]) => (
            <div key={category}>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                {category}
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {categoryCourses.length} دورات
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryCourses.map((course: any) => (
                  <div
                    key={course.id}
                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => !course.locked && navigate(`/student/center/courses/${course.id}`)}
                  >
                    <div className="relative h-48">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      {course.locked && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <div className="text-center text-white">
                            <Lock className="w-12 h-12 mx-auto mb-2" />
                            <p className="font-medium">مقفل</p>
                          </div>
                        </div>
                      )}
                      {!course.locked && course.progress > 0 && (
                        <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded-full text-sm font-medium">
                          {course.progress}%
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{course.title}</h3>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <Video className="w-4 h-4" />
                          <span>{course.lessons} درس</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{course.completed} مكتمل</span>
                        </div>
                      </div>

                      {!course.locked && course.progress > 0 && (
                        <div className="mb-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${course.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <button
                        className={`w-full py-2 rounded-lg font-medium ${
                          course.locked
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                        disabled={course.locked}
                      >
                        {course.locked ? 'مقفل' : 'متابعة التعلم'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && activeTab === 'available_courses' && availableCourses.length === 0 && (
        <div className="text-center py-8 text-gray-500">لا توجد دورات إضافية متاحة حالياً.</div>
      )}

      {!loading && !error && activeTab === 'available_courses' && availableCourses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCourses.map((course: any) => (
            <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative h-48">
                <img
                  src={course.thumbnail || 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400&h=250&fit=crop'}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{course.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    <span>{course._count?.lessons || 0} درس</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-indigo-700">
                    <span>{course.price > 0 ? `${course.price} ج.م` : 'مجاني'}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleEnroll(course.id)}
                  disabled={enrolling === course.id}
                  className={`w-full py-2 rounded-lg font-medium text-white ${
                    enrolling === course.id ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {enrolling === course.id ? 'جاري التسجيل...' : 'التسجيل في الدورة'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

