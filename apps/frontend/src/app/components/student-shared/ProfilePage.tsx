import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit2, Save } from 'lucide-react';
import { userService } from '../../services/user.service';
import { useAuth } from '../../contexts/AuthContext';
const ACADEMIC_CONFIG = {
  EG: {
    label: 'مصر',
    levels: {
      PRIMARY: {
        label: 'ابتدائي',
        grades: {
          PRIMARY_1: 'الصف الأول الابتدائي',
          PRIMARY_2: 'الصف الثاني الابتدائي',
          PRIMARY_3: 'الصف الثالث الابتدائي',
          PRIMARY_4: 'الصف الرابع الابتدائي',
          PRIMARY_5: 'الصف الخامس الابتدائي',
          PRIMARY_6: 'الصف السادس الابتدائي'
        }
      },
      PREPARATORY: {
        label: 'إعدادي',
        grades: {
          PREPARATORY_1: 'الصف الأول الإعدادي',
          PREPARATORY_2: 'الصف الثاني الإعدادي',
          PREPARATORY_3: 'الصف الثالث الإعدادي'
        }
      },
      SECONDARY: {
        label: 'ثانوي',
        grades: {
          SECONDARY_1: 'الصف الأول الثانوي',
          SECONDARY_2: 'الصف الثاني الثانوي',
          SECONDARY_3: 'الصف الثالث الثانوي'
        }
      }
    }
  }
} as const;

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    center: '',
    country: '',
    educationLevel: '',
    gradeLevel: ''
  });

  const { user, checkAuth } = useAuth();

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        password: '', // Don't prefill password
        role: user.role === 'ONLINE_STUDENT' ? 'طالب أونلاين' :
              user.role === 'CENTER_STUDENT' ? 'طالب سنتر' :
              user.role === 'TEACHER' ? 'معلم' :
              user.role === 'PARENT' ? 'ولي أمر' : 'طالب',
        center: (user as any).centerGroup?.name || 'غير محدد',
        country: (user as any).country || 'EG',
        educationLevel: (user as any).educationLevel || '',
        gradeLevel: (user as any).gradeLevel || ''
      }));
    }
    setLoading(false);
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    try {
      setIsSaving(true);
      setValidationErrors({});
      
      const payload: any = { 
        name: formData.name, 
        email: formData.email
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      
      await userService.updateProfile(user.id, payload);
      await checkAuth(); // Refresh user data in AuthContext
      
      setToast({ message: 'تم تحديث الملف الشخصي بنجاح', type: 'success' });
      setEditing(false);
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          if (e.path && e.path.length > 0) {
            errors[e.path[0]] = e.message;
          }
        });
        setValidationErrors(errors);
        setToast({ message: 'يرجى مراجعة الحقول المطلوبة', type: 'error' });
      } else {
        setToast({ message: err.response?.data?.message || 'حدث خطأ أثناء التحديث', type: 'error' });
      }
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 sm:p-6 lg:p-8">جاري التحميل...</div>;
  }

  return (
    <div className="p-8 relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl text-white font-medium shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الملف الشخصي</h1>
        <p className="text-gray-600">عرض وتعديل معلوماتك الشخصية</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 relative group">
            <User className="w-16 h-16 text-indigo-600" />
            {editing && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                <p className="text-white text-xs text-center px-2">تغيير الصورة<br/>(غير متاح حالياً)</p>
              </div>
            )}
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
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setValidationErrors({});
                    setFormData(prev => ({ ...prev, name: user?.name || '', email: user?.email || '', password: '', country: (user as any)?.country || 'EG', educationLevel: (user as any)?.educationLevel || '', gradeLevel: (user as any)?.gradeLevel || '' }));
                  }}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <Save className="w-5 h-5" />
                  <span>{isSaving ? 'جاري الحفظ...' : 'حفظ'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم الكامل
              </label>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  {editing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`flex-1 px-4 py-2 border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500`}
                    />
                  ) : (
                    <span className="text-gray-900">{formData.name}</span>
                  )}
                </div>
                {editing && validationErrors.name && <p className="text-red-500 text-xs mr-8">{validationErrors.name}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  {editing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`flex-1 px-4 py-2 border ${validationErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500`}
                    />
                  ) : (
                    <span className="text-gray-900">{formData.email}</span>
                  )}
                </div>
                {editing && validationErrors.email && <p className="text-red-500 text-xs mr-8">{validationErrors.email}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                معرف الحساب (Account ID)
              </label>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 font-mono text-sm bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 select-all cursor-text flex-1">
                    {user?.id}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mr-8 mt-1">يمكن استخدام هذا المعرف لربط حساب الطالب مع ولي الأمر.</p>
              </div>
            </div>

            {editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تغيير كلمة المرور (اختياري)
                </label>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <Edit2 className="w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      placeholder="أدخل كلمة مرور جديدة أو اتركه فارغاً"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`flex-1 px-4 py-2 border ${validationErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500`}
                    />
                  </div>
                  {validationErrors.password && <p className="text-red-500 text-xs mr-8">{validationErrors.password}</p>}
                </div>
              </div>
            )}

            {(user?.role === 'ONLINE_STUDENT' || user?.role === 'CENTER_STUDENT') && (
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">المستوى الدراسي</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium border border-gray-200">للقراءة فقط</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <p className="text-gray-600 flex items-center gap-2">
                      <span className="font-medium w-32">البلد:</span>
                      <span className="text-gray-900 font-medium">{formData.country ? (ACADEMIC_CONFIG as any)[formData.country]?.label : 'غير محدد'}</span>
                    </p>
                    <p className="text-gray-600 flex items-center gap-2">
                      <span className="font-medium w-32">المرحلة الدراسية:</span>
                      <span className="text-gray-900 font-medium">{formData.country && formData.educationLevel ? (ACADEMIC_CONFIG as any)[formData.country]?.levels[formData.educationLevel]?.label : 'غير محدد'}</span>
                    </p>
                    <p className="text-gray-600 flex items-center gap-2">
                      <span className="font-medium w-32">الصف الدراسي:</span>
                      <span className="text-gray-900 font-medium">{formData.country && formData.educationLevel && formData.gradeLevel ? (ACADEMIC_CONFIG as any)[formData.country]?.levels[formData.educationLevel]?.grades[formData.gradeLevel] : 'غير محدد'}</span>
                    </p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 mt-4 flex justify-center items-center gap-2">
                    <p className="text-sm text-indigo-700 font-medium">
                      لتغيير الصف الدراسي، يرجى التواصل مع الإدارة.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {user?.role === 'CENTER_STUDENT' && (
              <div className="pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">معلومات السنتر</h3>
                  <p className="text-gray-600 flex items-center gap-2">
                    <span className="font-medium w-24">اسم السنتر:</span>
                    <span className="text-gray-900 font-medium">{formData.center}</span>
                  </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
