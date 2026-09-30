import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, FileText, Check } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { GeometryDiagram } from './GeometryDiagram';
import { getMediaUrl } from '../../utils/mediaUrl';

const resolveOptionText = (options: any, answer: any) => {
  if (answer === null || answer === undefined || answer === "") return null;
  const strAnswer = String(answer).trim();

  if (Array.isArray(options)) {
    if (options.length > 0 && typeof options[0] === 'object' && options[0] !== null && 'id' in options[0]) {
      const match = options.find((o: any) => String(o.id) === strAnswer);
      if (match) return match.text;
      
      const idx = parseInt(strAnswer, 10);
      if (!isNaN(idx) && idx >= 0 && idx < options.length) {
        return options[idx].text;
      }
    } else if (options.length > 0 && typeof options[0] === 'string') {
      const idx = parseInt(strAnswer, 10);
      if (!isNaN(idx) && idx >= 0 && idx < options.length) {
        return options[idx];
      }
    }
  } else if (typeof options === 'string') {
    const parsedOptions = options.split('-');
    const idx = parseInt(strAnswer, 10);
    if (!isNaN(idx) && idx >= 0 && idx < parsedOptions.length) {
      return parsedOptions[idx];
    }
  }

  return strAnswer;
};

interface AssessmentReviewProps {
  data: any;
  isTeacher: boolean;
}

export default function AssessmentReview({ data, isTeacher }: AssessmentReviewProps) {
  const { assessment, student, attempt, questions } = data;

  if (!attempt) return <div className="text-center p-8 text-gray-500 dark:text-gray-400">جاري التحميل...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Score Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{assessment?.title}</h2>
          <p className="text-gray-500 dark:text-gray-400">الطالب: {student?.name}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">الدرجة</div>
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">
              {attempt.score} / {attempt.totalPoints}
            </div>
          </div>
          <div className="text-center border-r border-gray-200 dark:border-gray-700 pr-6">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">النسبة</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">
              {Math.round(attempt.percentage || 0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q: any, index: number) => (
          <QuestionReviewItem key={q.id} index={index + 1} q={q} isTeacher={isTeacher} />
        ))}
      </div>
    </div>
  );
}

