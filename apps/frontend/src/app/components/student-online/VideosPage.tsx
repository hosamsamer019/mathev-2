import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Eye, Clock } from 'lucide-react';

export default function VideosPage() {
  const navigate = useNavigate();

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../../services/api').then(({ courseApi }) => {
      courseApi.get('/lessons')
        .then(res => setVideos(Array.isArray(res.data) ? res.data : []))
        .catch(err => console.error('Failed to fetch videos', err))
        .finally(() => setLoading(false));
    });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-xl font-bold text-gray-500">جاري تحميل الفيديوهات...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الفيديوهات التعليمية</h1>
        <p className="text-gray-600">شاهد جميع الدروس المتاحة</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-3">
        <Eye className="w-5 h-5 text-yellow-600" />
        <div>
          <p className="font-medium text-yellow-900">المشاهدات المتبقية: 15 من 20</p>
          <p className="text-sm text-yellow-700">كل فيديو يستهلك مشاهدة واحدة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          // Extract YouTube ID for thumbnail
          let thumbnail = 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400&h=250&fit=crop';
          if (video.videoUrl) {
            const match = video.videoUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
            if (match && match[2].length === 11) {
              thumbnail = `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
            }
          }

          return (
            <div
              key={video.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => navigate(`/student/online/videos/${video.id}`)}
            >
              <div className="relative h-48">
                <img
                  src={thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-indigo-600" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {video.duration || 'غير محدد'}
                </div>
                {video.progress?.some((p: any) => p.watched) && (
                  <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                    تمت المشاهدة
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-2">{video.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{video.course?.title || video.courseName || 'دورة تعليمية'}</p>
                <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  مشاهدة الآن
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
