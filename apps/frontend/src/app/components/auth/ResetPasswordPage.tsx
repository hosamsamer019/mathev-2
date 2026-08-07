import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Check } from 'lucide-react';
import { authApi } from '../../services/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [reset, setReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (!token) {
      setError('رابط غير صالح أو منتهي الصلاحية.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authApi.post('/reset-password', { token, password: formData.password });
      setReset(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء تغيير كلمة المرور. قد يكون الرابط منتهي الصلاحية.');
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
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">إعادة تعيين كلمة المرور</h1>
            <p className="text-gray-600">أدخل كلمة المرور الجديدة</p>
          </div>

          {!reset ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="أدخل كلمة المرور الجديدة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="أعد إدخال كلمة المرور"
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
                  'تأكيد'
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">تم تغيير كلمة المرور!</h3>
              <p className="text-gray-600">
                تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 transition-colors font-medium mt-6"
              >
                تسجيل الدخول
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
