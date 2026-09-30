import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function PermissionDeniedPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-center">
        <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 dark:bg-red-950/40 mb-4">
          <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
        
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
          عذراً، غير مصرح لك
        </h2>
        
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة. يرجى العودة أو تسجيل الدخول بحساب مختلف.
        </p>

        <div className="mt-8 space-y-4">
          <button
            onClick={handleGoBack}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            العودة للصفحة السابقة
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
