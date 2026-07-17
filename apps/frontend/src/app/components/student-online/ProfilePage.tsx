import { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit2, Save } from 'lucide-react';

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: 'أحمد محمد علي',
    email: 'ahmed.mohamed@example.com',
    phone: '01012345678',
    city: 'القاهرة',
    school: 'مدرسة النور الثانوية',
    grade: 'الصف الأول الثانوي',
    joinDate: '2026-01-15',
  });

  const handleSave = () => {
    setEditing(false);
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
          <p className="text-gray-600 mb-4">{formData.grade}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>انضم في {formData.joinDate}</span>
          </div>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف
              </label>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <span className="text-gray-900">{formData.phone}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المدينة
              </label>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                {editing ? (
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <span className="text-gray-900">{formData.city}</span>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">معلومات الدراسة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المدرسة
                  </label>
                  <span className="text-gray-900">{formData.school}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الصف الدراسي
                  </label>
                  <span className="text-gray-900">{formData.grade}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
