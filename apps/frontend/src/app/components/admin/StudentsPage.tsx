import { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { ACADEMIC_CONFIG } from '@shared/utils/dist/academicConfig';
import { userService } from '../../services/user.service';

export default function StudentsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ONLINE_STUDENT',
    parentId: '',
    childId: '',
    centerGroupId: '',
    parentName: '',
    parentEmail: '',
    parentPassword: '',
    country: 'EG',
    educationLevel: '',
    gradeLevel: ''
  });

  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearchTerm]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getUsers({ page, limit, search: debouncedSearchTerm }); 
      setUsers(Array.isArray(res.data) ? res.data : []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'ONLINE_STUDENT', parentId: '', childId: '', centerGroupId: '', parentName: '', parentEmail: '', parentPassword: '', country: 'EG', educationLevel: '', gradeLevel: '' });
    setValidationErrors({});
    setShowModal(true);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'ONLINE_STUDENT',
      parentId: user.parentId || '',
      childId: '',
      centerGroupId: user.centerGroupId || '',
      parentName: '',
      parentEmail: '',
      parentPassword: '',
      country: user.country || 'EG',
      educationLevel: user.educationLevel || '',
      gradeLevel: user.gradeLevel || ''
    });
    setValidationErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if(confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await userService.deleteUser(id);
        setUsers(s => s.filter(x => x.id !== id));
        showToast('تم الحذف بنجاح', 'success');
      } catch (err) {
        console.error('Delete failed', err);
        showToast('فشل الحذف', 'error');
      }
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setValidationErrors({});
      
      const payload: any = { ...formData };
      if (!payload.parentId) payload.parentId = null;
      if (!payload.childId) payload.childId = null;
      if (!payload.centerGroupId) payload.centerGroupId = null;
      if (!payload.parentName) payload.parentName = null;
      if (!payload.parentEmail) payload.parentEmail = null;
      if (!payload.parentPassword) payload.parentPassword = null;
      
      // Clean up academic fields if not student
      if (!['ONLINE_STUDENT', 'CENTER_STUDENT'].includes(payload.role)) {
        payload.country = null;
        payload.educationLevel = null;
        payload.gradeLevel = null;
      }

      if (editingUser) {
        await userService.updateUser(editingUser.id, payload);
        showToast('تم التعديل بنجاح', 'success');
      } else {
        await userService.createUser(payload);
        showToast('تمت الإضافة بنجاح', 'success');
      }
      setShowModal(false);
      fetchUsers();
    } catch(err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          if (e.path && e.path.length > 0) {
            errors[e.path[0]] = e.message;
          }
        });
        setValidationErrors(errors);
        showToast('يرجى مراجعة الحقول المطلوبة', 'error');
      } else {
        showToast(err.response?.data?.message || 'حدث خطأ', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users; // Server-side search used instead

  return (
    <div className="p-8 relative">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} z-50`}>
          {toast.message}
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة المستخدمين</h1>
          <p className="text-gray-600">إضافة وتعديل وحذف المستخدمين</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مستخدم</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ابحث عن مستخدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-3 px-4 font-medium text-gray-700">الاسم</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">البريد الإلكتروني</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">الدور</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="text-center py-8 text-gray-500">جاري تحميل البيانات...</td></tr>}
              {!loading && filteredUsers.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-500">لا يوجد مستخدمين</td></tr>}
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{user.name}</td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(user)} title="تعديل" aria-label="تعديل" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} title="حذف" aria-label="حذف" className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-b-xl">
            <div className="flex flex-1 items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  الصفحة <span className="font-medium">{page}</span> من <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span>السابق</span>
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span>التالي</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-2 border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500`}
                />
                {validationErrors.name && <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full px-4 py-2 border ${validationErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500`}
                />
                {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingUser ? 'كلمة المرور الجديدة (اتركها فارغة للاحتفاظ بالقديمة)' : 'كلمة المرور'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={`w-full px-4 py-2 border ${validationErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500`}
                  placeholder={editingUser ? '••••••••' : ''}
                />
                {validationErrors.password && <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الدور (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className={`w-full px-4 py-2 border ${validationErrors.role ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500`}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="ONLINE_STUDENT">ONLINE_STUDENT</option>
                  <option value="CENTER_STUDENT">CENTER_STUDENT</option>
                  <option value="PARENT">PARENT</option>
                </select>
                {validationErrors.role && <p className="text-red-500 text-xs mt-1">{validationErrors.role}</p>}
              </div>

              {(formData.role === 'ONLINE_STUDENT' || formData.role === 'CENTER_STUDENT') && (
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <h3 className="text-md font-semibold text-gray-800 mb-3">المستوى الدراسي</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">البلد</label>
                      <select
                        value={formData.country}
                        onChange={(e) => setFormData({...formData, country: e.target.value, educationLevel: '', gradeLevel: ''})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        {Object.entries(ACADEMIC_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </div>
                    {formData.country && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">المرحلة الدراسية</label>
                        <select
                          value={formData.educationLevel}
                          onChange={(e) => setFormData({...formData, educationLevel: e.target.value, gradeLevel: ''})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">اختر المرحلة</option>
                          {Object.entries((ACADEMIC_CONFIG as any)[formData.country].levels).map(([key, level]: [string, any]) => (
                            <option key={key} value={key}>{level.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {formData.country && formData.educationLevel && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الصف الدراسي</label>
                        <select
                          value={formData.gradeLevel}
                          onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">اختر الصف</option>
                          {Object.entries((ACADEMIC_CONFIG as any)[formData.country].levels[formData.educationLevel].grades).map(([key, label]: [string, any]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(formData.role === 'ONLINE_STUDENT' || formData.role === 'CENTER_STUDENT') && !editingUser && (
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <h3 className="text-md font-semibold text-gray-800 mb-3">بيانات ولي الأمر (اختياري)</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم ولي الأمر</label>
                      <input
                        type="text"
                        value={formData.parentName}
                        onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">بريد ولي الأمر</label>
                      <input
                        type="email"
                        value={formData.parentEmail}
                        onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">كلمة مرور ولي الأمر</label>
                      <input
                        type="password"
                        value={formData.parentPassword}
                        onChange={(e) => setFormData({...formData, parentPassword: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.role === 'PARENT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">معرف الطالب المرتبط (Student ID)</label>
                  <input
                    type="text"
                    placeholder="Enter Student ID"
                    value={formData.childId}
                    onChange={(e) => setFormData({...formData, childId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {formData.role === 'CENTER_STUDENT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">معرف مجموعة السنتر (Center Group ID)</label>
                  <input
                    type="text"
                    placeholder="Enter Center Group ID"
                    value={formData.centerGroupId}
                    onChange={(e) => setFormData({...formData, centerGroupId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
