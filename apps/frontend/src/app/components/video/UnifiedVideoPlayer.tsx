import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX,
  Maximize, Minimize, Settings, CheckCircle, AlertCircle,
  AlertTriangle, XCircle, ChevronRight, ChevronLeft,
  FileText, Upload, Clock, Sparkles, ShieldCheck,
  BookOpen, Tv, RefreshCw, Check, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import SupabaseUploader from '../ui/SupabaseUploader';
import { courseService } from '../../services/course.service';
import { homeworkService } from '../../services/homework.service';
import {
  getVideoSourceType,
  extractYouTubeVideoId,
  getGoogleDrivePreviewUrl,
  formatVideoTime,
  isGoogleDriveUrl
} from '../../utils/videoUtils';

interface UnifiedVideoPlayerProps {
  lessonId: string;
  backUrl: string;
  mode?: 'online' | 'center';
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export default function UnifiedVideoPlayer({ lessonId, backUrl, mode = 'online' }: UnifiedVideoPlayerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Lesson & Course data
  const [lesson, setLesson] = useState<any>(null);
  const [courseLessons, setCourseLessons] = useState<any[]>([]);
  const [courseHomeworks, setCourseHomeworks] = useState<any[]>([]);
  const [homeworkUrl, setHomeworkUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showResumeAlert, setShowResumeAlert] = useState(false);

  // Anti-Cheat & Quizzes
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizAnswered, setQuizAnswered] = useState<Record<string, boolean>>({});
  const [quizFeedback, setQuizFeedback] = useState<'success' | 'error' | null>(null);
  const [isBlurred, setIsBlurred] = useState(false);

  // References
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const htmlVideoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTickTimeRef = useRef<number>(Date.now());
  const lastSavedTimestampRef = useRef<number>(0);
  const isCompletedRef = useRef(false);
  const maxWatchedTimeRef = useRef(0);
  const activeQuizRef = useRef<any>(null);
  const hasAutoResumedRef = useRef(false);

  // Source categorization
  const videoSourceType = getVideoSourceType(lesson?.videoUrl);
  const ytVideoId = extractYouTubeVideoId(lesson?.videoUrl);

  // 1. Initial Data Fetching
  const fetchLessonData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setActiveQuiz(null);
      activeQuizRef.current = null;
      setQuizFeedback(null);
      hasAutoResumedRef.current = false;
      setIsPlaying(false);
      setCurrentTime(0);
      setProgressPercent(0);

      const res = await courseService.getLessonDetails(lessonId);
      if (!res.data) {
        setLoadError('لم يتم العثور على بيانات الدرس');
        setIsLoading(false);
        return;
      }

      const lessonData = res.data;
      setLesson(lessonData);

      // Handle Existing Progress
      if (lessonData.progress && lessonData.progress.length > 0) {
        const p = lessonData.progress[0];
        const savedTime = Number(p.lastTimestamp) || 0;
        maxWatchedTimeRef.current = savedTime;
        isCompletedRef.current = Boolean(p.watched || p.status === 'COMPLETED');
        setProgressPercent(Number(p.progress) || 0);

        if (savedTime > 5 && !isCompletedRef.current) {
          setShowResumeAlert(true);
        }

        if (Array.isArray(p.answeredQuizzes)) {
          const answeredMap: Record<string, boolean> = {};
          p.answeredQuizzes.forEach((qId: string) => {
            answeredMap[qId] = true;
          });
          setQuizAnswered(answeredMap);
        }
      }

      // Notify Backend: Lesson Opened
      courseService.postLessonEvents(lessonId, { eventType: 'LESSON_OPENED' }).catch(() => {});

