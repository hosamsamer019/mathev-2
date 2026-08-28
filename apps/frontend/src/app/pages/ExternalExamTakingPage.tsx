import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, AlertCircle, AlertTriangle, 
  Maximize2, Minimize2, Send, User, BookOpen, 
  ChevronRight, ChevronLeft, ShieldAlert, Sparkles, LogOut, Check,
  MonitorOff
} from 'lucide-react';
import { examService } from '../services/exam.service';
import { MathContent } from '../components/ui/MathContent';
import { MathRenderer } from '../components/ui/MathRenderer';
import { GeometryDiagram } from '../components/ui/GeometryDiagram';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { normalizeAssessmentResult } from '../utils/assessmentResultNormalizer';
import ScrollToTopButton from '../components/ui/ScrollToTopButton';

interface Question {
  id: string | number;
  text?: string;
  questionText?: string;
  type?: string;
  options?: string[];
  points?: number;
  diagram?: any;
  given?: string[];
  required?: string;
  mathExpression?: string;
}

// Broadcast channel name per session — ensures multiple tabs share the same exam
const BC_CHANNEL = 'external-exam-tab-sync';

export default function ExternalExamTakingPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Student and Exam states
  const [studentName, setStudentName] = useState<string>('');
  const [exam, setExam] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exam flow states: 'loading' | 'active' | 'submitting' | 'submitted' | 'disqualified'
  const [viewState, setViewState] = useState<'loading' | 'active' | 'submitting' | 'submitted' | 'disqualified'>('loading');

  // Was this an automatic expiration submission?
  const [wasAutoSubmit, setWasAutoSubmit] = useState(false);

  // Answers & Navigation
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');

  // Timing
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetEndTimeRef = useRef<number>(0);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals & UX
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);

  // Multiple tab warning
  const [showMultiTabWarning, setShowMultiTabWarning] = useState(false);

  // Result state
  const [finalResult, setFinalResult] = useState<any>(null);
  const [reviewData, setReviewData] = useState<any>(null);

  // Prevent duplicate submissions
  const isSubmittingRef = useRef(false);

  // Anti-cheat deduplication: track last-reported violation timestamp
  // Prevents visibilitychange + blur both firing for one real event from counting as 2 violations
  const lastViolationTimestampRef = useRef<number>(0);
  const VIOLATION_DEBOUNCE_MS = 800;

  // BroadcastChannel for multi-tab detection
  const bcRef = useRef<BroadcastChannel | null>(null);

  // 1. Initial Authentication and Data Fetching
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('edu-user');
    
    if (!token || !userStr) {
      toast.error('يرجى تسجيل الدخول أولاً للوصول إلى الامتحان');
      navigate('/external-exam', { replace: true });
      return;
    }

    try {
      const user = JSON.parse(userStr);
      setStudentName(user.name || 'طالب خارجي');

      // IDOR guard: verify that the JWT's assessmentId matches the URL's assessmentId
      // Parse JWT payload (base64) without verifying signature — server verifies
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.assessmentId && assessmentId && payload.assessmentId !== assessmentId) {
        toast.error('رابط الامتحان غير صحيح. يرجى إدخال كود الامتحان من جديد.');
        navigate('/external-exam', { replace: true });
        return;
      }
    } catch {
      setStudentName('طالب خارجي');
    }

    if (!assessmentId) {
      setError('معرف الامتحان غير صالح');
      setLoading(false);
      return;
    }

    // Load recovery answers from sessionStorage if exists
    const cachedAnswers = sessionStorage.getItem(`ext_answers_${assessmentId}`);
    if (cachedAnswers) {
      try {
        setAnswers(JSON.parse(cachedAnswers));
      } catch (e) {
        console.warn('Could not parse cached answers', e);
      }
    }

    // Multi-tab detection via BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`${BC_CHANNEL}_${assessmentId}`);
      bcRef.current = bc;

      // Announce we are active
      bc.postMessage({ type: 'TAB_OPENED', ts: Date.now() });

      bc.onmessage = (ev) => {
        if (ev.data?.type === 'TAB_OPENED') {
          // Another tab opened — show warning banner
          setShowMultiTabWarning(true);
          // Acknowledge back so the new tab also knows
          bc.postMessage({ type: 'TAB_ALREADY_OPEN', ts: Date.now() });
        }
        if (ev.data?.type === 'TAB_ALREADY_OPEN') {
          setShowMultiTabWarning(true);
        }
      };
    }

    initExam(assessmentId);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
      bcRef.current?.close();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [assessmentId]);

  // 2. Exam Initializer (Get details & Start attempt)
  const initExam = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch assessment details
      const examRes = await examService.getExamDetails(id);
      const examData = examRes.data;
      setExam(examData);

      // Start or recover attempt
      const startRes = await examService.startAttempt(id);
      const attemptData = startRes.data.attempt || startRes.data;
      setAttempt(attemptData);

      if (attemptData.violationCount) {
        setViolationCount(attemptData.violationCount);
      }

      // Check if attempt is already completed/disqualified
      if (['SUBMITTED', 'GRADED', 'TIME_EXPIRED'].includes(attemptData.status)) {
        const normalized = normalizeAssessmentResult(attemptData);
        setFinalResult(normalized);
        // Show auto-submit message if expired
        if (attemptData.status === 'TIME_EXPIRED' || attemptData.cheatingReason === 'AUTO_SUBMITTED_TIME_EXPIRED') {
          setWasAutoSubmit(true);
        }
        setViewState('submitted');
        fetchReview(id, attemptData.id);
        return;
      }

      if (attemptData.status === 'CHEATING' || attemptData.cheatingDetected) {
        setViewState('disqualified');
        return;
      }

      // Populate existing answers from server if present
      if (Array.isArray(attemptData.answers) && attemptData.answers.length > 0) {
        const serverAnsMap: Record<string, string> = {};
        attemptData.answers.forEach((a: any) => {
          if (a.questionId && a.answer !== undefined) {
            serverAnsMap[a.questionId] = String(a.answer);
          }
        });
        setAnswers(prev => ({ ...serverAnsMap, ...prev }));
      }

      // Authoritative timer calculation
      setupTimer(examData, attemptData);

      // Setup anti-cheat listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);

      setViewState('active');
    } catch (err: any) {
      console.error('Failed to initialize external exam:', err);
      const code = err.response?.data?.code;
      if (code === 'ATTEMPT_ALREADY_FINISHED') {
        toast.info('لقد قمت بتسليم هذا الامتحان مسبقاً.');
        setViewState('submitted');
      } else if (code === 'ASSESSMENT_CLOSED') {
        setError('انتهى موعد تسليم الامتحان.');
      } else if (code === 'ASSESSMENT_NOT_OPEN') {
        setError('لم يبدأ موعد فتح الامتحان بعد.');
      } else if (err.response?.status === 403) {
        setError('غير مصرح لك بدخول هذا الامتحان.');
      } else {
        setError(err.response?.data?.message || 'فشل في تحميل الامتحان، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Timer Setup based on server timestamp
  const setupTimer = (examData: any, attemptData: any) => {
    let endTime: number;

    if (attemptData?.expiresAt) {
      endTime = new Date(attemptData.expiresAt).getTime();
    } else {
      const started = attemptData?.createdAt ? new Date(attemptData.createdAt).getTime() : Date.now();
      const durationMins = examData?.durationMinutes || examData?.duration || 60;
      endTime = started + durationMins * 60 * 1000;
    }

    targetEndTimeRef.current = endTime;
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    setTimeLeft(remaining);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const currentRemaining = Math.max(0, Math.floor((targetEndTimeRef.current - Date.now()) / 1000));
      setTimeLeft(currentRemaining);

      if (currentRemaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleTimeExpired();
      }
    }, 1000);
  };

  // 4. Autosave logic
  const handleAnswerSelect = (questionId: string | number, value: string) => {
    const qIdStr = String(questionId);
    const updated = { ...answers, [qIdStr]: value };
    setAnswers(updated);

    // Save to sessionStorage for resilience
    if (assessmentId) {
      sessionStorage.setItem(`ext_answers_${assessmentId}`, JSON.stringify(updated));
    }

    // Debounce autosave to server
    setSaveStatus('saving');
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(() => {
      performSync(updated);
    }, 1500);
  };

  const performSync = async (answersObj: Record<string, string>) => {
    if (!assessmentId) return;
    try {
      const formatted = Object.entries(answersObj).map(([questionId, answer]) => ({
        questionId,
        answer
      }));
      await examService.syncAttempt(assessmentId, formatted);
      setSaveStatus('saved');
    } catch (e: any) {
      // If server says time expired, transition to submitted state
      if (e.response?.data?.code === 'EXAM_TIME_EXPIRED') {
        setSaveStatus('error');
        toast.error('انتهى وقت الامتحان — جاري تسليم الإجابات...');
        submitExamPayload(true);
        return;
      }
      console.warn('Autosave sync failed, will retry on next change', e);
      setSaveStatus('error');
    }
  };

  // 5. Anti-cheat Violation Handling
  // Deduplication: one real focus-loss should only count as ONE violation
  const reportViolation = useCallback((type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'VISIBILITY_HIDDEN' | 'VISIBILITY_VISIBLE') => {
    if (document.fullscreenElement) return;

    // Get fresh viewState via ref pattern — useCallback captures stale closure otherwise
    if (!assessmentId) return;

    const now = Date.now();

    // VISIBILITY_VISIBLE is informational only — record but never triggers deduplication cooldown
    if (type === 'VISIBILITY_VISIBLE') {
      // Fire and forget — just record the return event on the server
      examService.reportViolation(assessmentId, 'VISIBILITY_VISIBLE').catch(() => {});
      return;
    }

    // Deduplication window: skip if we already reported a counting violation within the window
    if (now - lastViolationTimestampRef.current < VIOLATION_DEBOUNCE_MS) {
      return;
    }
    lastViolationTimestampRef.current = now;

    examService.reportViolation(assessmentId, type)
      .then((res: any) => {
        const nextCount = res.data?.violationCount ?? (violationCount + 1);
        setViolationCount(nextCount);

        if (nextCount >= 3 || res.data?.status === 'CHEATING') {
          handleDisqualification();
        } else {
          toast.warning(`تحذير: تم رصد مغادرة شاشة الامتحان! مخالفة (${nextCount} من 3). سيتم إلغاء الامتحان فوراً عند المخالفة الثالثة!`);
        }
      })
      .catch((err: any) => {
        if (err.response?.status === 403 || err.response?.data?.message?.includes('CHEATING')) {
          handleDisqualification();
        }
      });
  }, [assessmentId, violationCount]);

  const handleVisibilityChange = () => {
    if (document.hidden) {
      reportViolation('VISIBILITY_HIDDEN');
    } else {
      reportViolation('VISIBILITY_VISIBLE');
    }
  };

  const handleBlur = () => {
    // Only count as WINDOW_BLUR if not already within deduplication window
    // (catches Alt+Tab which fires both visibilitychange+blur)
    reportViolation('WINDOW_BLUR');
  };

  const handleDisqualification = () => {
    cleanupExam();
    setViewState('disqualified');
    toast.error('تم إلغاء الامتحان لرصد مخالفات متعددة.');
  };

  // 6. Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        toast.error('تعذر تفعيل وضع ملء الشاشة');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // 7. Submission Handlers
  const handleTimeExpired = () => {
    toast.error('انتهى الوقت المخصص للامتحان! جاري التسليم التلقائي...');
    submitExamPayload(true);
  };

  const handleManualSubmit = () => {
    setShowSubmitModal(true);
  };

  const submitExamPayload = async (isAuto = false) => {
    if (!assessmentId) return;
    // Prevent duplicate concurrent submissions
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    cleanupExam();
    setViewState('submitting');
    setShowSubmitModal(false);

    const formatted = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer
    }));

    try {
      const res = await examService.submitAttempt(assessmentId, formatted);
      const normalized = normalizeAssessmentResult(res.data);
      setFinalResult(normalized);
      setWasAutoSubmit(isAuto);
      setViewState('submitted');
      toast.success(isAuto ? 'تم تسليم الامتحان تلقائياً بنجاح!' : 'تم تسليم الامتحان بنجاح!');

      // Fetch detailed review if attempt id is available
      if (res.data?.id) {
        fetchReview(assessmentId, res.data.id);
      }
    } catch (err: any) {
      console.error('Exam submission error:', err);
      if (err.response?.data?.code === 'ATTEMPT_ALREADY_FINISHED') {
        toast.info('تم تسليم هذا الامتحان مسبقاً.');
        setWasAutoSubmit(isAuto);
        setViewState('submitted');
      } else {
        toast.error('حدث خطأ أثناء تسليم الامتحان، جاري محاولة استرجاع النتيجة.');
        setWasAutoSubmit(isAuto);
        setViewState('submitted');
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const fetchReview = async (examId: string, attemptId: string) => {
    try {
      const reviewRes = await examService.getAssessmentReview(examId, attemptId);
      setReviewData(reviewRes.data);
    } catch (e) {
      console.warn('Could not fetch review data for external student', e);
    }
  };

  const cleanupExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const questionsList: Question[] = exam?.questions || [];
  const currentQ = questionsList[currentQuestionIdx];
  const totalQuestions = questionsList.length;
  const answeredCount = Object.keys(answers).length;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDERING VIEWS
  // ─────────────────────────────────────────────────────────────────────────────

  // Loading State
  if (loading || viewState === 'loading') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDark ? 'bg-gray-950 text-white' : 'bg-slate-50 text-gray-900'}`} dir="rtl">
        <div className="w-14 h-14 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">جاري تحضير الامتحان والبيئة الآمنة...</h2>
        <p className="text-xs text-gray-400 mt-1">يرجى الانتظار لحظات</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-gray-950 text-white' : 'bg-slate-50 text-gray-900'}`} dir="rtl">
        <div className={`max-w-md w-full rounded-3xl border p-8 text-center shadow-xl ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">تعذر الدخول إلى الامتحان</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/external-exam')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
          >
            العودة لصفحة كود الامتحان
          </button>
        </div>
      </div>
    );
  }

  // Disqualified State
  if (viewState === 'disqualified') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-gray-950 text-white' : 'bg-slate-50 text-gray-900'}`} dir="rtl">
        <div className={`max-w-lg w-full rounded-3xl border p-8 text-center shadow-2xl ${isDark ? 'bg-gray-900 border-red-900/40' : 'bg-white border-red-200'}`}>
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse">
            <ShieldAlert className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-red-600 dark:text-red-400 mb-2">تم إلغاء الامتحان (رصد غش)</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            تم رصد مخالفات متعددة لشروط الامتحان (الخروج من الصفحة أو تبديل النوافذ 3 مرات). تم إغلاق الجلسة واحتساب درجة (0) للمحاولة وإبلاغ مدرس المادة.
          </p>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 text-xs text-red-700 dark:text-red-300 mb-6 text-right">
            <div><strong>اسم الطالب:</strong> {studentName}</div>
            <div className="mt-1"><strong>الامتحان:</strong> {exam?.title}</div>
            <div className="mt-1"><strong>عدد المخالفات:</strong> 3 مخالفات</div>
          </div>
          <button
            onClick={() => navigate('/external-exam')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
          >
            الخروج من الصفحة
          </button>
        </div>
      </div>
    );
  }

  // Submitted & Result State
  if (viewState === 'submitted') {
    const percentage = finalResult?.percentage ?? (attempt?.percentage || 0);
    const scoreVal = finalResult?.score ?? (attempt?.score || 0);
    const passingScore = exam?.passingScore || 50;
    const passed = percentage >= passingScore;

    return (
      <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-gray-950 text-white' : 'bg-slate-50 text-gray-900'}`} dir="rtl">
        <div className="max-w-2xl mx-auto">
          {/* Header Card */}
          <div className={`rounded-3xl border shadow-xl p-8 text-center mb-6 transition-all ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
              passed ? 'bg-green-100 dark:bg-green-950/60 text-green-600' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
            }`}>
              {passed ? <CheckCircle className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
            </div>

            <h1 className="text-2xl font-black mb-1 text-gray-900 dark:text-white">تم تسليم الامتحان بنجاح</h1>

            {/* Auto-submit time-expired banner */}
            {wasAutoSubmit && (
              <div className="mt-3 mb-4 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                انتهى وقت الامتحان وتم تسليم إجاباتك تلقائيًا.
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">منصة السادن التعليمية الذكية — نتائج الامتحان الخارجي</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 text-right text-xs">
              <div>
                <span className="text-gray-500 block mb-0.5">الطالب:</span>
                <span className="font-bold text-gray-900 dark:text-white">{studentName}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">الامتحان:</span>
                <span className="font-bold text-gray-900 dark:text-white truncate block">{exam?.title}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">الحالة:</span>
                <span className={`font-bold ${passed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {passed ? 'ناجح' : 'لم يحقق درجة النجاح'}
                </span>
              </div>
            </div>

            <div className="my-8 py-6 rounded-2xl bg-gradient-to-tr from-purple-600/10 via-indigo-600/10 to-blue-600/10 border border-purple-500/20">
              <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1 uppercase tracking-wider">النسبة المئوية المحسوبة</div>
              <div className="text-5xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                {Math.round(percentage)}%
              </div>
              <div className="text-xs text-gray-500 mt-2">
                الدرجة: {scoreVal} {finalResult?.totalPoints ? `من ${finalResult.totalPoints}` : 'نقطة'} (درجة النجاح: {passingScore}%)
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('edu-user');
                  navigate('/external-exam');
                }}
                className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                إنهاء والخروج
              </button>
            </div>
          </div>

          {/* Detailed Question Review if available */}
          {reviewData?.questions && Array.isArray(reviewData.questions) && (
            <div className={`rounded-3xl border p-6 sm:p-8 shadow-xl ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <BookOpen className="w-5 h-5 text-purple-600" />
                مراجعة إجابات الامتحان ({reviewData.questions.length} أسئلة)
              </h3>

              <div className="space-y-6">
                {reviewData.questions.map((q: any, i: number) => (
                  <div key={q.id || i} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-right">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">سؤال {i + 1}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        q.isCorrect ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                      }`}>
                        {q.isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'} ({q.pointsEarned || 0} / {q.points || 1} نقطة)
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      <MathContent content={q.questionText || q.text || ''} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                        <span className="text-gray-500 block mb-1">إجابتك:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{q.studentAnswer !== null && q.studentAnswer !== undefined ? String(q.studentAnswer) : 'لم يتم الإجابة'}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800">
                        <span className="text-green-600 dark:text-green-400 block mb-1 font-bold">الإجابة الصحيحة:</span>
                        <span className="font-bold text-green-700 dark:text-green-300">{String(q.correctAnswer ?? 'غير معلن')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Submitting State
  if (viewState === 'submitting') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDark ? 'bg-gray-950 text-white' : 'bg-slate-50 text-gray-900'}`} dir="rtl">
        <div className="w-14 h-14 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">جاري تسليم إجاباتك...</h2>
        <p className="text-xs text-gray-400 mt-1">يرجى الانتظار، لا تغلق الصفحة</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVE EXAM INTERFACE
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-950 text-white' : 'bg-slate-50 text-gray-900'}`} dir="rtl">
      {/* Multi-tab Warning Banner */}
      {showMultiTabWarning && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2">
          <MonitorOff className="w-4 h-4 shrink-0" />
          تم الكشف عن تبويب آخر مفتوح — قد يتسبب في مخالفات
          <button onClick={() => setShowMultiTabWarning(false)} className="mr-2 underline text-white/80">
            إغلاق
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <header className={`sticky z-30 border-b backdrop-blur-md px-4 py-3 sm:px-6 flex items-center justify-between transition-colors ${
        showMultiTabWarning ? 'top-8' : 'top-0'
      } ${isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200 shadow-sm'}`}>
        {/* Left: Brand & Student Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
              {exam?.title || 'الامتحان الخارجي'}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <User className="w-3.5 h-3.5" />
              <span className="font-medium">{studentName}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Timer */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-sm font-mono font-bold shadow-inner ${
          timeLeft < 300
            ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 animate-pulse'
            : 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300'
        }`}>
          <Clock className="w-4 h-4" />
          <span>{formatTime(timeLeft)}</span>
        </div>

        {/* Right: Actions & Submit */}
        <div className="flex items-center gap-2">
          {/* Autosave status indicator */}
          <div className="hidden md:flex items-center gap-1 text-[11px] font-medium text-gray-400 pl-2">
            {saveStatus === 'saving' && (
              <>
                <div className="w-2.5 h-2.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>جارٍ الحفظ...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span>تم الحفظ</span>
              </>
            )}
            {saveStatus === 'error' && (
              <span className="text-amber-500">تعذر الحفظ (سيتم الإعادة)</span>
            )}
          </div>

          {/* Violation indicator */}
          {violationCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 px-2 py-1 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>مخالفات: {violationCount}/3</span>
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'إلغاء وضع ملء الشاشة' : 'وضع ملء الشاشة'}
            className={`p-2 rounded-xl border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={isSubmittingRef.current}
            className="bg-gradient-to-l from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            تسليم الامتحان
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6">
        {/* Left Column: Question Content */}
        <div className="flex-1 flex flex-col justify-between">
          {currentQ ? (
            <div className={`rounded-3xl border p-6 sm:p-8 shadow-xl relative transition-all ${
              isDark ? 'bg-gray-900/90 border-gray-800 shadow-purple-950/10' : 'bg-white border-gray-200 shadow-indigo-100/50'
            }`}>
              {/* Question Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold">
                    السؤال {currentQuestionIdx + 1} من {totalQuestions}
                  </span>
                  {currentQ.points && (
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                      {currentQ.points} نقطة
                    </span>
                  )}
                </div>

                {answers[String(currentQ.id)] !== undefined && (
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    تمت الإجابة
                  </span>
                )}
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-relaxed mb-6">
                <MathContent content={currentQ.questionText || currentQ.text || ''} />
              </div>

              {/* Geometry Diagram if available */}
              {currentQ.diagram && (
                <div className="my-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex justify-center">
                  <GeometryDiagram data={currentQ.diagram} />
                </div>
              )}

              {/* Given Information */}
              {currentQ.given && currentQ.given.length > 0 && (
                <div className="mb-4 p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/10 text-xs">
                  <p className="font-bold text-purple-700 dark:text-purple-300 mb-1.5">المعطيات:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {currentQ.given.map((g, gi) => (
                      <li key={gi}><MathRenderer expression={g} /></li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Math Expression Block */}
              {currentQ.mathExpression && (
                <div className="my-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-center overflow-x-auto">
                  <MathRenderer expression={currentQ.mathExpression} block />
                </div>
              )}

              {/* Required */}
              {currentQ.required && (
                <div className="mb-5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  المطلوب: {currentQ.required}
                </div>
              )}

              {/* Options / Answer Input */}
              {Array.isArray(currentQ.options) && currentQ.options.length > 0 ? (
                <div className="space-y-3 my-6">
                  {currentQ.options.map((optionText, optIdx) => {
                    const isSelected = answers[String(currentQ.id)] === String(optIdx) || answers[String(currentQ.id)] === optionText;
                    return (
                      <label
                        key={optIdx}
                        onClick={() => handleAnswerSelect(currentQ.id, String(optIdx))}
                        className={`flex items-center gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 shadow-sm'
                            : 'border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-800 bg-gray-50/40 dark:bg-gray-800/20 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQ.id}`}
                          value={optIdx}
                          checked={isSelected}
                          onChange={() => handleAnswerSelect(currentQ.id, String(optIdx))}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {['أ', 'ب', 'ج', 'د', 'هـ'][optIdx] || optIdx + 1}
                        </span>
                        <div className="flex-1 text-sm font-medium leading-relaxed">
                          {optionText.includes('\\') || optionText.includes('^')
                            ? <MathRenderer expression={optionText} />
                            : <MathContent content={optionText} />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                /* Short answer / Numeric input */
                <div className="my-6">
                  <label className="block text-xs font-bold mb-2 text-gray-600 dark:text-gray-300">إجابتك:</label>
                  <input
                    type="text"
                    value={answers[String(currentQ.id)] || ''}
                    onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                    placeholder="أدخل الإجابة هنا..."
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 text-white focus:border-purple-500'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500 focus:bg-white'
                    }`}
                  />
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800 mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </button>

                <div className="text-xs text-gray-500 font-medium">
                  {answeredCount} من {totalQuestions} مُجاب عنها
                </div>

                {currentQuestionIdx < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-1.5"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    إنهاء الامتحان
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">لا توجد أسئلة متاحة في هذا الامتحان.</div>
          )}
        </div>

        {/* Right Column: Question Jumper Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          <div className={`rounded-3xl border p-5 shadow-lg ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-500 dark:text-gray-400">
              خريطة الأسئلة ({answeredCount}/{totalQuestions})
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {questionsList.map((q, idx) => {
                const isCurrent = idx === currentQuestionIdx;
                const isAnswered = answers[String(q.id)] !== undefined;

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                      isCurrent
                        ? 'ring-2 ring-purple-600 bg-purple-600 text-white shadow-md shadow-purple-500/25'
                        : isAnswered
                        ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2 text-[11px] text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-purple-600" />
                <span>السؤال الحالي</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500" />
                <span>تمت الإجابة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700" />
                <span>لم تتم الإجابة</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className={`max-w-md w-full rounded-3xl border p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="w-14 h-14 bg-green-100 dark:bg-green-950/60 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-center mb-2">تأكيد إنهاء وتسليم الامتحان</h3>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              هل أنت متأكد من رغبتك في تسليم الامتحان؟ بعد التسليم لن تتمكن من تعديل إجاباتك أو إعادة الدخول.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs mb-6 space-y-1.5 text-right">
              <div className="flex justify-between">
                <span className="text-gray-500">إجمالي الأسئلة:</span>
                <span className="font-bold">{totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الأسئلة المُجاب عليها:</span>
                <span className="font-bold text-green-600 dark:text-green-400">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الأسئلة المتبقية:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{totalQuestions - answeredCount}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-700 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                متابعة الحل
              </button>
              <button
                type="button"
                onClick={() => submitExamPayload(false)}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                تأكيد التسليم
              </button>
            </div>
          </div>
        </div>
      )}
      <ScrollToTopButton />
    </div>
  );
}
