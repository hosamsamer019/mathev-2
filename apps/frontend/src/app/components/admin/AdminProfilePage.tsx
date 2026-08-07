import { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Activity, Save, Edit2 } from 'lucide-react';
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

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', email: user.email || '' });
    }
    
    analyticsService.getAdminAnalytics().then((res: any) => {
      setStats(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

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

  if (loading) return <LoadingState message="جاري تحميل الملف الشخصي..." />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">إحصائيات المنصة السريعة</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg flex flex-col items-center justify-center">
            <Activity className="w-8 h-8 text-indigo-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.overview?.totalUsers || 0}</div>
            <div className="text-sm text-gray-500">إجمالي المستخدمين</div>
          </div>
          <div className="p-4 border rounded-lg flex flex-col items-center justify-center">
            <Activity className="w-8 h-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.overview?.totalCourses || 0}</div>
            <div className="text-sm text-gray-500">إجمالي الدورات</div>
          </div>
        </div>
      </div>
    </div>
  );
}
