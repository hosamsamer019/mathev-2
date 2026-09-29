import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, Clock, CheckCircle } from 'lucide-react';
import { courseService } from '../../services/course.service';
import { extractYouTubeVideoId } from '../../utils/videoUtils';

export default function LessonsPage() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseService.getLessons()
      .then(res => setLessons(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to fetch lessons', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الدروس التعليمية</h1>
        <p className="text-gray-600">شاهد الدروس وسجل تقدمك مباشرة داخل المنصة</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="mr-3 text-gray-600 font-medium">جاري تحميل الدروس...</span>
        </div>
      )}

      {!loading && lessons.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-gray-700">لا توجد دروس متاحة حالياً</p>
          <p className="text-sm text-gray-500 mt-1">سيتم إضافة الدروس التعليمية قريباً</p>
        </div>
      )}

      {!loading && lessons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => {
            const ytId = extractYouTubeVideoId(lesson.videoUrl);
            let thumbnail = 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=600&h=350&fit=crop';
            if (ytId) {
              thumbnail = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
            }

            const isWatched = lesson.progress?.some((p: any) => p.watched || p.status === 'COMPLETED');

            return (
              <div
                key={lesson.id}
                onClick={() => navigate(`/student/center/videos/${lesson.id}`)}
                className="group bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-900 overflow-hidden">
                  <img
                    src={thumbnail}
                    alt={lesson.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-emerald-500 transition-all duration-300">
                      <Play className="w-6 h-6 fill-current translate-x-[-1px]" />
                    </div>
                  </div>

                  {lesson.duration && (
                    <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-xs font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{lesson.duration}</span>
                    </div>
                  )}

                  {isWatched && (
                    <div className="absolute top-3 right-3 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>مكتمل</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-emerald-600">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{lesson.course?.title || 'دورة تعليمية'}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {lesson.title}
                    </h3>
                    {lesson.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                        {lesson.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full py-2.5 px-4 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-sm group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>مشاهدة الدرس في المنصة</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
