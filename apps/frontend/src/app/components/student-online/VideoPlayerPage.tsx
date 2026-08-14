import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Pause, Eye, ChevronRight, FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import confetti from 'canvas-confetti';
import SupabaseUploader from '../ui/SupabaseUploader';
import { courseService } from '../../services/course.service';
import { homeworkService } from '../../services/homework.service';

export default function VideoPlayerPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { user } = useAuth();
  
  const [lesson, setLesson] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [playerState, setPlayerState] = useState(-1);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizAnswered, setQuizAnswered] = useState<Record<string, boolean>>({});
  const [quizFeedback, setQuizFeedback] = useState<'success' | 'error' | null>(null);
  const [courseHomeworks, setCourseHomeworks] = useState<any[]>([]);
  const [homeworkUrl, setHomeworkUrl] = useState('');
  
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
        const res = await courseService.getLessonDetails(videoId!);
        if (res.data) {
          setLesson(res.data);
          if (res.data.progress && res.data.progress.length > 0) {
            maxTimeRef.current = res.data.progress[0].lastTimestamp || 0;
            lastTimeRef.current = maxTimeRef.current;
          }
        }
        
        if (res.data?.courseId) {
          const hwRes = await homeworkService.getHomeworksByCourse(res.data.courseId);
          setCourseHomeworks(hwRes.data || []);
        }
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
        onStateChange: (event: any) => {
          setPlayerState(event.data);
          // Resume from last timestamp when video starts playing (State 1 = playing)
          if (event.data === 1 && maxTimeRef.current > 0 && playerRef.current.getCurrentTime() < 2) {
             playerRef.current.seekTo(maxTimeRef.current, true);
          }
        }
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

      // Restrict fast-forwarding if not previously watched fully
      const isWatched = lesson?.progress && lesson.progress.length > 0 && lesson.progress[0].watched;
      
      if (!isWatched && currentTime > maxTimeRef.current + 2) {
        // Fast forward detected, snap back to maxTime
        playerRef.current.seekTo(maxTimeRef.current, true);
        return;
      }
      
      if (currentTime > maxTimeRef.current) {
        maxTimeRef.current = currentTime;
      }
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
        courseService.updateVideoProgress(videoId!, {
          progress: currentProgress,
          watched: currentProgress >= 90,
          lastTimestamp: currentTime
        }).catch(console.error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playerState, lesson, videoId, quizAnswered]);

  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    let devToolsCheckInterval: any;

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
      // Block PrintScreen, Ctrl+P, Windows+Shift+S, F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
      if (
        e.key === 'PrintScreen' || 
        (e.ctrlKey && e.key === 'p') || 
        (e.metaKey && e.shiftKey && e.key === 's') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's'))
      ) {
        e.preventDefault();
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

    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        setIsBlurred(true);
        if (playerRef.current && playerState === 1) playerRef.current.pauseVideo();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    devToolsCheckInterval = setInterval(detectDevTools, 1000);
    
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('copy', handleCopy);
      clearInterval(devToolsCheckInterval);
    };
  }, [playerState]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const duration = playerRef.current.getDuration();
    if (duration) {
      const targetTime = duration * percentage;
      const isWatched = lesson?.progress && lesson.progress.length > 0 && lesson.progress[0].watched;
      
      if (!isWatched && targetTime > maxTimeRef.current) {
        alert('لا يمكنك تخطي الفيديو إلا بعد مشاهدته كاملاً للمرة الأولى.');
        playerRef.current.seekTo(maxTimeRef.current, true);
      } else {
        playerRef.current.seekTo(targetTime, true);
      }
    }
  };

  const handleQuizSubmit = async (option: string) => {
    if (!activeQuiz) return;
    try {
      const res = await courseService.submitLessonQuiz(videoId!, activeQuiz.id, option);
      if (res.data.correct) {
        setQuizFeedback('success');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4F46E5', '#10B981', '#F59E0B']
        });
        setTimeout(() => {
          setQuizAnswered(prev => ({ ...prev, [activeQuiz.id]: true }));
          setActiveQuiz(null);
          setQuizFeedback(null);
          playerRef.current.playVideo();
        }, 2500);
      } else {
        setQuizFeedback('error');
        setTimeout(() => {
          setQuizFeedback(null);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setQuizFeedback('error');
      setTimeout(() => {
        setQuizFeedback(null);
      }, 1500);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-900 transition-all duration-300 ${isBlurred ? 'blur-xl grayscale select-none pointer-events-none' : ''}`}>
      {isBlurred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-white text-3xl font-bold">
          {/* 
            TECHNICAL NOTE FOR DEVELOPERS:
            This is a soft deterrent, not real DRM. It is bypassable via disabling JavaScript, 
            using DevTools before blur triggers, or DOM manipulation. It is purely meant to 
            deter casual screenshots/recording.
          */}
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
                    top: '40%',
                    left: '40%',
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
                  @media print {
                    body { display: none !important; opacity: 0 !important; visibility: hidden !important; }
                  }
                `}</style>
              </div>

              {/* Active Quiz Popup */}
              {activeQuiz && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 sm:p-6 z-50 overflow-hidden">
                  <div className={`bg-gray-800 border ${quizFeedback === 'success' ? 'border-green-500' : quizFeedback === 'error' ? 'border-red-500' : 'border-indigo-500'} rounded-2xl p-4 sm:p-8 max-w-lg w-full text-center shadow-2xl max-h-[90%] overflow-y-auto custom-scrollbar transition-colors duration-300`}>
                    
                    {quizFeedback === 'success' ? (
                      <div className="py-8 animate-in fade-in zoom-in duration-300">
                        <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 mx-auto mb-4" />
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">إجابة صحيحة!</h3>
                        <p className="text-gray-300">أحسنت 🌟 جاري استئناف الدرس...</p>
                      </div>
                    ) : quizFeedback === 'error' ? (
                      <div className="py-8 animate-in fade-in zoom-in duration-300">
                        <XCircle className="w-16 h-16 sm:w-20 sm:h-20 text-red-500 mx-auto mb-4" />
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">إجابة خاطئة</h3>
                        <p className="text-gray-300">حاول مرة أخرى ❌</p>
                      </div>
                    ) : (
                      <div className="animate-in fade-in duration-300">
                        <AlertTriangle className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-500 mx-auto mb-2 sm:mb-4" />
                        <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6">{activeQuiz.question}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          {(Array.isArray(activeQuiz.options) ? activeQuiz.options : 
                            (typeof activeQuiz.options === 'string' ? activeQuiz.options.split('-') : [])).map((opt: string, i: number) => (
                            <button
                              key={i}
                              onClick={() => handleQuizSubmit(opt)}
                              className="w-full p-3 sm:p-4 rounded-xl border border-gray-600 hover:bg-indigo-600 hover:border-indigo-500 text-white transition-colors text-sm sm:text-base"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                {courseHomeworks.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <select className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" id="homework-select">
                      {courseHomeworks.map(hw => <option key={hw.id} value={hw.id}>{hw.title}</option>)}
                    </select>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-white text-sm">رفع ملف الواجب (PDF/صور)</label>
                        <SupabaseUploader 
                          bucketName="homeworks"
                          label="اسحب ملف الواجب هنا للرفع"
                          maxSizeMB={20}
                          onUploadSuccess={(url) => setHomeworkUrl(url)}
                          onUploadError={(err) => alert(err)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">أو</span>
                        <div className="flex-1 border-t border-gray-700"></div>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="رابط الواجب (مثال: رابط Google Drive)" 
                          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" 
                          value={homeworkUrl}
                          onChange={(e) => setHomeworkUrl(e.target.value)}
                        />
                        <button onClick={async () => {
                          const select = document.getElementById('homework-select') as HTMLSelectElement;
                          if(homeworkUrl && select && select.value) {
                            try {
                              const { homeworkApi } = await import('../../services/api');
                              await homeworkApi.post(`/${select.value}/submit`, { url: homeworkUrl, answers: [] });
                              alert('تم تسليم الواجب بنجاح! سيقوم المعلم بمراجعته.');
                              setHomeworkUrl('');
                            } catch (err) {
                              alert('فشل في تسليم الواجب');
                            }
                          } else {
                            alert('يرجى رفع ملف الواجب أو وضع رابطه أولاً.');
                          }
                        }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                          تسليم الواجب
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-yellow-500 text-sm">لا توجد واجبات متاحة لهذه الدورة حالياً.</p>
                )}
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
