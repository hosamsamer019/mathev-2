import { useState, useEffect, useCallback } from 'react';
import { Upload, Video, Youtube, X, RefreshCw, CheckCircle, AlertTriangle, Clock, Loader } from 'lucide-react';
import { courseService } from '../../services/course.service';
import { useTheme } from '../../contexts/ThemeContext';

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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
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
      // TODO: Connect to a dedicated admin endpoint listing all uploads
      // For now, mock data from local state is used until /api/uploads/list is built
      setUploads([]);
    } catch (err) {
      console.error('Failed to fetch uploads', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Request Signed URL from backend
      const { data } = await courseService.requestUploadUrl({
        filename: uploadFile.name,
        mimetype: uploadFile.type,
        fileSize: uploadFile.size,
      });

      const { uploadId, signedUrl } = data;

      // 2. Upload directly to Cloudflare R2 via the Signed URL
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);
      xhr.setRequestHeader('Content-Type', uploadFile.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // 3. Notify backend that the upload is complete
          await courseService.completeUpload(uploadId);
          showToast('تم رفع الفيديو بنجاح وبدأت المعالجة', 'success');
          setShowUploadModal(false);
          setUploadFile(null);
          // Add to local list
          setUploads(prev => [{ id: uploadId, filename: uploadFile.name, status: 'UPLOAD_COMPLETED', fileSize: uploadFile.size, createdAt: new Date().toISOString() }, ...prev]);
        } else {
          showToast('فشل رفع الفيديو إلى التخزين السحابي', 'error');
        }
        setIsUploading(false);
      };

      xhr.onerror = () => {
        showToast('خطأ في الاتصال بالتخزين السحابي', 'error');
        setIsUploading(false);
      };

      xhr.send(uploadFile);
    } catch (err: any) {
      console.error('Upload failed:', err);
      showToast(err?.response?.data?.message || 'فشل الرفع', 'error');
      setIsUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary} mb-1`}>إدارة الفيديوهات</h1>
          <p className={textSecondary}>رفع وإدارة فيديوهات الدروس — تحويل تلقائي إلى HLS</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg"
        >
          <Upload className="w-5 h-5" />
          <span>رفع فيديو جديد</span>
        </button>
      </div>

      {/* Uploads Table */}
      <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className={`font-bold ${textPrimary}`}>سجل الرفع والمعالجة</h2>
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
            <p className={`text-sm ${textSecondary}`}>ابدأ برفع أول فيديو لتفعيل معالجة HLS</p>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl w-full max-w-lg`}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className={`text-lg font-bold ${textPrimary}`}>رفع فيديو جديد</h2>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${textSecondary}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Dropzone */}
              <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isDark ? 'border-gray-600 hover:border-violet-500' : 'border-gray-300 hover:border-violet-500'}`}>
                <Upload className={`w-10 h-10 mb-3 ${textSecondary}`} />
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {uploadFile ? uploadFile.name : 'اسحب الفيديو هنا أو انقر للاختيار'}
                </p>
                {uploadFile && <p className={`text-xs mt-1 ${textSecondary}`}>{formatSize(uploadFile.size)}</p>}
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </label>

              {/* Progress Bar */}
              {isUploading && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={textSecondary}>جاري الرفع...</span>
                    <span className={`font-medium ${textPrimary}`}>{uploadProgress}%</span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div className="h-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!uploadFile || isUploading}
                className="w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-violet-600 to-purple-700 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isUploading ? 'جاري الرفع...' : 'رفع الفيديو'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
