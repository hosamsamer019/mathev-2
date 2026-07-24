import { useEffect, useState } from 'react';
import { Plus, Play, Edit, Trash2, Eye, Upload, Youtube, Clock, Users, Star, BookOpen } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { courseApi } from '../../services/api';

const videoTypes = [
  { icon: Upload, label: 'رفع فيديو محلي', color: 'bg-blue-100 text-blue-700' },
  { icon: Youtube, label: 'رابط يوتيوب', color: 'bg-red-100 text-red-700' },
  { icon: Play, label: 'تسجيل مباشر', color: 'bg-green-100 text-green-700' },
];

export default function TeacherCoursesPage() {
  const { isDark } = useTheme();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [activeTab, setActiveTab] = useState<'courses' | 'videos'>('courses');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [lessonAnalytics, setLessonAnalytics] = useState<Record<string, any[]>>({});

  // Video Form State
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [newQuiz, setNewQuiz] = useState({ timestampSec: '', question: '', options: '', correctAnswer: '' });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await courseApi.get('/');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description || '',
          students: c.students || 0,
          videos: c.lessons?.length || 0,
          rating: c.rating || 5.0,
          progress: 0,
          status: c.status || 'مفعّل',
          level: c.level || 'ثانوي',
          thumbnail: c.thumbnail || '📚',
          color: c.color || 'from-indigo-500 to-blue-600',
          lessons: c.lessons || []
        }));
        setCourses(mapped);
      } else {
        setCourses([]);
      }
    } catch (err) {
      console.error('Failed to fetch teacher courses:', err);
      setError('فشل في جلب الدورات.');
    } finally {
      setLoading(false);
    }
  };

  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState('ثانوي ١');

  const handleAddCourse = async () => {
    if (!newCourseTitle.trim()) {
      alert('يرجى كتابة اسم الدورة');
      return;
    }
    try {
      await courseApi.post('/', { title: newCourseTitle, level: newCourseLevel });
      setShowAddCourse(false);
      setNewCourseTitle('');
      fetchCourses();
    } catch (err) {
      console.error('Failed to add course', err);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if(confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await courseApi.delete(`/${id}`);
        setCourses(c => c.filter(x => x.id !== id));
      } catch(err) {
        console.error('Delete failed', err);
      }
    }
  };

  const handleAddVideoSubmit = async () => {
    if (!videoTitle || !videoUrl || !selectedCourseId) {
      alert('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    try {
      await courseApi.post('/lessons', { 
        title: videoTitle, 
        videoUrl: videoUrl, 
        pdfUrl: pdfUrl || undefined,
        courseId: selectedCourseId,
        quizzes: quizzes.map(q => ({
          ...q,
          timestampSec: parseFloat(q.timestampSec),
          options: q.options.split('-').map((o:string) => o.trim())
        }))
      });
      setShowAddVideo(false);
      setVideoTitle('');
      setVideoUrl('');
      setPdfUrl('');
      setQuizzes([]);
      setSelectedCourseId('');
      alert('تم إضافة الفيديو بنجاح');
      fetchCourses();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إضافة الفيديو');
    }
  };

  const handleAddQuiz = () => {
    if(newQuiz.timestampSec && newQuiz.question && newQuiz.options && newQuiz.correctAnswer) {
      if (!newQuiz.options.includes('-')) {
        alert('يجب أن تحتوي الخيارات على علامة "-" للفصل بينها. مثال: الإجابة الأولى - الإجابة الثانية');
        return;
      }
      setQuizzes([...quizzes, newQuiz]);
      setNewQuiz({ timestampSec: '', question: '', options: '', correctAnswer: '' });
    } else {
      alert('يرجى تعبئة جميع حقول الاختبار');
    }
  };

  const handleViewCourse = async (course: any) => {
    setSelectedCourse(course);
    // Fetch analytics for all lessons in this course
    try {
      const res = await courseApi.get(`/${course.id}`);
      const courseDetails = res.data;
      
      const analyticsObj: Record<string, any[]> = {};
      for (const lesson of courseDetails.lessons || []) {
        try {
          const analyticsRes = await courseApi.get(`/lessons/${lesson.id}/analytics`);
          analyticsObj[lesson.id] = Array.isArray(analyticsRes.data) ? analyticsRes.data : [];
        } catch (err) {
          analyticsObj[lesson.id] = [];
        }
      }
      setLessonAnalytics(analyticsObj);
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا الفيديو؟')) {
      try {
        await courseApi.delete(`/lessons/${videoId}`);
        alert('تم حذف الفيديو بنجاح');
        fetchCourses(); // refresh the list
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء حذف الفيديو');
      }
    }
  };

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>الدورات والمحتوى</h1>
          <p className={textSecondary}>إدارة الدورات والفيديوهات التعليمية</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddVideo(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} text-sm transition-colors`}
          >
            <Play className="w-4 h-4" /> إضافة فيديو
          </button>
          <button
            onClick={() => setShowAddCourse(true)}
            className="flex items-center gap-2 bg-gradient-to-l from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> دورة جديدة
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 mb-6 ${cardBg} border rounded-xl p-1 w-fit`}>
        {[{ key: 'courses', label: 'الدورات' }, { key: 'videos', label: 'مكتبة الفيديوهات' }].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'courses' | 'videos')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white'
                : `${textSecondary} hover:${isDark ? 'text-white' : 'text-gray-900'}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'الدورات الكلية', value: courses.length, icon: BookOpen },
          { label: 'الطلاب المسجلين', value: courses.reduce((a, c) => a + c.students, 0), icon: Users },
          { label: 'إجمالي الفيديوهات', value: courses.reduce((a, c) => a + c.videos, 0), icon: Play },
          { label: 'متوسط التقييم', value: '٤.٧ ⭐', icon: Star },
        ].map((stat, idx) => (
          <div key={idx} className={`${cardBg} border rounded-xl p-4 flex items-center gap-3`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <stat.icon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className={`text-sm ${textSecondary}`}>{stat.label}</p>
              <p className={`text-lg font-bold ${textPrimary}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className={`text-center py-8 ${textSecondary}`}>جاري تحميل البيانات...</div>}
      {error && <div className="text-center py-8 text-red-500 bg-red-50 rounded-xl mb-4 border border-red-200">{error}</div>}

      {/* Courses & Videos Grid */}
      {!loading && !error && (
      <div>
        {activeTab === 'courses' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <div key={course.id} className={`${cardBg} border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow`}>
                <div className={`bg-gradient-to-l ${course.color} p-6 relative`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-4xl">{course.thumbnail}</span>
                      <h3 className="text-xl font-bold text-white mt-3">{course.title}</h3>
                      <p className="text-white/70 text-sm mt-1">{course.level}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      course.status === 'مفعّل' ? 'bg-green-400/20 text-green-100' : 'bg-gray-400/20 text-gray-100'
                    }`}>
                      {course.status}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <p className={`text-sm ${textSecondary} mb-4 line-clamp-2`}>{course.description}</p>
                  <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <Users className={`w-4 h-4 ${textSecondary}`} />
                      <span className={textSecondary}>{course.students} طالب</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Play className={`w-4 h-4 ${textSecondary}`} />
                      <span className={textSecondary}>{course.videos} فيديو</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className={textSecondary}>{course.rating}</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={textSecondary}>التقدم</span>
                      <span className={`font-medium ${textPrimary}`}>{course.progress}٪</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-l ${course.color}`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleViewCourse(course)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-medium bg-gradient-to-l ${course.color} text-white hover:opacity-90 transition-opacity`}>
                      <Eye className="w-4 h-4" /> تقارير المشاهدة
                    </button>
                    <button onClick={() => alert('جاري التعديل...')} className={`p-2 rounded-xl border ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} transition-colors`}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteCourse(course.id)} className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>مكتبة الفيديوهات</h2>
            <div className="space-y-4">
              {courses.flatMap(c => c.lessons?.map((l: any) => ({ ...l, courseName: c.title })) || []).length === 0 ? (
                <div className={textSecondary}>لا توجد فيديوهات مضافة بعد.</div>
              ) : (
                courses.flatMap(c => c.lessons?.map((l: any) => ({ ...l, courseName: c.title })) || []).map((video: any, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                        <Youtube className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className={`font-bold ${textPrimary}`}>{video.title}</h4>
                        <p className={`text-sm ${textSecondary}`}>{video.courseName} • {video.quizzes?.length || 0} أسئلة تفاعلية</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => window.open(`/student/online/videos/${video.id}`, '_blank')} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200">
                        معاينة الفيديو
                      </button>
                      <button onClick={() => handleDeleteVideo(video.id)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      )}
      
      {/* Add Course Modal */}
      {showAddCourse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddCourse(false)}>
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 w-full max-w-md shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-bold ${textPrimary} mb-6`}>إضافة دورة جديدة</h2>
            <div className="space-y-4">
              <input 
                placeholder="اسم الدورة (مثال: فيزياء ثالثة ثانوي)" 
                value={newCourseTitle}
                onChange={e => setNewCourseTitle(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`} 
              />
              <input 
                placeholder="المرحلة (مثال: ثانوي ١)" 
                value={newCourseLevel}
                onChange={e => setNewCourseLevel(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`} 
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAddCourse} className="flex-1 bg-gradient-to-l from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-medium hover:opacity-90">
                إضافة
              </button>
              <button onClick={() => setShowAddCourse(false)} className={`flex-1 py-3 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'} font-medium`}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Video Modal */}
      {showAddVideo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddVideo(false)}>
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 w-full max-w-md shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-bold ${textPrimary} mb-6`}>إضافة فيديو جديد</h2>
            <div className="space-y-3 mb-6">
              {videoTypes.map((type, idx) => (
                <button key={idx} className={`w-full flex items-center gap-3 p-4 rounded-xl border ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}>
                  <span className={`p-2 rounded-lg ${type.color}`}>
                    <type.icon className="w-5 h-5" />
                  </span>
                  <span className={`font-medium ${textPrimary}`}>{type.label}</span>
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`}
              >
                <option value="">اختر الدورة...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <input
                placeholder="عنوان الفيديو"
                value={videoTitle}
                onChange={e => setVideoTitle(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
              />
              <input
                placeholder="رابط الفيديو (مثال: رابط يوتيوب)"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
              />
              <input
                placeholder="رابط المرفقات (PDF) (اختياري)"
                value={pdfUrl}
                onChange={e => setPdfUrl(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
              />
              
              <div className={`p-4 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'} space-y-3`}>
                <h4 className={`text-sm font-bold ${textPrimary}`}>أسئلة منبثقة تفاعلية داخل الفيديو</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="الوقت بالثواني (مثال: 120)" value={newQuiz.timestampSec} onChange={e=>setNewQuiz({...newQuiz, timestampSec: e.target.value})} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  <input placeholder="السؤال" value={newQuiz.question} onChange={e=>setNewQuiz({...newQuiz, question: e.target.value})} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  <input placeholder="الخيارات (مفصولة بعلامة -)" value={newQuiz.options} onChange={e=>setNewQuiz({...newQuiz, options: e.target.value})} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  <input placeholder="الإجابة الصحيحة" value={newQuiz.correctAnswer} onChange={e=>setNewQuiz({...newQuiz, correctAnswer: e.target.value})} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
                <button onClick={handleAddQuiz} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700">إضافة سؤال</button>
                {quizzes.length > 0 && (
                  <ul className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 space-y-1">
                    {quizzes.map((q, i) => <li key={i}>سؤال عند {q.timestampSec}ث: {q.question}</li>)}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAddVideoSubmit} className="flex-1 bg-gradient-to-l from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-medium hover:opacity-90">
                إضافة
              </button>
              <button onClick={() => setShowAddVideo(false)} className={`flex-1 py-3 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'} font-medium`}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Analytics Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCourse(null)}>
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>تقارير مشاهدة الفيديوهات: {selectedCourse.title}</h2>
            
            {Object.keys(lessonAnalytics).length === 0 ? (
              <p className={textSecondary}>لا توجد فيديوهات في هذه الدورة حتى الآن.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(lessonAnalytics).map(([lessonId, analytics]) => (
                  <div key={lessonId} className={`p-4 rounded-xl border ${cardBg}`}>
                    <h3 className={`font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                      <Youtube className="text-red-500 w-5 h-5" /> 
                      الفيديو: {Array.isArray(analytics) && analytics.length > 0 ? analytics[0].lesson?.title : lessonId}
                    </h3>
                    
                    {!Array.isArray(analytics) || analytics.length === 0 ? (
                      <p className={`text-sm ${textSecondary}`}>لم يقم أي طالب بمشاهدة هذا الفيديو بعد.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={`border-b ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                              <th className="text-right py-2 px-4">اسم الطالب</th>
                              <th className="text-right py-2 px-4">حالة المشاهدة</th>
                              <th className="text-right py-2 px-4">نسبة التقدم</th>
                              <th className="text-right py-2 px-4">أخر نقطة توقف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.map(stat => (
                              <tr key={stat.id || Math.random()} className={`border-b last:border-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className={`py-3 px-4 ${textPrimary}`}>{stat.student?.name || 'مستخدم غير معروف'}</td>
                                <td className={`py-3 px-4`}>
                                  {stat.watched ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs">مكتمل</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs">قيد المشاهدة</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 w-1/3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                      <div className={`h-full ${stat.watched ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${stat.progress}%` }}></div>
                                    </div>
                                    <span className={textSecondary}>{Math.round(stat.progress)}%</span>
                                  </div>
                                </td>
                                <td className={`py-3 px-4 ${textSecondary}`}>
                                  {Math.floor(stat.lastTimestamp / 60)}:{Math.floor(stat.lastTimestamp % 60).toString().padStart(2, '0')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                          <h4 className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4" /> مؤشر التفاعل (Engagement Score)
                          </h4>
                          <p className="text-sm text-indigo-600 dark:text-indigo-400">
                            متوسط الإنجاز: {Math.round(analytics.reduce((acc, curr) => acc + curr.progress, 0) / analytics.length)}٪ <br/>
                            نقطة التوقف الشائعة (متوسط): {Math.floor((analytics.reduce((acc, curr) => acc + curr.lastTimestamp, 0) / analytics.length) / 60)}:{Math.floor((analytics.reduce((acc, curr) => acc + curr.lastTimestamp, 0) / analytics.length) % 60).toString().padStart(2, '0')} (تشير إلى الأجزاء التي تستدعي إعادة الشرح)
                          </p>
                        </div>
                        
                        {/* Fake Homework submissions for this lesson */}
                        <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                          <h4 className="font-bold text-gray-800 dark:text-gray-300 flex items-center gap-2 mb-3">
                            <BookOpen className="w-4 h-4 text-emerald-600" /> تسليمات الواجب (مرفقات الدرس)
                          </h4>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-gray-700 dark:text-gray-300">أحمد محمد (رابط Google Drive)</span>
                              <button onClick={() => alert('جاري تحميل المرفق...')} className="text-indigo-600 hover:underline">عرض الحل</button>
                            </li>
                            <li className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-gray-700 dark:text-gray-300">سارة أحمد (لم يتم التسليم بعد)</span>
                              <span className="text-gray-400">---</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-8 text-left">
              <button onClick={() => setSelectedCourse(null)} className="px-6 py-2 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
