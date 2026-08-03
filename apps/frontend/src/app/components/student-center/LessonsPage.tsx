import { useEffect, useState } from 'react';
import { Youtube, BookOpen } from 'lucide-react';
import { courseApi } from '../../services/api';

export default function LessonsPage() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseApi.get('/lessons')
      .then(res => setLessons(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to fetch lessons', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الدروس التعليمية</h1>
        <p className="text-gray-600">شاهد الدروس عبر يوتيوب</p>
      </div>

      {selectedVideo ? (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedVideo(null)}
            className="text-green-600 hover:text-green-800 mb-4"
          >
            ← العودة للدروس
          </button>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {lessons.find((l) => l.videoUrl === selectedVideo)?.title}
              </h2>
              <p className="text-gray-600">
                {lessons.find((l) => l.videoUrl === selectedVideo)?.description}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">الدروس الأخرى</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessons
                .filter((l) => l.videoUrl !== selectedVideo)
                .map((lesson) => (
                  <div
                    key={lesson.id}
                    onClick={() => setSelectedVideo(lesson.videoUrl)}
                    className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Youtube className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{lesson.title}</h4>
                      <p className="text-sm text-gray-600">{lesson.course?.title || 'دورة'}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && <div className="col-span-3 text-center py-8 text-gray-500">جاري تحميل الدروس...</div>}
          {!loading && lessons.length === 0 && <div className="col-span-3 text-center py-8 text-gray-500">لا توجد دروس حالياً</div>}
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setSelectedVideo(lesson.videoUrl)}
            >
              <div className="relative h-48 bg-gray-800 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                    <Youtube className="w-8 h-8 text-white" />
                  </div>
                </div>
                <img
                  src={`https://img.youtube.com/vi/${lesson.videoUrl}/maxresdefault.jpg`}
                  alt={lesson.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">{lesson.course?.title || 'دورة'}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{lesson.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{lesson.description}</p>
                <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                  مشاهدة على يوتيوب
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
