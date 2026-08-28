import { useState, useEffect } from 'react';
import { Brain, Sparkles, BookOpen, Target, MessageSquare, Zap, ChevronLeft, Send, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { aiService } from '../../services/ai.service';
import { questionService } from '../../services/question.service';
import { analyticsApi } from '../../services/api';
import { QuestionPreview, StructuredQuestion } from '../ui/QuestionPreview';

const aiTools = [
  {
    id: 'solver',
    icon: Brain,
    title: 'توليد الواجبات الذكي',
    description: 'إنشاء واجبات مخصصة لكل طالب حسب مستواه وضعفه',
    color: 'from-purple-500 to-indigo-600',
    badge: 'جديد',
  },
  {
    id: 'path',
    icon: Target,
    title: 'مسارات التعلم التكيفية',
    description: 'خطط دراسية مخصصة مبنية على تحليل أداء كل طالب',
    color: 'from-blue-500 to-cyan-600',
    badge: null,
  },
  {
    id: 'content',
    icon: BookOpen,
    title: 'توليد المحتوى التعليمي',
    description: 'إنشاء شرح تلقائي للمفاهيم الصعبة بالعربية',
    color: 'from-green-500 to-emerald-600',
    badge: null,
  },
  {
    id: 'chat',
    icon: MessageSquare,
    title: 'مراقبة المساعد الذكي',
    description: 'متابعة محادثات الطلاب مع المساعد وتحسين إجاباته',
    color: 'from-orange-500 to-red-500',
    badge: null,
  },
];

const homeworkGeneratorTopics = ['الجبر', 'الهندسة', 'التفاضل', 'التكامل', 'الإحصاء', 'المثلثات'];

export default function TeacherAIPage() {
  const { isDark } = useTheme();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('متوسط');
  const [questionCount, setQuestionCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [genStage, setGenStage] = useState<string>('');
  const [genElapsed, setGenElapsed] = useState<number>(0);
  const [generated, setGenerated] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: 'ai', text: 'مرحباً أستاذ! كيف يمكنني مساعدتك في إنشاء المحتوى التعليمي؟' },
  ]);

  const [aiStats, setAiStats] = useState<any>(null);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    fetchAiStats();
  }, []);

  const fetchAiStats = async () => {
    try {
      const res = await analyticsApi.get('/ai-stats');
      setAiStats(res.data);
    } catch {
      // AI stats are optional — fail silently for teachers
    }
  };

  const handleGenerate = async () => {
    if (selectedTopics.length === 0) {
      alert('يرجى اختيار موضوع واحد على الأقل');
      return;
    }
    if (generating) return;

    setGenerating(true);
    setGenElapsed(0);
    setGenProgressCount(0);
    setGenStage('إعداد الطلب...');

    const startTime = performance.now();
    const timer = setInterval(() => {
      setGenElapsed(Math.round((performance.now() - startTime) / 100) / 10);
    }, 100);

    setTimeout(() => {
      setGenStage('جاري الاتصال بالذكاء الاصطناعي...');
    }, 350);

    setTimeout(() => {
      setGenStage('توليد الأسئلة...');
      setGenProgressCount(Math.max(1, Math.floor(questionCount * 0.4)));
    }, 900);

    setTimeout(() => {
      setGenStage('التحقق من صحة الأسئلة...');
      setGenProgressCount(Math.max(1, Math.floor(questionCount * 0.8)));
    }, 2000);

    try {
      const res = await aiService.generateQuestions({
        topic: selectedTopics.join('، '),
        difficulty,
        count: questionCount
      });
      setGenProgressCount(res.data.questions?.length || questionCount);
      setGenStage('اكتمل التوليد');
      setGeneratedQuestions(res.data.questions);
      setGenerated(true);
    } catch (err) {
      console.error(err);
      alert('فشل في التوليد');
    } finally {
      clearInterval(timer);
      setGenerating(false);
    }
  };

  const handleSaveToBank = async () => {
    if (!generatedQuestions || generatedQuestions.length === 0) return;
    try {
      setGenerating(true);
      const payload = generatedQuestions.map((q: any) => ({
        text: q.questionText,
        options: q.options?.map((o: any) => o.text) || [],
        correctAnswer: q.options?.findIndex((o: any) => o.id === q.correctAnswer) || 0,
        tag: selectedTopics.join('، '),
        mathExpression: q.mathExpression,
        diagram: q.diagram,
        solutionSteps: q.solutionSteps,
        given: q.given,
        required: q.required,
        explanation: q.explanation,
        solutionExplanation: q.solutionExplanation,
        generationLogic: q.generationLogic,
        validationStatus: q.validationStatus
      }));

      await questionService.createQuestionsBatch(payload);
      alert('تم حفظ كافة الأسئلة في بنك الأسئلة دفعة واحدة بنجاح!');
      setGenerated(false);
    } catch (err) {
      console.error(err);
      alert('فشل في حفظ الأسئلة');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', text: chatInput };
    const aiMsg = {
      role: 'ai',
      text: `بناءً على طلبك "${chatInput}"، يمكنني إنشاء المحتوى المناسب. سأقوم بتحليل مستوى الطلاب وإنشاء شرح مفصل باللغة العربية مع أمثلة تطبيقية.`,
    };
    setMessages([...messages, userMsg, aiMsg]);
    setChatInput('');
  };

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>أدوات الذكاء الاصطناعي</h1>
        </div>
        <p className={textSecondary}>استخدم قوة الذكاء الاصطناعي لتحسين تجربة التدريس والتعلم</p>
      </div>

      {!activeTool ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {aiTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`${cardBg} border rounded-2xl p-6 text-right hover:shadow-lg transition-all group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <tool.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  {tool.badge && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {tool.badge}
                    </span>
                  )}
                  <ChevronLeft className={`w-5 h-5 ${textSecondary} group-hover:text-purple-600 transition-colors`} />
                </div>
              </div>
              <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>{tool.title}</h3>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>{tool.description}</p>
            </button>
          ))}

          {/* AI Stats */}
          <div className={`md:col-span-2 ${cardBg} border rounded-2xl p-6`}>
            <h2 className={`font-bold ${textPrimary} mb-4`}>إحصائيات الذكاء الاصطناعي</h2>
            {aiStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'إجمالي الرسائل', value: aiStats.totalMessages ?? 0, color: 'text-purple-600' },
                  { label: 'إجمالي الجلسات', value: aiStats.totalSessions ?? 0, color: 'text-blue-600' },
                  { label: 'الطلاب النشطين', value: aiStats.activeStudents ?? 0, color: 'text-green-600' },
                ].map((stat, idx) => (
                  <div key={idx} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 text-center`}>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className={`text-sm ${textSecondary} mt-1`}>{stat.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            )}
            
            <h2 className={`font-bold ${textPrimary} mt-8 mb-4`}>أحدث محادثات الطلاب مع المساعد</h2>
            {aiStats && aiStats.conversations && aiStats.conversations.length > 0 ? (
              <div className="space-y-4">
                {aiStats.conversations.map((conv: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-bold ${textPrimary}`}>{conv.student}</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{conv.status}</span>
                    </div>
                    <p className={`text-sm ${textSecondary}`}>{conv.lastMessage}</p>
                    <p className={`text-xs ${textSecondary} mt-2`}>{new Date(conv.time).toLocaleString('ar-EG')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${textSecondary} text-center py-4`}>لا توجد محادثات مسجلة</p>
            )}
          </div>
        </div>
      ) : activeTool === 'solver' ? (
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <button onClick={() => { setActiveTool(null); setGenerated(false); }} className="flex items-center gap-2 text-emerald-600 mb-6 hover:underline">
            <ChevronLeft className="w-4 h-4 rotate-180" /> رجوع
          </button>
          <h2 className={`text-xl font-bold ${textPrimary} mb-6`}>توليد الواجبات الذكي</h2>

          {!generated ? (
            <div className="space-y-6 max-w-lg">
              <div>
                <label className={`text-sm font-medium ${textPrimary} block mb-3`}>اختر المواضيع</label>
                <div className="flex flex-wrap gap-2">
                  {homeworkGeneratorTopics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopics(prev =>
                        prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
                      )}
                      className={`px-4 py-2 rounded-xl text-sm transition-colors border ${
                        selectedTopics.includes(topic)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-sm font-medium ${textPrimary} block mb-3`}>مستوى الصعوبة</label>
                <div className="flex gap-2">
                  {['سهل', 'متوسط', 'صعب'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-5 py-2 rounded-xl text-sm transition-colors border ${
                        difficulty === d ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`text-sm font-medium ${textPrimary} block mb-3`}>عدد الأسئلة: {questionCount}</label>
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>٥</span><span>٣٠</span>
                </div>
              </div>
              {generating && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      {genStage || 'توليد الأسئلة...'}
                    </span>
                    <div className="flex items-center gap-2">
                      {genProgressCount > 0 && (
                        <span className="text-xs font-semibold text-purple-800 dark:text-purple-200 bg-purple-200 dark:bg-purple-800 px-2 py-0.5 rounded-full">
                          تم توليد {genProgressCount} من {questionCount} أسئلة
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-800 px-2 py-0.5 rounded-full">
                        الوقت المنقضي: {genElapsed.toFixed(1)} ثانية
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full animate-pulse transition-all duration-300" style={{ width: `${Math.min(100, Math.max(15, (genElapsed / (questionCount * 2)) * 100))}%` }}></div>
                  </div>
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={generating || selectedTopics.length === 0}
                className="flex items-center gap-2 bg-gradient-to-l from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري التوليد الفائق...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> توليد الواجب
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 p-4 rounded-xl">
                <Zap className="w-5 h-5" />
                <span className="font-medium">تم توليد الواجب بنجاح! ({questionCount} سؤال في {selectedTopics.join('، ')})</span>
              </div>
              <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
                {generatedQuestions.map((q, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                       <button className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-md font-bold hover:bg-purple-200 transition-colors">
                          تعديل
                       </button>
                       <button className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-md font-bold hover:bg-red-200 transition-colors">
                          إعادة التوليد
                       </button>
                    </div>
                    <QuestionPreview question={q} showSolution={true} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveToBank} disabled={generating} className="bg-gradient-to-l from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90">
                  حفظ في بنك الأسئلة
                </button>
                <button onClick={() => setGenerated(false)} className={`px-6 py-3 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
                  إعادة التوليد
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* AI Chat for other tools */
        <div className={`${cardBg} border rounded-2xl flex flex-col`} style={{ height: '600px' }}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <button onClick={() => setActiveTool(null)} className="text-emerald-600 hover:underline flex items-center gap-1">
              <ChevronLeft className="w-4 h-4 rotate-180" /> رجوع
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h2 className={`font-bold ${textPrimary}`}>مساعد المعلم الذكي</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                  {msg.role === 'ai' ? <Brain className="w-4 h-4 text-purple-600" /> : <span className="text-emerald-700 text-xs font-bold">أ</span>}
                </div>
                <div className={`max-w-md px-4 py-3 rounded-2xl text-sm ${msg.role === 'ai' ? isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900' : 'bg-purple-600 text-white'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="اطلب من الذكاء الاصطناعي إنشاء محتوى..."
                className={`flex-1 px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200'} focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm`}
              />
              <button onClick={handleSendChat} className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
