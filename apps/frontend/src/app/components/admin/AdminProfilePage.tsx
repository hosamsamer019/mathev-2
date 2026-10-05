import { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Activity, Save, Edit2, Key, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/user.service';
import { analyticsService } from '../../services/analytics.service';
import { LoadingState } from '../ui/LoadingState';

export default function AdminProfilePage() {
  const { user, checkAuth } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', email: user.email || '' });
    }
    
    analyticsService.getAdminAnalytics().then((res: any) => {
      setStats(res?.data || res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id, user?.name, user?.email]);


  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      await userService.updateProfile(user.id, formData);
      await checkAuth();
      setEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword) {
      setPasswordError('يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordError('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await userService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess(res.message || 'تم تغيير كلمة المرور بنجاح');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'حدث خطأ أثناء تغيير كلمة المرور';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return <LoadingState message="جاري تحميل الملف الشخصي..." />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Profile Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">الملف الشخصي للمسؤول</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-indigo-600 flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> تعديل
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">الاسم</label>
            {editing ? (
              <input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border p-2 rounded" 
              />
            ) : (
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <UserIcon className="w-5 h-5 text-gray-400" /> {user?.name}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">البريد الإلكتروني</label>
            {editing ? (
              <input 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full border p-2 rounded" 
              />
            ) : (
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Mail className="w-5 h-5 text-gray-400" /> {user?.email}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">معرف الحساب (Account ID)</label>
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 select-all cursor-text">
              <UserIcon className="w-5 h-5 text-gray-400" /> {user?.id}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex items-center gap-2 mb-6">
          <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">تغيير كلمة المرور</h2>
        </div>

        {passwordSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              كلمة المرور الحالية
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={e => {
                  setPasswordData({ ...passwordData, currentPassword: e.target.value });
                  setPasswordError('');
                }}
                disabled={passwordLoading}
                placeholder="أدخل كلمة المرور الحالية"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 rounded-lg pr-4 pl-10 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={e => {
                    setPasswordData({ ...passwordData, newPassword: e.target.value });
                    setPasswordError('');
                  }}
                  disabled={passwordLoading}
                  placeholder="6 أحرف على الأقل"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 rounded-lg pr-4 pl-10 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={e => {
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                    setPasswordError('');
                  }}
                  disabled={passwordLoading}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 rounded-lg pr-4 pl-10 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={passwordLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Key className="w-4 h-4" />
              {passwordLoading ? 'جاري تغيير كلمة المرور...' : 'تغيير كلمة المرور'}
            </button>
          </div>
        </form>
      </div>

      {/* Platform Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">إحصائيات المنصة السريعة</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center">
            <Activity className="w-8 h-8 text-indigo-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.overview?.totalUsers || 0}</div>
            <div className="text-sm text-gray-500">إجمالي المستخدمين</div>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center">
            <Activity className="w-8 h-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.overview?.totalCourses || 0}</div>
            <div className="text-sm text-gray-500">إجمالي الدورات</div>
          </div>
        </div>
      </div>
    </div>
  );
}
