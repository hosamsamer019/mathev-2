import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, BookOpen, Video, ClipboardCheck, BarChart3, Users,
  Shield, Zap, Star, ChevronLeft, Check, Sparkles, Globe,
  TrendingUp, MessageSquare, Award, Play, ArrowLeft,
  GraduationCap, Target, Cpu, Lock, HelpCircle, ChevronDown, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ScrollToTopButton from '../ui/ScrollToTopButton';

const features = [
  {
    icon: Brain,
    title: 'ذكاء اصطناعي متقدم',
    description: 'حل المسائل الرياضية خطوة بخطوة مع شرح تفصيلي بالعربية',
    color: 'from-brand-accent-500 to-brand-600',
    bg: 'bg-brand-accent-50',
  },
  {
    icon: Target,
    title: 'مسارات تعلم تكيفية',
    description: 'خطط دراسية مخصصة بناءً على مستوى الطالب وأدائه',
    color: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Video,
    title: 'فيديوهات تعليمية HD',
    description: 'محتوى مرئي عالي الجودة مع تتبع التقدم والمتابعة',
    color: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
  },
  {
    icon: ClipboardCheck,
    title: 'امتحانات ذكية',
    description: 'بنك أسئلة عشوائي مع تصحيح فوري وتحليل شامل للنتائج',
    color: 'from-orange-500 to-red-600',
    bg: 'bg-orange-50',
  },
  {
    icon: BarChart3,
    title: 'تحليلات متقدمة',
    description: 'توقع أداء الطلاب واكتشاف حالات الخطر مبكراً',
    color: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-50',
  },
  {
    icon: Shield,
    title: 'أمان مؤسسي',
    description: 'تشفير كامل، مصادقة متعددة العوامل، وحماية البيانات',
    color: 'from-slate-500 to-gray-600',
    bg: 'bg-slate-50',
  },
];

