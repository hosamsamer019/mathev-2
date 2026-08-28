import { useEffect, useState } from 'react';
import { Plus, Play, Edit, Trash2, Eye, Upload, Youtube, Clock, Users, Star, BookOpen, Database, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { courseService } from '../../services/course.service';
import { homeworkService } from '../../services/homework.service';
import SupabaseUploader from '../ui/SupabaseUploader';
import { isGoogleDriveUrl } from '../../utils/videoUtils';
import ScrollToTopButton from '../ui/ScrollToTopButton';

const ACADEMIC_CONFIG = {
  EG: {
    label: 'مصر',
    levels: {
      PRIMARY: {
        label: 'ابتدائي',
        grades: {
          PRIMARY_1: 'الصف الأول الابتدائي',
          PRIMARY_2: 'الصف الثاني الابتدائي',
          PRIMARY_3: 'الصف الثالث الابتدائي',
          PRIMARY_4: 'الصف الرابع الابتدائي',
          PRIMARY_5: 'الصف الخامس الابتدائي',
          PRIMARY_6: 'الصف السادس الابتدائي'
        }
      },
      PREPARATORY: {
        label: 'إعدادي',
        grades: {
          PREPARATORY_1: 'الصف الأول الإعدادي',
          PREPARATORY_2: 'الصف الثاني الإعدادي',
          PREPARATORY_3: 'الصف الثالث الإعدادي'
        }
      },
      SECONDARY: {
        label: 'ثانوي',
        grades: {
          SECONDARY_1: 'الصف الأول الثانوي',
          SECONDARY_2: 'الصف الثاني الثانوي',
          SECONDARY_3: 'الصف الثالث الثانوي'
        }
      }
    }
  }
} as const;

const videoTypes = [
  { icon: Youtube, label: 'رابط يوتيوب', color: 'bg-red-100 text-red-700', disabled: false },
  { icon: Database, label: 'Google Drive', color: 'bg-blue-100 text-blue-700', disabled: false },
  { icon: Upload, label: 'رفع فيديو محلي', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', disabled: true },
  { icon: Play, label: 'تسجيل مباشر', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', disabled: true },
];

export default function TeacherCoursesPage() {
  const { isDark } = useTheme();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'videos'>('courses');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [lessonAnalytics, setLessonAnalytics] = useState<Record<string, any[]>>({});
  const [courseHomeworks, setCourseHomeworks] = useState<any[]>([]);

  // Video Form State
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [selectedVideoType, setSelectedVideoType] = useState('رابط يوتيوب');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [newQuiz, setNewQuiz] = useState({ id: '', timestampSec: '', question: '', options: '', correctAnswer: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState({ title: '', source: '', isEdit: false });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await courseService.getCourses();
      const data = res.data.data ? res.data.data : Array.isArray(res.data) ? res.data : [];
      if (data && data.length > 0) {
        const mapped = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description || '',
          students: c._count?.enrollments || 0,
          videos: c._count?.lessons || 0,
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
    } catch (err: any) {
      console.error('Failed to fetch teacher courses:', err);
      if (err.response?.status === 403) {
        setError('غير مصرح لك بعرض هذه الدورات.');
      } else {
        setError('فشل في جلب الدورات.');
      }
    } finally {
      setLoading(false);
    }
  };

  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState('ثانوي ١');
  const [newCoursePrice, setNewCoursePrice] = useState(0);
  const [newCourseCountry, setNewCourseCountry] = useState('EG');
  const [newCourseEducationLevel, setNewCourseEducationLevel] = useState('');
  const [newCourseGradeLevel, setNewCourseGradeLevel] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCourse = async () => {
    setFormErrors({});
    if (!newCourseTitle.trim()) {
      setFormErrors({ title: 'يرجى كتابة اسم الدورة' });
      return;
    }
    try {
      setIsSubmitting(true);
      await courseService.createCourse({ 
        title: newCourseTitle, 
        category: newCourseGradeLevel ? newCourseGradeLevel : newCourseLevel, 
        price: newCoursePrice,
        country: newCourseCountry,
        educationLevel: newCourseEducationLevel,
        gradeLevel: newCourseGradeLevel
      });
      setShowAddCourse(false);
      setNewCourseTitle('');
      setNewCoursePrice(0);
      fetchCourses();
    } catch (err: any) {
      console.error('Failed to add course', err);
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          errors[e.path[0]] = e.message;
        });
        setFormErrors(errors);
      } else {
        setFormErrors({ global: 'حدث خطأ أثناء الإضافة' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCourseSubmit = async () => {
    setFormErrors({});
    if (!newCourseTitle.trim()) {
      setFormErrors({ title: 'يرجى كتابة اسم الدورة' });
      return;
    }
    try {
      setIsSubmitting(true);
      await courseService.updateCourse(editingCourse.id, { 
        title: newCourseTitle, 
        price: newCoursePrice,
        ...(newCourseCountry && { country: newCourseCountry }),
        ...(newCourseEducationLevel && { educationLevel: newCourseEducationLevel }),
        ...(newCourseGradeLevel && { gradeLevel: newCourseGradeLevel })
      });
      setShowEditCourse(false);
      setEditingCourse(null);
      setNewCourseTitle('');
      setNewCoursePrice(0);
      fetchCourses();
    } catch (err: any) {
      console.error('Failed to update course', err);
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          errors[e.path[0]] = e.message;
        });
        setFormErrors(errors);
      } else {
        setFormErrors({ global: 'حدث خطأ أثناء التعديل' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if(confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await courseService.deleteCourse(id);
        setCourses(c => c.filter(x => x.id !== id));
      } catch(err) {
        console.error('Delete failed', err);
      }
    }
  };

  const [videoFormErrors, setVideoFormErrors] = useState<Record<string, string>>({});
  const [isVideoSubmitting, setIsVideoSubmitting] = useState(false);

  const handleAddVideoSubmit = async () => {
    setVideoFormErrors({});
    if (!videoTitle || !videoUrl || !selectedCourseId) {
      setVideoFormErrors({ global: 'يرجى تعبئة جميع الحقول المطلوبة' });
      return;
    }
    try {
      setIsVideoSubmitting(true);
      const payload = {
        title: videoTitle, 
        videoUrl: videoUrl, 
        fileUrl: pdfUrl || undefined,
        courseId: selectedCourseId,
        quizzes: quizzes.map(q => ({
          ...(q.id ? { id: q.id } : {}),
          timestampSec: parseFloat(q.timestampSec),
          question: q.question,
          options: typeof q.options === 'string' ? q.options.split('-').map((o:string) => o.trim()) : q.options,
          correctAnswer: q.correctAnswer
        }))
      };

      if (editingLessonId) {
        await courseService.updateLesson(editingLessonId, payload);
        setSuccessDetails({ title: videoTitle, source: selectedVideoType, isEdit: true });
      } else {
        await courseService.createLesson(payload);
        setSuccessDetails({ title: videoTitle, source: selectedVideoType, isEdit: false });
      }
      setShowSuccessModal(true);

      setShowAddVideo(false);
      setEditingLessonId(null);
      setVideoTitle('');
      setVideoUrl('');
      setPdfUrl('');
      setQuizzes([]);
      setSelectedCourseId('');
      setSelectedVideoType('رابط يوتيوب');
      fetchCourses();
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          errors[e.path[0]] = e.message;
        });
        setVideoFormErrors(errors);
      } else {
        setVideoFormErrors({ global: 'حدث خطأ أثناء إضافة الفيديو' });
      }
    } finally {
      setIsVideoSubmitting(false);
    }
  };

  const handleAddQuiz = () => {
    if(newQuiz.timestampSec && newQuiz.question && newQuiz.options && newQuiz.correctAnswer) {
      if (typeof newQuiz.options === 'string' && !newQuiz.options.includes('-')) {
        alert('يجب أن تحتوي الخيارات على علامة "-" للفصل بينها. مثال: الإجابة الأولى - الإجابة الثانية');
        return;
      }
      setQuizzes([...quizzes, newQuiz]);
      setNewQuiz({ id: '', timestampSec: '', question: '', options: '', correctAnswer: '' });
    } else {
      alert('يرجى تعبئة جميع حقول الاختبار');
    }
  };

  const handleViewCourse = async (course: any) => {
    setSelectedCourse(course);
    // Fetch analytics for all lessons in this course
    try {
      const res = await courseService.getCourseDetails(course.id);
      const courseDetails = res.data;
      
      const analyticsObj: Record<string, any[]> = {};
      for (const lesson of courseDetails.lessons || []) {
        try {
          const analyticsRes = await courseService.getVideoAnalytics(lesson.id);
          analyticsObj[lesson.id] = Array.isArray(analyticsRes.data) ? analyticsRes.data : [];
        } catch (err) {
          analyticsObj[lesson.id] = [];
        }
      }
      setLessonAnalytics(analyticsObj);

      // Fetch homeworks for this course
      try {
        const hwRes = await homeworkService.getHomeworksByCourse(course.id);
        setCourseHomeworks(Array.isArray(hwRes.data) ? hwRes.data : []);
      } catch (err) {
        setCourseHomeworks([]);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleEditVideo = (video: any) => {
    setSelectedCourseId(video.courseId);
    setVideoTitle(video.title);
    setVideoUrl(video.videoUrl || '');
    setPdfUrl(video.pdfUrl || '');
    if (isGoogleDriveUrl(video.videoUrl)) {
      setSelectedVideoType('Google Drive');
    } else {
      setSelectedVideoType('رابط يوتيوب');
    }
    setQuizzes(video.quizzes ? video.quizzes.map((q: any) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options.join(' - ') : q.options
    })) : []);
    setEditingLessonId(video.id);
    setShowAddVideo(true);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا الفيديو؟')) {
      try {
        await courseService.deleteLesson(videoId);
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
            onClick={() => {
              setEditingLessonId(null);
              setVideoTitle('');
              setVideoUrl('');
              setPdfUrl('');
              setQuizzes([]);
              setSelectedCourseId('');
              setSelectedVideoType('رابط يوتيوب');
              setShowAddVideo(true);
            }}
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
      <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                    <button 
                      onClick={() => {
                        setEditingCourse(course);
                        setNewCourseTitle(course.title);
                        setNewCoursePrice(course.price || 0);
                        setShowEditCourse(true);
                      }} 
                      className={`p-2 rounded-xl border border-blue-200 text-blue-500 hover:bg-blue-50 dark:border-blue-900/50 dark:hover:bg-blue-900/20 transition-colors`}
                      title="تعديل الدورة"
                    >
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
                      <button onClick={() => handleEditVideo(video)} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200">
                        <Edit className="w-4 h-4" />
                      </button>
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
              <div className="space-y-1">
                <input 
                  placeholder="اسم الدورة (مثال: فيزياء ثالثة ثانوي)" 
                  value={newCourseTitle}
                  onChange={e => setNewCourseTitle(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${formErrors.title ? 'border-red-500' : (isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200')} text-sm`} 
                />
                {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
              </div>
              <div className="space-y-3">
                <label className={`block text-sm font-medium ${textPrimary}`}>المستوى الدراسي الموجه له الدورة</label>
                <select
                  value={newCourseCountry}
                  onChange={(e) => {
                    setNewCourseCountry(e.target.value);
                    setNewCourseEducationLevel('');
                    setNewCourseGradeLevel('');
                  }}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`}
                >
                  {Object.entries(ACADEMIC_CONFIG).map(([key, config]) => (
                    <option key={key} value={key} className="text-black">{config.label}</option>
                  ))}
                </select>

                {newCourseCountry && (
                  <select
                    value={newCourseEducationLevel}
                    onChange={(e) => {
                      setNewCourseEducationLevel(e.target.value);
                      setNewCourseGradeLevel('');
                    }}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`}
                  >
                    <option value="" className="text-black">اختر المرحلة</option>
                    {Object.entries((ACADEMIC_CONFIG as any)[newCourseCountry].levels).map(([key, level]: [string, any]) => (
                      <option key={key} value={key} className="text-black">{level.label}</option>
                    ))}
                  </select>
                )}

                {newCourseCountry && newCourseEducationLevel && (
                  <select
                    value={newCourseGradeLevel}
                    onChange={(e) => setNewCourseGradeLevel(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`}
                  >
                    <option value="" className="text-black">اختر الصف</option>
                    {Object.entries((ACADEMIC_CONFIG as any)[newCourseCountry].levels[newCourseEducationLevel].grades).map(([key, label]: [string, any]) => (
                      <option key={key} value={key} className="text-black">{label}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <input 
                  type="number"
                  min="0"
                  placeholder="سعر الدورة (اختياري)" 
                  value={newCoursePrice}
                  onChange={e => setNewCoursePrice(Number(e.target.value))}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`} 
                />
              </div>
              {formErrors.global && <p className="text-red-500 text-sm text-center">{formErrors.global}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleAddCourse} 
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-l from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإضافة...' : 'إضافة'}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={() => {
          setShowAddVideo(false);
          setEditingLessonId(null);
        }}>
          <div 
            id="teacher-video-modal-container"
            className={`${isDark ? 'bg-gray-850 text-white' : 'bg-white text-gray-900'} rounded-3xl w-full max-w-2xl shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'}`} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-5 sm:p-6 border-b flex-shrink-0 flex items-center justify-between ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50/80 border-gray-100'} backdrop-blur-md`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
                  <Youtube className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">{editingLessonId ? 'تعديل الفيديو والدرس' : 'إضافة فيديو ودرس جديد'}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">حدد الدورة ونوع الفيديو والأسئلة التفاعلية</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddVideo(false);
                  setEditingLessonId(null);
                }} 
                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-800'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div id="teacher-video-modal-body" className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-5 relative">
              <div>
                <label className="block text-xs font-semibold mb-2">نوع الفيديو والمصدر</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {videoTypes.map((type, idx) => (
                    <button 
                      key={idx} 
                      type="button"
                      disabled={type.disabled}
                      onClick={() => !type.disabled && setSelectedVideoType(type.label)}
                      className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${
                        type.disabled ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 
                        selectedVideoType === type.label 
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm' 
                          : (isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50')
                      }`}
                    >
                      {type.disabled && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                          قريباً
                        </span>
                      )}
                      <span className={`p-2 rounded-lg ${type.color}`}>
                        <type.icon className="w-4 h-4" />
                      </span>
                      <span className={`text-xs font-bold ${textPrimary}`}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold">الدورة التعليمية *</label>
                  <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border ${videoFormErrors.courseId ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : (isDark ? 'bg-gray-750 border-gray-600 text-white' : 'bg-gray-50 border-gray-200')} text-sm`}
                  >
                    <option value="">اختر الدورة...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  {videoFormErrors.courseId && <p className="text-red-500 text-xs mt-1">{videoFormErrors.courseId}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold">عنوان الفيديو والدرس *</label>
                  <input
                    placeholder="مثال: مقدمة في حساب التفاضل والتكامل"
                    value={videoTitle}
                    onChange={e => setVideoTitle(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border ${videoFormErrors.title ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : (isDark ? 'bg-gray-750 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200')} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
                  />
                  {videoFormErrors.title && <p className="text-red-500 text-xs mt-1">{videoFormErrors.title}</p>}
                </div>

                {selectedVideoType === 'رابط يوتيوب' ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold">رابط فيديو YouTube *</label>
                    <input
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border ${videoFormErrors.videoUrl ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : (isDark ? 'bg-gray-750 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200')} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono`}
                      dir="ltr"
                    />
                    {videoFormErrors.videoUrl && <p className="text-red-500 text-xs mt-1">{videoFormErrors.videoUrl}</p>}
                  </div>
                ) : selectedVideoType === 'Google Drive' ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold">رابط Google Drive *</label>
                    <input
                      placeholder="https://drive.google.com/file/d/..."
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border ${videoFormErrors.videoUrl ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : (isDark ? 'bg-gray-750 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200')} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono`}
                      dir="ltr"
                    />
                    {videoFormErrors.videoUrl && <p className="text-red-500 text-xs mt-1">{videoFormErrors.videoUrl}</p>}
                  </div>
                ) : selectedVideoType === 'رفع فيديو محلي' ? (
                  <div className="space-y-1">
                    <label className={`block text-xs font-semibold mb-1 ${textPrimary}`}>ملف الفيديو (MP4/WebM) *</label>
                    <SupabaseUploader 
                      bucketName="videos"
                      acceptedFileTypes="video/mp4,video/webm"
                      label="اسحب ملف الفيديو هنا للرفع"
                      maxSizeMB={500}
                      onUploadSuccess={(url) => setVideoUrl(url)}
                      onUploadError={(err) => alert(err)}
                    />
                    {videoFormErrors.videoUrl && <p className="text-red-500 text-xs mt-1">{videoFormErrors.videoUrl}</p>}
                  </div>
                ) : (
                  <div className={`p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm`}>
                    قم بتشغيل تطبيق التسجيل المباشر. سيبدأ البث بعد النقر على إضافة.
                  </div>
                )}
                
                <div className="space-y-1 pt-2">
                  <label className={`block text-xs font-semibold mb-1 ${textPrimary}`}>المرفقات (PDF) - اختياري</label>
                  <SupabaseUploader 
                    bucketName="pdfs"
                    acceptedFileTypes="application/pdf"
                    label="اسحب ملف PDF هنا للرفع (مذكرة الدرس)"
                    maxSizeMB={50}
                    onUploadSuccess={(url) => setPdfUrl(url)}
                    onUploadError={(err) => alert(err)}
                  />
                  {videoFormErrors.pdfUrl && <p className="text-red-500 text-xs mt-1">{videoFormErrors.pdfUrl}</p>}
                </div>
                
                <div className={`p-4 rounded-2xl border ${isDark ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-bold ${textPrimary}`}>أسئلة منبثقة تفاعلية داخل الفيديو</h4>
                    <span className="text-[11px] text-gray-500">تظهر للطالب أثناء مشاهدة الفيديو</span>
                  </div>
                  {selectedVideoType === 'Google Drive' && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-yellow-800 dark:text-yellow-200 leading-relaxed">
                        <strong>ملاحظة:</strong> مشغل Google Drive يعرض الأسئلة أسفل الفيديو مباشرة.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input placeholder="الوقت بالثواني (مثال: 120)" value={newQuiz.timestampSec} onChange={e=>setNewQuiz({...newQuiz, timestampSec: e.target.value})} className="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-750 dark:text-white" />
                    <input placeholder="السؤال" value={newQuiz.question} onChange={e=>setNewQuiz({...newQuiz, question: e.target.value})} className="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-750 dark:text-white" />
                    <input placeholder="الخيارات (مفصولة بشرطة -)" value={newQuiz.options} onChange={e=>setNewQuiz({...newQuiz, options: e.target.value})} className="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-750 dark:text-white" />
                    <input placeholder="الإجابة الصحيحة" value={newQuiz.correctAnswer} onChange={e=>setNewQuiz({...newQuiz, correctAnswer: e.target.value})} className="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-750 dark:text-white" />
                  </div>
                  <button type="button" onClick={handleAddQuiz} className="w-full bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">إضافة سؤال تفاعلي</button>
                  {quizzes.length > 0 && (
                    <ul className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 space-y-1 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      {quizzes.map((q, i) => <li key={i} className="flex items-center justify-between"><span>سؤال عند {q.timestampSec}ث: {q.question}</span></li>)}
                    </ul>
                  )}
                </div>
                {videoFormErrors.global && <p className="text-red-500 text-xs font-bold text-center">{videoFormErrors.global}</p>}
              </div>

              {/* Scroll to Top within modal */}
              <ScrollToTopButton containerId="teacher-video-modal-body" className="!bottom-20 !start-8" />
            </div>

            {/* Modal Sticky Footer Bar */}
            <div className={`p-4 border-t flex-shrink-0 flex items-center justify-end gap-3 ${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-gray-50/90 border-gray-100'}`}>
              <button 
                type="button"
                onClick={() => {
                  setShowAddVideo(false);
                  setEditingLessonId(null);
                }} 
                className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >
                إلغاء
              </button>
              <button 
                type="button"
                onClick={handleAddVideoSubmit} 
                disabled={isVideoSubmitting}
                className="px-6 py-2.5 bg-gradient-to-l from-emerald-600 via-teal-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                {isVideoSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>جاري الإضافة...</span>
                  </>
                ) : (
                  <span>{editingLessonId ? 'حفظ تعديلات الفيديو' : 'إضافة الفيديو'}</span>
                )}
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
                            {analytics.map((stat, index) => (
                              <tr key={stat.id || `stat-${index}`} className={`border-b last:border-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
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
                        
                      </div>
                    )}
                  </div>
                ))}

                {courseHomeworks.length > 0 && (
                  <div className={`p-4 mt-6 rounded-xl border ${cardBg}`}>
                    <h3 className={`font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
                      <BookOpen className="text-emerald-500 w-5 h-5" /> 
                      واجبات الدورة ({courseHomeworks.length})
                    </h3>
                    <div className="space-y-4">
                      {courseHomeworks.map(hw => (
                        <div key={hw.id} className={`p-4 border ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'} rounded-xl`}>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className={`font-bold ${textPrimary}`}>{hw.title}</h4>
                            <span className="text-sm bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg">
                              تسليمات: {hw._count?.submissions || 0}
                            </span>
                          </div>
                          <p className={`text-xs ${textSecondary}`}>أُضيف في: {new Date(hw.createdAt).toLocaleDateString('ar-EG')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {/* Edit Course Modal */}
      {showEditCourse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditCourse(false)}>
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 w-full max-w-md shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-bold ${textPrimary} mb-6`}>تعديل الدورة</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <input 
                  placeholder="اسم الدورة (مثال: فيزياء ثالثة ثانوي)" 
                  value={newCourseTitle}
                  onChange={e => setNewCourseTitle(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border ${formErrors.title ? 'border-red-500' : (isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200')} text-sm`} 
                />
                {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
              </div>
              <div className="space-y-3">
                <label className={`block text-sm font-medium ${textPrimary}`}>المستوى الدراسي الموجه له الدورة</label>
                <select
                  value={newCourseCountry}
                  onChange={(e) => {
                    setNewCourseCountry(e.target.value);
                    setNewCourseEducationLevel('');
                    setNewCourseGradeLevel('');
                  }}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`}
                >
                  {Object.entries(ACADEMIC_CONFIG).map(([key, config]) => (
                    <option key={key} value={key} className="text-black">{config.label}</option>
                  ))}
                </select>

                {newCourseCountry && (
                  <select
                    value={newCourseEducationLevel}
                    onChange={(e) => {
                      setNewCourseEducationLevel(e.target.value);
                      setNewCourseGradeLevel('');
                    }}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`}
                  >
                    <option value="" className="text-black">اختر المرحلة</option>
                    {Object.entries((ACADEMIC_CONFIG as any)[newCourseCountry].levels).map(([key, level]: [string, any]) => (
                      <option key={key} value={key} className="text-black">{level.label}</option>
                    ))}
                  </select>
                )}

                {newCourseCountry && newCourseEducationLevel && (
                  <select
                    value={newCourseGradeLevel}
                    onChange={(e) => setNewCourseGradeLevel(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`}
                  >
                    <option value="" className="text-black">اختر الصف</option>
                    {Object.entries((ACADEMIC_CONFIG as any)[newCourseCountry].levels[newCourseEducationLevel].grades).map(([key, label]: [string, any]) => (
                      <option key={key} value={key} className="text-black">{label}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <input 
                  type="number"
                  min="0"
                  placeholder="سعر الدورة (اختياري)" 
                  value={newCoursePrice}
                  onChange={e => setNewCoursePrice(Number(e.target.value))}
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'} text-sm`} 
                />
              </div>
              {formErrors.global && <p className="text-red-500 text-sm text-center">{formErrors.global}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleEditCourseSubmit} 
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-l from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button onClick={() => setShowEditCourse(false)} className={`flex-1 py-3 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'} font-medium`}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center transform transition-all duration-300 scale-100 opacity-100`}>
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>
              {successDetails.isEdit ? 'تم تعديل الفيديو بنجاح' : 'تمت إضافة الفيديو بنجاح'}
            </h2>
            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} mb-8`}>
              <p className={`font-semibold ${textPrimary} mb-1 truncate`}>{successDetails.title}</p>
              <p className={`text-sm ${textSecondary}`}>{successDetails.source}</p>
            </div>
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              حسنًا
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
