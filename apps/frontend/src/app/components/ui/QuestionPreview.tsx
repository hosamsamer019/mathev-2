import React, { useState } from 'react';
import { MathRenderer } from './MathRenderer';
import { GeometryDiagram, DiagramData } from './GeometryDiagram';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GenerationLogic {
  questionDesign: string;
  mathematicalMethod: string;
  difficultyReason: string;
  learningObjective: string;
}

export interface StructuredQuestion {
  id?: string;
  type?: string;
  topic?: string;
  subtopic?: string;
  gradeLevel?: string;
  difficulty?: string;
  questionText: string;
  mathExpression?: string | null;
  diagram?: DiagramData | null;
  given?: string[] | null;
  required?: string | null;
  options?: { id: string; text: string }[];
  correctAnswer?: string;
  explanation?: string;
  solutionSteps?: string[];
  solutionExplanation?: string | null;
  generationLogic?: GenerationLogic | null;
  validationStatus?: 'STRUCTURALLY_VALID' | 'MATHEMATICALLY_VERIFIED' | 'NEEDS_REVIEW' | 'INVALID';
  points?: number;
}

interface QuestionPreviewProps {
  question: StructuredQuestion;
  /** When true, show teacher-only panels: generation logic, solution, validation status */
  showSolution?: boolean;
  /** When true, show the "كيف تم توليد السؤال؟" teacher-only panel */
  isTeacher?: boolean;
}

// ─── Validation Status Badge ───────────────────────────────────────────────────

const ValidationBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;

  const configs: Record<string, { icon: string; label: string; classes: string }> = {
    MATHEMATICALLY_VERIFIED: {
      icon: '✓',
      label: 'تم التحقق رياضيًا',
      classes: 'bg-green-100 text-green-800 border border-green-200',
    },
    STRUCTURALLY_VALID: {
      icon: '●',
      label: 'صحيح هيكليًا',
      classes: 'bg-blue-100 text-blue-800 border border-blue-200',
    },
    NEEDS_REVIEW: {
      icon: '⚠',
      label: 'يحتاج مراجعة المعلم',
      classes: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    },
    INVALID: {
      icon: '✕',
      label: 'السؤال غير صحيح',
      classes: 'bg-red-100 text-red-800 border border-red-200',
    },
  };

  const config = configs[status];
  if (!config) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${config.classes}`}>
      <span className="text-base leading-none">{config.icon}</span>
      {config.label}
    </span>
  );
};

// ─── Expandable Panel ──────────────────────────────────────────────────────────

const ExpandablePanel: React.FC<{
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  panelClass?: string;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = false, panelClass = 'bg-gray-50 border-gray-200', children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border overflow-hidden mb-3 ${panelClass}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-right hover:brightness-95 transition"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 font-semibold text-sm">
          {icon}
          {title}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 text-sm">{children}</div>}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const QuestionPreview: React.FC<QuestionPreviewProps> = ({
  question,
  showSolution = true,
  isTeacher = false,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6" dir="rtl">

      {/* ─── Header: question text + metadata badges ─── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 leading-relaxed whitespace-pre-wrap flex-1">
          {question.questionText}
        </h3>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {question.points && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap">
              {question.points} {question.points === 1 ? 'نقطة' : 'نقاط'}
            </span>
          )}
          {isTeacher && <ValidationBadge status={question.validationStatus} />}
        </div>
      </div>

      {/* ─── Diagram ─── */}
      {question.diagram && <GeometryDiagram data={question.diagram} />}

      {/* ─── Given (structured mathematical givens) ─── */}
      {question.given && question.given.length > 0 && (
        <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <p className="font-semibold text-gray-700 mb-2 text-sm">المعطيات:</p>
          <ul className="list-disc list-inside space-y-1">
            {question.given.map((g, i) => (
              <li key={i} className="text-gray-800 text-sm">
                <MathRenderer expression={g} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Main Mathematical Expression ─── */}
      {question.mathExpression && (
        <div className="my-6 text-center overflow-x-auto text-xl bg-indigo-50 p-4 rounded-xl border border-indigo-100">
          <MathRenderer expression={question.mathExpression} block />
        </div>
      )}

      {/* ─── Required ─── */}
      {question.required && (
        <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
          <p className="text-yellow-900 text-sm">
            <span className="font-bold">المطلوب: </span>
            {question.required}
          </p>
        </div>
      )}

      {/* ─── Options ─── */}
      {question.options && question.options.length > 0 && (
        <div className="mt-6">
          <p className="font-semibold text-gray-700 mb-3 text-sm">الخيارات:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {question.options.map((opt) => {
              const isCorrect = showSolution && isTeacher && opt.id === question.correctAnswer;
              return (
                <div
                  key={opt.id}
                  className={`flex items-center p-3 rounded-xl border transition-colors ${
                    isCorrect
                      ? 'bg-green-50 border-green-300 ring-1 ring-green-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full ml-3 font-semibold text-sm shrink-0 ${
                      isCorrect ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <div className="text-gray-800 flex-1 min-w-0 overflow-hidden text-sm">
                    <MathRenderer expression={opt.text} />
                  </div>
                  {isCorrect && (
                    <span className="text-green-600 text-xs font-bold mr-2 shrink-0">✓ صحيح</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Teacher-only panels ─── */}
      {isTeacher && showSolution && (
        <div className="mt-6 border-t border-gray-100 pt-5 space-y-2">

          {/* Solution panel */}
          {(question.solutionExplanation || question.solutionSteps?.length || question.explanation) && (
            <ExpandablePanel
              title="كيف تم حل السؤال؟"
              defaultOpen={false}
              panelClass="bg-indigo-50 border-indigo-200"
              icon={
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              {/* Solution explanation (plain Arabic text) */}
              {question.solutionExplanation && (
                <p className="text-gray-700 leading-relaxed mb-4 bg-white p-3 rounded-lg border border-indigo-100">
                  {question.solutionExplanation}
                </p>
              )}

              {/* Solution steps (rendered LaTeX) */}
              {question.solutionSteps && question.solutionSteps.length > 0 && (
                <div className="space-y-2 text-center overflow-x-auto">
                  {question.solutionSteps.map((step, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-lg border border-indigo-100">
                      <span className="text-xs text-indigo-400 block mb-1 text-right">الخطوة {idx + 1}</span>
                      <MathRenderer expression={step} block />
                    </div>
                  ))}
                </div>
              )}

              {/* Fallback explanation */}
              {!question.solutionExplanation && !question.solutionSteps?.length && question.explanation && (
                <p className="text-gray-700 leading-relaxed">{question.explanation}</p>
              )}
            </ExpandablePanel>
          )}

          {/* Generation Logic panel — teacher only, never shown to students */}
          {question.generationLogic && (
            <ExpandablePanel
              title="كيف تم توليد السؤال؟"
              defaultOpen={false}
              panelClass="bg-purple-50 border-purple-200"
              icon={
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            >
              <dl className="space-y-3">
                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <dt className="text-xs text-purple-500 font-bold mb-1">الهدف التعليمي</dt>
                  <dd className="text-gray-800 text-sm leading-relaxed">{question.generationLogic.learningObjective}</dd>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <dt className="text-xs text-purple-500 font-bold mb-1">فكرة تصميم السؤال</dt>
                  <dd className="text-gray-800 text-sm leading-relaxed">{question.generationLogic.questionDesign}</dd>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <dt className="text-xs text-purple-500 font-bold mb-1">المهارة الرياضية المستهدفة</dt>
                  <dd className="text-gray-800 text-sm leading-relaxed">{question.generationLogic.mathematicalMethod}</dd>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <dt className="text-xs text-purple-500 font-bold mb-1">سبب مستوى الصعوبة</dt>
                  <dd className="text-gray-800 text-sm leading-relaxed">{question.generationLogic.difficultyReason}</dd>
                </div>
              </dl>
            </ExpandablePanel>
          )}
        </div>
      )}
    </div>
  );
};
