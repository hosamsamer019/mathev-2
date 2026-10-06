import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, Volume1, VolumeX,
  Maximize, Minimize, Settings, CheckCircle, AlertCircle,
  AlertTriangle, X, ChevronRight, ChevronLeft,
  FileText, Upload, Clock, Sparkles, ShieldCheck,
  BookOpen, Tv, RefreshCw, Check, ArrowRight, Pipette,
  ListVideo, HelpCircle, FastForward
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
  extractVimeoId,
  getGoogleDrivePreviewUrl,
  getLessonMediaStreamUrl,
  formatVideoTime,
  formatVideoTimeRemaining,
  isGoogleDriveUrl,
  VideoSourceType
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
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);
  const [videoTicket, setVideoTicket] = useState<string>('');

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showResumeAlert, setShowResumeAlert] = useState(false);
  const [savedResumeTime, setSavedResumeTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [doubleTapRipple, setDoubleTapRipple] = useState<'left' | 'right' | null>(null);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekPos, setHoverSeekPos] = useState<number>(0);

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
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const isCompletedRef = useRef(false);
  const maxWatchedTimeRef = useRef(0);
  const activeQuizRef = useRef<any>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // Source categorization
  const videoSourceType = getVideoSourceType(lesson?.videoUrl);
  const isNativePlayable = videoSourceType === 'direct' || videoSourceType === 'google-drive';
  const playableMediaUrl = videoSourceType === 'google-drive' ? getLessonMediaStreamUrl(lessonId, videoTicket) : lesson?.videoUrl;
  const ytVideoId = extractYouTubeVideoId(lesson?.videoUrl);
  const vimeoId = extractVimeoId(lesson?.videoUrl);
  const drivePreviewUrl = getGoogleDrivePreviewUrl(lesson?.videoUrl);

  // Keep refs in sync for unmount persistence
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Flush progress helper
  const flushProgress = useCallback((targetTime?: number, targetDuration?: number, isCompleted = false) => {
    const timeToSave = targetTime !== undefined ? targetTime : currentTimeRef.current;
    const totalDur = targetDuration !== undefined ? targetDuration : durationRef.current;
    if (timeToSave <= 0 && !isCompleted) return;

    const calcPct = totalDur > 0 ? Math.min(100, Math.round((timeToSave / totalDur) * 100)) : 0;

    courseService.updateVideoProgress(lessonId, {
      progress: isCompleted ? 100 : calcPct,
      watched: isCompleted,
      lastTimestamp: Math.round(timeToSave)
    }).catch(() => {});
  }, [lessonId]);

  // 1. Initial Data Fetching
  const fetchLessonData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setActiveQuiz(null);
      activeQuizRef.current = null;
      setQuizFeedback(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setProgressPercent(0);
      setShowResumeAlert(false);

      const res = await courseService.getLessonDetails(lessonId);
      if (!res.data) {
        setLoadError('لم يتم العثور على بيانات هذا الدرس');
        setIsLoading(false);
        return;
      }

      const lessonData = res.data;
      setLesson(lessonData);

      // Fetch short-lived 60s scoped video ticket for stream authentication
      try {
        const ticketRes = await courseService.getVideoTicket(lessonId);
        if (ticketRes.data?.ticket) {
          setVideoTicket(ticketRes.data.ticket);
        }
      } catch {
        // Non-blocking fallback
      }

      // Handle Existing Progress from DB
      if (lessonData.progress && lessonData.progress.length > 0) {
        const p = lessonData.progress[0];
        const savedTime = Number(p.lastTimestamp) || 0;
        const savedPct = Number(p.progress) || 0;
        const isWatched = Boolean(p.watched || p.status === 'COMPLETED');

        maxWatchedTimeRef.current = savedTime;
        isCompletedRef.current = isWatched;
        setProgressPercent(savedPct);

        if (savedTime > 5 && !isWatched) {
          setSavedResumeTime(savedTime);
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
      setLoadError(err.response?.data?.message || 'حدث خطأ أثناء تحميل بيانات الفيديو. يرجى إعادة المحاولة.');
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchLessonData();
  }, [fetchLessonData]);

  // Flush on unmount or page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushProgress();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushProgress();
    };
  }, [flushProgress]);

  // 2. YouTube IFrame API Loader
  useEffect(() => {
    if (videoSourceType === 'youtube' && !(window as any).YT) {
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
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
      const containerElem = document.getElementById('unified-yt-player');
      if (!containerElem) return;

      ytPlayerRef.current = new (window as any).YT.Player('unified-yt-player', {
        videoId: ytVideoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          fs: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            const dur = event.target.getDuration() || 0;
            if (dur > 0) setDuration(dur);
            setIsBuffering(false);
          },
          onStateChange: (event: any) => {
            // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
            if (event.data === 1) {
              setIsPlaying(true);
              setIsBuffering(false);
              courseService.postLessonEvents(lessonId, { eventType: 'VIDEO_PLAYING' }).catch(() => {});
            } else if (event.data === 2) {
              setIsPlaying(false);
              setIsBuffering(false);
              courseService.postLessonEvents(lessonId, {
                eventType: 'VIDEO_PAUSED',
                lastTimestamp: Math.round(currentTimeRef.current)
              }).catch(() => {});
            } else if (event.data === 3) {
              setIsBuffering(true);
            } else if (event.data === 0) {
              setIsPlaying(false);
              setIsBuffering(false);
              handleVideoEnded();
            }
          },
          onError: (event: any) => {
            console.error('YouTube Player Error:', event.data);
            setIsBuffering(false);
            if (event.data === 101 || event.data === 150) {
              setLoadError('تم تقييد تشغيل هذا الفيديو على المنصات الخارجية من قبل صاحب القناة.');
            } else {
              setLoadError('تعذر تشغيل الفيديو من المصدر. تأكد من صحة الرابط أو جودة الاتصال.');
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
        const t = setTimeout(initYouTubePlayer, 150);
        return () => clearTimeout(t);
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
      } else if (isNativePlayable && htmlVideoRef.current) {
        current = htmlVideoRef.current.currentTime || 0;
        if (htmlVideoRef.current.duration > 0 && htmlVideoRef.current.duration !== total) {
          total = htmlVideoRef.current.duration;
          setDuration(total);
        }
        // Buffer progress
        if (htmlVideoRef.current.buffered.length > 0 && total > 0) {
          const bufferedEnd = htmlVideoRef.current.buffered.end(htmlVideoRef.current.buffered.length - 1);
          setBufferedPercent(Math.min(100, Math.round((bufferedEnd / total) * 100)));
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

        courseService.postLessonEvents(lessonId, {
          eventType: 'VIDEO_PROGRESS_TICK',
          playedSeconds: playedSec,
          progress: total > 0 ? (current / total) * 100 : 0,
          lastTimestamp: Math.round(current)
        }).catch(() => {});
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying, duration, videoSourceType, lesson, quizAnswered, lessonId]);

  // 5. Completion Logic
  const handleVideoEnded = useCallback(() => {
    isCompletedRef.current = true;
    setProgressPercent(100);
    courseService.postLessonEvents(lessonId, {
      eventType: 'VIDEO_COMPLETED',
      progress: 100,
      lastTimestamp: Math.round(durationRef.current || currentTimeRef.current)
    }).catch(() => {});

    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 }
    });

    toast.success('أحسنت! تم إكمال مشاهدة الدرس بنجاح 🎉');
  }, [lessonId]);

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
        toast.error('إجابة غير صحيحة، فكر وحاول مرة أخرى.');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء إرسال الإجابة.');
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
    } else if (isNativePlayable && htmlVideoRef.current) {
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
    } else if (isNativePlayable && htmlVideoRef.current) {
      if (htmlVideoRef.current.error) {
        setIsPlaying(false);
        setLoadError('تعذر تشغيل هذا الفيديو (المصدر غير مدعوم أو غير متاح حالياً).');
        return;
      }
      const playPromise = htmlVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          setIsPlaying(false);
          if (err.name === 'NotAllowedError') {
            // Autoplay policy prevented playback
          } else {
            console.error('Playback play() error:', err);
            if (err.name === 'NotSupportedError') {
              setLoadError('تعذر تشغيل الفيديو (المصدر غير متاح أو نوع الملف غير مدعوم).');
            }
          }
        });
      }
    }
  };

  const seekTo = (targetSeconds: number) => {
    const maxDur = duration || targetSeconds;
    const clamped = Math.max(0, Math.min(maxDur, targetSeconds));
    setCurrentTime(clamped);
    currentTimeRef.current = clamped;

    if (videoSourceType === 'youtube' && ytPlayerRef.current) {
      if (typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(clamped, true);
      }
    } else if (isNativePlayable && htmlVideoRef.current) {
      htmlVideoRef.current.currentTime = clamped;
    }
  };

  const skipRelative = (deltaSeconds: number) => {
    seekTo(currentTime + deltaSeconds);
  };

  const handleResumeClick = () => {
    const resumeTarget = savedResumeTime || maxWatchedTimeRef.current;
    if (resumeTarget > 0) {
      seekTo(resumeTarget);
    }
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
    } else if (isNativePlayable && htmlVideoRef.current) {
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
    } else if (isNativePlayable && htmlVideoRef.current) {
      htmlVideoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    const isCurrentlyFs = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      isFullscreen
    );

    if (isCurrentlyFs) {
      // Exit fullscreen
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitFullscreenElement && (document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((htmlVideoRef.current as any)?.webkitDisplayingFullscreen && (htmlVideoRef.current as any)?.webkitExitFullscreen) {
        (htmlVideoRef.current as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
      document.body.style.overflow = '';
    } else {
      // Enter fullscreen
      let enteredNative = false;
      if (playerContainerRef.current?.requestFullscreen) {
        playerContainerRef.current.requestFullscreen().then(() => {
          enteredNative = true;
        }).catch(() => {});
      } else if ((playerContainerRef.current as any)?.webkitRequestFullscreen) {
        try {
          (playerContainerRef.current as any).webkitRequestFullscreen();
          enteredNative = true;
        } catch {}
      }

      // iOS Safari fallback on video element if container fullscreen is not supported
      if (!enteredNative && isNativePlayable && htmlVideoRef.current && (htmlVideoRef.current as any).webkitEnterFullscreen) {
        try {
          (htmlVideoRef.current as any).webkitEnterFullscreen();
        } catch {}
      }

      setIsFullscreen(true);
      document.body.style.overflow = 'hidden';
    }
  };

  const togglePictureInPicture = async () => {
    if (isNativePlayable && htmlVideoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await htmlVideoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.error('PiP Error:', err);
      }
    }
  };

  // Fullscreen change & orientation listeners
  useEffect(() => {
    const handleFsChange = () => {
      const isNativeFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      if (!isNativeFs && isFullscreen) {
        setIsFullscreen(false);
        document.body.style.overflow = '';
      } else if (isNativeFs) {
        setIsFullscreen(true);
        document.body.style.overflow = 'hidden';
      }
    };

    const handleWebkitVideoEndFullscreen = () => {
      setIsFullscreen(false);
      document.body.style.overflow = '';
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    
    const videoEl = htmlVideoRef.current;
    if (videoEl) {
      videoEl.addEventListener('webkitendfullscreen', handleWebkitVideoEndFullscreen);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      if (videoEl) {
        videoEl.removeEventListener('webkitendfullscreen', handleWebkitVideoEndFullscreen);
      }
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

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

  // Touch double-tap handler for mobile skip ±10s
  const handleVideoTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    handleUserActivity();
    const touch = e.changedTouches[0];
    const now = Date.now();
    const timeDelta = now - lastTapRef.current.time;
    const targetRect = e.currentTarget.getBoundingClientRect();
    const touchX = touch.clientX - targetRect.left;
    const isLeftSide = touchX < targetRect.width / 2;

    if (timeDelta < 300) {
      // Double tap detected
      if (isLeftSide) {
        skipRelative(-10);
        setDoubleTapRipple('left');
        setTimeout(() => setDoubleTapRipple(null), 600);
      } else {
        skipRelative(10);
        setDoubleTapRipple('right');
        setTimeout(() => setDoubleTapRipple(null), 600);
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: touchX };
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
      }, 250);
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
    flushProgress();
    const routePrefix = mode === 'center' ? '/student/center/videos' : '/student/online/videos';
    navigate(`${routePrefix}/${targetLessonId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-indigo-500/30 overflow-x-hidden" dir="rtl">
      {/* Content Protection Blur Screen */}
      {isBlurred && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex flex-col items-center justify-center p-6 text-center backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 animate-pulse">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">تم إيقاف العرض مؤقتاً</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed mb-6">
            تم إيقاف الشرح مؤقتاً لمساعدتك على التركيز وحماية المحتوى التعليمي. انقر بالأسفل للاستمرار في المشاهدة.
          </p>
          <button
            onClick={() => setIsBlurred(false)}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/30 min-h-[44px] min-w-[140px] flex items-center justify-center"
          >
            متابعة المشاهدة
          </button>
        </div>
      )}

      {/* Top Header Navigation - Sleek & Mobile-Optimized */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Back Button */}
          <button
            onClick={() => {
              flushProgress();
              navigate(backUrl);
            }}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 active:scale-95 px-3 py-2 rounded-xl transition-all border border-slate-700/50 shadow-sm shrink-0 min-h-[38px]"
          >
            <ChevronRight className="w-4 h-4" />
            <span className="hidden xs:inline">العودة للدروس</span>
            <span className="xs:hidden">رجوع</span>
          </button>

          {/* Breadcrumb Context */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0 flex-1 justify-center px-2">
            <BookOpen className="w-3.5 h-3.5 shrink-0 text-indigo-400 hidden sm:block" />
            <span className="truncate max-w-[120px] sm:max-w-[200px] font-medium text-slate-400">
              {lesson?.course?.title || 'الدورة التعليمية'}
            </span>
            <span className="text-slate-600">/</span>
            <span className="truncate max-w-[150px] sm:max-w-[260px] text-slate-200 font-semibold">
              {lesson?.title || 'جاري التحميل...'}
            </span>
          </div>

          {/* Course Playlist Trigger on Mobile */}
          <button
            onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
            className="lg:hidden flex items-center gap-1 text-xs font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 hover:bg-indigo-900/60 px-2.5 py-1.5 rounded-xl transition-colors shrink-0"
            title="قائمة الدروس"
          >
            <ListVideo className="w-4 h-4" />
            <span className="hidden sm:inline">الدروس ({courseLessons.length})</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Left Column: Video Player & Controls (Takes 2 Cols on Desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Player Container */}
            <div
              id="alsaden-video-player-container"
              data-testid="unified-player-container"
              ref={playerContainerRef}
              onMouseMove={handleUserActivity}
              onTouchStart={handleVideoTouch}
              onContextMenu={(e) => e.preventDefault()}
              className={`group relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 transition-all ${
                isFullscreen
                  ? 'fixed inset-0 w-full h-[100dvh] max-h-[100dvh] z-[99999] rounded-none border-none flex flex-col justify-center items-center bg-black'
                  : 'aspect-video w-full'
              }`}
            >
              {/* Floating Exit Fullscreen Button on Top-Right (always accessible on mobile & desktop) */}
              {isFullscreen && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                  className="absolute top-4 start-4 z-40 bg-black/75 hover:bg-black text-white p-2.5 rounded-full backdrop-blur-md border border-white/20 shadow-2xl active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                  title="خروج من ملء الشاشة"
                  aria-label="خروج من ملء الشاشة"
                >
                  <Minimize className="w-5 h-5 text-white" />
                </button>
              )}

              {/* Dynamic Anti-Piracy Watermark */}
              {user && (
                <div
                  className="absolute pointer-events-none opacity-20 text-white/90 font-mono text-[10px] sm:text-xs select-none z-30 tracking-wider truncate max-w-[80%]"
                  style={{
                    top: '25%',
                    left: '15%',
                    animation: 'floatWatermark 22s linear infinite alternate'
                  }}
                >
                  {user.name} • {user.email || user.phone}
                </div>
              )}

              <style>{`
                @keyframes floatWatermark {
                  0% { transform: translate(0, 0); }
                  50% { transform: translate(60px, 40px); }
                  100% { transform: translate(120px, 10px); }
                }
              `}</style>

              {/* Double-Tap Skip Indicator (Left: -10s, Right: +10s) */}
              {doubleTapRipple === 'left' && (
                <div className="absolute inset-y-0 left-0 w-1/3 z-30 flex items-center justify-center bg-indigo-600/20 backdrop-blur-xs rounded-r-full pointer-events-none animate-in fade-in zoom-in-75">
                  <div className="flex flex-col items-center text-white">
                    <RotateCcw className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" style={{ animationDuration: '0.4s' }} />
                    <span className="text-xs font-bold mt-1 font-mono">10- ثواني</span>
                  </div>
                </div>
              )}
              {doubleTapRipple === 'right' && (
                <div className="absolute inset-y-0 right-0 w-1/3 z-30 flex items-center justify-center bg-indigo-600/20 backdrop-blur-xs rounded-l-full pointer-events-none animate-in fade-in zoom-in-75">
                  <div className="flex flex-col items-center text-white">
                    <RotateCw className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" style={{ animationDuration: '0.4s' }} />
                    <span className="text-xs font-bold mt-1 font-mono">10+ ثواني</span>
                  </div>
                </div>
              )}

              {/* Skeleton / Initial Loading State */}
              {isLoading && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3 z-30">
                  <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs sm:text-sm text-slate-300 font-medium">جاري تجهيز مشغل الفيديو...</p>
                </div>
              )}

              {/* Buffering Indicator */}
              {isBuffering && !isLoading && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-25">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shadow-lg" />
                </div>
              )}

              {/* Professional Compact Error State */}
              {loadError && !isLoading && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-30">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">تعذر تشغيل الفيديو</h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">{loadError}</p>
                  <button
                    onClick={fetchLessonData}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/25 min-h-[44px]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {/* Polished Resume Action Pill */}
              {showResumeAlert && !isPlaying && !isLoading && !loadError && (
                <div className="absolute top-3 inset-x-3 sm:inset-x-auto sm:end-4 z-30 bg-slate-900/95 border border-indigo-500/40 text-white px-3.5 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      توقفت عند <b className="text-indigo-300 font-mono">{formatVideoTime(savedResumeTime || maxWatchedTimeRef.current)}</b>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleResumeClick}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      متابعة
                    </button>
                    <button
                      onClick={() => setShowResumeAlert(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                      title="إغلاق"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Interactive In-Video Quiz Overlay */}
              {activeQuiz && (
                <div className="absolute inset-0 bg-slate-950/90 z-40 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md animate-in fade-in">
                  <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 sm:p-7 max-w-md w-full shadow-2xl text-center max-h-[90vh] overflow-y-auto">
                    {quizFeedback === 'success' ? (
                      <div className="py-4 animate-in zoom-in-95">
                        <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
                        <h4 className="text-lg sm:text-xl font-black text-white mb-1">إجابة صحيحة!</h4>
                        <p className="text-xs text-slate-300">أحسنت 🌟 جاري استئناف الشرح الآن...</p>
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
                              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-indigo-600 hover:border-indigo-500 active:scale-98 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition-all text-center min-h-[44px]"
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

              {/* Video Player Display Components */}
              {!isLoading && !loadError && (
                <>
                  {/* 1. YouTube Player (Managed with custom AL-SADEN controls) */}
                  {videoSourceType === 'youtube' && (
                    <div className="w-full h-full relative pointer-events-none">
                      <div id="unified-yt-player" className="w-full h-full pointer-events-auto" />
                    </div>
                  )}

                  {/* 2. Unified Native / Streamed Video (Direct MP4 / WebM / Google Drive / Uploads / CDN) */}
                  {isNativePlayable && (
                    <video
                      ref={htmlVideoRef}
                      src={playableMediaUrl}
                      className="w-full h-full object-contain"
                      playsInline
                      preload="metadata"
                      onClick={togglePlay}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onWaiting={() => setIsBuffering(true)}
                      onPlaying={() => setIsBuffering(false)}
                      onLoadedMetadata={() => {
                        if (htmlVideoRef.current?.duration) {
                          setDuration(htmlVideoRef.current.duration);
                        }
                      }}
                      onError={(e) => {
                        const mediaErr = e.currentTarget.error;
                        console.error('HTML Video Element Error:', mediaErr?.code, mediaErr?.message);
                        setIsPlaying(false);
                        setIsBuffering(false);
                        setLoadError('تعذر تحميل الفيديو من المصدر (المصدر غير متاح أو تالف).');
                      }}
                      onEnded={handleVideoEnded}
                    />
                  )}

                  {/* 3. Vimeo In-Platform Embed */}
                  {videoSourceType === 'vimeo' && vimeoId && (
                    <iframe
                      src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&title=0&byline=0&portrait=0`}
                      className="w-full h-full border-0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title={lesson?.title}
                    />
                  )}

                  {/* 4. Unknown / Invalid Source fallback */}
                  {videoSourceType === 'unknown' && !lesson?.videoUrl && (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                      <Tv className="w-12 h-12 text-slate-600 mb-3" />
                      <h4 className="text-base font-bold text-white mb-1">لا يوجد فيديو مرفق بهذا الدرس</h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        سيقوم المعلم برفع الشرح التعليمي لهذا الدرس قريباً.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Center Play Button Overlay (when paused) */}
              {(videoSourceType === 'youtube' || isNativePlayable) && !activeQuiz && (
                <div
                  onClick={togglePlay}
                  className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer select-none"
                >
                  {!isPlaying && !isLoading && !loadError && (
                    <button
                      type="button"
                      aria-label="تشغيل الفيديو"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                      }}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transform transition-all hover:scale-110 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-indigo-500/40"
                    >
                      <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-white translate-x-0.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Custom High-End Controls Bar Overlay */}
              {(videoSourceType === 'youtube' || isNativePlayable) && !activeQuiz && (
                <div
                  className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-3 sm:px-5 pb-3 sm:pb-4 pt-8 transition-opacity duration-300 ${
                    controlsVisible || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  dir="ltr"
                >
                  {/* Seek Bar with Touch-Friendly Hit Area */}
                  <div
                    className="relative py-2 sm:py-3 cursor-pointer select-none group/timeline"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      if (duration > 0) {
                        setHoverSeekTime(pos * duration);
                        setHoverSeekPos(pos * 100);
                      }
                    }}
                    onMouseLeave={() => setHoverSeekTime(null)}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      if (duration > 0) {
                        seekTo(pos * duration);
                      }
                    }}
                  >
                    {/* Hover Timestamp Bubble */}
                    {hoverSeekTime !== null && duration > 0 && (
                      <div
                        className="absolute bottom-full mb-1.5 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-lg pointer-events-none"
                        style={{ left: `${hoverSeekPos}%` }}
                      >
                        {formatVideoTime(hoverSeekTime)}
                      </div>
                    )}

                    {/* Progress Track */}
                    <div className="relative w-full h-1.5 sm:h-2 bg-slate-700/80 rounded-full overflow-hidden transition-all group-hover/timeline:h-2.5">
                      {/* Buffered Range Bar */}
                      <div
                        className="absolute top-0 left-0 bottom-0 bg-slate-500/50 rounded-full transition-all"
                        style={{ width: `${bufferedPercent}%` }}
                      />
                      {/* Played Progress Bar */}
                      <div
                        className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                        style={{ width: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%` }}
                      />
                    </div>

                    {/* Scrubber Knob */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full shadow-lg opacity-90 sm:opacity-0 group-hover/timeline:opacity-100 transition-opacity pointer-events-none"
                      style={{ left: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%` }}
                    />

                    {/* Checkpoint Markers on Timeline */}
                    {lesson?.quizzes && duration > 0 && lesson.quizzes.map((q: any) => {
                      const markerPos = (Number(q.timestampSec) / duration) * 100;
                      if (markerPos <= 100) {
                        return (
                          <div
                            key={q.id}
                            title={`سؤال تفاعلي عند ${formatVideoTime(q.timestampSec)}`}
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400 rounded-full z-10 -translate-x-1/2 ring-2 ring-slate-900"
                            style={{ left: `${markerPos}%` }}
                          />
                        );
                      }
                      return null;
                    })}
                  </div>

                  {/* Controls Row */}
                  <div className="flex items-center justify-between text-white text-xs mt-1">
                    {/* Left Controls: Play, Skip, Volume, Time */}
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      {/* Play / Pause (Min 44px touch area) */}
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all focus:outline-none"
                        aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
                      </button>

                      {/* Skip -10s */}
                      <button
                        type="button"
                        onClick={() => skipRelative(-10)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all text-[11px] font-bold"
                        title="تأخير 10 ثواني"
                        aria-label="تأخير 10 ثواني"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {/* Skip +10s */}
                      <button
                        type="button"
                        onClick={() => skipRelative(10)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all text-[11px] font-bold"
                        title="تقديم 10 ثواني"
                        aria-label="تقديم 10 ثواني"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>

                      {/* Volume & Mute */}
                      <div className="flex items-center gap-1 group/vol">
                        <button
                          type="button"
                          onClick={toggleMute}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all"
                          aria-label={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-4 h-4 text-red-400" />
                          ) : volume < 0.5 ? (
                            <Volume1 className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-14 sm:w-18 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 hidden md:block"
                          aria-label="مستوى الصوت"
                        />
                      </div>

                      {/* Time display (Monospace LTR format) */}
                      <div className="font-mono text-slate-300 text-[11px] sm:text-xs tracking-tight ml-1">
                        <span>{formatVideoTime(currentTime)}</span>
                        <span className="mx-1 text-slate-500">/</span>
                        <span>{formatVideoTime(duration)}</span>
                      </div>
                    </div>

                    {/* Right Controls: Speed, PiP, Fullscreen */}
                    <div className="flex items-center gap-1 sm:gap-2 relative">
                      {/* Playback Speed Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                          className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-white/15 active:scale-95 transition-all text-xs font-mono font-bold flex items-center gap-1 border border-transparent hover:border-slate-700 min-h-[36px]"
                          aria-label="سرعة التشغيل"
                        >
                          <span>{playbackSpeed}x</span>
                        </button>

                        {showSpeedMenu && (
                          <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 min-w-[80px] animate-in fade-in zoom-in-95">
                            <span className="text-[10px] text-slate-400 font-bold px-2 py-0.5 text-center">السرعة</span>
                            {SPEED_OPTIONS.map((speed) => (
                              <button
                                key={speed}
                                onClick={() => handleSpeedSelect(speed)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono text-center transition-colors ${
                                  playbackSpeed === speed
                                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                    : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Picture-in-Picture (if supported) */}
                      {isNativePlayable && typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled && (
                        <button
                          type="button"
                          onClick={togglePictureInPicture}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all hidden sm:flex"
                          title="صورة داخل صورة"
                          aria-label="صورة داخل صورة"
                        >
                          <Tv className="w-4 h-4" />
                        </button>
                      )}

                      {/* Fullscreen (Min 44px touch area) */}
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all"
                        title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
                        aria-label={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
                      >
                        {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lesson Title & Progress Summary Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold text-white mb-1 leading-snug break-words">
                    {lesson?.title || 'جاري التحميل...'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 truncate">
                    {lesson?.course?.title || 'الدورة التعليمية'}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
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
                  <span className="font-bold text-indigo-400 font-mono">{progressPercent}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-indigo-500 to-indigo-600 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Previous & Next Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 pt-1">
                {prevLesson ? (
                  <button
                    onClick={() => navigateToLesson(prevLesson.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-3 sm:px-4 rounded-xl border border-slate-700 hover:bg-slate-800 active:scale-98 text-slate-300 text-xs sm:text-sm font-semibold transition-all min-h-[44px] min-w-0"
                  >
                    <ChevronRight className="w-4 h-4 shrink-0" />
                    <span className="truncate">السابق: {prevLesson.title}</span>
                  </button>
                ) : (
                  <div className="flex-1" />
                )}

                {nextLesson ? (
                  <button
                    onClick={() => navigateToLesson(nextLesson.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-3 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-indigo-600/20 min-h-[44px] min-w-0"
                  >
                    <span className="truncate">التالي: {nextLesson.title}</span>
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                  </button>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </div>

            {/* Attached Lesson Material (PDF) */}
            {lesson?.pdfUrl && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">مذكرة وملفات الدرس (PDF)</h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">قم بتحميل المرفقات الخاصة بهذا الدرس للمذاكرة</p>
                  </div>
                </div>
                <a
                  href={lesson.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-sm min-h-[38px] flex items-center justify-center"
                >
                  تحميل
                </a>
              </div>
            )}

            {/* Interactive Lesson Quizzes List */}
            {lesson?.quizzes && lesson.quizzes.length > 0 && (
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
                              className="w-full p-2.5 rounded-lg border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-medium transition-colors min-h-[44px]"
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                تسليم واجب الدرس
              </h4>
              <p className="text-xs text-slate-400">
                قم برفع ملف الحل الخاص بك ليقوم المعلم بتصحيحه وتسجيل درجاتك.
              </p>

              {courseHomeworks.length > 0 ? (
                <div className="space-y-3">
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 min-h-[44px]"
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
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 min-h-[44px]"
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
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all min-h-[44px] shrink-0 shadow-md shadow-emerald-600/20"
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

          {/* Right Column: Course Playlist Sidebar (Desktop & Mobile Drawer) */}
          <div className={`space-y-4 ${showPlaylistDrawer ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
              <h3 className="text-xs sm:text-sm font-bold text-white mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ListVideo className="w-4 h-4 text-indigo-400" />
                  قائمة دروس الدورة
                </span>
                <span className="text-xs text-slate-400 font-normal font-mono">({courseLessons.length} درس)</span>
              </h3>

              <div className="space-y-2 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {courseLessons.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">جاري تحميل قائمة الدروس...</p>
                ) : (
                  courseLessons.map((l, idx) => {
                    const isCurrent = l.id === lessonId;
                    return (
                      <button
                        key={l.id}
                        onClick={() => navigateToLesson(l.id)}
                        className={`w-full p-3 rounded-xl border transition-all text-right flex items-center justify-between gap-3 min-h-[44px] ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/25'
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold font-mono flex items-center justify-center shrink-0 ${
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
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 text-xs text-slate-400 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>حماية المحتوى والخصوصية</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                المحتوى محمي بحقوق الملكية الفكرية. يتم حفظ تقدمك تلقائياً في السيرفر لمتابعة دراستك من أي جهاز.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
