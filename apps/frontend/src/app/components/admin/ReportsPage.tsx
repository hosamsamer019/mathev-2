import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, Users, Award, BookOpen } from 'lucide-react';
import { analyticsApi } from '../../services/api';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await analyticsApi.get('/admin');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">التقارير والإحصائيات</h1>
          <p className="text-gray-600">تحليل شامل لأداء المنصة</p>
        </div>
        <button className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700">
          <Download className="w-5 h-5" />
          <span>تصدير التقرير</span>
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
          <h2 className="text-xl font-bold text-gray-900 mb-6">احصائيات أخرى ستضاف لاحقاً</h2>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
             <p className="text-gray-500">المزيد من الرسوم البيانية ستضاف هنا</p>
          </div>
        </div>
      </div>
    </div>
  );
}
