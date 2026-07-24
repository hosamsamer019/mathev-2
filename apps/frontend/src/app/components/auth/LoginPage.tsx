import { useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Building2, GraduationCap, Users, ChevronLeft, Eye, EyeOff, Sparkles, Lock, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth, UserRole } from '../../contexts/AuthContext';

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
    role: 'student_online',
    label: 'طالب أونلاين',
    description: 'تعلم عن بُعد مع محتوى تفاعلي',
    icon: User,
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-blue-600',
    path: '/student/online/home',
  },
  {
    role: 'student_center',
    label: 'طالب السنتر',
    description: 'دروس السنتر مع الفيديوهات والواجبات',
    icon: Building2,
    color: 'text-green-600',
    gradient: 'from-green-500 to-emerald-600',
    path: '/student/center/lessons',
  },
  {
    role: 'teacher',
    label: 'معلم / أستاذ',
    description: 'إدارة الطلاب والمحتوى والتحليلات',
    icon: GraduationCap,
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-600',
    path: '/teacher/home',
  },
  {
    role: 'parent',
    label: 'ولي الأمر',
    description: 'متابعة أداء وتقدم أبنائك',
    icon: Users,
    color: 'text-cyan-600',
    gradient: 'from-cyan-500 to-blue-600',
    path: '/parent/home',
  },
  {
    role: 'admin',
    label: 'المدير العام',
    description: 'إدارة المنصة بالكامل والتقارير المالية',
    icon: Sparkles,
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-indigo-600',
    path: '/admin/dashboard',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<LoginStep>('role');
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role: RoleOption) => {
    setSelectedRole(role);
    setStep('form');
  };

  const getTestEmail = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'admin@edu.com';
      case 'teacher': return 'teacher@edu.com';
      case 'student_online': return 'student@edu.com';
      case 'student_center': return 'center@edu.com';
      case 'parent': return 'parent@edu.com';
      default: return `${role}@edu.com`;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);
    setError('');

    const loginEmail = formData.email || getTestEmail(selectedRole.role);
    const loginPassword = formData.password || '123456';

    await new Promise((r) => setTimeout(r, 800));
    const success = await login(loginEmail, loginPassword, selectedRole.role);
    
    if (success) {
      navigate(selectedRole.path);
    } else {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق من البيانات.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Decorations */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />

      {/* Back to Home Button */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 right-6 z-50 flex items-center gap-2 text-white hover:text-indigo-200 transition-colors bg-indigo-600/50 hover:bg-indigo-600 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg"
      >
        <ChevronLeft className="w-5 h-5 rotate-180" />
        <span className="font-medium">الرئيسية</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-2xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">منصة معلم الرياضيات</h1>
          <p className="text-indigo-300 text-sm">منصة التعلم الذكي المتكاملة</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {step === 'role' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-xl font-bold text-white text-center mb-2">أهلاً بك!</h2>
              <p className="text-indigo-200 text-sm text-center mb-6">اختر دورك للمتابعة</p>
              <div className="grid grid-cols-2 gap-3">
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
                      <p className="text-indigo-300 text-xs mt-0.5 leading-tight">{role.description}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              <div className="mt-6 text-center space-y-2">
                <button
                  onClick={() => navigate('/admin/login')}
                  className="block w-full text-indigo-300 hover:text-white text-sm transition-colors"
                >
                  تسجيل دخول المدير العام ←
                </button>
                <p className="text-xs text-indigo-400">
                  ليس لديك حساب؟ {' '}
                  <button className="text-white hover:underline">إنشاء حساب جديد</button>
                </p>
              </div>
            </motion.div>
          )}

          {step === 'form' && selectedRole && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <button
                onClick={() => { setStep('role'); setError(''); }}
                className="flex items-center gap-1 text-indigo-300 hover:text-white text-sm mb-6 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" /> رجوع
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedRole.gradient} flex items-center justify-center`}>
                  <selectedRole.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold">{selectedRole.label}</h2>
                  <p className="text-indigo-300 text-sm">أدخل بيانات الدخول</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-indigo-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pr-10 pl-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                      placeholder={getTestEmail(selectedRole.role)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-indigo-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pr-10 pl-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                      placeholder="أدخل كلمة المرور"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 -translate-y-1/2 left-3 text-indigo-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded accent-indigo-400" />
                    <span className="text-sm text-indigo-200">تذكرني</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-indigo-300 hover:text-white"
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

              <p className="text-center text-indigo-300 text-xs mt-4">
                يمكنك الدخول بأي بريد إلكتروني لتجربة المنصة
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-indigo-400 text-xs mt-6">
          منصة معلم الرياضيات © ٢٠٢٦ • آمنة ومشفرة
        </p>
      </motion.div>
    </div>
  );
}
