import { useEffect, useState } from 'react';
import { Plus, Play, Edit, Trash2, Eye, Upload, Youtube, Clock, Users, Star, BookOpen } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { courseApi } from '../../services/api';

const DEFAULT_COURSES = [
  {
    id: 'c1',
    title: 'الجبر والمعادلات',
    description: 'دورة شاملة في الجبر والمعادلات الخطية والتربيعية',
    students: 45,
    videos: 12,
    rating: 4.8,
    progress: 85,
    status: 'مفعّل',
    level: 'ثانوي ١',
    thumbnail: '📊',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'c2',
    title: 'الهندسة الإقليدية',
    description: 'أساسيات الهندسة المستوية والفراغية مع حل مسائل متقدمة',
    students: 38,
    videos: 18,
    rating: 4.9,
    progress: 70,
    status: 'مفعّل',
    level: 'ثانوي ٢',
    thumbnail: '📐',
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'c3',
    title: 'التفاضل والتكامل',
    description: 'مقدمة في حساب التفاضل والتكامل للمرحلة الثانوية',
    students: 29,
    videos: 22,
    rating: 4.7,
    progress: 55,
    status: 'مفعّل',
    level: 'ثانوي ٣',
    thumbnail: '∫',
    color: 'from-purple-500 to-violet-600',
  },
  {
    id: 'c4',
    title: 'الإحصاء والاحتمالات',
    description: 'مفاهيم الإحصاء الوصفي والاستدلالي وتطبيقاته',
    students: 22,
    videos: 15,
    rating: 4.6,
    progress: 40,
    status: 'مسودة',
    level: 'ثانوي ٣',
    thumbnail: '📈',
    color: 'from-orange-500 to-red-500',
  },
];

const videoTypes = [
  { icon: Upload, label: 'رفع فيديو محلي', color: 'bg-blue-100 text-blue-700' },
  { icon: Youtube, label: 'رابط يوتيوب', color: 'bg-red-100 text-red-700' },
  { icon: Play, label: 'تسجيل مباشر', color: 'bg-green-100 text-green-700' },
];

export default function TeacherCoursesPage() {
  const { isDark } = useTheme();
  const [courses, setCourses] = useState<any[]>(DEFAULT_COURSES);
  const [loading, setLoading] = useState(true);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [activeTab, setActiveTab] = useState<'courses' | 'videos'>('courses');

  useEffect(() => {
    courseApi.get('/')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const mapped = res.data.map((c: any) => ({
            id: c.id,
            title: c.title,
            description: c.description || '',
            students: c.students || 0,
            videos: c.modules?.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0) || 0,
            rating: c.rating || 5.0,
            progress: 0,
            status: c.status || 'مفعّل',
            level: c.level || 'ثانوي',
            thumbnail: c.thumbnail || '📚',
            color: c.color || 'from-indigo-500 to-blue-600'
          }));
          setCourses(mapped);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch teacher courses:', err);
      })
      .finally(() => setLoading(false));
  }, []);

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

      {/* Courses Grid */}
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
                <button className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-medium bg-gradient-to-l ${course.color} text-white hover:opacity-90 transition-opacity`}>
                  <Eye className="w-4 h-4" /> عرض
                </button>
                <button className={`p-2 rounded-xl border ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} transition-colors`}>
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
              <input
                placeholder="عنوان الفيديو"
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
              />
              <input
                placeholder="وصف الفيديو (اختياري)"
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm`}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button className="flex-1 bg-gradient-to-l from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-medium hover:opacity-90">
                إضافة
              </button>
              <button onClick={() => setShowAddVideo(false)} className={`flex-1 py-3 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'} font-medium`}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
