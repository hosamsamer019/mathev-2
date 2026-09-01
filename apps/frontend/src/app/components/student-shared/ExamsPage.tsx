import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, CheckCircle, AlertCircle, Camera, AlertTriangle, ShieldAlert } from 'lucide-react';
import { examService } from '../../services/exam.service';
import { useExamAntiCheat } from '../../hooks/useExamAntiCheat';
import { MathContent } from '../ui/MathContent';
import { MathRenderer } from '../ui/MathRenderer';
import { GeometryDiagram } from '../ui/GeometryDiagram';
import { toast } from 'sonner';
import { normalizeAssessmentResult } from '../../utils/assessmentResultNormalizer';

export default function ExamsPage() {
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [examState, setExamState] = useState<'list' | 'setup' | 'running' | 'submitting' | 'submitted' | 'disqualified'>('list');
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [wasAutoSubmit, setWasAutoSubmit] = useState(false);
  const [initialViolationCount, setInitialViolationCount] = useState(0);

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentExam, setCurrentExam] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetEndTimeRef = useRef<number>(0);
  const isSubmittingRef = useRef(false);

  // Get current userId from localStorage for anti-cheat scoping
  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem('edu-user') || '{}')?.id ?? null;
    } catch { return null; }
  })();

  const isAntiCheatEnabled = examState === 'running';

  const handleDisqualification = useCallback(() => {
    cleanupExam();
    setExamState('disqualified');
    toast.error('تم إنهاء الامتحان بسبب مخالفة قواعد الامتحان.');
  }, []);

  const { violationCount, showMultiTabWarning } = useExamAntiCheat({
    assessmentId: selectedExam,
    attemptId,
    studentIdentifier: currentUserId,
    enabled: isAntiCheatEnabled,
    onDisqualified: handleDisqualification,
    initialViolationCount,
  });

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('edu-user') || '{}');
    if (currentUser?.isGuest && currentUser?.guestAssessmentId) {
      handleSelectExam(currentUser.guestAssessmentId);
    } else {
      fetchExams();
    }
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await examService.getExams();
      setExams(res.data.data ? res.data.data : Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('Failed to fetch exams', err);
      if (err.response?.status === 403) {
        setError('لا يمكنك عرض الامتحانات لأنك لست مسجلاً في أي دورة.');
      } else {
        setError('فشل في تحميل الامتحانات');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExam = async (examId: string) => {
    try {
      setLoading(true);
      const res = await examService.getExamDetails(examId);
      setCurrentExam(res.data);
      setSelectedExam(examId);
      setExamState('setup');
    } catch (err: any) {
      console.error('Failed to load exam details', err);
      if (err.response?.status === 403) {
        toast.error('غير مصرح لك بدخول هذا الامتحان.');
      } else {
        toast.error('فشل تحميل تفاصيل الامتحان');
      }
      setExamState('list');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      toast.error('يجب السماح بالوصول للكاميرا لبدء الامتحان.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const beginExam = async () => {
    if (currentExam?.requiresCamera && !cameraActive) {
      toast.error('يجب تشغيل الكاميرا أولاً!');
      return;
    }

    try {
      const res = await examService.startAttempt(selectedExam!);
      const attemptData = res.data?.attempt || res.data;

      // Capture attempt ID for IDOR-safe violation reporting and BroadcastChannel scoping
      setAttemptId(attemptData?.id ?? null);

      // Restore existing violation count from server in case of refresh
      if (attemptData?.violationCount) {
        setInitialViolationCount(attemptData.violationCount);
      }

      // If attempt already finished or cheated (refresh after submit/cheating), handle state
      if (['SUBMITTED', 'GRADED', 'TIME_EXPIRED', 'CHEATING'].includes(attemptData?.status) || attemptData?.cheatingDetected) {
        if (attemptData?.status === 'CHEATING' || attemptData?.cheatingDetected) {
          setExamState('disqualified');
          return;
        }
        const normalized = normalizeAssessmentResult(attemptData);
        setScore(normalized.percentage);
        setExamState('submitted');
        return;
      }

      // Use server-authoritative expiresAt if available, else calculate
      let endTime: number;
      if (attemptData?.expiresAt) {
        endTime = new Date(attemptData.expiresAt).getTime();
      } else {
        const startedAt = attemptData?.createdAt ? new Date(attemptData.createdAt).getTime() : Date.now();
        const durationMs = (currentExam.duration || 60) * 60 * 1000;
        endTime = startedAt + durationMs;
      }

      targetEndTimeRef.current = endTime;
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      // Restore saved answers from server if available
      if (Array.isArray(attemptData?.answers) && attemptData.answers.length > 0) {
        const restored: Record<string, string> = {};
        attemptData.answers.forEach((a: any) => {
          if (a.questionId && a.answer !== undefined) {
            restored[a.questionId] = String(a.answer);
          }
        });
        setAnswers(restored);
      }

      setExamState('running');

      // Timer
      timerRef.current = setInterval(() => {
        setTimeLeft(() => {
          const newRemaining = Math.max(0, Math.floor((targetEndTimeRef.current - Date.now()) / 1000));
          if (newRemaining <= 1) {
            handleAutoSubmit();
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return newRemaining;
        });
      }, 1000);

      // Periodic answer sync every 30 seconds
      syncRef.current = setInterval(() => {
        syncDraft();
      }, 30000);

    } catch (err: any) {
      console.error('API exam start failed:', err);
      const code = err.response?.data?.code;
      if (code === 'NOT_ENROLLED') toast.error('أنت غير مسجل في هذا الكورس.');
      else if (code === 'ATTEMPT_ALREADY_FINISHED') toast.warning('لقد قمت بتسليم هذا الامتحان مسبقًا ولا يمكن الدخول إليه مرة أخرى.');
      else if (code === 'ASSESSMENT_CLOSED') toast.error('انتهى موعد تسليم الامتحان.');
      else if (code === 'ASSESSMENT_NOT_OPEN') toast.info('لم يبدأ موعد فتح الامتحان بعد.');
      else if (code === 'STUDENT_ROLE_REQUIRED') toast.error('هذا الحساب لا يمكنه بدء الامتحان.');
      else toast.error('حدث خطأ أثناء بدء الامتحان.');
    }
  };

  const syncDraft = () => {
    if (!selectedExam) return;
    const formatted = Object.entries(answers).map(([qId, val]) => ({
      questionId: qId,
      answer: val
    }));
    examService.syncAttempt(selectedExam, formatted).catch((err: any) => {
      if (err.response?.data?.code === 'EXAM_TIME_EXPIRED') {
        toast.error('انتهى وقت الامتحان — جاري تسليم الإجابات...');
        handleAutoSubmit();
      }
    });
  };

  const handleAutoSubmit = () => {
    setWasAutoSubmit(true);
    cleanupExam();
    submitPayload(true);
  };

  const handleManualSubmit = () => {
    if (confirm('هل أنت متأكد من تسليم الامتحان؟')) {
      cleanupExam();
      submitPayload(false);
    }
  };

  const cleanupExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (syncRef.current) clearInterval(syncRef.current);
    stopCamera();
  };

  const submitPayload = async (isAuto = false) => {
    if (!selectedExam) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setExamState('submitting');

    const formatted = Object.entries(answers).map(([qId, val]) => ({
      questionId: qId,
      answer: val
    }));

    try {
      const res = await examService.submitAttempt(selectedExam, formatted);
      const normalized = normalizeAssessmentResult(res.data);
      setScore(normalized.percentage);
      setAttemptId(res.data?.id ?? attemptId);
      setExamState('submitted');
      toast.success(isAuto ? 'تم تسليم الامتحان تلقائياً بنجاح!' : 'تم تسليم الامتحان بنجاح!');
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'ATTEMPT_ALREADY_FINISHED') {
        toast.info('تم تسليم هذا الامتحان مسبقاً.');
        setExamState('submitted');
      } else {
        toast.error('خطأ في التسليم!');
        setExamState('list');
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── DISQUALIFIED STATE ───────────────────────────────────────────────────
  if (examState === 'disqualified') {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center" dir="rtl">
        <div className="bg-white rounded-xl shadow-md p-8">
          <ShieldAlert className="w-24 h-24 text-red-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">تم إنهاء الامتحان بسبب مخالفة قواعد الامتحان</h2>
          <p className="text-gray-600 mb-2">تم تسجيل ثلاث مخالفات، ولذلك تم إنهاء محاولتك تلقائيًا.</p>
          <p className="text-2xl font-bold text-red-600 mb-8">الدرجة: 0</p>
          <button onClick={() => { setExamState('list'); setAnswers({}); fetchExams(); }} className="mt-2 bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700">العودة للرئيسية</button>
        </div>
      </div>
    );
  }

  // ─── SUBMITTING STATE ─────────────────────────────────────────────────────
  if (examState === 'submitting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-gray-900">جاري تسليم الامتحان...</h2>
      </div>
    );
  }

  // ─── SETUP STATE ──────────────────────────────────────────────────────────
  if (examState === 'setup') {
    if (!currentExam?.requiresCamera) {
      return (
        <div className="p-8 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <ClipboardCheck className="w-16 h-16 mx-auto text-indigo-600 mb-4" />
            <h2 className="text-2xl font-bold mb-4">{currentExam?.title}</h2>
            <p className="text-gray-600 mb-6">هذا الامتحان لا يتطلب كاميرا. اضغط للبدء.</p>
            <button onClick={beginExam} className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700">ابدأ الامتحان</button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <Camera className="w-16 h-16 mx-auto text-indigo-600 mb-4" />
          <h2 className="text-2xl font-bold mb-4">إعداد كاميرا المراقبة</h2>
          <p className="text-gray-600 mb-6">يجب تفعيل الكاميرا لضمان نزاهة الامتحان.</p>
          <div className="bg-gray-100 rounded-lg overflow-hidden h-64 mb-6 flex items-center justify-center relative">
            <video ref={videoRef} autoPlay playsInline muted className="h-full object-cover" />
            {!cameraActive && <p className="absolute text-gray-500">الكاميرا معطلة</p>}
          </div>
          <div className="flex gap-4 justify-center">
            <button onClick={startCamera} className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">تفعيل الكاميرا</button>
            <button onClick={beginExam} disabled={!cameraActive} className={`px-6 py-2 rounded text-white ${cameraActive ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}>ابدأ الامتحان</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RUNNING STATE ────────────────────────────────────────────────────────
  if (examState === 'running' && currentExam) {
    return (
      <div className="p-8 max-w-3xl mx-auto" dir="rtl">
        {/* Multi-tab warning */}
        {showMultiTabWarning && (
          <div className="mb-4 bg-yellow-50 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>تحذير: تم الكشف عن تبويب آخر مفتوح لهذا الامتحان. استخدام أكثر من تبويب قد يُسجَّل كمخالفة.</span>
          </div>
        )}

        {/* Violation counter */}
        {violationCount > 0 && (
          <div className="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm font-bold">
            ⚠️ مخالفات مسجلة: {violationCount} / 3
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-6 mb-6 sticky top-0 z-10 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{currentExam.title}</h1>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-lg font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-indigo-600'}`}>
              <Clock className="w-5 h-5" />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <button onClick={handleManualSubmit} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">إنهاء وتسليم</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8 space-y-8">
          {(Array.isArray(currentExam.questions) ? currentExam.questions : []).map((q: any, idx: number) => {
            const originalOptions = Array.isArray(q.options) ? q.options : [];
            let displayOptions = originalOptions.map((opt: string, i: number) => ({ text: opt, originalIndex: i }));

            if (currentExam.randomization) {
              const seed = q.id.toString().split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
              displayOptions.sort((a: { text: string; originalIndex: number }, b: { text: string; originalIndex: number }) => {
                const randomA = Math.sin(seed + a.originalIndex) * 10000;
                const randomB = Math.sin(seed + b.originalIndex) * 10000;
                return (randomA - Math.floor(randomA)) - (randomB - Math.floor(randomB));
              });
            }

            return (
              <div key={q.id} className="pb-6 border-b border-gray-200 last:border-0" dir="rtl">
                <div className="font-bold text-gray-900 mb-4 flex justify-between">
                  <div>
                    <span className="text-indigo-600 ml-2">السؤال {idx + 1}:</span>
                    <MathContent content={q.text || ''} className="leading-relaxed inline" />
                  </div>
                  {q.points && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded h-6">{q.points} نقطة</span>}
                </div>

                {q.diagram && <GeometryDiagram data={q.diagram} />}

                {q.given && q.given.length > 0 && (
                  <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium text-gray-700 mb-2">المعطيات:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {q.given.map((g: string, i: number) => (
                        <li key={i} className="text-gray-800"><MathRenderer expression={g} /></li>
                      ))}
                    </ul>
                  </div>
                )}

                {q.mathExpression && (
                  <div className="my-6 text-center overflow-x-auto text-xl">
                    <MathRenderer expression={q.mathExpression} block />
                  </div>
                )}

                {q.required && (
                  <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                    <p className="font-medium text-yellow-800"><span className="font-bold">المطلوب:</span> {q.required}</p>
                  </div>
                )}

                <div className="space-y-3 mt-4">
                  {displayOptions.map((optionObj: { text: string, originalIndex: number }, renderIdx: number) => (
                    <label key={renderIdx} className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={optionObj.originalIndex}
                        checked={answers[q.id] === optionObj.originalIndex.toString()}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-5 h-5 text-indigo-600"
                      />
                      <div className="text-gray-900">
                        {optionObj.text.includes('\\') || optionObj.text.includes('^') || optionObj.text.match(/[a-zA-Z]/)
                          ? <MathRenderer expression={optionObj.text} />
                          : <MathContent content={optionObj.text} />}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── SUBMITTED STATE ──────────────────────────────────────────────────────
  if (examState === 'submitted' && currentExam) {
    const passed = score >= (currentExam.passingScore || 50);
    return (
      <div className="p-8 max-w-2xl mx-auto text-center" dir="rtl">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
            {passed ? <CheckCircle className="w-12 h-12 text-green-600" /> : <AlertCircle className="w-12 h-12 text-red-600" />}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">انتهى الامتحان!</h2>
          {wasAutoSubmit && (
            <p className="text-orange-600 font-bold mb-4">انتهى وقت الامتحان وتم تسليم إجاباتك تلقائيًا</p>
          )}
          <div className="text-6xl font-bold text-indigo-600 mb-4">{score}%</div>
          <p className="text-gray-600 mb-8">{passed ? 'مبروك! لقد نجحت' : 'للأسف، لم تنجح'}</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { setExamState('list'); setAnswers({}); setWasAutoSubmit(false); fetchExams(); }} className="bg-gray-100 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-200 font-bold transition-colors">العودة للامتحانات</button>
            {attemptId && (
              <button
                onClick={() => navigate(`/student/online/assessment/${currentExam.id}/review/${attemptId}`)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-bold transition-colors shadow-sm"
              >
                عرض النتيجة التفصيلية
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── EXAM LIST ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الامتحانات</h1>
        <p className="text-gray-600">اختبر معلوماتك من خلال الامتحانات</p>
      </div>

      {loading && <div className="text-center py-8 text-gray-500">جاري تحميل الامتحانات...</div>}
      {error && <div className="text-center py-8 text-red-500 bg-red-50 rounded-xl mb-4">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.length === 0 && <p className="text-gray-500 col-span-3 text-center py-8">لا توجد امتحانات متاحة حالياً.</p>}
          {(Array.isArray(exams) ? exams : []).map((exam) => {
            const now = new Date().getTime();
            const isTooEarly = exam.startTime && now < new Date(exam.startTime).getTime();
            const isTooLate = exam.endTime && now > new Date(exam.endTime).getTime();
            const isLocked = isTooEarly || isTooLate;

            if (isTooLate && exam.status !== 'completed') {
              return null;
            }

            return (
              <div key={exam.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${exam.status === 'completed' ? 'bg-green-100' : 'bg-indigo-100'}`}>
                      {exam.status === 'completed' ? <CheckCircle className="w-6 h-6 text-green-600" /> : <ClipboardCheck className="w-6 h-6 text-indigo-600" />}
                    </div>
                    {exam.score != null && (
                      <div className="text-2xl font-bold text-green-600">{Math.round(exam.score)}%</div>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3">{exam.title}</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{exam.duration} دقيقة</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ClipboardCheck className="w-4 h-4" />
                      <span>{exam.questions?.length || 0} سؤال</span>
                    </div>
                    {exam.startTime && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>يبدأ: {new Date(exam.startTime).toLocaleString('ar')}</span>
                      </div>
                    )}
                    {exam.endTime && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>ينتهي: {new Date(exam.endTime).toLocaleString('ar')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {exam.status === 'completed' ? (
                  <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm text-center">مكتمل - {Math.round(exam.score)}%</div>
                ) : isLocked ? (
                  <div className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm text-center">غير متاح حالياً</div>
                ) : (
                  <button onClick={() => handleSelectExam(exam.id)} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">ابدأ الامتحان</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