      // Fetch Course Lessons for navigation & playlist
      if (lessonData.courseId) {
        try {
          const courseRes = await courseService.getCourseDetails(lessonData.courseId);
          if (courseRes.data?.lessons) {
            setCourseLessons(courseRes.data.lessons);
          }
        } catch {
          // Non-critical fallback
        }

        try {
          const hwRes = await homeworkService.getHomeworksByCourse(lessonData.courseId);
          setCourseHomeworks(hwRes.data || []);
        } catch {
          // Non-critical fallback
        }
      }
    } catch (err: any) {
      console.error('Error fetching lesson:', err);
      setLoadError(err.response?.data?.message || 'حدث خطأ أثناء تحميل بيانات الفيديو');
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchLessonData();
  }, [fetchLessonData]);

  // 2. YouTube IFrame API Loader
  useEffect(() => {
    if (videoSourceType === 'youtube' && !(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, [videoSourceType]);

  // 3. YouTube Player Initialization
  const initYouTubePlayer = useCallback(() => {
    if (!ytVideoId || !(window as any).YT || !(window as any).YT.Player) return;

    if (ytPlayerRef.current) {
      try {
        if (typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById(ytVideoId);
          return;
        }
      } catch {
        // Fall through to instantiate
      }
    }

    try {
      ytPlayerRef.current = new (window as any).YT.Player('unified-yt-player', {
        videoId: ytVideoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          fs: 0, // Handled by custom player container
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            const dur = event.target.getDuration() || 0;
            if (dur > 0) setDuration(dur);
          },
          onStateChange: (event: any) => {
            // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
            if (event.data === 1) {
              setIsPlaying(true);
              courseService.postLessonEvents(lessonId, { eventType: 'VIDEO_PLAYING' }).catch(() => {});
            } else if (event.data === 2) {
              setIsPlaying(false);
              courseService.postLessonEvents(lessonId, { eventType: 'VIDEO_PAUSED' }).catch(() => {});
            } else if (event.data === 0) {
              setIsPlaying(false);
              handleVideoEnded();
            }
          },
          onError: (event: any) => {
            console.error('YouTube Player Error:', event.data);
            if (event.data === 101 || event.data === 150) {
              setLoadError('صاحب هذا الفيديو على يوتيوب قام بتعطيل التضمين (Embedding). يرجى التحقق من إعدادات الفيديو.');
            } else {
              setLoadError('تعذر تشغيل الفيديو من المصدر. تأكد من صحة الرابط.');
            }
          }
        }
      });
    } catch (err) {
      console.error('Failed to create YT player:', err);
    }
  }, [ytVideoId, lessonId]);

  useEffect(() => {
    if (videoSourceType === 'youtube' && !isLoading) {
      if ((window as any).YT && (window as any).YT.Player) {
        setTimeout(initYouTubePlayer, 150);
      } else {
        (window as any).onYouTubeIframeAPIReady = initYouTubePlayer;
      }
    }
  }, [videoSourceType, isLoading, initYouTubePlayer]);

  // 4. Time Sync & Checkpoint Trigger Loop (Active Playback)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      let current = 0;
      let total = duration;

      if (videoSourceType === 'youtube' && ytPlayerRef.current) {
        if (typeof ytPlayerRef.current.getCurrentTime === 'function') {
          current = ytPlayerRef.current.getCurrentTime() || 0;
        }
        if (typeof ytPlayerRef.current.getDuration === 'function') {
          const d = ytPlayerRef.current.getDuration() || 0;
          if (d > 0 && d !== total) {
            total = d;
            setDuration(d);
          }
        }
      } else if (videoSourceType === 'direct' && htmlVideoRef.current) {
        current = htmlVideoRef.current.currentTime || 0;
        if (htmlVideoRef.current.duration > 0 && htmlVideoRef.current.duration !== total) {
          total = htmlVideoRef.current.duration;
          setDuration(total);
        }
      }

      setCurrentTime(current);
      maxWatchedTimeRef.current = Math.max(maxWatchedTimeRef.current, current);

      if (total > 0) {
        const pct = Math.min(100, Math.round((current / total) * 100));
        setProgressPercent(pct);
      }

      // Checkpoint Quizzes Detection
      if (lesson?.quizzes && Array.isArray(lesson.quizzes) && !activeQuizRef.current) {
        for (const quiz of lesson.quizzes) {
          const qTime = Number(quiz.timestampSec);
          if (!quizAnswered[quiz.id] && qTime > 0) {
            // Trigger when passing within 1.5s of quiz timestamp
            if (current >= qTime - 0.5 && current <= qTime + 1.5) {
              handleTriggerQuiz(quiz);
              break;
            }
          }
        }
      }

      // Throttled Progress Persistence (every 6 seconds)
      const now = Date.now();
      if (now - lastTickTimeRef.current >= 6000) {
        const playedSec = Math.round((now - lastTickTimeRef.current) / 1000);
        lastTickTimeRef.current = now;
        lastSavedTimestampRef.current = current;

        courseService.postLessonEvents(lessonId, {
          eventType: 'VIDEO_PROGRESS_TICK',
          playedSeconds: playedSec,
          progress: total > 0 ? (current / total) * 100 : 0,
          lastTimestamp: Math.round(current)
        }).catch(() => {});
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, duration, videoSourceType, lesson, quizAnswered, lessonId]);

  // 5. Completion Logic
  const handleVideoEnded = useCallback(() => {
    isCompletedRef.current = true;
    setProgressPercent(100);
    courseService.postLessonEvents(lessonId, {
      eventType: 'VIDEO_COMPLETED',
      progress: 100,
      lastTimestamp: duration
    }).catch(() => {});

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });

    toast.success('أحسنت! تم إكمال مشاهدة الدرس بنجاح 🎉');
  }, [lessonId, duration]);

  // 6. Interactive Quiz Handlers
  const handleTriggerQuiz = (quiz: any) => {
    pausePlayback();
    setActiveQuiz(quiz);
    activeQuizRef.current = quiz;
    setQuizFeedback(null);
  };

  const handleQuizAnswerSubmit = async (selectedOption: string) => {
    if (!activeQuiz) return;
    try {
      const res = await courseService.submitLessonQuiz(lessonId, activeQuiz.id, selectedOption);
      if (res.data?.passed) {
        setQuizFeedback('success');
        setQuizAnswered(prev => ({ ...prev, [activeQuiz.id]: true }));

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.5 }
        });

        setTimeout(() => {
          setActiveQuiz(null);
          activeQuizRef.current = null;
          setQuizFeedback(null);
          resumePlayback();
        }, 1500);
      } else {
        setQuizFeedback('error');
        toast.error('إجابة غير صحيحة، حاول مرة أخرى.');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تقييم الإجابة.');
    }
  };

  // 7. Core Playback Controls
  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (videoSourceType === 'youtube' && ytPlayerRef.current) {
      if (typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
    } else if (videoSourceType === 'direct' && htmlVideoRef.current) {
      htmlVideoRef.current.pause();
    }
  };

  const resumePlayback = () => {
    if (activeQuizRef.current) return;
    setIsPlaying(true);
    setShowResumeAlert(false);

    if (videoSourceType === 'youtube' && ytPlayerRef.current) {
      if (typeof ytPlayerRef.current.playVideo === 'function') {
        ytPlayerRef.current.playVideo();
      }
    } else if (videoSourceType === 'direct' && htmlVideoRef.current) {
      htmlVideoRef.current.play().catch(console.error);
    }
  };

  const seekTo = (targetSeconds: number) => {
    const clamped = Math.max(0, Math.min(duration || targetSeconds, targetSeconds));
    setCurrentTime(clamped);

    if (videoSourceType === 'youtube' && ytPlayerRef.current) {
      if (typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(clamped, true);
      }
    } else if (videoSourceType === 'direct' && htmlVideoRef.current) {
      htmlVideoRef.current.currentTime = clamped;
    }
  };

  const skipRelative = (deltaSeconds: number) => {
    seekTo(currentTime + deltaSeconds);
  };

  const handleResumeClick = () => {
    seekTo(maxWatchedTimeRef.current);
    setShowResumeAlert(false);
    resumePlayback();
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);

    if (videoSourceType === 'youtube' && ytPlayerRef.current) {
      if (typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(newVol * 100);
      }
    } else if (videoSourceType === 'direct' && htmlVideoRef.current) {
      htmlVideoRef.current.volume = newVol;
      htmlVideoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      handleVolumeChange(volume > 0 ? volume : 0.8);
    } else {
      handleVolumeChange(0);
    }
  };

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);

    if (videoSourceType === 'youtube' && ytPlayerRef.current) {
      if (typeof ytPlayerRef.current.setPlaybackRate === 'function') {
        ytPlayerRef.current.setPlaybackRate(speed);
      }
    } else if (videoSourceType === 'direct' && htmlVideoRef.current) {
      htmlVideoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Handle Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Controls Visibility Auto-Hide
  const handleUserActivity = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
        setShowSpeedMenu(false);
      }, 3500);
    }
  };

  // Anti-Cheat: Soft Window Blur Pause
  useEffect(() => {
    const onBlur = () => {
      setTimeout(() => {
        if (document.activeElement?.tagName === 'IFRAME') return;
        if (document.hasFocus && document.hasFocus()) return;
        setIsBlurred(true);
        pausePlayback();
      }, 200);
    };
    const onFocus = () => setIsBlurred(false);

    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Previous & Next Lesson Navigation
  const currentIndex = courseLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;

  const navigateToLesson = (targetLessonId: string) => {
    const routePrefix = mode === 'center' ? '/student/center/videos' : '/student/online/videos';
    navigate(`${routePrefix}/${targetLessonId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-indigo-500/30" dir="rtl">
      {/* Content Protection Blur Screen */}
      {isBlurred && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex flex-col items-center justify-center p-6 text-center backdrop-blur-lg">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">تم إيقاف العرض مؤقتاً</h2>
          <p className="text-sm text-slate-400 max-w-sm">
            تم إيقاف الفيديو مؤقتاً لحماية حقوق النشر والتركيز على الدرس. انقر هنا للعودة لمتابعة المشاهدة.
          </p>
          <button
            onClick={() => setIsBlurred(false)}
            className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-600/25"
          >
            متابعة المشاهدة
          </button>
        </div>
      )}

      {/* Top Header Navigation */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(backUrl)}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3.5 py-2 rounded-xl transition-colors border border-slate-700/50 shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة لقائمة الدروس</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
            <BookOpen className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
            <span className="truncate font-medium">{lesson?.course?.title || 'الدورة'}</span>
            <span>/</span>
            <span className="text-slate-200 truncate font-semibold">{lesson?.title || 'الدرس'}</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Video Player & Controls (Takes 2 Cols on Desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Player Container */}
            <div
              ref={playerContainerRef}
              onMouseMove={handleUserActivity}
              onTouchStart={handleUserActivity}
              onContextMenu={(e) => e.preventDefault()}
              className={`group relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 transition-all ${
                isFullscreen
                  ? 'fixed inset-0 w-screen h-screen z-[9999] rounded-none border-none flex flex-col justify-center'
                  : 'aspect-video w-full'
              }`}
            >
              {/* Dynamic Anti-Piracy Watermark */}
              <div
                className="absolute pointer-events-none opacity-20 text-white font-black text-sm sm:text-2xl select-none z-30"
                style={{
                  top: '35%',
                  left: '30%',
                  animation: 'moveWatermark 18s linear infinite alternate'
                }}
              >
                {user?.name} | {user?.email}
              </div>

              <style>{`
                @keyframes moveWatermark {
                  0% { transform: translate(0, 0) rotate(-15deg); }
                  100% { transform: translate(120px, 60px) rotate(-15deg); }
                }
              `}</style>

              {/* Loading State */}
              {isLoading && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3 z-30">
                  <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs sm:text-sm text-slate-300 font-medium">جاري تجهيز مشغل الفيديو...</p>
                </div>
              )}

              {/* Error State */}
              {loadError && !isLoading && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-30">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">تعذر تشغيل الفيديو</h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">{loadError}</p>
                  <button
                    onClick={fetchLessonData}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {/* Resume Playback Banner */}
              {showResumeAlert && !isPlaying && !isLoading && (
                <div className="absolute top-4 inset-x-4 sm:inset-x-auto sm:end-4 z-30 bg-slate-900/90 border border-indigo-500/40 text-white px-4 py-2.5 rounded-xl shadow-xl backdrop-blur-md flex items-center justify-between sm:justify-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>توقفت عند <b className="text-indigo-300">{formatVideoTime(maxWatchedTimeRef.current)}</b></span>
                  </div>
                  <button
                    onClick={handleResumeClick}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    استئناف
                  </button>
                </div>
              )}

              {/* Interactive In-Video Quiz Overlay */}
              {activeQuiz && (
                <div className="absolute inset-0 bg-slate-950/90 z-40 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md animate-in fade-in">
                  <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 sm:p-7 max-w-md w-full shadow-2xl text-center max-h-[90vh] overflow-y-auto">
                    {quizFeedback === 'success' ? (
                      <div className="py-4 animate-in zoom-in-95">
                        <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
                        <h4 className="text-xl font-black text-white mb-1">إجابة صحيحة!</h4>
                        <p className="text-xs text-slate-300">أحسنت 🌟 جاري استئناف الشرح...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                          سؤال تفاعلي أثناء الشرح
                        </span>
                        <h4 className="text-base sm:text-lg font-bold text-white mb-4 leading-snug">
                          {activeQuiz.question}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(Array.isArray(activeQuiz.options)
                            ? activeQuiz.options
                            : typeof activeQuiz.options === 'string'
                            ? activeQuiz.options.split('-')
                            : []
                          ).map((opt: string, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => handleQuizAnswerSubmit(opt)}
                              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-indigo-600 hover:border-indigo-500 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition-all text-center"
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

              {/* Video Player Display */}
              {!isLoading && !loadError && (
                <>
                  {videoSourceType === 'youtube' && (
                    <div className="w-full h-full relative pointer-events-none">
                      <div id="unified-yt-player" className="w-full h-full pointer-events-auto" />
                    </div>
                  )}

                  {videoSourceType === 'direct' && (
                    <video
                      ref={htmlVideoRef}
                      src={lesson?.videoUrl}
                      className="w-full h-full object-contain"
                      crossOrigin="anonymous"
                      playsInline
                      onClick={togglePlay}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={handleVideoEnded}
                    />
                  )}

                  {videoSourceType === 'google-drive' && (
                    <iframe
                      src={getGoogleDrivePreviewUrl(lesson?.videoUrl) || ''}
                      className="w-full h-full border-0"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      title={lesson?.title}
                    />
                  )}
                </>
              )}

              {/* Center Click Surface / Big Play Button */}
              {videoSourceType !== 'google-drive' && !activeQuiz && (
                <div
                  onClick={togglePlay}
                  className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer select-none"
                >
                  {!isPlaying && !isLoading && !loadError && (
                    <button
                      type="button"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transform transition-all hover:scale-110 active:scale-95 group"
                    >
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white translate-x-0.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Custom Controls Bar Overlay */}
              {videoSourceType !== 'google-drive' && !activeQuiz && (
                <div
                  className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 transition-opacity duration-300 ${
                    controlsVisible || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  dir="ltr"
                >
                  {/* Seek Scrubber Bar */}
                  <div className="mb-2 sm:mb-3 flex items-center gap-2 group/track">
                    <div
                      className="relative w-full h-2 bg-slate-700/80 rounded-full cursor-pointer hover:h-3 transition-all"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = (e.clientX - rect.left) / rect.width;
                        if (duration > 0) {
                          seekTo(pos * duration);
                        }
                      }}
                    >
                      {/* Played Progress Fill */}
                      <div
                        className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                        style={{ width: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%` }}
                      />

                      {/* Scrubber Knob */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover/track:opacity-100 transition-opacity"
                        style={{ left: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%` }}
                      />

                      {/* Checkpoint Markers on Timeline */}
                      {lesson?.quizzes && duration > 0 && lesson.quizzes.map((q: any) => {
                        const markerPos = (Number(q.timestampSec) / duration) * 100;
                        if (markerPos <= 100) {
                          return (
                            <div
                              key={q.id}
                              title={`سؤال عند ${formatVideoTime(q.timestampSec)}`}
                              className="absolute top-0 bottom-0 w-1.5 bg-amber-400 rounded-full z-10 -translate-x-1/2"
                              style={{ left: `${markerPos}%` }}
                            />
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>

                  {/* Buttons Row */}
                  <div className="flex items-center justify-between text-white text-xs">
                    {/* Left Controls (Play/Pause, Skip, Volume, Time) */}
                    <div className="flex items-center gap-2 sm:gap-4">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors focus:outline-none"
                        aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => skipRelative(-10)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors hidden sm:flex items-center gap-0.5 text-[11px] font-bold"
                        title="تأخير 10 ثواني"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>10-</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => skipRelative(10)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors hidden sm:flex items-center gap-0.5 text-[11px] font-bold"
                        title="تقديم 10 ثواني"
                      >
                        <RotateCw className="w-4 h-4" />
                        <span>10+</span>
                      </button>

                      {/* Volume */}
                      <div className="flex items-center gap-1.5 group/vol">
                        <button
                          type="button"
                          onClick={toggleMute}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-14 sm:w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 hidden sm:block"
                        />
                      </div>

                      {/* Time display */}
                      <div className="font-mono text-slate-300 text-[11px] sm:text-xs">
                        <span>{formatVideoTime(currentTime)}</span>
                        <span className="mx-1 text-slate-500">/</span>
                        <span>{formatVideoTime(duration)}</span>
                      </div>
                    </div>

                    {/* Right Controls (Speed, Fullscreen) */}
                    <div className="flex items-center gap-2 relative">
                      {/* Speed Dropdown Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                          className="px-2 py-1 rounded-lg hover:bg-white/10 transition-colors text-xs font-mono font-bold flex items-center gap-1"
                        >
                          <span>{playbackSpeed}x</span>
                        </button>

                        {showSpeedMenu && (
                          <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 min-w-[70px]">
                            {SPEED_OPTIONS.map((speed) => (
                              <button
                                key={speed}
                                onClick={() => handleSpeedSelect(speed)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono text-center transition-colors ${
                                  playbackSpeed === speed
                                    ? 'bg-indigo-600 text-white font-bold'
                                    : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Fullscreen */}
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
                      >
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Below Video Guidance Alert for Google Drive */}
            {videoSourceType === 'google-drive' && (
              <div className="bg-amber-950/40 border border-amber-500/30 text-amber-200/90 p-3.5 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  يتم تشغيل هذا الدرس عبر مشغل جوجل درايف. يمكنك استعراض أسئلة الدرس التفاعلية بالأسفل بعد مشاهدة الشرح.
                </p>
              </div>
            )}

            {/* Lesson Title & Progress Summary Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {lesson?.title || 'جاري التحميل...'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {lesson?.course?.title || 'الدورة التعليمية'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      isCompletedRef.current
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : progressPercent > 0
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isCompletedRef.current ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        تم إكمال الدرس
                      </>
                    ) : progressPercent > 0 ? (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        قيد المشاهدة ({progressPercent}%)
                      </>
                    ) : (
                      'لم تبدأ بعد'
                    )}
                  </span>
                </div>
              </div>

              {/* Progress Bar with Metric */}
              <div className="space-y-1.5 mb-5">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>نسبة المشاهدة المكتملة</span>
                  <span className="font-bold text-indigo-400">{progressPercent}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-indigo-500 to-indigo-600 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Previous & Next Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                {prevLesson ? (
                  <button
                    onClick={() => navigateToLesson(prevLesson.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-semibold transition-colors truncate"
                  >
                    <ChevronRight className="w-4 h-4 shrink-0" />
                    <span className="truncate">الدرس السابق: {prevLesson.title}</span>
                  </button>
                ) : (
                  <div className="flex-1" />
                )}

                {nextLesson ? (
                  <button
                    onClick={() => navigateToLesson(nextLesson.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold transition-colors shadow-md shadow-indigo-600/20 truncate"
                  >
                    <span className="truncate">الدرس التالي: {nextLesson.title}</span>
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                  </button>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </div>

            {/* Attached Lesson Material (PDF) */}
            {lesson?.pdfUrl && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">مذكرة وملفات الدرس (PDF)</h4>
                    <p className="text-xs text-slate-400 truncate">قم بتحميل المرفقات الخاصة بهذا الدرس للمذاكرة</p>
                  </div>
                </div>
                <a
                  href={lesson.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-sm"
                >
                  تحميل
                </a>
              </div>
            )}

            {/* Google Drive Quizzes List */}
            {videoSourceType === 'google-drive' && lesson?.quizzes?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  أسئلة الدرس التفاعلية
                </h4>
                <div className="space-y-3">
                  {lesson.quizzes.map((quiz: any, idx: number) => (
                    <div key={quiz.id || idx} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h5 className="text-xs sm:text-sm font-bold text-white">{quiz.question}</h5>
                      </div>

                      {quizAnswered[quiz.id] ? (
                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-xs font-semibold">
                          <CheckCircle className="w-4 h-4" />
                          <span>تمت الإجابة بشكل صحيح</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(Array.isArray(quiz.options)
                            ? quiz.options
                            : typeof quiz.options === 'string'
                            ? quiz.options.split('-')
                            : []
                          ).map((opt: string, i: number) => (
                            <button
                              key={i}
                              onClick={async () => {
                                try {
                                  const res = await courseService.submitLessonQuiz(lessonId, quiz.id, opt);
                                  if (res.data?.passed) {
                                    setQuizAnswered((prev) => ({ ...prev, [quiz.id]: true }));
                                    confetti({ particleCount: 70, spread: 50 });
                                    toast.success('إجابة صحيحة!');
                                  } else {
                                    toast.error('إجابة غير صحيحة، حاول ثانية.');
                                  }
                                } catch {
                                  toast.error('حدث خطأ أثناء إرسال الإجابة.');
                                }
                              }}
                              className="w-full p-2.5 rounded-lg border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-medium transition-colors"
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

            {/* Homework Submission Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                تسليم واجب الدرس
              </h4>
              <p className="text-xs text-slate-400">
                قم برفع ملف الحل الخاص بك ليقوم المعلم بتصحيحه وتسجيل درجاتك.
              </p>

              {courseHomeworks.length > 0 ? (
                <div className="space-y-3">
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    id="hw-select"
                  >
                    {courseHomeworks.map((hw) => (
                      <option key={hw.id} value={hw.id}>
                        {hw.title}
                      </option>
                    ))}
                  </select>

                  <div className="space-y-3">
                    <SupabaseUploader
                      bucketName="homeworks"
                      label="اسحب ملف الواجب هنا للرفع (PDF/صور)"
                      maxSizeMB={20}
                      onUploadSuccess={(url) => setHomeworkUrl(url)}
                      onUploadError={(err) => alert(err)}
                    />

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="أو أدخل رابط الملف (Google Drive)..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                        value={homeworkUrl}
                        onChange={(e) => setHomeworkUrl(e.target.value)}
                      />
                      <button
                        onClick={async () => {
                          const select = document.getElementById('hw-select') as HTMLSelectElement;
                          if (homeworkUrl && select?.value) {
                            try {
                              const { homeworkApi } = await import('../../services/api');
                              await homeworkApi.post(`/${select.value}/submit`, { url: homeworkUrl, answers: [] });
                              toast.success('تم تسليم الواجب بنجاح!');
                              setHomeworkUrl('');
                            } catch {
                              toast.error('فشل في تسليم الواجب.');
                            }
                          } else {
                            toast.warning('يرجى اختيار الواجب وإضافة الملف أولاً.');
                          }
                        }}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        تسليم
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  لا توجد واجبات متاحة لهذه الدورة حالياً.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Course Playlist Sidebar */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                <span>قائمة دروس الدورة</span>
                <span className="text-xs text-slate-400 font-normal">({courseLessons.length} درس)</span>
              </h3>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {courseLessons.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">جاري تحميل قائمة الدروس...</p>
                ) : (
                  courseLessons.map((l, idx) => {
                    const isCurrent = l.id === lessonId;
                    return (
                      <button
                        key={l.id}
                        onClick={() => navigateToLesson(l.id)}
                        className={`w-full p-3 rounded-xl border transition-all text-right flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25'
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                              isCurrent ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold truncate">{l.title}</span>
                        </div>

                        {isCurrent ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white shrink-0">
                            الدرس الحالي
                          </span>
                        ) : (
                          <Tv className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Anti-Piracy Protection Notice */}
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>حماية المحتوى التعليمي</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                المحتوى محمي بحقوق الملكية الفكرية. يتم تسجيل تقدمك وربط الجلسة بحسابك التعليمي تلقائياً.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
