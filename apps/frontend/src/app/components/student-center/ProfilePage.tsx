import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Edit2, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    center: '',
    grade: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: (user as any).phoneNumber || '',
        city: (user as any).governorate || '',
        center: (user as any).institution || '',
        grade: user.grade || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      // API update logic here
      setEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الملف الشخصي</h1>
        <p className="text-gray-600">معلوماتك الشخصية</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{formData.name}</h2>
          <p className="text-gray-600">{formData.grade}</p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">المعلومات الشخصية</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-green-600 hover:text-green-800"
              >
                <Edit2 className="w-5 h-5" />
                <span>تعديل</span>
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Save className="w-5 h-5" />
                <span>حفظ</span>
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">الاسم</p>
                {editing ? (
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" />
                ) : (
                  <p className="text-gray-900 font-medium">{formData.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">البريد الإلكتروني</p>
                {editing ? (
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" />
                ) : (
                  <p className="text-gray-900 font-medium">{formData.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">رقم الهاتف</p>
                {editing ? (
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" />
                ) : (
                  <p className="text-gray-900 font-medium">{formData.phone}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">المدينة</p>
                {editing ? (
                  <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-3 py-2 border rounded-lg mt-1" />
                ) : (
                  <p className="text-gray-900 font-medium">{formData.city}</p>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">معلومات السنتر</h3>
              <div className="space-y-4">
                <p className="text-gray-600 flex items-center gap-2">
                  <span className="font-medium w-24">اسم السنتر:</span>
                  {editing ? (
                    <input type="text" value={formData.center} onChange={e => setFormData({...formData, center: e.target.value})} className="flex-1 px-3 py-2 border rounded-lg" />
                  ) : (
                    <span>{formData.center}</span>
                  )}
                </p>
                <p className="text-gray-600 flex items-center gap-2">
                  <span className="font-medium w-24">الصف الدراسي:</span>
                  {editing ? (
                    <input type="text" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} className="flex-1 px-3 py-2 border rounded-lg" />
                  ) : (
                    <span>{formData.grade}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
