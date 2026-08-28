import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Sparkles, Key, User, Phone, CheckCircle, BookOpen,
  AlertCircle, ArrowLeft, Clock, Lock, CalendarClock
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// Exam availability state derived from API error codes
type ExamState = 'idle' | 'NOT_STARTED' | 'OPEN' | 'CLOSED';

function formatArabicDateTime(dt: string | Date): string {
  try {
    const d = new Date(dt);
    return d.toLocaleString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch {
    return String(dt);
  }
}

export default function ExternalExamPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { examCode: routeExamCode } = useParams<{ examCode?: string }>();
  const { loginGuest } = useAuth();
  const { isDark } = useTheme();

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Explicit exam state machine — driven by API response codes
  const [examState, setExamState] = useState<ExamState>('idle');
  const [examStateDate, setExamStateDate] = useState<string | null>(null);

  // Auto-populate exam code from query params or route params
  useEffect(() => {
    const urlCode = searchParams.get('code') || routeExamCode || '';
    if (urlCode) {
      setCode(urlCode.toUpperCase().trim());
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }

    if (searchParams.get('expired') === 'true') {
      toast.info('انتهت جلسة الامتحان. يرجى إعادة الدخول باستخدام كود الامتحان.');
    }
  }, [searchParams, routeExamCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Blocked states — no submission allowed
    if (examState === 'NOT_STARTED' || examState === 'CLOSED') return;

    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedCode) {
      toast.error('يرجى إدخال كود دخول الامتحان');
      return;
    }

    if (!trimmedName || trimmedName.length < 2) {
      toast.error('يرجى إدخال اسم الطالب كاملاً (حرفين على الأقل)');
      return;
    }

    if (trimmedName.length > 100) {
      toast.error('اسم الطالب طويل جداً');
      return;
    }

    if (trimmedPhone && !/^[0-9+ -]{7,15}$/.test(trimmedPhone)) {
      toast.error('يرجى إدخال رقم هاتف صحيح');
      return;
    }

    try {
      setLoading(true);
      // Reset exam state each attempt
      setExamState('idle');
      setExamStateDate(null);

      const res = await loginGuest(trimmedName, trimmedPhone, trimmedCode);

      if (res.success && res.assessmentId) {
        toast.success('تم التحقق بنجاح! جاري تحضير الامتحان...');
        navigate(`/external-exam/take/${res.assessmentId}`);
      } else {
        // Drive UI state from the API error code — no IP messages
        if (res.code === 'ASSESSMENT_NOT_OPEN') {
          setExamState('NOT_STARTED');
          setExamStateDate(res.openAt || null);
          toast.warning('الامتحان لم يبدأ بعد');
        } else if (res.code === 'ASSESSMENT_CLOSED') {
          setExamState('CLOSED');
          setExamStateDate(res.closeAt || null);
          toast.error('انتهى وقت إتاحة هذا الامتحان');
        } else {
          const msg = res.message || 'كود الامتحان غير صحيح أو غير متاح للطلاب الخارجيين';
          toast.error(msg);
        }
      }
    } catch (err: any) {
      console.error('External exam login error:', err);
      toast.error('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Exam state banners ───────────────────────────────────────────────────
  const renderStateBanner = () => {
    if (examState === 'NOT_STARTED') {
      return (
        <div className="mb-6 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-right" dir="rtl">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="font-black text-amber-700 dark:text-amber-300 text-sm">الامتحان لم يبدأ بعد</span>
          </div>
          {examStateDate && (
            <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
              موعد بدء الامتحان: <span className="font-bold">{formatArabicDateTime(examStateDate)}</span>
            </p>
          )}
          <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-1">
            يرجى العودة في الموعد المحدد.
          </p>
        </div>
      );
    }

    if (examState === 'CLOSED') {
      return (
        <div className="mb-6 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-right" dir="rtl">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-red-500 shrink-0" />
            <span className="font-black text-red-700 dark:text-red-300 text-sm">انتهى وقت الامتحان</span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
            هذا الامتحان لم يعد متاحًا للدخول.
          </p>
          {examStateDate && (
            <p className="text-xs text-red-600/80 dark:text-red-500 mt-1">
              انتهى في: <span className="font-bold">{formatArabicDateTime(examStateDate)}</span>
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  // ─── Submit button config ─────────────────────────────────────────────────
  const getButtonConfig = () => {
    if (examState === 'NOT_STARTED') {
      return { text: 'غير متاح حاليًا', disabled: true, icon: <Clock className="w-4 h-4" /> };
    }
    if (examState === 'CLOSED') {
      return { text: 'الامتحان مغلق', disabled: true, icon: <Lock className="w-4 h-4" /> };
    }
    if (loading) {
      return {
        text: 'جارٍ التحقق من بيانات الامتحان...',
        disabled: true,
        icon: <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      };
    }
    return { text: 'دخول الامتحان', disabled: false, icon: <CheckCircle className="w-4 h-4" /> };
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-gray-950 text-white' : 'bg-slate-50 text-gray-900'}`} dir="rtl">
      {/* Background decorations */}
      <div className="fixed inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
      <div className="fixed top-12 right-12 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-12 left-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between max-w-5xl mx-auto w-full py-4 border-b border-gray-200/40 dark:border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">منصة السادن التعليمية</h2>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">بوابة الامتحانات الذكية لمادة الرياضيات</p>
          </div>
        </div>

        <Link
          to="/"
          className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border transition-colors ${
            isDark ? 'border-gray-700 bg-gray-900/60 text-gray-300 hover:bg-gray-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          الرئيسية
        </Link>
      </header>

      {/* Main card */}
      <main className="relative z-10 flex items-center justify-center my-8">
        <div className={`max-w-md w-full rounded-3xl border shadow-2xl p-6 sm:p-8 backdrop-blur-xl transition-all duration-300 ${
          isDark ? 'bg-gray-900/90 border-gray-800 shadow-purple-950/20' : 'bg-white/95 border-gray-200 shadow-indigo-100'
        }`}>
          {/* Header icon and title */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-500/25 mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black mb-1.5 tracking-tight text-gray-900 dark:text-white">دخول الامتحان الخارجي</h1>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              أدخل كود الامتحان واسمك للبدء فوراً بدون الحاجة إلى إنشاء حساب أو بريد إلكتروني.
            </p>
          </div>

          {/* Exam state banner (NOT_STARTED / CLOSED) */}
          {renderStateBanner()}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Exam Access Code */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                كود دخول الامتحان <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                  <Key className="w-4 h-4 text-purple-500" />
                </span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    // Reset state when user changes the code
                    if (examState !== 'idle') { setExamState('idle'); setExamStateDate(null); }
                  }}
                  placeholder="مثال: 7TF4-WJ6J-ZGS6"
                  required
                  className={`w-full pr-10 pl-4 py-3 rounded-xl border text-sm outline-none transition-all font-mono font-bold tracking-wider text-center uppercase ${
                    isDark
                      ? 'bg-gray-800/80 border-gray-700 text-purple-300 placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      : 'bg-gray-50 border-gray-200 text-purple-700 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white'
                  }`}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Student Name */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                اسم الطالب الكامل <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </span>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل اسمك الثنائي أو الثلاثي"
                  required
                  className={`w-full pr-10 pl-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                    isDark
                      ? 'bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            {/* Phone Number (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  رقم الهاتف
                </label>
                <span className="text-[11px] text-gray-400 font-normal">اختياري</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 pointer-events-none">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className={`w-full pr-10 pl-4 py-3 rounded-xl border text-sm outline-none transition-all text-left font-mono ${
                    isDark
                      ? 'bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white'
                  }`}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Submit Button — state-driven */}
            <button
              type="submit"
              disabled={buttonConfig.disabled}
              className={`w-full mt-5 font-bold py-3.5 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm ${
                examState === 'NOT_STARTED'
                  ? 'bg-amber-500 text-white cursor-not-allowed'
                  : examState === 'CLOSED'
                  ? 'bg-gray-500 text-white cursor-not-allowed'
                  : 'bg-gradient-to-l from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white shadow-purple-600/25 hover:shadow-purple-600/35'
              }`}
            >
              {buttonConfig.icon}
              {buttonConfig.text}
            </button>
          </form>

          {/* Secure indicator */}
          <div className="mt-6 pt-5 border-t border-gray-200/50 dark:border-gray-800/60 flex items-center justify-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            اتصال آمن ومراقب إلكترونياً — لا يتطلب حساباً أو بريداً إلكترونياً
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-3 text-xs text-gray-400">
        منصة السادن التعليمية الذكية لمادة الرياضيات &copy; {new Date().getFullYear()} — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
