import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Pause, Eye, ChevronRight, FileText, CheckCircle, AlertTriangle, XCircle, Maximize, Minimize } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import SupabaseUploader from '../ui/SupabaseUploader';
import { courseService } from '../../services/course.service';
import { homeworkService } from '../../services/homework.service';
import { isGoogleDriveUrl, getGoogleDrivePreviewUrl } from '../../utils/videoUtils';

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
  const maxTimeRef = useRef(0);
  const lastSavedTimeRef = useRef(0);
  const isCompletedRef = useRef(false);
  const activeQuizRef = useRef<any>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  const hasAutoResumed = useRef(false);
  
  const lastRealTimeRef = useRef<number>(0);
  const lastYtTimeRef = useRef<number>(0);
  const pendingSeekTargetRef = useRef<number | null>(null);
  const seekTimeoutRef = useRef<any>(null);
  const pendingSeekTicksRef = useRef<number>(0);
  const pendingSeekLastTimeRef = useRef<number>(0);

  const handleSetActiveQuiz = (quiz: any) => {
    setActiveQuiz(quiz);
    activeQuizRef.current = quiz;
  };

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
        // Reset all lesson-specific state for new video
        setActiveQuiz(null);
        activeQuizRef.current = null;
        maxTimeRef.current = 0;
        isCompletedRef.current = false;
        hasAutoResumed.current = false;
        setPlayerState(-1);
        setQuizAnswered({});
        setQuizFeedback(null);
        setIsBlurred(false);

        // Reset all timing and seek refs
        lastRealTimeRef.current = 0;
        lastYtTimeRef.current = 0;
        pendingSeekTargetRef.current = null;
        pendingSeekTicksRef.current = 0;
        pendingSeekLastTimeRef.current = 0;
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current);
          seekTimeoutRef.current = null;
        }

        const res = await courseService.getLessonDetails(videoId!);
        if (res.data) {
          setLesson(res.data);
          if (res.data.progress && res.data.progress.length > 0) {
            maxTimeRef.current = res.data.progress[0].lastTimestamp || 0;
            isCompletedRef.current = res.data.progress[0].watched || false;
            
            const answeredFromBackend = res.data.progress[0].answeredQuizzes;
            if (Array.isArray(answeredFromBackend)) {
              const newQuizAnswered: Record<string, boolean> = {};
              answeredFromBackend.forEach((id: string) => {
                newQuizAnswered[id] = true;
              });
              setQuizAnswered(newQuizAnswered);
            }
          }
          
          if (res.data.videoUrl && isGoogleDriveUrl(res.data.videoUrl)) {
            courseService.postLessonEvents(videoId!, { eventType: 'LESSON_OPENED' }).catch(console.error);
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
    if (isGoogleDriveUrl(lesson.videoUrl)) return;
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
        fs: 1, // Enable fullscreen
        playsinline: 1
      },
      events: {
        onStateChange: (event: any) => {
          setPlayerState(event.data);
          if (event.data === 1) {
            courseService.postLessonEvents(ytId, { eventType: 'VIDEO_PLAYING' }).catch(console.error);
            // Absolute Playback Lock
            if (activeQuizRef.current) {
              playerRef.current.pauseVideo();
              return;
            }
            if (!hasAutoResumed.current && maxTimeRef.current > 0 && playerRef.current.getCurrentTime() < 2) {
               hasAutoResumed.current = true;
               playerRef.current.seekTo(maxTimeRef.current, true);
            }
          } else if (event.data === 2) {
            courseService.postLessonEvents(ytId, { eventType: 'VIDEO_PAUSED' }).catch(console.error);
          }
        }
      }
    });
  };

  useEffect(() => {
    if (lesson && isGoogleDriveUrl(lesson.videoUrl)) return;
    if (lesson && (window as any).YT && (window as any).YT.Player) {
      if (!playerRef.current) {
        initPlayer();
      } else {
        // Player already exists, just load the new video
        const match = lesson.videoUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
        const ytId = match && match[2].length === 11 ? match[2] : null;
        if (ytId && typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById(ytId);
        }
      }
    } else if (lesson && !(window as any).YT) {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }
  }, [lesson]);

  const executeProgrammaticSeek = (targetTime: number, hitQuiz: any = null) => {
    if (!playerRef.current) return;
    
    pendingSeekTargetRef.current = targetTime;
    pendingSeekTicksRef.current = 0;
    pendingSeekLastTimeRef.current = playerRef.current.getCurrentTime() || 0;
    
    playerRef.current.seekTo(targetTime, true);
    
    if (hitQuiz) {
      playerRef.current.pauseVideo();
      handleSetActiveQuiz(hitQuiz);
    }
    
    // Fail-safe: if YouTube gets stuck or the tolerance check fails, forcefully resolve after 5 seconds
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      if (pendingSeekTargetRef.current !== null) {
        pendingSeekTargetRef.current = null;
        pendingSeekTicksRef.current = 0;
        if (playerRef.current) {
          lastYtTimeRef.current = playerRef.current.getCurrentTime() || 0;
          lastRealTimeRef.current = Date.now();
        }
      }
    }, 5000); 
  };

  useEffect(() => {
    (window as any)._testPlayerRef = playerRef;
    (window as any)._testMaxTimeRef = maxTimeRef;
    (window as any)._testActiveQuizRef = activeQuizRef;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current) return;
      if (activeQuizRef.current) return; // Absolute interval lock while quiz is active
      
      const currentTime = playerRef.current.getCurrentTime() || 0;
      
      if (pendingSeekTargetRef.current !== null) {
        const diff = Math.abs(currentTime - pendingSeekTargetRef.current);
        const timeAdvanced = currentTime !== pendingSeekLastTimeRef.current;
        
        let settled = false;
        if (diff <= 0.5) {
           settled = true;
        } else if (diff <= 2.5) {
           // Allow for keyframe snapping if the time is advancing normally (playing) or cleanly paused.
           if (timeAdvanced || playerState === 2) {
              pendingSeekTicksRef.current += 1;
           } else {
              pendingSeekTicksRef.current = 0;
           }
           if (pendingSeekTicksRef.current >= 2) {
              settled = true;
           }
        }
        
        pendingSeekLastTimeRef.current = currentTime;
        
        if (settled) {
          pendingSeekTargetRef.current = null;
          pendingSeekTicksRef.current = 0;
          lastYtTimeRef.current = currentTime;
          lastRealTimeRef.current = Date.now();
          if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
        }
        return; // Freeze interval while programmatic seek completes/buffers
      }
      
      const duration = playerRef.current.getDuration();
      
      if (!duration) return;

      const now = Date.now();
      const realTimeDiff = (now - lastRealTimeRef.current) / 1000;
      const ytTimeDiff = currentTime - lastYtTimeRef.current;
      const rate = playerRef.current.getPlaybackRate() || 1;

      if (lastRealTimeRef.current === 0) {
        lastYtTimeRef.current = currentTime;
        lastRealTimeRef.current = now;
        return;
      }

      let isSeek = false;
      if (ytTimeDiff > (realTimeDiff * rate) + 2) {
        isSeek = true;
      } else if (ytTimeDiff < -2) {
        isSeek = true;
      }

      const sortedQuizzes = [...(lesson?.quizzes || [])].map((q: any) => ({
        ...q,
        timestampSec: Number(q.timestampSec)
      })).sort((a: any, b: any) => a.timestampSec - b.timestampSec);

      if (isSeek && ytTimeDiff > 0) {
        // Forward Seek
        let allowedMax = maxTimeRef.current;
        if (isCompletedRef.current) allowedMax = Infinity;
        
        let firstBlockingQuizTime = Infinity;
        for (const quiz of sortedQuizzes) {
          // You cannot jump over an unanswered quiz that is AFTER your previous position
          if (!quizAnswered[quiz.id] && quiz.timestampSec > lastYtTimeRef.current) {
            firstBlockingQuizTime = quiz.timestampSec;
            break;
          }
        }
        
        const authorizedTime = Math.min(allowedMax, firstBlockingQuizTime);

        if (currentTime > authorizedTime) {
          playerRef.current.seekTo(authorizedTime, true);
          lastYtTimeRef.current = authorizedTime;
          lastRealTimeRef.current = now;
          return; // Skip progress update this tick
        } else {
          maxTimeRef.current = Math.max(maxTimeRef.current, currentTime);
        }
      } else if (!isSeek) {
        maxTimeRef.current = Math.max(maxTimeRef.current, currentTime);
      }

      // Quiz Detection (Natural playback crossing)
      if (!isSeek && playerState === 1 && lesson?.quizzes) {
         for (const quiz of sortedQuizzes) {
            if (!quizAnswered[quiz.id]) {
               // Crossing logic with 0.1s tolerance
               if (lastYtTimeRef.current < quiz.timestampSec + 0.1 && currentTime >= quiz.timestampSec - 0.1) {
                 playerRef.current.pauseVideo();
                 playerRef.current.seekTo(quiz.timestampSec, true);
                 if (!activeQuizRef.current || activeQuizRef.current.id !== quiz.id) {
                   handleSetActiveQuiz(quiz);
                   setQuizFeedback(null);
                 }
                 lastYtTimeRef.current = quiz.timestampSec;
                 lastRealTimeRef.current = Date.now();
                 return;
               }
            }
         }
      }

      // Sync progress bar
      const currentProgress = Math.min((currentTime / duration) * 100, 100);
      setProgress(currentProgress);

      // Authoritative Completion Logic
      if (!isCompletedRef.current) {
        const isVideoEnded = playerState === 0; // 0 = ended
        const allQuizzes = lesson?.quizzes || [];
        const allQuizzesAnswered = allQuizzes.every((q: any) => quizAnswered[q.id]);
        
        if (isVideoEnded && allQuizzesAnswered) {
          isCompletedRef.current = true;
          courseService.postLessonEvents(videoId!, { eventType: 'VIDEO_COMPLETED' }).catch(console.error);
        }
      }

      // Persist progress
      if (now - lastSavedTimeRef.current > 15000) {
        const playedSeconds = lastSavedTimeRef.current === 0 ? 0 : (now - lastSavedTimeRef.current) / 1000;
        lastSavedTimeRef.current = now;
        courseService.postLessonEvents(videoId!, {
          eventType: 'VIDEO_PROGRESS_TICK',
          playedSeconds: Math.round(playedSeconds),
          progress: currentProgress,
          lastTimestamp: maxTimeRef.current
        }).catch(console.error);
      }

      lastYtTimeRef.current = currentTime;
      lastRealTimeRef.current = now;
    }, 500);

    return () => clearInterval(interval);
  }, [playerState, lesson, videoId, quizAnswered]);

  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    let devToolsCheckInterval: any;

    const handleBlur = () => {
      // Delay to allow DOM focus state to settle (e.g. iframe stealing focus programmatically)
      setTimeout(() => {
        // 1. If focus moved to our own iframe (YouTube or Google Drive)
        if (document.activeElement?.tagName === 'IFRAME') return;
        
        // 2. If the document actually still has focus (e.g. a toast or modal in the same window)
        if (document.hasFocus && document.hasFocus()) return;
        
        // 3. Otherwise, it's a genuine exit
        setIsBlurred(true);
      }, 150);
    };
    const handleFocus = () => setIsBlurred(false);
    
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsBlurred(true);
        if (playerRef.current && typeof playerRef.current.getPlayerState === 'function' && playerRef.current.getPlayerState() === 1) {
          playerRef.current.pauseVideo();
        }
      } else {
        setIsBlurred(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block PrintScreen, Ctrl+P, Windows+Shift+S, F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
      const key = e.key.toLowerCase();
      if (
        e.key === 'PrintScreen' || 
        (e.ctrlKey && key === 'p') || 
        (e.metaKey && e.shiftKey && key === 's') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
        (e.ctrlKey && (key === 'u' || key === 's'))
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
      // Multiply by devicePixelRatio to account for browser zoom
      const zoom = window.devicePixelRatio || 1;
      const widthThreshold = window.outerWidth - (window.innerWidth * zoom) > 300;
      const heightThreshold = window.outerHeight - (window.innerHeight * zoom) > 300;
      
      // On high-DPI displays (e.g. retina), devicePixelRatio is > 1 even without zoom, 
      // which breaks outerWidth comparisons in some browsers because outerWidth is often in CSS pixels.
      // A safer check that balances DevTools detection without breaking high-DPI or zoom:
      const diffX = Math.abs(window.outerWidth - window.innerWidth);
      const diffY = Math.abs(window.outerHeight - window.innerHeight);
      // Modern browsers usually don't have chrome > 350px unless devtools is open
      if (diffX > 350 || diffY > 350) {
        setIsBlurred(true);
        if (playerRef.current && typeof playerRef.current.getPlayerState === 'function' && playerRef.current.getPlayerState() === 1) {
          playerRef.current.pauseVideo();
        }
      } else {
        setIsBlurred(false);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('contextmenu', handleContextMenu);
    
    devToolsCheckInterval = setInterval(detectDevTools, 1000);
    
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(devToolsCheckInterval);
    };
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current) return;
    
    if (activeQuizRef.current) {
      toast.error('يجب الإجابة على السؤال أولاً.');
      return;
    }

    const clickX = e.nativeEvent.offsetX;
    const targetWidth = e.currentTarget.clientWidth || 1;
    let percentage = Math.max(0, Math.min(1, clickX / targetWidth));
    
    // In RTL layouts, if the progress bar visually fills from right to left, we might need to invert the percentage.
    // However, since we forced dir="ltr" on the container, it visually fills left to right.
    // offsetX reliably gives distance from the left edge.
    const duration = playerRef.current.getDuration();
    if (!duration) return;
    
    const targetTime = duration * percentage;
    const currentTime = pendingSeekTargetRef.current !== null 
                        ? pendingSeekTargetRef.current 
                        : (playerRef.current.getCurrentTime() || 0);

    // 1. Backward seeking must ALWAYS work.
    if (targetTime < currentTime) {
      executeProgrammaticSeek(targetTime);
      return;
    }

    // 2. Forward seeking
    let allowedMax = maxTimeRef.current;
    if (isCompletedRef.current) allowedMax = Infinity;

    // Find the EARLIEST unanswered quiz that is AFTER the current position
    const sortedQuizzes = [...(lesson?.quizzes || [])]
        .map((q: any) => ({ ...q, timestampSec: Number(q.timestampSec) }))
        .sort((a: any, b: any) => a.timestampSec - b.timestampSec);

    let firstBlockingQuizTime = Infinity;
    for (const quiz of sortedQuizzes) {
      if (!quizAnswered[quiz.id] && quiz.timestampSec > currentTime) {
        firstBlockingQuizTime = quiz.timestampSec;
        break; // Only the earliest one blocks
      }
    }

    // Add a 1.5s tolerance to account for state machine polling lag
    const authorizedTime = Math.min(allowedMax, firstBlockingQuizTime) + 1.5;

    if (targetTime > authorizedTime) {
      // Unauthorized forward seek
      if (firstBlockingQuizTime <= allowedMax && targetTime > firstBlockingQuizTime + 1.5) {
         // Blocked by an unanswered quiz
         toast.error('لا يمكنك تخطي سؤال مطلوب.');
         // Execute seek to the quiz so the state machine natural crossing triggers it
         executeProgrammaticSeek(firstBlockingQuizTime);
      } else {
         // Blocked by maxWatchedTime
         toast.error('لا يمكنك تخطي الفيديو إلا بعد مشاهدته كاملاً للمرة الأولى.');
         executeProgrammaticSeek(authorizedTime);
      }
    } else {
      // Authorized forward seek
      executeProgrammaticSeek(targetTime);
    }
  };

  const handleQuizSubmit = async (option: string) => {
    if (!activeQuiz) return;
    try {
      const res = await courseService.submitLessonQuiz(videoId!, activeQuiz.id, option);
      courseService.postLessonEvents(videoId!, { eventType: 'QUIZ_SUBMITTED' }).catch(console.error);
      if (res.data.passed) {
        setQuizFeedback('success');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4F46E5', '#10B981', '#F59E0B']
        });
        setTimeout(() => {
          setQuizAnswered(prev => ({ ...prev, [activeQuiz.id]: true }));
          handleSetActiveQuiz(null);
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
            <div ref={containerRef} className="bg-black rounded-xl overflow-hidden relative" onContextMenu={e => e.preventDefault()}>
              <div className="relative aspect-video bg-gray-800 flex items-center justify-center">
                {lesson?.videoUrl ? (
                  isGoogleDriveUrl(lesson.videoUrl) ? (
                    <div className="w-full h-full flex flex-col pointer-events-auto z-[50]">
                      <iframe
                        src={getGoogleDrivePreviewUrl(lesson.videoUrl) || ''}
                        className="w-full h-full border-0 rounded-xl"
                        allow="autoplay; fullscreen"
                        allowFullScreen
                      ></iframe>
                      <div className="absolute top-4 left-4 right-4 bg-yellow-900/90 text-yellow-100 p-3 rounded-xl flex items-center gap-3 shadow-xl backdrop-blur-sm z-[60] pointer-events-none">
                        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                        <span className="text-sm">إذا لم يعمل الفيديو، يرجى طلب تغيير صلاحيات المشاركة لجوجل درايف إلى "أي شخص لديه الرابط". الأسئلة الموقوتة غير مدعومة هنا.</span>
                      </div>
                    </div>
                  ) : (
                    <div id="yt-player" className="w-full h-full pointer-events-none" />
                  )
                ) : (
                  <div className="text-white">جاري تحميل الفيديو...</div>
                )}

                {(!lesson?.videoUrl || !isGoogleDriveUrl(lesson.videoUrl)) && (
                  <div 
                    className="absolute inset-0 z-10 cursor-pointer"
                    onClick={() => {
                      if (activeQuizRef.current) return;
                      if (playerState === 1) {
                        playerRef.current?.pauseVideo();
                      } else {
                        playerRef.current?.playVideo();
                      }
                    }}
                    onDoubleClick={(e) => {
                      if (!playerRef.current || activeQuizRef.current) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const current = pendingSeekTargetRef.current !== null ? pendingSeekTargetRef.current : (playerRef.current.getCurrentTime() || 0);
                      const duration = playerRef.current.getDuration() || 0;
                      
                      if (clickX > rect.width / 2) {
                        // Forward 10s
                        let targetTime = Math.min(duration, current + 10);
                        
                        const sortedQuizzes = [...(lesson?.quizzes || [])]
                          .map(q => ({...q, timestampSec: Number(q.timestampSec)}))
                          .sort((a: any, b: any) => a.timestampSec - b.timestampSec);
                          
                        let hitQuiz = null;
                        for (const quiz of sortedQuizzes) {
                          if (!quizAnswered[quiz.id] && quiz.timestampSec > current && quiz.timestampSec <= targetTime) {
                            hitQuiz = quiz;
                            break;
                          }
                        }
                        
                        if (hitQuiz) {
                          executeProgrammaticSeek(hitQuiz.timestampSec, hitQuiz);
                          return;
                        }
                        
                        if (!isCompletedRef.current && targetTime > maxTimeRef.current) {
                           targetTime = maxTimeRef.current;
                        }
                        
                        executeProgrammaticSeek(targetTime);
                      } else {
                        // Backward 10s
                        const targetTime = Math.max(0, current - 10);
                        executeProgrammaticSeek(targetTime);
                      }
                    }}
                  />
                )}

                {/* Custom Play Icon */}
                {(!lesson?.videoUrl || !isGoogleDriveUrl(lesson.videoUrl)) && playerState !== 1 && (
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
                  #yt-player {
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100% !important;
                    aspect-ratio: 16 / 9 !important;
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

              {(!lesson?.videoUrl || !isGoogleDriveUrl(lesson.videoUrl)) && (
                <div className="bg-gray-900 p-4 rounded-b-xl" dir="ltr">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        if (activeQuizRef.current) return;
                        if (playerState === 1) playerRef.current?.pauseVideo();
                        else playerRef.current?.playVideo();
                      }} 
                      className="text-white hover:text-indigo-400 focus:outline-none transition-colors"
                    >
                      {playerState === 1 ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>

                    <button 
                      onClick={() => {
                        if (!playerRef.current || activeQuizRef.current) return;
                        const current = pendingSeekTargetRef.current !== null ? pendingSeekTargetRef.current : (playerRef.current.getCurrentTime() || 0);
                        const targetTime = Math.max(0, current - 10);
                        executeProgrammaticSeek(targetTime);
                      }} 
                      className="text-white hover:text-indigo-400 focus:outline-none transition-colors" 
                      title="تأخير 10 ثواني"
                    >
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>
                    </button>

                    <button 
                      onClick={() => {
                        if (!playerRef.current || activeQuizRef.current) return;
                        const current = pendingSeekTargetRef.current !== null ? pendingSeekTargetRef.current : (playerRef.current.getCurrentTime() || 0);
                        const duration = playerRef.current.getDuration() || 0;
                        let targetTime = Math.min(duration, current + 10);
                        
                        const sortedQuizzes = [...(lesson?.quizzes || [])]
                          .map(q => ({...q, timestampSec: Number(q.timestampSec)}))
                          .sort((a: any, b: any) => a.timestampSec - b.timestampSec);
                          
                        let hitQuiz = null;
                        for (const quiz of sortedQuizzes) {
                          if (!quizAnswered[quiz.id] && quiz.timestampSec > current && quiz.timestampSec <= targetTime) {
                            hitQuiz = quiz;
                            break;
                          }
                        }

                        if (hitQuiz) {
                          executeProgrammaticSeek(hitQuiz.timestampSec, hitQuiz);
                          return;
                        }

                        if (!isCompletedRef.current && targetTime > maxTimeRef.current) {
                           targetTime = maxTimeRef.current;
                        }
                        
                        executeProgrammaticSeek(targetTime);
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
                    
                    <button
                      onClick={toggleFullscreen}
                      className="text-white hover:text-indigo-400 focus:outline-none transition-colors"
                      title="ملء الشاشة"
                    >
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}
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

              {/* Google Drive Quizzes */}
              {lesson?.videoUrl && isGoogleDriveUrl(lesson.videoUrl) && lesson?.quizzes?.length > 0 && (
                <div className="mb-6 bg-gray-900 border border-gray-700 p-4 rounded-xl">
                  <h4 className="text-white font-medium mb-4">أسئلة الدرس</h4>
                  <div className="space-y-4">
                    {lesson.quizzes.map((quiz: any, idx: number) => (
                      <div key={quiz.id || idx} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="bg-indigo-600/20 text-indigo-400 w-8 h-8 rounded-lg flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <h5 className="text-white font-medium">{quiz.question}</h5>
                        </div>
                        
                        {quizAnswered[quiz.id] ? (
                          <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">تمت الإجابة بشكل صحيح</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(Array.isArray(quiz.options) ? quiz.options : 
                              (typeof quiz.options === 'string' ? quiz.options.split('-') : [])).map((opt: string, i: number) => (
                              <button
                                key={i}
                                onClick={async () => {
                                  try {
                                    const res = await courseService.submitLessonQuiz(videoId!, quiz.id, opt);
                                    if (res.data.passed) {
                                      setQuizAnswered(prev => ({ ...prev, [quiz.id]: true }));
                                      confetti({
                                        particleCount: 100,
                                        spread: 70,
                                        origin: { y: 0.6 },
                                        colors: ['#4F46E5', '#10B981', '#F59E0B']
                                      });
                                    } else {
                                      toast.error('إجابة خاطئة، حاول مرة أخرى.');
                                    }
                                  } catch (err) {
                                    console.error(err);
                                    toast.error('حدث خطأ أثناء إرسال الإجابة.');
                                  }
                                }}
                                className="w-full p-3 rounded-lg border border-gray-600 hover:bg-indigo-600 hover:border-indigo-500 text-gray-300 hover:text-white transition-colors text-sm text-right"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
                              toast.success('تم تسليم الواجب بنجاح! سيقوم المعلم بمراجعته.');
                              setHomeworkUrl('');
                            } catch (err) {
                              toast.error('فشل في تسليم الواجب');
                            }
                          } else {
                            toast.warning('يرجى التأكد من اختيار الواجب وإضافة رابط الحل');
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
