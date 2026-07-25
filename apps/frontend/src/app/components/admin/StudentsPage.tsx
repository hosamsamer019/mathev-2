import { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { userApi } from '../../services/api';

export default function StudentsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ONLINE_STUDENT',
    parentId: '',
    centerGroupId: '',
    parentName: '',
    parentEmail: '',
    parentPassword: ''
  });

  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userApi.get('/users'); 
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'ONLINE_STUDENT', parentId: '', centerGroupId: '', parentName: '', parentEmail: '', parentPassword: '' });
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
      centerGroupId: user.centerGroupId || '',
      parentName: '',
      parentEmail: '',
      parentPassword: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if(confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await userApi.delete(`/users/${id}`);
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
      if (editingUser) {
        await userApi.put(`/users/${editingUser.id}`, formData);
        showToast('تم التعديل بنجاح', 'success');
      } else {
        await userApi.post('/users', formData);
        showToast('تمت الإضافة بنجاح', 'success');
      }
      setShowModal(false);
      fetchUsers();
    } catch(err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'حدث خطأ', 'error');
    }
  };

  const filteredUsers = users.filter(s => s.name?.includes(searchTerm) || s.email?.includes(searchTerm));

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
                      <button onClick={() => handleEdit(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingUser ? 'كلمة المرور الجديدة (اتركها فارغة للاحتفاظ بالقديمة)' : 'كلمة المرور'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder={editingUser ? '••••••••' : ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الدور (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="ONLINE_STUDENT">ONLINE_STUDENT</option>
                  <option value="CENTER_STUDENT">CENTER_STUDENT</option>
                  <option value="PARENT">PARENT</option>
                </select>
              </div>

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
                    value={formData.parentId}
                    onChange={(e) => setFormData({...formData, parentId: e.target.value})}
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
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  حفظ
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
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
