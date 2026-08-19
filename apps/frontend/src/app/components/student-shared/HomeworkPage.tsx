import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { homeworkService } from '../../services/homework.service';

export default function HomeworkPage() {
  const [selectedHomework, setSelectedHomework] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const navigate = useNavigate();

  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    fetchHomeworks();
  }, []);

  const fetchHomeworks = () => {
    setLoading(true);
    setError(null);
    homeworkService.getHomeworks()
      .then((res) => {
        const data = res.data.data ? res.data.data : Array.isArray(res.data) ? res.data : [];
        if (data.length > 0) {
          const mapped = data.map((hw: any) => ({
            id: hw.id,
            title: hw.title,
            status: hw.status === 'draft' ? 'pending' : hw.status,
            score: hw.score || null,
            deadline: new Date(hw.deadline || Date.now()).toLocaleDateString(),
            isLocked: hw.isLocked || false
          }));
          setHomeworks(mapped);
        } else {
          setHomeworks([]);
        }
      })
      .catch((err: any) => {
        console.error('Error fetching homeworks:', err);
        if (err.response?.status === 403) {
          setError('لا توجد واجبات متاحة لأنك لست مسجلاً في أي دورة.');
        } else {
          setError('فشل في جلب الواجبات. تأكد من اتصال الخادم.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedHomework) {
      homeworkService.getHomeworkDetails(selectedHomework)
        .then((res) => {
          if (res.data && res.data.questions?.length > 0) {
            setQuestions(res.data.questions);
          }
        })
        .catch((err: any) => {
          console.error('Error fetching homework details:', err);
          if (err.response?.status === 403) {
            alert('غير مصرح لك بعرض هذا الواجب.');
            setSelectedHomework(null);
          }
        });
    }
  }, [selectedHomework]);

  const handleSubmit = () => {
    if (!selectedHomework) return;
    
    // Format answers for API
    const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
      questionId: qId,
      answer: val
    }));

    homeworkService.submitHomework(selectedHomework, { answers: formattedAnswers })
      .then((res) => {
        setScore(Math.round(res.data.score || res.data.percentage || 0));
        setAttemptId(res.data.id);
        setSubmitted(true);
      })
      .catch((err) => {
        console.error('API submission failed:', err);
        const code = err.response?.data?.code;
        if (code === 'NOT_ENROLLED') alert('أنت غير مسجل في هذا الكورس.');
        else if (code === 'ATTEMPT_ALREADY_FINISHED') alert('لقد قمت بتسليم هذا الواجب مسبقًا ولا يمكن الدخول إليه مرة أخرى.');
        else if (code === 'ASSESSMENT_CLOSED') alert('انتهى موعد تسليم الواجب.');
        else if (code === 'ASSESSMENT_NOT_OPEN') alert('لم يبدأ موعد فتح الواجب بعد.');
        else if (code === 'STUDENT_ROLE_REQUIRED') alert('هذا الحساب لا يمكنه بدء الواجب.');
        else alert('حدث خطأ أثناء تسليم الواجب. يرجى المحاولة مرة أخرى.');
      });
  };

  if (selectedHomework === null) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">الواجبات</h1>
          <p className="text-gray-600">قم بحل الواجبات واحصل على التقييم الفوري</p>
        </div>

        {loading && <div className="text-center py-8 text-gray-500">جاري تحميل الواجبات...</div>}
        {error && <div className="text-center py-8 text-red-500 bg-red-50 rounded-xl mb-4">{error}</div>}

        {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {homeworks.length === 0 && <p className="text-gray-500 col-span-3 text-center py-8">لا توجد واجبات متاحة حالياً.</p>}
          {homeworks.map((hw) => (
            <div
              key={hw.id}
              className={`bg-white rounded-xl shadow-md p-6 transition-shadow ${hw.isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-xl cursor-pointer'}`}
              onClick={() => {
                if (hw.isLocked) {
                  alert('يجب إكمال مشاهدة فيديو الدرس قبل فتح الواجب');
                  return;
                }
                if (hw.status === 'pending' || hw.status === 'available') {
                  setSelectedHomework(hw.id);
                }
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  hw.isLocked ? 'bg-gray-200' : hw.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {hw.isLocked ? (
                    <XCircle className="w-6 h-6 text-gray-500" />
                  ) : hw.status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Clock className="w-6 h-6 text-yellow-600" />
                  )}
                </div>
                {hw.status === 'completed' && hw.score && (
                  <div className="text-2xl font-bold text-green-600">{hw.score}%</div>
                )}
              </div>

              <h3 className="font-bold text-gray-900 mb-2">{hw.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Clock className="w-4 h-4" />
                <span>الموعد النهائي: {hw.deadline}</span>
              </div>

              <div className={`px-3 py-1 rounded-full text-sm inline-block ${
                hw.isLocked
                  ? 'bg-gray-200 text-gray-700'
                  : hw.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {hw.isLocked ? 'مقفل (شاهد الدرس)' : hw.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
              score >= 70 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {score >= 70 ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">تم التقييم!</h2>
            <div className="text-6xl font-bold text-indigo-600 mb-4">{score}%</div>
            <p className="text-gray-600 mb-8">
              {score >= 70 ? 'أحسنت! لقد نجحت في الواجب' : 'يمكنك المحاولة مرة أخرى'}
            </p>

            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => {
                  setSelectedHomework(null);
                  setAnswers({});
                  setSubmitted(false);
                }}
                className="bg-gray-100 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-200 font-bold transition-colors"
              >
                العودة للواجبات
              </button>
              {attemptId && (
                <button
                  onClick={() => navigate(`/student/online/assessment/${selectedHomework}/review/${attemptId}`)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-bold transition-colors shadow-sm"
                >
                  عرض النتيجة التفصيلية
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => setSelectedHomework(null)}
            className="text-indigo-600 hover:text-indigo-800 mb-4"
          >
            ← العودة للواجبات
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">واجب المتباينات</h1>
          <p className="text-gray-600">أجب على جميع الأسئلة ثم اضغط على إرسال</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="space-y-8">
            {questions.map((q, idx) => (
              <div key={q.id} className="pb-6 border-b border-gray-200 last:border-0">
                <h3 className="font-bold text-gray-900 mb-4">
                  السؤال {idx + 1}: {q.text || q.question}
                </h3>
                <div className="space-y-3">
                  {(Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? q.options.split('-') : [])).map((option: string, optIdx: number) => (
                    <label
                      key={optIdx}
                      className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={optIdx}
                        checked={answers[q.id] === optIdx.toString()}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-5 h-5 text-indigo-600"
                      />
                      <span className="text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed mt-8 font-medium"
          >
            إرسال الإجابات
          </button>
        </div>
      </div>
    </div>
  );
}
