import { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, X, AlertTriangle, Shield, Filter } from 'lucide-react';
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
import { userService } from '../../services/user.service';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [debouncedRoleFilter, setDebouncedRoleFilter] = useState('');
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersMatching, setTotalUsersMatching] = useState(0);
  const limit = 10;

  // Selection & Bulk Delete State
  const [selectionMode, setSelectionMode] = useState<'MANUAL' | 'ALL'>('MANUAL');
  const [manualSelectedIds, setManualSelectedIds] = useState<Set<string>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const [showImpactModal, setShowImpactModal] = useState(false);
  const [impactData, setImpactData] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      setDebouncedRoleFilter(roleFilter);
      setPage(1);
      // Reset selection when filters change
      setSelectionMode('MANUAL');
      setManualSelectedIds(new Set());
      setExcludedIds(new Set());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearchTerm, debouncedRoleFilter]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getUsers({ page, limit, search: debouncedSearchTerm, role: debouncedRoleFilter } as any); 
      setUsers(Array.isArray(res.data) ? res.data : []);
      setTotalPages(res.totalPages || 1);
      setTotalUsersMatching(res.total || 0);
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

  // Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectionMode('ALL');
      setManualSelectedIds(new Set());
      setExcludedIds(new Set());
    } else {
      setSelectionMode('MANUAL');
      setManualSelectedIds(new Set());
      setExcludedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (id === currentUser?.id) return;
    
    if (selectionMode === 'ALL') {
      const newExcluded = new Set(excludedIds);
      if (!checked) newExcluded.add(id);
      else newExcluded.delete(id);
      setExcludedIds(newExcluded);
    } else {
      const newManual = new Set(manualSelectedIds);
      if (checked) newManual.add(id);
      else newManual.delete(id);
      setManualSelectedIds(newManual);
    }
  };

  const isSelected = (id: string) => {
    if (id === currentUser?.id) return false;
    if (selectionMode === 'ALL') {
      return !excludedIds.has(id);
    }
    return manualSelectedIds.has(id);
  };

  const totalSelectedCount = selectionMode === 'ALL' 
    ? Math.max(0, totalUsersMatching - excludedIds.size - (users.some(u => u.id === currentUser?.id && !excludedIds.has(u.id)) ? 1 : 0)) 
    : manualSelectedIds.size;

  const prepareBulkDelete = async () => {
    if (totalSelectedCount === 0) return;
    try {
      setIsDeleting(true);
      const payload = selectionMode === 'ALL' 
        ? { selectAll: true, search: debouncedSearchTerm, role: debouncedRoleFilter, excludedIds: Array.from(excludedIds) }
        : { userIds: Array.from(manualSelectedIds) };
        
      const impact = await userService.getDeletionImpact(payload);
      setImpactData(impact);
      setShowImpactModal(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'فشل في جلب بيانات التأثير', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const payload = selectionMode === 'ALL' 
        ? { selectAll: true, search: debouncedSearchTerm, role: debouncedRoleFilter, excludedIds: Array.from(excludedIds) }
        : { userIds: Array.from(manualSelectedIds) };
        
      const res = await userService.bulkDeleteUsers(payload);
      showToast(`تم حذف ${res.count} مستخدم بنجاح`, 'success');
      setShowImpactModal(false);
      
      // Reset state
      setSelectionMode('MANUAL');
      setManualSelectedIds(new Set());
      setExcludedIds(new Set());
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'فشل الحذف', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const prepareSingleDelete = async (id: string) => {
    if (id === currentUser?.id) {
       showToast('لا يمكنك حذف حسابك الشخصي', 'error');
       return;
    }
    try {
      setIsDeleting(true);
      // We overwrite manual selection for the sake of the dialog state
      setSelectionMode('MANUAL');
      setManualSelectedIds(new Set([id]));
      
      const impact = await userService.getDeletionImpact({ userIds: [id] });
      setImpactData(impact);
      setShowImpactModal(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'فشل في جلب بيانات التأثير', 'error');
      setManualSelectedIds(new Set());
    } finally {
      setIsDeleting(false);
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
          if (e.path && e.path.length > 0) errors[e.path[0]] = e.message;
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

  return (
    <div className="p-8 relative">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} z-50`}>
          {toast.message}
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة المستخدمين</h1>
            <p className="text-gray-600">إضافة وتعديل وحذف المستخدمين، وإدارة الصلاحيات</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalSelectedCount > 0 && (
            <button
              onClick={prepareBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
              <span>حذف المحدد ({totalSelectedCount})</span>
            </button>
          )}
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة مستخدم</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ابحث عن مستخدم (بالاسم أو البريد)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="relative w-64">
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pr-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white appearance-none"
            >
              <option value="">كل الأدوار</option>
              <option value="ADMIN">مدير</option>
              <option value="TEACHER">معلم</option>
              <option value="ONLINE_STUDENT">طالب أونلاين</option>
              <option value="CENTER_STUDENT">طالب سنتر</option>
              <option value="PARENT">ولي أمر</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="py-3 px-4 w-12 rounded-tr-lg">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={selectionMode === 'ALL'}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                  />
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">الاسم</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">البريد الإلكتروني</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">الدور</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 rounded-tl-lg">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-8 text-gray-500">جاري تحميل البيانات...</td></tr>}
              {!loading && users.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-500">لا يوجد مستخدمين</td></tr>}
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                const checked = isSelected(user.id);
                return (
                  <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${checked ? 'bg-purple-50/50' : ''}`}>
                    <td className="py-3 px-4">
                      <input 
                        type="checkbox" 
                        checked={checked}
                        disabled={isSelf}
                        onChange={(e) => handleSelectOne(user.id, e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="py-3 px-4 text-gray-900 font-medium">
                      {user.name} {isSelf && <span className="text-xs text-gray-400 mr-2">(أنت)</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                          user.role === 'TEACHER' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'PARENT' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(user)} title="تعديل" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        {!isSelf && (
                          <button onClick={() => prepareSingleDelete(user.id)} title="حذف" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-b-xl">
            <div className="flex flex-1 items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  الصفحة <span className="font-medium">{page}</span> من <span className="font-medium">{totalPages}</span>
                  <span className="mr-4 text-gray-500">إجمالي النتائج: {totalUsersMatching}</span>
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

      {/* Impact Deletion Modal */}
      {showImpactModal && impactData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-red-100">
            <div className="flex items-center gap-4 text-red-600 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">تأكيد الحذف الكلي!</h2>
                <p className="text-red-500/80 text-sm">هذا الإجراء نهائي ولا يمكن التراجع عنه.</p>
              </div>
            </div>

            <div className="bg-red-50 p-5 rounded-xl mb-8 space-y-3 border border-red-100 max-h-[50vh] overflow-y-auto">
              {impactData.users === 0 ? (
                <p className="font-bold text-gray-800 text-lg">لا يوجد مستخدمون محددون للحذف</p>
              ) : (
                <>
                  <p className="font-bold text-gray-800 text-lg border-b border-red-200 pb-2">
                    سيتم حذف البيانات التالية نهائياً:
                  </p>
                  
                  {impactData.emails && impactData.emails.length > 0 && (
                    <div className="py-2 mb-2 border-b border-red-200">
                      <p className="font-semibold text-gray-700 mb-1">الحسابات المتأثرة ({impactData.users}):</p>
                      <ul className="text-sm text-gray-600 list-disc list-inside bg-white/50 p-2 rounded">
                        {impactData.emails.map((email: string, i: number) => (
                          <li key={i}>{email}</li>
                        ))}
                      </ul>
                      {impactData.users > 10 && (
                        <p className="text-xs text-gray-500 mt-1 mr-2">...و {impactData.users - 10} مستخدمين آخرين</p>
                      )}
                    </div>
                  )}

                  <ul className="text-gray-700 text-sm space-y-2 pt-2">
                    <li className="flex justify-between"><span>المستخدمين:</span> <span className="font-bold text-red-600">{impactData.users}</span></li>
                    <li className="flex justify-between"><span>منهم معلمين:</span> <span className="font-bold">{impactData.teachers}</span></li>
                    {impactData.teachers > 0 && (
                      <li className="flex justify-between"><span>الدورات التعليمية (بكل محتوياتها):</span> <span className="font-bold text-red-600">{impactData.courses}</span></li>
                    )}
                    <li className="flex justify-between"><span>الاشتراكات/التسجيلات:</span> <span className="font-bold">{impactData.enrollments}</span></li>
                    <li className="flex justify-between"><span>محاولات الامتحانات:</span> <span className="font-bold">{impactData.examAttempts}</span></li>
                    <li className="flex justify-between"><span>المدفوعات:</span> <span className="font-bold">{impactData.payments}</span></li>
                    <li className="flex justify-between"><span>الواجبات المسلمة:</span> <span className="font-bold">{impactData.submissions}</span></li>
                    <li className="flex justify-between"><span>سجلات الحضور:</span> <span className="font-bold">{impactData.attendances}</span></li>
                  </ul>
                  
                  <div className="mt-4 p-3 bg-red-100/50 rounded-lg text-xs text-red-800 leading-relaxed border border-red-200">
                    <strong>تنبيه:</strong> سيتم أيضاً حذف أية رسائل دردشة، وأية بيانات أخرى مرتبطة بهؤلاء المستخدمين.
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmBulkDelete}
                disabled={isDeleting || impactData.users === 0}
                className={`flex-1 bg-red-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-red-200 transition-all ${isDeleting || impactData.users === 0 ? 'opacity-50 cursor-not-allowed hover:bg-red-600' : 'hover:bg-red-700'}`}
              >
                {isDeleting ? 'جاري الحذف...' : 'نعم، قم بالحذف الكلي'}
              </button>
              <button
                onClick={() => setShowImpactModal(false)}
                disabled={isDeleting}
                className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-2.5 border ${validationErrors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none`}
                />
                {validationErrors.name && <p className="text-red-500 text-xs mt-1.5">{validationErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full px-4 py-2.5 border ${validationErrors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none`}
                />
                {validationErrors.email && <p className="text-red-500 text-xs mt-1.5">{validationErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingUser ? 'كلمة المرور الجديدة (اتركها فارغة للاحتفاظ بالقديمة)' : 'كلمة المرور'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={`w-full px-4 py-2.5 border ${validationErrors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none`}
                  placeholder={editingUser ? '••••••••' : ''}
                />
                {validationErrors.password && <p className="text-red-500 text-xs mt-1.5">{validationErrors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الدور (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className={`w-full px-4 py-2.5 border ${validationErrors.role ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none bg-white`}
                >
                  <option value="ADMIN">ADMIN (مدير)</option>
                  <option value="TEACHER">TEACHER (معلم)</option>
                  <option value="ONLINE_STUDENT">ONLINE_STUDENT (طالب أونلاين)</option>
                  <option value="CENTER_STUDENT">CENTER_STUDENT (طالب سنتر)</option>
                  <option value="PARENT">PARENT (ولي أمر)</option>
                </select>
                {validationErrors.role && <p className="text-red-500 text-xs mt-1.5">{validationErrors.role}</p>}
              </div>

              {(formData.role === 'ONLINE_STUDENT' || formData.role === 'CENTER_STUDENT') && (
                <div className="pt-4 border-t border-gray-100 mt-2 bg-gray-50/50 p-4 rounded-xl">
                  <h3 className="text-sm font-bold text-purple-700 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-purple-600 rounded-full"></span>
                    الملف الأكاديمي للطالب
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">البلد</label>
                      <select
                        value={formData.country}
                        onChange={(e) => setFormData({...formData, country: e.target.value, educationLevel: '', gradeLevel: ''})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      >
                        {Object.entries(ACADEMIC_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </div>
                    {formData.country && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">المرحلة الدراسية</label>
                        <select
                          value={formData.educationLevel}
                          onChange={(e) => setFormData({...formData, educationLevel: e.target.value, gradeLevel: ''})}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">الصف الدراسي</label>
                        <select
                          value={formData.gradeLevel}
                          onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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

              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
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
