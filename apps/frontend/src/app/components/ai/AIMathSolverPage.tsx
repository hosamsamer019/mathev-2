import { useState } from 'react';
import { Brain, Send, Sparkles, RefreshCw, BookOpen, ChevronLeft, History, Star } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { aiApi } from '../../services/api';

interface SolverStep {
  step: number;
  title: string;
  content: string;
  formula?: string;
}

const sampleProblems = [
  'حل المعادلة: 2x² + 5x - 3 = 0',
  'احسب مشتقة: f(x) = x³ + 2x² - 5x + 1',
  'احسب التكامل: ∫(3x² + 2x)dx',
  'في مثلث ABC، إذا كان sin(A) = 3/5، جد cos(A)',
  'حل المنظومة: { 2x + y = 7, x - y = 2 }',
  'جد مجموع المتسلسلة: 1 + 2 + 3 + ... + 100',
];

export default function AIMathSolverPage() {
  const { isDark } = useTheme();
  const [problem, setProblem] = useState('');
  const [solving, setSolving] = useState(false);
  const [solution, setSolution] = useState<{ answer: string; steps: SolverStep[] } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await aiApi.get('/history');
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleHistory = () => {
    if (!showHistory) fetchHistory();
    setShowHistory(!showHistory);
  };

  const handleSolve = async () => {
    if (!problem.trim()) return;
    setSolving(true);
    setSolution(null);
    setActiveStep(null);
    
    try {
      const response = await aiApi.post('/solve', { problem, level: 'high_school' });
      const { result, steps, solution: explanation } = response.data;
      
      // Map API response to UI SolverStep format
      const mappedSteps: SolverStep[] = Array.isArray(steps) ? steps.map((s: string, idx: number) => ({
        step: idx + 1,
        title: `الخطوة ${idx + 1}`,
        content: s
      }));

      setSolution({
        answer: result,
        steps: mappedSteps
      });
    } catch (error) {
      console.error('AI Solver failed:', error);
      alert('حدث خطأ أثناء حل المسألة');
    } finally {
      setSolving(false);
    }
  };

  const handleSaveSolution = async () => {
    try {
      await aiApi.post('/history/save', { problem, solution });
      alert('تم حفظ الحل في السجل بنجاح');
      fetchHistory();
    } catch (err) {
      console.error('Failed to save', err);
    }
  };

  const handleSimilar = async () => {
    try {
      const res = await aiApi.post('/similar', { problem });
      if (res.data?.similarProblem) {
        setProblem(res.data.similarProblem);
        setSolution(null);
      } else {
        alert('لا توجد مسائل مشابهة حالياً');
      }
    } catch (err) {
      console.error('Failed to fetch similar', err);
    }
  };

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${textPrimary}`}>حل المسائل بالذكاء الاصطناعي</h1>
              <p className={textSecondary}>شرح تفصيلي خطوة بخطوة لأي مسألة رياضية</p>
            </div>
          </div>
          <button
            onClick={handleToggleHistory}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'} hover:bg-gray-50 dark:hover:bg-gray-700`}
          >
            <History className="w-4 h-4" /> السجل
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Problem Input */}
          <div className={`${cardBg} border rounded-2xl p-6`}>
            <h2 className={`font-bold ${textPrimary} mb-4`}>أدخل المسألة الرياضية</h2>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="مثال: حل المعادلة 2x² + 5x - 3 = 0، أو احسب ∫(x²+1)dx"
              rows={4}
              className={`w-full px-4 py-3 rounded-xl border text-sm resize-none ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                {['×', '÷', '√', '∫', '∑', 'π', '±', '∞'].map((sym) => (
                  <button
                    key={sym}
                    onClick={() => setProblem(prev => prev + sym)}
                    className={`w-8 h-8 rounded-lg text-sm font-mono ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSolve}
                disabled={!problem.trim() || solving}
                className="flex items-center gap-2 bg-gradient-to-l from-purple-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {solving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الحل...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    حل المسألة
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Solution Section */}
          {solving && (
            <div className={`${cardBg} border rounded-2xl p-8 text-center`}>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className={`font-bold ${textPrimary} mb-2`}>الذكاء الاصطناعي يحلل المسألة...</h3>
              <p className={`text-sm ${textSecondary}`}>يتم إنشاء شرح تفصيلي خطوة بخطوة</p>
              <div className="flex justify-center gap-2 mt-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {solution && (
            <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
              {/* Answer Banner */}
              <div className="bg-gradient-to-l from-purple-600 to-indigo-700 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">الإجابة النهائية</span>
                </div>
                <p className="text-2xl font-bold text-white font-mono">{solution.answer}</p>
              </div>

              {/* Steps */}
              <div className="p-6">
                <h3 className={`font-bold ${textPrimary} mb-4`}>الحل التفصيلي خطوة بخطوة</h3>
                <div className="space-y-3">
                  {solution.steps.map((step) => (
                    <div key={step.step}>
                      <button
                        onClick={() => setActiveStep(activeStep === step.step ? null : step.step)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                          activeStep === step.step
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            activeStep === step.step ? 'bg-purple-600 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {step.step}
                          </div>
                          <span className={`font-medium ${textPrimary}`}>{step.title}</span>
                        </div>
                        <ChevronLeft className={`w-4 h-4 ${textSecondary} transition-transform ${activeStep === step.step ? 'rotate-90' : ''}`} />
                      </button>
                      {activeStep === step.step && (
                        <div className={`mx-4 p-4 rounded-b-xl border border-t-0 ${isDark ? 'border-gray-700 bg-gray-700/30' : 'border-gray-100 bg-gray-50'}`}>
                          <p className={`text-sm ${textSecondary} mb-3`}>{step.content}</p>
                          {step.formula && (
                            <div className={`px-4 py-2 rounded-lg font-mono text-sm ${isDark ? 'bg-gray-800 text-purple-400' : 'bg-white text-purple-700 border border-purple-100'}`}>
                              {step.formula}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={handleSimilar} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <BookOpen className="w-4 h-4" /> تمارين مشابهة
                  </button>
                  <button onClick={handleSaveSolution} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Star className="w-4 h-4" /> حفظ الحل
                  </button>
                  <button onClick={() => { setSolution(null); setProblem(''); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <RefreshCw className="w-4 h-4" /> مسألة جديدة
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sample Problems */}
          <div className={`${cardBg} border rounded-2xl p-5`}>
            <h3 className={`font-bold ${textPrimary} mb-4`}>أمثلة للتجربة</h3>
            <div className="space-y-2">
              {sampleProblems.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setProblem(sample)}
                  className={`w-full text-right p-3 rounded-xl text-sm border transition-colors ${
                    isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-100 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className={`${cardBg} border rounded-2xl p-5`}>
            <h3 className={`font-bold ${textPrimary} mb-4`}>المواضيع المتاحة</h3>
            <div className="flex flex-wrap gap-2">
              {['جبر', 'هندسة', 'تفاضل', 'تكامل', 'إحصاء', 'مثلثات', 'أعداد', 'دوال'].map((topic) => (
                <span key={topic} className="text-xs px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  {topic}
                </span>
              ))}
            </div>
          </div>

          {/* History Panel */}
          {showHistory && (
            <div className={`${cardBg} border rounded-2xl p-5`}>
              <h3 className={`font-bold ${textPrimary} mb-4`}>السجل السابق</h3>
              {loadingHistory ? (
                <div className="text-center py-4 text-gray-500">جاري التحميل...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-4 text-gray-500">لا يوجد سجل حالياً</div>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(history) ? history : []).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setProblem(item.problem)}
                      className={`w-full text-right p-3 rounded-xl border ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${textPrimary} line-clamp-2`}>{item.problem}</p>
                        {item.saved && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                      </div>
                      <p className={`text-xs ${textSecondary} mt-1`}>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
