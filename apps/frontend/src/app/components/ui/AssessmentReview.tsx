import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, FileText, Check } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { GeometryDiagram } from './GeometryDiagram';

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

  if (!attempt) return <div className="text-center p-8 text-gray-500">جاري التحميل...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Score Card */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{assessment?.title}</h2>
          <p className="text-gray-500">الطالب: {student?.name}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">الدرجة</div>
            <div className="text-3xl font-bold text-indigo-600" dir="ltr">
              {attempt.score} / {attempt.totalPoints}
            </div>
          </div>
          <div className="text-center border-r pr-6">
            <div className="text-sm text-gray-500 mb-1">النسبة</div>
            <div className="text-3xl font-bold text-gray-900" dir="ltr">
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
        return <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200"><Check className="w-3.5 h-3.5" /> تم التحقق رياضيًا</div>;
      case 'STRUCTURALLY_VALID':
        return <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold border border-blue-200"><div className="w-2 h-2 rounded-full bg-blue-600"></div> صحيح هيكليًا</div>;
      case 'NEEDS_REVIEW':
        return <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200"><AlertTriangle className="w-3.5 h-3.5" /> يحتاج مراجعة المعلم</div>;
      case 'INVALID':
        return <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-200"><XCircle className="w-3.5 h-3.5" /> السؤال غير صالح</div>;
      default:
        return null;
    }
  };

  const isUnanswered = q.studentAnswer === null || q.studentAnswer === undefined || q.studentAnswer === '';

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-3 flex items-center justify-between border-b ${q.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-700">السؤال {index}</span>
          {q.isCorrect ? (
            <span className="flex items-center gap-1 text-emerald-700 font-bold text-sm"><CheckCircle className="w-4 h-4" /> إجابة صحيحة</span>
          ) : isUnanswered ? (
            <span className="flex items-center gap-1 text-gray-500 font-bold text-sm"><HelpCircle className="w-4 h-4" /> لم يتم الإجابة</span>
          ) : (
            <span className="flex items-center gap-1 text-red-700 font-bold text-sm"><XCircle className="w-4 h-4" /> إجابة غير صحيحة</span>
          )}
        </div>
        <div className="text-sm font-bold text-gray-600 bg-white px-3 py-1 rounded-full border">
          {q.pointsEarned} / {q.points} نقاط
        </div>
      </div>

      <div className="p-6">
        {/* Validation Badge (Teacher Only) */}
        {isTeacher && q.validationStatus && (
          <div className="mb-4">{getValidationBadge(q.validationStatus)}</div>
        )}

        {/* Question Text & Math */}
        <div className="text-lg text-gray-900 font-medium mb-4 whitespace-pre-wrap leading-relaxed">
          {q.questionText}
        </div>
        {q.mathExpression && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl overflow-x-auto" dir="ltr">
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
                <span className="font-bold text-gray-700">المعطيات:</span>
                <span className="text-gray-600"><MathRenderer expression={q.given} /></span>
              </div>
            )}
            {q.required && (
              <div className="flex items-start gap-2">
                <span className="font-bold text-gray-700">المطلوب:</span>
                <span className="text-gray-600"><MathRenderer expression={q.required} /></span>
              </div>
            )}
          </div>
        )}

        {/* Answers Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-xl border ${q.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
            <div className="text-xs uppercase tracking-wider font-bold mb-2 opacity-75">إجابتك</div>
            <div className="font-medium text-lg min-h-[28px]" dir="ltr">
              {isUnanswered ? <span className="text-gray-400" dir="rtl">لا توجد إجابة</span> : (
                resolveOptionText(q.options, q.studentAnswer)
              )}
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-gray-50 border-gray-200 text-gray-900">
            <div className="text-xs uppercase tracking-wider font-bold mb-2 opacity-75">الإجابة الصحيحة</div>
            <div className="font-medium text-lg min-h-[28px]" dir="ltr">
              {resolveOptionText(q.options, q.correctAnswer) || <span className="text-red-500" dir="rtl">غير متوفرة</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {(q.solutionExplanation || (q.solutionSteps && q.solutionSteps.length > 0)) && (
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {showSolution ? 'إخفاء الحل' : 'كيف تم الحل؟'}
            </button>
          )}

          {isTeacher && q.generationLogic && (
            <button
              onClick={() => setShowGeneration(!showGeneration)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-100 transition-colors ml-auto"
            >
              <HelpCircle className="w-4 h-4" />
              {showGeneration ? 'إخفاء معلومات التوليد' : 'كيف تم توليد السؤال؟'}
            </button>
          )}
        </div>

        {/* Solution Panel */}
        {showSolution && (q.solutionExplanation || (q.solutionSteps && q.solutionSteps.length > 0)) && (
          <div className="mt-4 p-5 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <h4 className="font-bold text-indigo-900 mb-3">كيف تم الحل؟</h4>
            {q.solutionExplanation && (
              <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">{q.solutionExplanation}</p>
            )}
            {q.solutionSteps && q.solutionSteps.length > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-gray-700 text-sm mb-2">خطوات الحل:</div>
                {q.solutionSteps.map((step: string, i: number) => (
                  <div key={i} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm overflow-x-auto text-gray-800" dir="ltr">
                    <MathRenderer expression={step} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generation Logic Panel (Teacher Only) */}
        {isTeacher && showGeneration && q.generationLogic && (
          <div className="mt-4 p-5 bg-purple-50/50 rounded-xl border border-purple-100">
            <h4 className="font-bold text-purple-900 mb-4">معلومات التصميم التربوي (للمعلم فقط)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                <div className="text-xs font-bold text-purple-800 mb-1">سبب تصميم السؤال</div>
                <div className="text-gray-700 text-sm leading-relaxed">{q.generationLogic.questionDesign}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                <div className="text-xs font-bold text-purple-800 mb-1">الطريقة الرياضية</div>
                <div className="text-gray-700 text-sm leading-relaxed">{q.generationLogic.mathematicalMethod}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                <div className="text-xs font-bold text-purple-800 mb-1">سبب مستوى الصعوبة</div>
                <div className="text-gray-700 text-sm leading-relaxed">{q.generationLogic.difficultyReason}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                <div className="text-xs font-bold text-purple-800 mb-1">الهدف التعليمي</div>
                <div className="text-gray-700 text-sm leading-relaxed">{q.generationLogic.learningObjective}</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
