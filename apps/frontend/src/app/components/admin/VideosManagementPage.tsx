import { useState, useEffect, useCallback } from 'react';
import { Upload, Video, Youtube, X, RefreshCw, CheckCircle, AlertTriangle, Clock, Loader } from 'lucide-react';
import { courseService } from '../../services/course.service';
import { useTheme } from '../../contexts/ThemeContext';
import SupabaseUploader from '../ui/SupabaseUploader';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:          { label: 'في الانتظار',   color: 'text-gray-500 bg-gray-100 dark:bg-gray-700', icon: Clock },
  UPLOADING:        { label: 'جاري الرفع',    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40', icon: Upload },
  UPLOAD_COMPLETED: { label: 'تم الرفع',      color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40', icon: CheckCircle },
  PROCESSING:       { label: 'قيد المعالجة',  color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40', icon: Loader },
  TRANSCODING:      { label: 'تحويل الفيديو', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40', icon: RefreshCw },
  COMPLETED:        { label: 'مكتمل',         color: 'text-green-600 bg-green-100 dark:bg-green-900/40', icon: CheckCircle },
  FAILED:           { label: 'فشل',           color: 'text-red-600 bg-red-100 dark:bg-red-900/40', icon: AlertTriangle },
};

export default function VideosManagementPage() {
  const { isDark } = useTheme();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUploads = useCallback(async () => {
    try {
      setLoading(true);
      // For now, mock data from local state is used until /api/uploads/list is built
      setUploads(prev => prev); // keep existing state
    } catch (err) {
      console.error('Failed to fetch uploads', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const handleUploadSuccess = (url: string) => {
    showToast('تم رفع الفيديو بنجاح', 'success');
    setUploads(prev => [
      { id: Date.now().toString(), filename: url.split('/').pop(), status: 'COMPLETED', fileSize: 0, createdAt: new Date().toISOString() }, 
      ...prev
    ]);
    setTimeout(() => {
      setShowUploadModal(false);
    }, 1500);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary} mb-1`}>إدارة الفيديوهات</h1>
          <p className={textSecondary}>رفع وإدارة فيديوهات الدروس</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg"
        >
          <Upload className="w-5 h-5" />
          <span>رفع فيديو جديد</span>
        </button>
      </div>

      <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className={`font-bold ${textPrimary}`}>سجل الرفع</h2>
          <button onClick={fetchUploads} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${textSecondary}`}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader className={`w-8 h-8 animate-spin mx-auto mb-3 ${textSecondary}`} />
            <p className={textSecondary}>جاري التحميل...</p>
          </div>
        ) : uploads.length === 0 ? (
          <div className="p-12 text-center">
            <Video className={`w-12 h-12 mx-auto mb-4 ${textSecondary}`} />
            <p className={`font-medium ${textPrimary} mb-1`}>لا توجد فيديوهات مرفوعة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`text-right py-3 px-4 font-medium text-sm ${textSecondary}`}>اسم الملف</th>
                  <th className={`text-right py-3 px-4 font-medium text-sm ${textSecondary}`}>الحجم</th>
                  <th className={`text-right py-3 px-4 font-medium text-sm ${textSecondary}`}>الحالة</th>
                  <th className={`text-right py-3 px-4 font-medium text-sm ${textSecondary}`}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => {
                  const status = STATUS_MAP[upload.status] || STATUS_MAP.PENDING;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={upload.id} className={`border-b last:border-0 ${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                      <td className={`py-3 px-4 text-sm font-medium ${textPrimary}`}>{upload.filename}</td>
                      <td className={`py-3 px-4 text-sm ${textSecondary}`}>{formatSize(upload.fileSize)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-sm ${textSecondary}`}>{new Date(upload.createdAt).toLocaleDateString('ar-EG')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl w-full max-w-lg`}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className={`text-lg font-bold ${textPrimary}`}>رفع فيديو جديد</h2>
              <button onClick={() => setShowUploadModal(false)} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${textSecondary}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <SupabaseUploader 
                bucketName="platform-uploads" 
                acceptedFileTypes="video/*" 
                label="اسحب الفيديو هنا أو انقر للاختيار"
                maxSizeMB={500}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={(err) => showToast(err, 'error')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
