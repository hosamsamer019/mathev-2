import { useState } from 'react';
import { ClipboardCheck, Clock, CheckCircle } from 'lucide-react';

export default function ExamsPage() {
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const exams = [
    { id: 1, title: 'امتحان الجبر', status: 'completed', score: 90, questions: 10 },
    { id: 2, title: 'امتحان الهندسة', status: 'available', score: null, questions: 15 },
  ];

  const questions = [
    {
      id: 1,
      question: 'ما هو حل المعادلة: x + 5 = 12؟',
      options: ['x = 5', 'x = 7', 'x = 10', 'x = 17'],
      correct: 1,
    },
    {
      id: 2,
      question: 'أوجد قيمة y: 2y = 18',
      options: ['y = 6', 'y = 9', 'y = 12', 'y = 18'],
      correct: 1,
    },
  ];

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach((q) => {
      if (parseInt(answers[q.id]) === q.correct) {
        correctCount++;
      }
    });
    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setSubmitted(true);
  };

  if (selectedExam && !submitted) {
    return (
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setSelectedExam(null)}
            className="text-green-600 hover:text-green-800 mb-4"
          >
            ← العودة للامتحانات
          </button>

          <div className="bg-white rounded-xl shadow-md p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">امتحان الهندسة</h1>

            <div className="space-y-8">
              {questions.map((q, idx) => (
                <div key={q.id} className="pb-6 border-b border-gray-200 last:border-0">
                  <h3 className="font-bold text-gray-900 mb-4">
                    السؤال {idx + 1}: {q.question}
                  </h3>
                  <div className="space-y-3">
                    {q.options.map((option, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          value={optIdx}
                          checked={answers[q.id] === optIdx.toString()}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          className="w-5 h-5 text-green-600"
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
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 mt-8"
            >
              إرسال الإجابات
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">تم التسليم!</h2>
            <div className="text-6xl font-bold text-green-600 mb-4">{score}%</div>
            <button
              onClick={() => {
                setSelectedExam(null);
                setSubmitted(false);
                setAnswers({});
              }}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700"
            >
              العودة للامتحانات
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الامتحانات</h1>
        <p className="text-gray-600">اختبر معلوماتك</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <div key={exam.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                exam.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                {exam.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <ClipboardCheck className="w-6 h-6 text-yellow-600" />
                )}
              </div>
              {exam.score && (
                <div className="text-2xl font-bold text-green-600">{exam.score}%</div>
              )}
            </div>

            <h3 className="font-bold text-gray-900 mb-3">{exam.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Clock className="w-4 h-4" />
              <span>{exam.questions} سؤال</span>
            </div>

            {exam.status === 'available' ? (
              <button
                onClick={() => setSelectedExam(exam.id)}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                ابدأ الامتحان
              </button>
            ) : (
              <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm text-center">
                مكتمل
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
