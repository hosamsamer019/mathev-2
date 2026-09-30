import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Eye, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { courseService } from '../../services/course.service';
import { getVideoThumbnailUrl } from '../../utils/videoUtils';

export default function VideosPage() {
  const navigate = useNavigate();

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseService.getLessons()
      .then((res) => {
        setVideos(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => console.error('Failed to fetch videos', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-base font-bold text-gray-500">جاري تحميل الفيديوهات...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">الفيديوهات التعليمية</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">شاهد الدروس وسجل تقدمك مباشرة داخل المنصة</p>
      </div>

      {videos.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-gray-700 dark:text-gray-200">لا توجد فيديوهات تعليمية متاحة حالياً</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">سيتم إضافة الدروس التعليمية قريباً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {videos.map((video) => {
            const thumbnail = getVideoThumbnailUrl(video.videoUrl);
            const isWatched = video.progress?.some((p: any) => p.watched || p.status === 'COMPLETED');
            const progressRecord = video.progress?.[0];
            const progressPct = progressRecord?.progress ? Math.round(Number(progressRecord.progress)) : 0;

            return (
              <div
                key={video.id}
                className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
                onClick={() => navigate(`/student/center/videos/${video.id}`)}
              >
                <div className="relative aspect-video bg-gray-900 overflow-hidden">
                  <img
                    src={thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-600/90 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-emerald-500 transition-all duration-300">
                      <Play className="w-6 h-6 fill-white translate-x-[-1px]" />
                    </div>
                  </div>

                  {video.duration && (
                    <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-xs font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{video.duration}</span>
                    </div>
                  )}

                  {isWatched ? (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>مكتمل</span>
                    </div>
                  ) : progressPct > 0 ? (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow font-mono">
                      <span>{progressPct}%</span>
                    </div>
                  ) : null}
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1.5">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{video.course?.title || video.courseName || 'دورة تعليمية'}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {video.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-xs sm:text-sm group-hover:bg-emerald-600 group-hover:text-white dark:group-hover:bg-emerald-600 dark:group-hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
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