const aboutItems = [
  {
    icon: GraduationCap,
    title: 'للطلاب',
    description: 'شروحات فيديو تفاعلية، مساعد ذكي لحل المسائل خطوة بخطوة، بنك أسئلة شامل، وامتحانات إلكترونية مع تصحيح فوري.',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
  },
  {
    icon: Users,
    title: 'للمعلمين والمراكز',
    description: 'إدارة متكاملة للدروس والواجبات، توليد أسئلة الاختبارات بمساعدة الذكاء الاصطناعي، وتحليلات دقيقة لمستوى استيعاب الطلاب.',
    color: 'from-purple-500 to-pink-600',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
  },
  {
    icon: Target,
    title: 'لأولياء الأمور',
    description: 'متابعة شاملة ومستمرة لالتزام الطالب الدراسي، درجات الاختبارات، ونقاط القوة والضعف لضمان أفضل تفوق أكاديمي.',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
];

const faqItems = [
  {
    q: 'ما هي منصة AL-SADEN؟',
    a: 'AL-SADEN هي منصة تعليمية ذكية متخصصة في تدريس الرياضيات للطلاب والمعلمين والمراكز التعليمية، تجمع بين الشروحات التفاعلية، الاختبارات الإلكترونية، وأدوات الذكاء الاصطناعي لحل المسائل ومتابعة التقدم الأكاديمي.',
  },
  {
    q: 'لمن صُممت منصة AL-SADEN؟',
    a: 'صُممت المنصة لخدمة طلاب المراحل الإعدادية والثانوية العامة، ومعلمي الرياضيات، وأولياء الأمور والمراكز التعليمية، حيث توفر لكل مستخدم واجهة ولوحة تحكم متخصصة لاحتياجاته.',
  },
  {
    q: 'ماذا تقدم المنصة للطالب؟',
    a: 'توفر المنصة شروحات فيديو تفاعلية بجودة عالية، امتحانات إلكترونية مع تصحيح فوري، مساعد ذكي لشرح خطوات حل المسائل الرياضية، وبنك أسئلة شامل مع تقارير أداء دورية.',
  },
  {
    q: 'هل توفر المنصة ميزة حل المسائل بالذكاء الاصطناعي؟',
    a: 'نعم، تتيح المنصة مساعداً رياضياً ذكياً يساعد الطالب في فهم وتفكيك خطوات حل المسائل الجبرية والهندسية خطوة بخطوة مع توضيح القوانين الرياضية باللغة العربية.',
  },
  {
    q: 'كيف تعمل ميزة دخول الامتحان بكود؟',
    a: 'يمكن للطلاب دخول الامتحانات المحددة مباشرة دون الحاجة لحساب معقد، وذلك من خلال صفحة "دخول امتحان بكود" وإدخال كود الامتحان المخصص الصادر من المعلم.',
  },
  {
    q: 'كيف تساعد المنصة المعلمين وأولياء الأمور؟',
    a: 'تمكن المنصة المعلم من رفع وإدارة المحتوى، توليد أسئلة الاختبارات بمساعدة الذكاء الاصطناعي، ومتابعة تحليلات تفصيلية لمستوى كل طالب، بينما تتيح لولي الأمر متابعة دقيقة ومستمرة لالتزام الطالب ودرجاته.',
  },
];

const stats = [
  { value: '٥٠٠٠+', label: 'طالب مسجل', icon: Users },
  { value: '٩٨٪', label: 'معدل رضا المستخدمين', icon: Star },
  { value: '٣٢٠+', label: 'درس ومحتوى', icon: BookOpen },
  { value: '٤.٩/٥', label: 'تقييم المنصة', icon: Award },
];

const plans = [
  {
    name: 'الأساسي',
    nameEn: 'basic',
    price: '٤٩',
    period: 'شهرياً',
    description: 'مثالي للطلاب المبتدئين',
    color: 'from-gray-600 to-gray-700',
    features: [
      'الوصول إلى ٥٠ فيديو',
      'امتحانات أساسية',
      'واجبات شهرية',
      'دعم عبر البريد',
      'تقارير بسيطة',
    ],
    notIncluded: ['الذكاء الاصطناعي', 'مسارات تكيفية', 'تحليلات متقدمة'],
    popular: false,
  },
  {
    name: 'الاحترافي',
    nameEn: 'pro',
    price: '٩٩',
    period: 'شهرياً',
    description: 'الأكثر شيوعاً للطلاب الجادين',
    color: 'from-brand-600 to-brand-accent-600',
    features: [
      'وصول غير محدود للمحتوى',
      'ذكاء اصطناعي لحل المسائل',
      'مسارات تعلم مخصصة',
      'امتحانات متقدمة',
      'تحليلات تفصيلية',
      'دعم ٢٤/٧',
      'شهادات إتمام',
    ],
    notIncluded: [],
    popular: true,
  },
  {
    name: 'المؤسسي',
    nameEn: 'enterprise',
    price: '٢٩٩',
    period: 'شهرياً',
    description: 'للمدارس والمؤسسات التعليمية',
    color: 'from-brand-accent-600 to-pink-600',
    features: [
      'كل مميزات الاحترافي',
      'إدارة متعددة المعلمين',
      'لوحة ولي الأمر',
      'تحليلات المخاطر بالذكاء الاصطناعي',
      'API مخصص',
      'مدير حساب مخصص',
      'تخصيص كامل للعلامة التجارية',
    ],
    notIncluded: [],
    popular: false,
  },
];

const testimonials = [
  {
    name: 'أ. محمد إبراهيم',
    role: 'معلم رياضيات - القاهرة',
    text: 'المنصة غيرت طريقة تدريسي بالكامل. الذكاء الاصطناعي يساعد طلابي على فهم المسائل المعقدة بشكل لم أتخيله.',
    rating: 5,
    avatar: 'م',
  },
  {
    name: 'أحمد محمد',
    role: 'طالب ثانوي - الجيزة',
    text: 'المساعد الذكي كأن معي مدرس خاص ٢٤ ساعة. درجاتي ارتفعت من ٦٠٪ إلى ٩٢٪ في شهرين فقط!',
    rating: 5,
    avatar: 'أ',
  },
  {
    name: 'سارة خالد',
    role: 'طالبة جامعية - الإسكندرية',
    text: 'مسارات التعلم التكيفية رائعة - كل يوم تقترح عليّ بالضبط ما أحتاج أن أراجعه. منصة استثنائية!',
    rating: 5,
    avatar: 'س',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activePlan, setActivePlan] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(prev => prev === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100" dir="rtl">
      {/* Header & Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between" aria-label="التنقل الرئيسي">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/logo.jpeg" alt="AL-SADEN Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain bg-white flex-shrink-0" />
            <div>
              <span className="font-bold text-gray-900 dark:text-white leading-none text-sm sm:text-lg block">AL-SADEN</span>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">AL-SADEN</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">المميزات</a>
            <a href="#about" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">عن المنصة</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">الأسعار</a>
            <a href="#faq" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">الأسئلة الشائعة</a>
            <a href="#testimonials" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">آراء المستخدمين</a>
          </div>

          {/* Action Buttons (Desktop & Mobile) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/external-exam')}
              className="text-xs sm:text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-700 font-medium px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">دخول امتحان بكود</span>
              <span className="sm:hidden">امتحان بكود</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-xs sm:text-sm bg-gradient-to-l from-brand-600 to-brand-accent-600 text-white px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-sm cursor-pointer whitespace-nowrap"
            >
              ابدأ الآن
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-accent-900 py-16 sm:py-24 lg:py-32">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-accent-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm mb-6 sm:mb-8 border border-white/20 max-w-full">
                <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="truncate">منصة التعلم الرياضي الأذكى في المنطقة العربية</span>
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                تعلّم الرياضيات
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-yellow-400 to-orange-400"> بذكاء حقيقي</span>
              </h1>
              <p className="text-base sm:text-xl text-brand-200 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
                منصة ذكاء اصطناعي متكاملة تجمع بين التعليم الشخصي والتحليل المتقدم لضمان تفوق كل طالب
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto">
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center justify-center gap-2 bg-gradient-to-l from-yellow-400 to-orange-400 text-gray-900 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg hover:opacity-90 transition-opacity shadow-xl w-full sm:w-auto cursor-pointer"
                >
                  <Play className="w-5 h-5 flex-shrink-0" />
                  ابدأ رحلة التعلم الآن
                </button>
                <button
                  onClick={() => navigate('/admin/login')}
                  className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/30 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-medium text-base sm:text-lg hover:bg-white/20 transition-colors w-full sm:w-auto cursor-pointer"
                >
                  <GraduationCap className="w-5 h-5 flex-shrink-0" />
                  دخول المعلم والمدير
                </button>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mt-12 sm:mt-20"
            >
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20">
                  <stat.icon className="w-6 h-6 sm:w-8 h-8 text-yellow-400 mx-auto mb-2 sm:mb-3" />
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-brand-200 text-xs sm:text-sm mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-4 py-2 rounded-full text-sm mb-4">
                <Cpu className="w-4 h-4" />
                مميزات المنصة
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                كل ما تحتاجه لتفوق رياضي حقيقي
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
                منظومة تعليمية متكاملة مدعومة بالذكاء الاصطناعي لضمان أفضل تجربة تعليمية
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all group"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 sm:py-24 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full text-sm mb-4">
                <Info className="w-4 h-4" />
                عن المنصة
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                منظومة AL-SADEN التعليمية المتكاملة
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
                منصة السادن التعليمية الذكية صُممت لتقديم تجربة رائدة في تعلم الرياضيات والمتابعة الأكاديمية، عبر الجمع بين المحتوى المرئي عالي الجودة، بنك الأسئلة الشامل، وأحدث أدوات التحليل الذكي لمتابعة وتطوير كل طالب.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {aboutItems.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-200/80 dark:border-gray-800 hover:border-brand-500/50 transition-all shadow-sm"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Section */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-brand-600 to-brand-accent-700 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm mb-6">
                  <Brain className="w-4 h-4" />
                  الذكاء الاصطناعي
                </div>
                <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                  مساعد ذكي لحل
                  <br />
                  أي مسألة رياضية
                </h2>
                <p className="text-brand-200 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                  يوفر مساعدنا الذكي شرحاً تفصيلياً خطوة بخطوة لأي مسألة رياضية، مع تحديد مواضع الخطأ وتقديم تمارين مشابهة لتعزيز الفهم.
                </p>
                <div className="space-y-3 sm:space-y-4">
                  {[
                    'حل المعادلات الجبرية والتفاضلية',
                    'شرح المفاهيم الهندسية بالرسم التفاعلي',
                    'توليد تمارين بمستويات مختلفة',
                    'تذكر سياق المحادثة والتاريخ الدراسي',
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      </div>
                      <p className="text-white text-sm sm:text-base">{item}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-8 sm:mt-10 flex items-center justify-center gap-2 bg-white text-brand-700 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl font-bold hover:bg-brand-50 transition-colors w-full sm:w-auto cursor-pointer"
                >
                  جرب المساعد الآن
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

              {/* AI Chat Preview */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 w-full">
                <div className="bg-gradient-to-l from-brand-600 to-brand-accent-600 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">مساعد الرياضيات الذكي</p>
                    <p className="text-brand-200 text-xs">متاح الآن ●</p>
                  </div>
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none p-3.5 sm:p-4 max-w-full sm:max-w-xs">
                    <p className="text-gray-700 dark:text-gray-200 text-sm">كيف أحل المعادلة: 2x² + 5x - 3 = 0؟</p>
                  </div>
                  <div className="bg-brand-50 dark:bg-brand-950/50 rounded-2xl rounded-tr-none p-3.5 sm:p-4 mr-auto max-w-full sm:max-w-sm">
                    <p className="text-brand-900 dark:text-brand-200 text-sm font-medium mb-2">سأحل هذه المعادلة التربيعية خطوة بخطوة:</p>
                    <div className="space-y-2 text-sm text-brand-800 dark:text-brand-300">
                      <p>📌 الخطوة ١: نحدد المعاملات</p>
                      <p className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 font-mono text-gray-900 dark:text-white break-all">a=2, b=5, c=-3</p>
                      <p>📌 الخطوة ٢: نطبق قانون الحل</p>
                      <p className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 font-mono text-gray-900 dark:text-white break-all">x = (-b ± √(b²-4ac)) / 2a</p>
                      <p>✅ الجواب: x = 0.5 أو x = -3</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs text-center">هل تريد تمارين مشابهة على المعادلات التربيعية؟</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 sm:py-24 bg-white dark:bg-gray-950 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm mb-4">
                <Zap className="w-4 h-4" />
                خطط الاشتراك
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">أسعار تناسب الجميع</h2>
              <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg mb-6 sm:mb-8">جرب مجاناً لمدة ١٤ يوماً بدون بطاقة ائتمان</p>
              <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => setActivePlan('monthly')}
                  className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activePlan === 'monthly' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  شهري
                </button>
                <button
                  onClick={() => setActivePlan('yearly')}
                  className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activePlan === 'yearly' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  سنوي
                  <span className="mr-2 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">وفر ٢٠٪</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {plans.map((plan, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className={`relative rounded-3xl p-6 sm:p-8 border-2 transition-all bg-white dark:bg-gray-900 ${
                    plan.popular
                      ? 'border-brand-500 shadow-2xl shadow-brand-100 dark:shadow-none lg:scale-105'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-l from-brand-600 to-brand-accent-600 text-white px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg whitespace-nowrap">
                        ⭐ الأكثر شعبية
                      </span>
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6`}>
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{plan.description}</p>
                  <div className="flex items-end gap-1 mb-6 sm:mb-8">
                    <span className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
                      {activePlan === 'yearly' ? Math.floor(parseInt(plan.price.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())) * 0.8).toString() : plan.price}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 mb-2 text-sm">ج.م / {plan.period}</span>
                  </div>
                  <button
                    onClick={() => navigate('/login')}
                    className={`w-full py-3 sm:py-3.5 rounded-2xl font-bold text-sm transition-all mb-6 sm:mb-8 cursor-pointer ${
                      plan.popular
                        ? `bg-gradient-to-l ${plan.color} text-white hover:opacity-90 shadow-lg`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    ابدأ مجاناً
                  </button>
                  <div className="space-y-3">
                    {plan.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-3">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-3 opacity-40">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full flex-shrink-0" />
                        <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm line-through">{feature}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900 transition-colors">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-full text-sm mb-4">
                <HelpCircle className="w-4 h-4" />
                الأسئلة الشائعة
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                إجابات على أهم تساؤلاتك حول AL-SADEN
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
                كل ما تود معرفته عن خدمات المنصة، نظام الامتحانات، والمساعد الذكي
              </p>
            </div>

            <div className="space-y-4">
              {faqItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-right px-6 py-5 flex items-center justify-between gap-4 font-bold text-base sm:text-lg text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
                    aria-expanded={openFaqIndex === idx}
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                        openFaqIndex === idx ? 'transform rotate-180 text-brand-600' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaqIndex === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-5 pt-1 text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed border-t border-gray-100 dark:border-gray-700/60">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-16 sm:py-24 bg-white dark:bg-gray-950 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 px-4 py-2 rounded-full text-sm mb-4">
                <Star className="w-4 h-4" />
                آراء المستخدمين
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">ماذا يقول مستخدمونا؟</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {testimonials.map((testimonial, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-center gap-1 mb-4 sm:mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-xs sm:text-sm">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-accent-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">{testimonial.name}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{testimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-brand-900 to-brand-accent-900">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm mb-6 sm:mb-8">
              <TrendingUp className="w-4 h-4" />
              ابدأ اليوم مجاناً
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              انضم لأكثر من ٥٠٠٠ طالب يتفوقون بالرياضيات
            </h2>
            <p className="text-brand-200 text-base sm:text-lg mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed">
              ١٤ يوماً تجريبية مجانية، بدون بطاقة ائتمان، إلغاء في أي وقت
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full max-w-md sm:max-w-none mx-auto">
              <button
                onClick={() => navigate('/login')}
                className="bg-gradient-to-l from-yellow-400 to-orange-400 text-gray-900 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg hover:opacity-90 transition-opacity shadow-xl w-full sm:w-auto cursor-pointer"
              >
                ابدأ رحلتك الآن
              </button>
              <button
                onClick={() => navigate('/admin/login')}
                className="border-2 border-white/30 text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-medium text-base sm:text-lg hover:bg-white/10 transition-colors w-full sm:w-auto cursor-pointer"
              >
                دخول المدير / المعلم
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.jpeg" alt="AL-SADEN Logo" className="w-10 h-10 rounded-xl object-contain bg-white flex-shrink-0" />
                <span className="text-white font-bold text-lg">AL-SADEN</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-400">منصة ذكاء اصطناعي متكاملة لتعليم الرياضيات بأحدث التقنيات.</p>
            </div>
            {[
              { title: 'المنصة', links: ['المميزات', 'عن المنصة', 'الأسعار', 'الذكاء الاصطناعي'] },
              { title: 'الدعم', links: ['مركز المساعدة', 'تواصل معنا', 'الأسئلة الشائعة', 'التدريب'] },
              { title: 'الشركة', links: ['عن المنصة', 'الفريق', 'المدونة', 'الشراكات'] },
            ].map((col, idx) => (
              <div key={idx}>
                <h4 className="text-white font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <a href="#" className="text-sm hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-400 leading-relaxed">
                © AL-SADEN — منصة وبرمجية مملوكة بالكامل لـ{' '}
                <a
                  href="https://ox-digital-eg.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:text-brand-300 font-medium transition-colors underline underline-offset-4 inline-block"
                >
                  OX Digital
                </a>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Lock className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-green-400">منصة آمنة ومشفرة</span>
            </div>
          </div>
        </div>
      </footer>
      <ScrollToTopButton />
    </div>
  );
}

