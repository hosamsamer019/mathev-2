import { User, Mail, Phone, MapPin } from 'lucide-react';

export default function ProfilePage() {
  const profile = {
    name: 'محمد أحمد علي',
    email: 'mohamed.ahmed@example.com',
    phone: '01098765432',
    city: 'الجيزة',
    center: 'سنتر التميز التعليمي',
    grade: 'الصف الثاني الثانوي',
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
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile.name}</h2>
          <p className="text-gray-600">{profile.grade}</p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">المعلومات الشخصية</h2>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">الاسم</p>
                <p className="text-gray-900 font-medium">{profile.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">البريد الإلكتروني</p>
                <p className="text-gray-900 font-medium">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">رقم الهاتف</p>
                <p className="text-gray-900 font-medium">{profile.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">المدينة</p>
                <p className="text-gray-900 font-medium">{profile.city}</p>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">معلومات السنتر</h3>
              <div className="space-y-2">
                <p className="text-gray-600">
                  <span className="font-medium">اسم السنتر:</span> {profile.center}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">الصف الدراسي:</span> {profile.grade}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
