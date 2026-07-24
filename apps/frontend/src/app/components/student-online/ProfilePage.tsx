import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit2, Save } from 'lucide-react';
import { userApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: 'جاري التحميل...',
    email: '...',
    role: 'طالب'
  });

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        role: user.role === 'student_online' ? 'طالب أونلاين' :
              user.role === 'student_center' ? 'طالب سنتر' :
              user.role === 'teacher' ? 'معلم' :
              user.role === 'parent' ? 'ولي أمر' : 'طالب'
      }));
    }
    setLoading(false);
  }, [user]);

  const handleSave = async () => {
    try {
      // In a real app we'd PUT /users/:id here
      setEditing(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الملف الشخصي</h1>
        <p className="text-gray-600">عرض وتعديل معلوماتك الشخصية</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-16 h-16 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{formData.name}</h2>
          <p className="text-gray-600 mb-4">{formData.role}</p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">المعلومات الشخصية</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
              >
                <Edit2 className="w-5 h-5" />
                <span>تعديل</span>
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                <Save className="w-5 h-5" />
                <span>حفظ</span>
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم الكامل
              </label>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <span className="text-gray-900">{formData.name}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                {editing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <span className="text-gray-900">{formData.email}</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
