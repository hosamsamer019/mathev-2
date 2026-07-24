import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Play, Pause, Eye, ChevronRight, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function VideoPlayerPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { user } = useAuth();
  
  const [lesson, setLesson] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [playerState, setPlayerState] = useState(-1);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizAnswered, setQuizAnswered] = useState<Record<string, boolean>>({});
  
  const playerRef = useRef<any>(null);
  const lastTimeRef = useRef(0);
  const maxTimeRef = useRef(0);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const { courseApi } = await import('../../services/api');
        // Because we don't have a GET /lessons/:id, fetch all and find
        const res = await courseApi.get('/lessons');
        const currentLesson = res.data.find((l: any) => l.id === videoId);
        setLesson(currentLesson);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLesson();
  }, [videoId]);

  const initPlayer = () => {
    if (!lesson?.videoUrl || !(window as any).YT) return;
    const match = lesson.videoUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    const ytId = match && match[2].length === 11 ? match[2] : null;
    if (!ytId) return;

    playerRef.current = new (window as any).YT.Player('yt-player', {
      videoId: ytId,
      playerVars: {
        controls: 0,
        disablekb: 1,
        rel: 0,
        modestbranding: 1,
        fs: 0, // Disable fullscreen to keep watermark relative
        playsinline: 1
      },
      events: {
        onStateChange: (event: any) => setPlayerState(event.data)
      }
    });
  };

  useEffect(() => {
    if (lesson && (window as any).YT && (window as any).YT.Player && !playerRef.current) {
      initPlayer();
    } else if (lesson && !(window as any).YT) {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }
  }, [lesson]);

  useEffect(() => {
    // Monitor progress and prevent fast forward
    const interval = setInterval(() => {
      if (!playerRef.current || playerState !== 1) return; // 1 = playing
      
      const currentTime = playerRef.current.getCurrentTime();
      const duration = playerRef.current.getDuration();
      
      if (!duration) return;

      // Allow free seeking
      lastTimeRef.current = currentTime;
      
      const currentProgress = Math.min((currentTime / duration) * 100, 100);
      setProgress(currentProgress);

      // Trigger Quizzes
      if (lesson?.quizzes) {
        // Sort quizzes by timestamp to ensure chronological order
        const sortedQuizzes = [...lesson.quizzes].sort((a, b) => a.timestampSec - b.timestampSec);
        for (const quiz of sortedQuizzes) {
          if (currentTime >= quiz.timestampSec && !quizAnswered[quiz.id]) {
            playerRef.current.pauseVideo();
            setActiveQuiz(quiz);
            break; // Stop after triggering the first unanswered quiz
          }
        }
      }

      // Send progress to backend
      if (Math.round(currentTime) % 10 === 0) { // every 10 seconds
        import('../../services/api').then(({ courseApi }) => {
          courseApi.post(`/lessons/${videoId}/progress`, {
            progress: currentProgress,
            watched: currentProgress >= 90,
            lastTimestamp: currentTime
          }).catch(console.error);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playerState, lesson, videoId, quizAnswered]);

  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsBlurred(true);
        if (playerRef.current && playerState === 1) {
          playerRef.current.pauseVideo();
        }
      } else {
        setIsBlurred(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p') || (e.metaKey && e.shiftKey && e.key === 's')) {
        setIsBlurred(true);
        navigator.clipboard.writeText('حفظ حقوق النشر: غير مسموح بتصوير الشاشة').catch(() => {});
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('حفظ حقوق النشر: غير مسموح بتصوير الشاشة').catch(() => {});
        setTimeout(() => setIsBlurred(false), 2000);
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData('text/plain', 'حفظ حقوق النشر: غير مسموح بالنسخ');
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('copy', handleCopy);
    
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('copy', handleCopy);
    };
  }, [playerState]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    
    const clickX = e.clientX - rect.left;
    
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    
    const duration = playerRef.current.getDuration();
    if (duration) {
      playerRef.current.seekTo(duration * percentage, true);
    }
  };

  const handleQuizSubmit = (option: string) => {
    if (!activeQuiz) return;
    if (option === activeQuiz.correctAnswer) {
      alert('إجابة صحيحة!');
      setQuizAnswered(prev => ({ ...prev, [activeQuiz.id]: true }));
      setActiveQuiz(null);
      playerRef.current.playVideo();
    } else {
      alert('إجابة خاطئة، حاول مرة أخرى.');
    }
  };

  return (
    <div className={`min-h-screen bg-gray-900 transition-all duration-300 ${isBlurred ? 'blur-xl grayscale select-none pointer-events-none' : ''}`}>
      {isBlurred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-white text-3xl font-bold">
          تم إيقاف العرض مؤقتاً لحماية المحتوى
        </div>
      )}
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
            <div className="bg-black rounded-xl overflow-hidden relative" onContextMenu={e => e.preventDefault()}>
              <div className="relative aspect-video bg-gray-800 flex items-center justify-center">
                {lesson?.videoUrl ? (
                  <div id="yt-player" className="w-full h-full pointer-events-none" />
                ) : (
                  <div className="text-white">جاري تحميل الفيديو...</div>
                )}

                <div 
                  className="absolute inset-0 z-10 cursor-pointer"
                  onClick={() => {
                    if (playerState === 1) {
                      playerRef.current?.pauseVideo();
                    } else {
                      playerRef.current?.playVideo();
                    }
                  }}
                  onDoubleClick={(e) => {
                    if (!playerRef.current) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const current = playerRef.current.getCurrentTime() || 0;
                    const duration = playerRef.current.getDuration() || 0;
                    if (clickX > rect.width / 2) {
                      // Right side: Forward 10s
                      playerRef.current.seekTo(Math.min(duration, current + 10), true);
                    } else {
                      // Left side: Backward 10s
                      playerRef.current.seekTo(Math.max(0, current - 10), true);
                    }
                  }}
                />

                {/* Custom Play Icon */}
                {playerState !== 1 && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <div className="bg-indigo-600/80 p-4 rounded-full shadow-lg backdrop-blur-sm">
                      <Play className="w-12 h-12 text-white ml-2" />
                    </div>
                  </div>
                )}
                
                {/* Dynamic Watermark */}
                <div 
                  className="absolute pointer-events-none opacity-30 text-white font-bold text-xl md:text-3xl rotate-45 select-none"
                  style={{
                    top: `${Math.random() * 80}%`,
                    left: `${Math.random() * 80}%`,
                    animation: 'moveWatermark 20s linear infinite alternate'
                  }}
                >
                  {user?.name} <br/> {user?.email}
                </div>
                
                <style>{`
                  @keyframes moveWatermark {
                    0% { transform: translate(0, 0) rotate(45deg); }
                    100% { transform: translate(100px, 50px) rotate(45deg); }
                  }
                `}</style>
              </div>

              {/* Active Quiz Popup */}
              {activeQuiz && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
                  <div className="bg-gray-800 border border-indigo-500 rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-6">{activeQuiz.question}</h3>
                    <div className="space-y-3">
                      {(Array.isArray(activeQuiz.options) ? activeQuiz.options : 
                        (typeof activeQuiz.options === 'string' ? activeQuiz.options.split('-') : [])).map((opt: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => handleQuizSubmit(opt)}
                          className="w-full p-4 rounded-xl border border-gray-600 hover:bg-indigo-600 hover:border-indigo-500 text-white transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-900 p-4 rounded-b-xl" dir="ltr">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      if (playerState === 1) playerRef.current?.pauseVideo();
                      else playerRef.current?.playVideo();
                    }} 
                    className="text-white hover:text-indigo-400 focus:outline-none transition-colors"
                  >
                    {playerState === 1 ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>

                  <button 
                    onClick={() => {
                      if (!playerRef.current) return;
                      const current = playerRef.current.getCurrentTime() || 0;
                      playerRef.current.seekTo(Math.max(0, current - 10), true);
                    }} 
                    className="text-white hover:text-indigo-400 focus:outline-none transition-colors" 
                    title="تأخير 10 ثواني"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>
                  </button>

                  <button 
                    onClick={() => {
                      if (!playerRef.current) return;
                      const current = playerRef.current.getCurrentTime() || 0;
                      const duration = playerRef.current.getDuration() || 0;
                      playerRef.current.seekTo(Math.min(duration, current + 10), true);
                    }} 
                    className="text-white hover:text-indigo-400 focus:outline-none transition-colors" 
                    title="تقديم 10 ثواني"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>
                  </button>

                  <div 
                    className="flex-1 bg-gray-700 h-3 rounded-full cursor-pointer relative group"
                    onClick={handleSeek}
                  >
                    <div 
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-300 relative" 
                      style={{ width: `${Math.round(progress)}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transform translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-white text-sm w-16 font-medium text-right" dir="rtl">{Math.round(progress)}% تم</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h1 className="text-2xl font-bold text-white mb-3">{lesson?.title || 'جاري التحميل...'}</h1>
              <p className="text-gray-400 mb-4">{lesson?.course?.title || 'الدورة'}</p>
              
              {lesson?.pdfUrl && (
                <div className="mb-6 bg-indigo-900/30 border border-indigo-500/30 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="text-indigo-400 w-8 h-8" />
                    <div>
                      <h4 className="text-white font-medium">مذكرة الدرس (PDF)</h4>
                      <p className="text-gray-400 text-sm">قم بتحميل المرفقات الخاصة بهذا الدرس</p>
                    </div>
                  </div>
                  <a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    تحميل
                  </a>
                </div>
              )}
              
              {/* Homework Submission */}
              <div className="mb-6 bg-gray-900 border border-gray-700 p-4 rounded-xl">
                <h4 className="text-white font-medium mb-2">تسليم واجب الدرس</h4>
                <p className="text-gray-400 text-sm mb-4">قم برفع الحل الخاص بك (أو ضع رابط للملف) ليقوم المعلم بتصحيحه.</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="رابط الواجب (مثال: رابط Google Drive)" className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" id="homework-input" />
                  <button onClick={() => {
                    const input = document.getElementById('homework-input') as HTMLInputElement;
                    if(input && input.value) {
                      alert('تم تسليم الواجب بنجاح! سيقوم المعلم بمراجعته.');
                      input.value = '';
                    } else {
                      alert('يرجى وضع رابط الواجب أولاً.');
                    }
                  }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                    رفع الحل
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-medium text-white mb-2">معلومات النظام</h3>
                <ul className="text-gray-300 leading-relaxed text-sm space-y-2 list-disc list-inside">
                  <li>يتم تتبع مشاهدتك بشكل تلقائي ولحظي.</li>
                  <li>يمكنك تقديم الفيديو أو تأخيره بحرية تامة باستخدام الأزرار أو شريط التمرير.</li>
                  <li>تظهر أسئلة تفاعلية أثناء الشرح يجب الإجابة عليها لاستكمال الفيديو.</li>
                  <li>يظهر اسمك ورقمك كعلامة مائية متحركة لحماية حقوق النشر.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 h-fit">
            <h2 className="text-xl font-bold text-white mb-4">الدروس القادمة</h2>
            <div className="space-y-3">
              <p className="text-sm text-gray-400">سيتم إضافة الدروس القادمة هنا.</p>
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
