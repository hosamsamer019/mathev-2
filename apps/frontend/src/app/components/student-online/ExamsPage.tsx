import { useState, useEffect, useRef } from 'react';
import { ClipboardCheck, Clock, CheckCircle, AlertCircle, Camera, AlertTriangle } from 'lucide-react';
import { courseApi, examApi } from '../../services/api';

export default function ExamsPage() {
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [examState, setExamState] = useState<'list' | 'setup' | 'running' | 'submitted' | 'disqualified'>('list');
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [currentExam, setCurrentExam] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hardcode courseId for demonstration, in a real app this comes from routing
  const COURSE_ID = 'clqzxyzcourse0001';

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await examApi.get(`/`); // Changed from courseApi.get('/exams')
      setExams(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch exams', err);
      setError('فشل في تحميل الامتحانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExam = async (examId: string) => {
    setSelectedExam(examId);
    setExamState('setup');
    try {
      const res = await examApi.get(`/${examId}`);
      setCurrentExam(res.data);
    } catch (err) {
      console.error('Failed to load exam details', err);
      alert('فشل تحميل تفاصيل الامتحان');
      setExamState('list');
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
      alert('يجب السماح بالوصول للكاميرا لبدء الامتحان.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const beginExam = async () => {
    // Fix #2: Camera is optional based on exam config
    if (currentExam?.requireCamera !== false && !cameraActive) {
      alert('يجب تشغيل الكاميرا أولاً!');
      return;
    }

    try {
      const res = await courseApi.post(`/exams/${selectedExam}/start`);
      const attempt = res.data;
      setExamState('running');

      // Fix #4: Calculate remaining time from server startedAt
      const startedAt = new Date(attempt.startedAt).getTime();
      const durationSec = currentExam.duration * 60;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, durationSec - elapsed);
      setTimeLeft(remaining);

      // Start timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start sync
      syncRef.current = setInterval(() => {
        syncDraft();
      }, 30000); // 30 sec

      // Tab switch detection
      document.addEventListener('visibilitychange', handleTabSwitch);

    } catch (err) {
      alert('حدث خطأ أثناء بدء الامتحان. قد يكون لديك محاولة سابقة.');
    }
  };

  const handleTabSwitch = () => {
    if (document.hidden && selectedExam && examState === 'running') {
      courseApi.post(`/exams/${selectedExam}/violation`, { type: 'TAB_SWITCH' })
        .then(() => alert('تحذير: تم تسجيل خروجك من صفحة الامتحان!'))
        .catch(err => {
          if (err.response?.data?.message?.includes('Disqualified')) {
            handleDisqualification();
          }
        });
    }
  };

  const syncDraft = () => {
    if (!selectedExam) return;
    const formatted = Object.entries(answers).map(([qId, val]) => ({
      questionId: qId,
      selectedOption: parseInt(val)
    }));
    courseApi.post(`/exams/${selectedExam}/sync`, { answers: formatted }).catch(() => {});
  };

  const handleAutoSubmit = () => {
    cleanupExam();
    submitPayload();
  };

  const handleManualSubmit = () => {
    if (confirm('هل أنت متأكد من تسليم الامتحان؟')) {
      cleanupExam();
      submitPayload();
    }
  };

  const handleDisqualification = () => {
    cleanupExam();
    setExamState('disqualified');
  };

  const cleanupExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (syncRef.current) clearInterval(syncRef.current);
    document.removeEventListener('visibilitychange', handleTabSwitch);
    stopCamera();
  };

  const submitPayload = async () => {
    if (!selectedExam) return;
    const formatted = Object.entries(answers).map(([qId, val]) => ({
      questionId: qId,
      selectedOption: parseInt(val)
    }));

    try {
      const res = await courseApi.post(`/exams/${selectedExam}/submit`, { answers: formatted });
      setScore(Math.round(res.data.score));
      setExamState('submitted');
    } catch (err) {
      alert('خطأ في التسليم!');
      setExamState('list');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (examState === 'setup') {
    // Fix #2: Skip camera setup if exam doesn't require it
    if (currentExam?.requireCamera === false) {
      return (
        <div className="p-8 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <ClipboardCheck className="w-16 h-16 mx-auto text-indigo-600 mb-4" />
            <h2 className="text-2xl font-bold mb-4">{currentExam.title}</h2>
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
          <p className="text-gray-600 mb-6">يجب تفعيل الكاميرا لضمان نزاهة الامتحان. لن يتم تسجيل الفيديو، سيتم استخدامه للمراقبة الحية فقط.</p>
          
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

  if (examState === 'running' && currentExam) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
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
          {(Array.isArray(currentExam.questions) ? currentExam.questions : []).map((q: any, idx: number) => (
            <div key={q.id} className="pb-6 border-b border-gray-200 last:border-0">
              <h3 className="font-bold text-gray-900 mb-4">السؤال {idx + 1}: {q.questionText}</h3>
              <div className="space-y-3">
                {(Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? q.options.split('-') : [])).map((option: string, optIdx: number) => (
                  <label key={optIdx} className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 cursor-pointer transition-colors">
                    <input type="radio" name={`question-${q.id}`} value={optIdx} checked={answers[q.id] === optIdx.toString()} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} className="w-5 h-5 text-indigo-600" />
                    <span className="text-gray-900">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (examState === 'disqualified') {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-xl shadow-md p-8">
          <AlertTriangle className="w-24 h-24 text-red-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">تم إلغاء الامتحان!</h2>
          <p className="text-gray-600">تم رصد مخالفات متعددة لشروط الامتحان (الخروج من الصفحة). تم إغلاق المحاولة ومنح درجة 0.</p>
          <button onClick={() => setExamState('list')} className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700">العودة للرئيسية</button>
        </div>
      </div>
    );
  }

  if (examState === 'submitted') {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${score >= 60 ? 'bg-green-100' : 'bg-red-100'}`}>
            {score >= 60 ? <CheckCircle className="w-12 h-12 text-green-600" /> : <AlertCircle className="w-12 h-12 text-red-600" />}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">انتهى الامتحان!</h2>
          <div className="text-6xl font-bold text-indigo-600 mb-4">{score}%</div>
          <p className="text-gray-600 mb-8">{score >= 60 ? 'مبروك! لقد نجحت' : 'للأسف، لم تنجح'}</p>
          <button onClick={() => { setExamState('list'); setAnswers({}); fetchExams(); }} className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700">العودة للامتحانات</button>
        </div>
      </div>
    );
  }

  // Fix #1: Restore completed exam display with scores and question counts
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الامتحانات</h1>
        <p className="text-gray-600">اختبر معلوماتك من خلال الامتحانات</p>
      </div>

      {loading && <div className="text-center py-8 text-gray-500">جاري تحميل الامتحانات...</div>}
      {error && <div className="text-center py-8 text-red-500 bg-red-50 rounded-xl mb-4">{error}</div>}

      {!loading && !error && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.length === 0 && <p className="text-gray-500 col-span-3 text-center py-8">لا توجد امتحانات متاحة حالياً.</p>}
        {(Array.isArray(exams) ? exams : []).map((exam) => (
          <div key={exam.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
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
            </div>
            {exam.status === 'completed' ? (
              <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm text-center">مكتمل - {Math.round(exam.score)}%</div>
            ) : (
              <button onClick={() => handleSelectExam(exam.id)} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">ابدأ الامتحان</button>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
