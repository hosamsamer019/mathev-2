import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import { authApi } from '../../services/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.post('/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء إرسال الرابط. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-full mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">نسيت كلمة المرور</h1>
            <p className="text-gray-600">أدخل بريدك الإلكتروني لاستعادة كلمة المرور</p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-70 flex justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'إرسال رابط الاستعادة'
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 py-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لتسجيل الدخول</span>
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">تم الإرسال بنجاح!</h3>
              <p className="text-gray-600">
                إذا كان البريد الإلكتروني مسجلاً لدينا، ستتلقى رابطاً لإعادة تعيين كلمة المرور قريباً.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 transition-colors font-medium mt-6"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
