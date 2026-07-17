import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Play, Pause, Maximize, Volume2, SkipForward, SkipBack, Eye, ChevronRight } from 'lucide-react';

export default function VideoPlayerPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const [playing, setPlaying] = useState(false);
  const [remainingViews, setRemainingViews] = useState(15);

  const nextLessons = [
    { id: 2, title: 'العمليات الحسابية الأساسية', duration: '20:15' },
    { id: 3, title: 'المعادلات الخطية', duration: '25:45' },
    { id: 4, title: 'حل المعادلات', duration: '18:20' },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto p-6">
        <button
          onClick={() => navigate('/student/online/videos')}
          className="text-white hover:text-gray-300 mb-4 flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          العودة للفيديوهات
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-black rounded-xl overflow-hidden">
              <div className="relative aspect-video bg-gray-800 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=800&h=450&fit=crop"
                  alt="Video"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setPlaying(!playing)}
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-all"
                >
                  <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center">
                    {playing ? (
                      <Pause className="w-10 h-10 text-white" />
                    ) : (
                      <Play className="w-10 h-10 text-white mr-1" />
                    )}
                  </div>
                </button>

                <div className="absolute top-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <span className="font-medium">المشاهدات المتبقية: {remainingViews}</span>
                </div>
              </div>

              <div className="bg-gray-900 p-4">
                <div className="flex items-center gap-4 mb-4">
                  <button className="text-white hover:text-indigo-400">
                    <SkipBack className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setPlaying(!playing)}
                    className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-700"
                  >
                    {playing ? (
                      <Pause className="w-6 h-6 text-white" />
                    ) : (
                      <Play className="w-6 h-6 text-white mr-1" />
                    )}
                  </button>
                  <button className="text-white hover:text-indigo-400">
                    <SkipForward className="w-6 h-6" />
                  </button>
                  <div className="flex-1 bg-gray-700 h-2 rounded-full">
                    <div className="bg-indigo-600 h-2 rounded-full w-1/3"></div>
                  </div>
                  <span className="text-white text-sm">5:20 / 15:30</span>
                  <button className="text-white hover:text-indigo-400">
                    <Volume2 className="w-6 h-6" />
                  </button>
                  <button className="text-white hover:text-indigo-400">
                    <Maximize className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h1 className="text-2xl font-bold text-white mb-3">مقدمة في الجبر</h1>
              <p className="text-gray-400 mb-4">الجبر - الصف الأول الثانوي</p>
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-medium text-white mb-2">وصف الدرس</h3>
                <p className="text-gray-300 leading-relaxed">
                  في هذا الدرس سنتعرف على أساسيات الجبر والمفاهيم الأولية التي تشكل حجر الأساس لفهم
                  الرياضيات المتقدمة. سنتناول المتغيرات والثوابت والعمليات الجبرية الأساسية.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 h-fit">
            <h2 className="text-xl font-bold text-white mb-4">الدروس القادمة</h2>
            <div className="space-y-3">
              {nextLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => navigate(`/student/online/videos/${lesson.id}`)}
                  className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">{lesson.title}</h3>
                      <p className="text-sm text-gray-400">{lesson.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-medium text-yellow-400">تنبيه</h3>
                </div>
                <p className="text-sm text-yellow-100">
                  التحميل والتسجيل معطل لحماية حقوق الملكية
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
