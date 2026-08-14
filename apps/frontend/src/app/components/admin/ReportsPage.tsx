import { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, Users, Award, BookOpen, Loader2 } from 'lucide-react';
import { analyticsService } from '../../services/analytics.service';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getAdminAnalytics();
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`تقرير_المنصة_${new Date().toLocaleDateString('ar-EG')}.pdf`);
    } catch (err) {
      showToast('فشل تصدير PDF', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">جاري تحميل الإحصائيات...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-red-500">حدث خطأ أثناء جلب البيانات.</div>;
  }

  const { overview, roleDistribution } = data;

  const roleColors: Record<string, string> = {
    'ADMIN': '#ef4444',
    'TEACHER': '#f59e0b',
    'ONLINE_STUDENT': '#3b82f6',
    'CENTER_STUDENT': '#10b981',
    'PARENT': '#8b5cf6'
  };

  const formattedRoleData = roleDistribution?.map((r: any) => ({
    name: r.role,
    value: r._count
  })) || [];

  return (
    <div className="p-8 relative" ref={reportRef}>
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} z-50`}>
          {toast.message}
        </div>
      )}
      
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">التقارير والإحصائيات</h1>
          <p className="text-gray-600">تحليل شامل لأداء المنصة</p>
        </div>
        <button 
          onClick={handleExportPDF}
          disabled={exporting}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-60"
        >
          {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          <span>{exporting ? 'جاري التصدير...' : 'تصدير PDF'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">إجمالي المستخدمين</p>
              <p className="text-3xl font-bold text-blue-600">{overview?.totalUsers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">الدورات النشطة</p>
              <p className="text-3xl font-bold text-green-600">{overview?.totalCourses || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">عدد الامتحانات</p>
              <p className="text-3xl font-bold text-purple-600">{overview?.totalExams || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">التسليمات</p>
              <p className="text-3xl font-bold text-orange-600">{overview?.totalSubmissions || 0}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">توزيع المستخدمين</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={formattedRoleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {formattedRoleData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={roleColors[entry.name] || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">أداء الدورات</h2>
          {data.performanceData && data.performanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="course" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="average" fill="#10b981" name="متوسط الدرجات" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
               <p className="text-gray-500">لا يوجد بيانات كافية لعرض الأداء</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