function QuestionReviewItem({ q, index, isTeacher }: { q: any; index: number; isTeacher: boolean }) {
  const [showSolution, setShowSolution] = useState(false);
  const [showGeneration, setShowGeneration] = useState(false);

  const getValidationBadge = (status: string) => {
    switch (status) {
      case 'MATHEMATICALLY_VERIFIED':
        return <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800"><Check className="w-3.5 h-3.5" /> تم التحقق رياضيًا</div>;
      case 'STRUCTURALLY_VALID':
        return <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800"><div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></div> صحيح هيكليًا</div>;
      case 'NEEDS_REVIEW':
        return <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800"><AlertTriangle className="w-3.5 h-3.5" /> يحتاج مراجعة المعلم</div>;
      case 'INVALID':
        return <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 rounded-full text-xs font-bold border border-red-200 dark:border-red-800"><XCircle className="w-3.5 h-3.5" /> السؤال غير صالح</div>;
      default:
        return null;
    }
  };

  const isUnanswered = q.studentAnswer === null || q.studentAnswer === undefined || q.studentAnswer === '';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-3 flex items-center justify-between border-b ${q.isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40' : 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40'}`}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-700 dark:text-gray-200">السؤال {index}</span>
          {q.isCorrect ? (
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold text-sm"><CheckCircle className="w-4 h-4" /> إجابة صحيحة</span>
          ) : isUnanswered ? (
            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-bold text-sm"><HelpCircle className="w-4 h-4" /> لم يتم الإجابة</span>
          ) : (
            <span className="flex items-center gap-1 text-red-700 dark:text-red-300 font-bold text-sm"><XCircle className="w-4 h-4" /> إجابة غير صحيحة</span>
          )}
        </div>
        <div className="text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
          {q.pointsEarned} / {q.points} نقاط
        </div>
      </div>

      <div className="p-6">
        {/* Validation Badge (Teacher Only) */}
        {isTeacher && q.validationStatus && (
          <div className="mb-4">{getValidationBadge(q.validationStatus)}</div>
        )}

        {/* Question Text & Math */}
        <div className="text-lg text-gray-900 dark:text-white font-medium mb-4 whitespace-pre-wrap leading-relaxed">
          {q.questionText}
        </div>
        {q.imageUrl && (
          <div className="my-4 flex justify-center">
            <img
              src={getMediaUrl(q.imageUrl)}
              alt={`صورة السؤال ${index}`}
              className="max-h-72 max-w-full rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm object-contain bg-white dark:bg-gray-900 p-1"
            />
          </div>
        )}
        {q.mathExpression && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/60 rounded-xl overflow-x-auto border border-gray-200 dark:border-gray-700" dir="ltr">
            <MathRenderer expression={q.mathExpression} block />
          </div>
        )}
        {q.diagram && (
          <div className="mb-6 flex justify-center">
            <GeometryDiagram data={q.diagram} />
          </div>
        )}
        
        {/* Given / Required */}
        {(q.given || q.required) && (
          <div className="mb-6 space-y-2">
            {q.given && (
              <div className="flex items-start gap-2">
                <span className="font-bold text-gray-700 dark:text-gray-300">المعطيات:</span>
                <span className="text-gray-600 dark:text-gray-400"><MathRenderer expression={q.given} /></span>
              </div>
            )}
            {q.required && (
              <div className="flex items-start gap-2">
                <span className="font-bold text-gray-700 dark:text-gray-300">المطلوب:</span>
                <span className="text-gray-600 dark:text-gray-400"><MathRenderer expression={q.required} /></span>
              </div>
            )}
          </div>
        )}

        {/* Answers Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-xl border ${q.isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'}`}>
            <div className="text-xs uppercase tracking-wider font-bold mb-2 opacity-75">إجابتك</div>
            <div className="font-medium text-lg min-h-[28px]" dir="ltr">
              {isUnanswered ? <span className="text-gray-400" dir="rtl">لا توجد إجابة</span> : (
                resolveOptionText(q.options, q.studentAnswer)
              )}
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
            <div className="text-xs uppercase tracking-wider font-bold mb-2 opacity-75">الإجابة الصحيحة</div>
            <div className="font-medium text-lg min-h-[28px]" dir="ltr">
              {resolveOptionText(q.options, q.correctAnswer) || <span className="text-red-500 dark:text-red-400" dir="rtl">غير متوفرة</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {(q.solutionExplanation || (q.solutionSteps && q.solutionSteps.length > 0)) && (
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {showSolution ? 'إخفاء الحل' : 'كيف تم الحل؟'}
            </button>
          )}

          {isTeacher && q.generationLogic && (
            <button
              onClick={() => setShowGeneration(!showGeneration)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors ml-auto"
            >
              <HelpCircle className="w-4 h-4" />
              {showGeneration ? 'إخفاء معلومات التوليد' : 'كيف تم توليد السؤال؟'}
            </button>
          )}
        </div>

        {/* Solution Panel */}
        {showSolution && (q.solutionExplanation || (q.solutionSteps && q.solutionSteps.length > 0)) && (
          <div className="mt-4 p-5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-200 mb-3">كيف تم الحل؟</h4>
            {q.solutionExplanation && (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">{q.solutionExplanation}</p>
            )}
            {q.solutionSteps && q.solutionSteps.length > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-gray-700 dark:text-gray-300 text-sm mb-2">خطوات الحل:</div>
                {q.solutionSteps.map((step: string, i: number) => (
                  <div key={i} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40 shadow-sm overflow-x-auto text-gray-800 dark:text-gray-200" dir="ltr">
                    <MathRenderer expression={step} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generation Logic Panel (Teacher Only) */}
        {isTeacher && showGeneration && q.generationLogic && (
          <div className="mt-4 p-5 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40">
            <h4 className="font-bold text-purple-900 dark:text-purple-200 mb-4">معلومات التصميم التربوي (للمعلم فقط)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-purple-100 dark:border-purple-900/40 shadow-sm">
                <div className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-1">سبب تصميم السؤال</div>
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{q.generationLogic.questionDesign}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-purple-100 dark:border-purple-900/40 shadow-sm">
                <div className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-1">الطريقة الرياضية</div>
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{q.generationLogic.mathematicalMethod}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-purple-100 dark:border-purple-900/40 shadow-sm">
                <div className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-1">سبب مستوى الصعوبة</div>
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{q.generationLogic.difficultyReason}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-purple-100 dark:border-purple-900/40 shadow-sm">
                <div className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-1">الهدف التعليمي</div>
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{q.generationLogic.learningObjective}</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
