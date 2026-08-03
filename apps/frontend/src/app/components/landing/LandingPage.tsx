import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, BookOpen, Video, ClipboardCheck, BarChart3, Users,
  Shield, Zap, Star, ChevronLeft, Check, Sparkles, Globe,
  TrendingUp, MessageSquare, Award, Play, ArrowLeft,
  GraduationCap, Target, Cpu, Lock
} from 'lucide-react';
import { motion } from 'motion/react';

const features = [
  {
    icon: Brain,
    title: 'ذكاء اصطناعي متقدم',
    description: 'حل المسائل الرياضية خطوة بخطوة مع شرح تفصيلي بالعربية',
    color: 'from-purple-500 to-indigo-600',
    bg: 'bg-purple-50',
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
    color: 'from-indigo-600 to-purple-600',
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
    color: 'from-purple-600 to-pink-600',
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

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">م</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-none">منصة معلم الرياضيات</h1>
              <p className="text-xs text-gray-500">Smart Math Platform</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">المميزات</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">الأسعار</a>
            <a href="#testimonials" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">آراء المستخدمين</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors px-4 py-2 rounded-lg hover:bg-indigo-50"
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm bg-gradient-to-l from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md"
            >
              ابدأ مجاناً
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 py-24 lg:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm mb-8 border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              منصة التعلم الرياضي الأذكى في المنطقة العربية
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              تعلّم الرياضيات
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-yellow-400 to-orange-400"> بذكاء حقيقي</span>
            </h1>
            <p className="text-xl text-indigo-200 mb-10 max-w-2xl mx-auto leading-relaxed">
              منصة ذكاء اصطناعي متكاملة تجمع بين التعليم الشخصي والتحليل المتقدم لضمان تفوق كل طالب
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 bg-gradient-to-l from-yellow-400 to-orange-400 text-gray-900 px-8 py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity shadow-xl w-full sm:w-auto"
              >
                <Play className="w-5 h-5" />
                ابدأ رحلة التعلم الآن
              </button>
              <button
                onClick={() => navigate('/admin/login')}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/30 px-8 py-4 rounded-2xl font-medium text-lg hover:bg-white/20 transition-colors w-full sm:w-auto"
              >
                <GraduationCap className="w-5 h-5" />
                دخول المعلم والمدير
              </button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
          >
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <stat.icon className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-indigo-200 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm mb-4">
              <Cpu className="w-4 h-4" />
              مميزات المنصة
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              كل ما تحتاجه لتفوق رياضي حقيقي
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              منظومة تعليمية متكاملة مدعومة بالذكاء الاصطناعي لضمان أفضل تجربة تعليمية
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 to-purple-700 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm mb-6">
                <Brain className="w-4 h-4" />
                الذكاء الاصطناعي
              </div>
              <h2 className="text-4xl font-bold text-white mb-6">
                مساعد ذكي لحل
                <br />
                أي مسألة رياضية
              </h2>
              <p className="text-indigo-200 text-lg mb-8 leading-relaxed">
                يوفر مساعدنا الذكي شرحاً تفصيلياً خطوة بخطوة لأي مسألة رياضية، مع تحديد مواضع الخطأ وتقديم تمارين مشابهة لتعزيز الفهم.
              </p>
              <div className="space-y-4">
                {[
                  'حل المعادلات الجبرية والتفاضلية',
                  'شرح المفاهيم الهندسية بالرسم التفاعلي',
                  'توليد تمارين بمستويات مختلفة',
                  'تذكر سياق المحادثة والتاريخ الدراسي',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-white">{item}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/login')}
                className="mt-10 flex items-center gap-2 bg-white text-indigo-700 px-7 py-3.5 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
              >
                جرب المساعد الآن
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            {/* AI Chat Preview */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-l from-indigo-600 to-purple-600 px-6 py-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">مساعد الرياضيات الذكي</p>
                  <p className="text-indigo-200 text-xs">متاح الآن ●</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4 max-w-xs">
                  <p className="text-gray-700 text-sm">كيف أحل المعادلة: 2x² + 5x - 3 = 0؟</p>
                </div>
                <div className="bg-indigo-50 rounded-2xl rounded-tr-none p-4 mr-auto max-w-sm">
                  <p className="text-indigo-900 text-sm font-medium mb-2">سأحل هذه المعادلة التربيعية خطوة بخطوة:</p>
                  <div className="space-y-2 text-sm text-indigo-800">
                    <p>📌 الخطوة ١: نحدد المعاملات</p>
                    <p className="bg-white rounded-lg px-3 py-2 font-mono">a=2, b=5, c=-3</p>
                    <p>📌 الخطوة ٢: نطبق قانون الحل</p>
                    <p className="bg-white rounded-lg px-3 py-2 font-mono">x = (-b ± √(b²-4ac)) / 2a</p>
                    <p>✅ الجواب: x = 0.5 أو x = -3</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-500 text-xs text-center">هل تريد تمارين مشابهة على المعادلات التربيعية؟</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm mb-4">
              <Zap className="w-4 h-4" />
              خطط الاشتراك
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">أسعار تناسب الجميع</h2>
            <p className="text-gray-600 text-lg mb-8">جرب مجاناً لمدة ١٤ يوماً بدون بطاقة ائتمان</p>
            <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActivePlan('monthly')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activePlan === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                شهري
              </button>
              <button
                onClick={() => setActivePlan('yearly')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activePlan === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                سنوي
                <span className="mr-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">وفر ٢٠٪</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className={`relative rounded-3xl p-8 border-2 transition-all ${
                  plan.popular
                    ? 'border-indigo-500 shadow-2xl shadow-indigo-100 scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-l from-indigo-600 to-purple-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">
                      ⭐ الأكثر شعبية
                    </span>
                  </div>
                )}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6`}>
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-6">{plan.description}</p>
                <div className="flex items-end gap-1 mb-8">
                  <span className="text-5xl font-bold text-gray-900">
                    {activePlan === 'yearly' ? Math.floor(parseInt(plan.price.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())) * 0.8).toString() : plan.price}
                  </span>
                  <span className="text-gray-500 mb-2">ج.م / {plan.period}</span>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all mb-8 ${
                    plan.popular
                      ? `bg-gradient-to-l ${plan.color} text-white hover:opacity-90 shadow-lg`
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  ابدأ مجاناً
                </button>
                <div className="space-y-3">
                  {plan.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-3 opacity-40">
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                      <span className="text-gray-500 text-sm line-through">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm mb-4">
              <Star className="w-4 h-4" />
              آراء المستخدمين
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">ماذا يقول مستخدمونا؟</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 text-sm">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-gray-500 text-xs">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm mb-8">
            <TrendingUp className="w-4 h-4" />
            ابدأ اليوم مجاناً
          </div>
          <h2 className="text-4xl font-bold text-white mb-6">
            انضم لأكثر من ٥٠٠٠ طالب يتفوقون بالرياضيات
          </h2>
          <p className="text-indigo-200 text-lg mb-10">
            ١٤ يوماً تجريبية مجانية، بدون بطاقة ائتمان، إلغاء في أي وقت
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-l from-yellow-400 to-orange-400 text-gray-900 px-10 py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity shadow-xl"
            >
              ابدأ رحلتك الآن
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              className="border-2 border-white/30 text-white px-10 py-4 rounded-2xl font-medium text-lg hover:bg-white/10 transition-colors"
            >
              دخول المدير / المعلم
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">م</span>
                </div>
                <span className="text-white font-bold">منصة معلم الرياضيات</span>
              </div>
              <p className="text-sm leading-relaxed">منصة ذكاء اصطناعي متكاملة لتعليم الرياضيات بأحدث التقنيات.</p>
            </div>
            {[
              { title: 'المنصة', links: ['المميزات', 'الأسعار', 'المحتوى', 'الذكاء الاصطناعي'] },
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
            <p className="text-sm">© ٢٠٢٦ منصة معلم الرياضيات. جميع الحقوق محفوظة.</p>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-400">منصة آمنة ومشفرة</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
