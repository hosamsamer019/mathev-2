import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { ACADEMIC_CONFIG } from '@shared/utils/dist/academicConfig';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '', country: 'EG', educationLevel: '', gradeLevel: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});
    setGlobalError('');

    try {
      await register({
        ...formData,
        role: 'ONLINE_STUDENT' // Default safe role
      });
      
      // Navigate to student home
      navigate('/student/online/home');

    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          if (e.path && e.path.length > 0) {
            errors[e.path[0]] = e.message;
          }
        });
        setValidationErrors(errors);
      } else {
        setGlobalError(err.response?.data?.message || 'حدث خطأ أثناء إنشاء الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-accent-900 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Decorations */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-accent-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl" />

      {/* Back to Home Button */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 right-6 z-50 flex items-center gap-2 text-white hover:text-brand-200 transition-colors bg-brand-600/50 hover:bg-brand-600 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg"
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-accent-600 rounded-2xl mb-4 shadow-2xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">إنشاء حساب جديد</h1>
          <p className="text-brand-300 text-sm">انضم الآن وابدأ رحلة التعلم</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-200 mb-2">
                الاسم الكامل
              </label>
              <div className="relative">
                <User className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-brand-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full pr-10 pl-4 py-3 bg-white/10 border ${validationErrors.name ? 'border-red-500' : 'border-white/20'} rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm`}
                  placeholder="أدخل اسمك الكامل"
                />
              </div>
              {validationErrors.name && <p className="text-red-400 text-xs mt-1">{validationErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-200 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-brand-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pr-10 pl-4 py-3 bg-white/10 border ${validationErrors.email ? 'border-red-500' : 'border-white/20'} rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm`}
                  placeholder="student@edu.com"
                />
              </div>
              {validationErrors.email && <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>}
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
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pr-10 pl-10 py-3 bg-white/10 border ${validationErrors.password ? 'border-red-500' : 'border-white/20'} rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm`}
                  placeholder="أدخل كلمة المرور (٦ أحرف على الأقل)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 left-3 text-brand-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {validationErrors.password && <p className="text-red-400 text-xs mt-1">{validationErrors.password}</p>}
            </div>

            {/* Academic Profile */}
            <div className="pt-4 border-t border-white/10 mt-4">
              <h3 className="text-md font-semibold text-white mb-3">المستوى الدراسي</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-1">البلد</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value, educationLevel: '', gradeLevel: ''})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                  >
                    {Object.entries(ACADEMIC_CONFIG).map(([key, config]) => (
                      <option key={key} value={key} className="text-black">{config.label}</option>
                    ))}
                  </select>
                </div>
                {formData.country && (
                  <div>
                    <label className="block text-sm font-medium text-brand-200 mb-1">المرحلة الدراسية</label>
                    <select
                      value={formData.educationLevel}
                      onChange={(e) => setFormData({...formData, educationLevel: e.target.value, gradeLevel: ''})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                    >
                      <option value="" className="text-black">اختر المرحلة</option>
                      {Object.entries((ACADEMIC_CONFIG as any)[formData.country].levels).map(([key, level]: [string, any]) => (
                        <option key={key} value={key} className="text-black">{level.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {formData.country && formData.educationLevel && (
                  <div>
                    <label className="block text-sm font-medium text-brand-200 mb-1">الصف الدراسي</label>
                    <select
                      value={formData.gradeLevel}
                      onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                    >
                      <option value="" className="text-black">اختر الصف</option>
                      {Object.entries((ACADEMIC_CONFIG as any)[formData.country].levels[formData.educationLevel].grades).map(([key, label]: [string, any]) => (
                        <option key={key} value={key} className="text-black">{label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {globalError && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-xl">
                {globalError}
              </div>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-l from-brand-500 to-blue-600 hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg mt-6`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري إنشاء الحساب...
                </>
              ) : (
                'إنشاء حساب جديد'
              )}
            </motion.button>
          </form>

          <p className="text-center text-sm text-brand-300 mt-6">
            لديك حساب بالفعل؟ {' '}
            <button onClick={() => navigate('/login')} className="text-white hover:underline font-medium">تسجيل الدخول</button>
          </p>
        </div>

        <p className="text-center text-brand-400 text-xs mt-6">
          AL-SADEN © ٢٠٢٦ • آمنة ومشفرة
        </p>
      </motion.div>
    </div>
  );
}
