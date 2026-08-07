import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoading(true);
    setError('');
    
    const success = await login(formData.email, formData.password, 'ADMIN');
    if (success) {
      navigate('/admin/home');
    } else {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-accent-950 via-brand-accent-900 to-brand-900 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-accent-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-accent-500/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-accent-500 to-brand-accent-600 rounded-2xl mb-4 shadow-2xl">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">دخول الإدارة</h1>
          <p className="text-brand-accent-300 text-sm">منطقة محمية - للمدير العام فقط</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-brand-accent-200 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-brand-accent-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pr-10 pl-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-brand-accent-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                  placeholder="أدخل البريد الإلكتروني"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-accent-200 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-brand-accent-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pr-10 pl-10 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-brand-accent-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                  placeholder="أدخل كلمة المرور"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 -translate-y-1/2 left-3 text-brand-accent-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-l from-brand-accent-600 to-brand-accent-600 hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" /> دخول لوحة الإدارة
                </>
              )}
            </button>
          </form>

          <button
            onClick={() => navigate('/login')}
            className="w-full mt-4 flex items-center justify-center gap-2 text-brand-accent-300 hover:text-white text-sm transition-colors py-2"
          >
            <ArrowLeft className="w-4 h-4" /> العودة لصفحة الدخول الرئيسية
          </button>
        </div>

        <p className="text-center text-brand-accent-400 text-xs mt-6">
          🔒 اتصال مشفر ومؤمن • AL-SADEN
        </p>
      </motion.div>
    </div>
  );
}
