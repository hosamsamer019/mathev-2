import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Edit, Save, Camera, Award, Star, BookOpen, Users } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

export default function TeacherProfilePage() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    bio: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: (user as any).phoneNumber || '',
        city: (user as any).governorate || '',
        bio: '' // Can be loaded from user if exists
      });
    }
  }, [user]);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-emerald-500`;

  const achievements = [
    { icon: Users, label: '١٢٠ طالب نشط', color: 'text-blue-600 bg-blue-100' },
    { icon: Star, label: '٤.٩ تقييم متوسط', color: 'text-yellow-600 bg-yellow-100' },
    { icon: BookOpen, label: '٤ دورات منشورة', color: 'text-green-600 bg-green-100' },
    { icon: Award, label: 'أفضل معلم ٢٠٢٦', color: 'text-purple-600 bg-purple-100' },
  ];

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="max-w-3xl mx-auto">
        {/* Profile Header */}
        <div className={`${cardBg} border rounded-3xl p-8 mb-6 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10" />
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                م
              </div>
              <button className="absolute -bottom-2 -left-2 w-8 h-8 bg-white dark:bg-gray-700 rounded-lg shadow border border-gray-200 dark:border-gray-600 flex items-center justify-center text-emerald-600">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 text-center md:text-right">
              <h1 className={`text-2xl font-bold ${textPrimary}`}>{formData.name}</h1>
              <p className={textSecondary}>{formData.bio}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
                <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">⭐ خطة مؤسسية</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">✅ حساب موثق</span>
                <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full">🏆 معلم متميز</span>
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                editing ? 'bg-emerald-600 text-white' : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {editing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {editing ? 'حفظ' : 'تعديل'}
            </button>
          </div>
        </div>

        {/* Achievements */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {achievements.map((ach, idx) => (
            <div key={idx} className={`${cardBg} border rounded-xl p-4 text-center`}>
              <div className={`w-10 h-10 rounded-xl ${ach.color} flex items-center justify-center mx-auto mb-2`}>
                <ach.icon className="w-5 h-5" />
              </div>
              <p className={`text-sm font-medium ${textPrimary}`}>{ach.label}</p>
            </div>
          ))}
        </div>

        {/* Info Form */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>المعلومات الشخصية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`text-sm font-medium ${textSecondary} block mb-2`}>الاسم الكامل</label>
              <div className="relative">
                <User className={`absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 ${textSecondary}`} />
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={!editing} className={`${inputClass} pr-10 ${!editing ? 'cursor-default' : ''}`} />
              </div>
            </div>
            <div>
              <label className={`text-sm font-medium ${textSecondary} block mb-2`}>البريد الإلكتروني</label>
              <div className="relative">
                <Mail className={`absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 ${textSecondary}`} />
                <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} readOnly={!editing} className={`${inputClass} pr-10 ${!editing ? 'cursor-default' : ''}`} />
              </div>
            </div>
            <div>
              <label className={`text-sm font-medium ${textSecondary} block mb-2`}>رقم الهاتف</label>
              <div className="relative">
                <Phone className={`absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 ${textSecondary}`} />
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} readOnly={!editing} className={`${inputClass} pr-10 ${!editing ? 'cursor-default' : ''}`} />
              </div>
            </div>
            <div>
              <label className={`text-sm font-medium ${textSecondary} block mb-2`}>المدينة</label>
              <div className="relative">
                <MapPin className={`absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 ${textSecondary}`} />
                <input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} readOnly={!editing} className={`${inputClass} pr-10 ${!editing ? 'cursor-default' : ''}`} />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className={`text-sm font-medium ${textSecondary} block mb-2`}>نبذة شخصية</label>
            <textarea
              readOnly={!editing}
              value={formData.bio}
              onChange={e => setFormData({...formData, bio: e.target.value})}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
