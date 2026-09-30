import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building2, GraduationCap, Users, ChevronLeft, Eye, EyeOff, Sparkles, Lock, Mail, ShieldCheck, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth, UserRole, getDefaultRouteForRole } from '../../contexts/AuthContext';

type LoginStep = 'role' | 'type' | 'form';

interface RoleOption {
  role: UserRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  path: string;
}

const roles: RoleOption[] = [
  {
    role: 'ONLINE_STUDENT',
    label: 'طالب أونلاين',
    description: 'تعلم عن بُعد مع محتوى تفاعلي',
    icon: User,
    color: 'text-brand-600',
    gradient: 'from-blue-500 to-brand-500',
    path: '/student/online/home',
  },
  {
    role: 'CENTER_STUDENT',
    label: 'طالب سنتر',
    description: 'دروس السنتر مع الفيديوهات والواجبات',
    icon: Building2,
    color: 'text-green-600',
    gradient: 'from-orange-500 to-rose-500',
    path: '/student/center/home',
  },
  {
    role: 'TEACHER',
    label: 'معلم',
    description: 'إدارة الطلاب والمحتوى والتحليلات',
    icon: Users,
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-500',
    path: '/teacher/home',
  },
  {
    role: 'PARENT',
    label: 'ولي أمر',
    description: 'متابعة أداء وتقدم أبنائك',
    icon: ShieldCheck,
    color: 'text-cyan-600',
    gradient: 'from-brand-accent-500 to-pink-500',
    path: '/parent/home',
  },
  {
    role: 'ADMIN',
    label: 'إدارة',
    description: 'إدارة المنصة بالكامل والتقارير المالية',
    icon: KeyRound,
    color: 'text-brand-accent-600',
    gradient: 'from-slate-700 to-slate-900',
    path: '/admin/home',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();
  const [step, setStep] = useState<LoginStep>('role');
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, redirect to role's dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleRoleSelect = (role: RoleOption) => {
    setSelectedRole(role);
    setStep('form');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    
    if (!formData.email || !formData.password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoading(true);
    setError('');

    const success = await login(formData.email, formData.password, selectedRole.role);
    
    if (success) {
      navigate(getDefaultRouteForRole(selectedRole.role));
    } else {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق من البيانات.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-accent-900 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Decorations */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-accent-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl" />

      {/* Back to Home Button */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-4 start-4 sm:top-6 sm:start-6 z-50 flex items-center gap-1.5 text-white hover:text-brand-200 transition-colors bg-brand-600/50 hover:bg-brand-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl backdrop-blur-md shadow-lg text-xs sm:text-sm"
      >
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span className="font-medium">الرئيسية</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative mt-10 sm:mt-0"
      >
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-brand-500 to-brand-accent-600 rounded-2xl mb-3 sm:mb-4 shadow-2xl">
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">AL-SADEN</h1>
          <p className="text-brand-300 text-xs sm:text-sm">منصة التعلم الذكي المتكاملة</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl border border-white/20">
          {step === 'role' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-lg sm:text-xl font-bold text-white text-center mb-1 sm:mb-2">أهلاً بك!</h2>
              <p className="text-brand-200 text-xs sm:text-sm text-center mb-5 sm:mb-6">اختر دورك للمتابعة</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roles.map((role) => (
                  <motion.button
                    key={role.role}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect(role)}
                    className="flex flex-col items-center gap-3 p-5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-2xl transition-all text-center group"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <role.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{role.label}</p>
                      <p className="text-brand-300 text-xs mt-0.5 leading-tight">{role.description}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              <div className="mt-6 text-center space-y-2">
                <button
                  onClick={() => navigate('/admin/login')}
                  className="block w-full text-brand-300 hover:text-white text-sm transition-colors"
                >
                  تسجيل دخول المدير العام ←
                </button>
              </div>
            </motion.div>
          )}

          {step === 'form' && selectedRole && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <button
                onClick={() => { setStep('role'); setError(''); }}
                className="flex items-center gap-1 text-brand-300 hover:text-white text-sm mb-6 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" /> رجوع
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedRole.gradient} flex items-center justify-center`}>
                  <selectedRole.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold">{selectedRole.label}</h2>
                  <p className="text-brand-300 text-sm">أدخل بيانات الدخول</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-2">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-brand-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                      placeholder="أدخل البريد الإلكتروني"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-2">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-brand-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pr-10 pl-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                      placeholder="أدخل كلمة المرور"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 -translate-y-1/2 left-3 text-brand-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded accent-brand-400" />
                    <span className="text-sm text-brand-200">تذكرني</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-brand-300 hover:text-white"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-l ${selectedRole.gradient} hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </motion.button>
              </form>

              <p className="text-center text-brand-300 text-xs mt-4">
                يمكنك الدخول بأي بريد إلكتروني لتجربة المنصة
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-brand-400 text-xs mt-6">
          AL-SADEN © ٢٠٢٦ • آمنة ومشفرة
        </p>
      </motion.div>
    </div>
  );
}
