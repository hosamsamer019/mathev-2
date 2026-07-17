import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, Users, Award } from 'lucide-react';

export default function ReportsPage() {
  const performanceData = [
    { name: 'ممتاز (90-100)', value: 45 },
    { name: 'جيد جداً (80-89)', value: 78 },
    { name: 'جيد (70-79)', value: 56 },
    { name: 'مقبول (60-69)', value: 23 },
    { name: 'ضعيف (<60)', value: 12 },
  ];

  const monthlyProgress = [
    { month: 'يناير', online: 120, center: 85 },
    { month: 'فبراير', online: 150, center: 92 },
    { month: 'مارس', online: 180, center: 105 },
    { month: 'أبريل', online: 210, center: 118 },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];

  return (
    <div className="p-8">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">متوسط الأداء العام</p>
              <p className="text-3xl font-bold text-green-600">85%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">الطلاب النشطون</p>
              <p className="text-3xl font-bold text-blue-600">1,234</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">معدل الإنجاز</p>
              <p className="text-3xl font-bold text-purple-600">78%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">نسبة النجاح</p>
              <p className="text-3xl font-bold text-orange-600">92%</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">توزيع الأداء</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={performanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">التقدم الشهري</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="online" fill="#4f46e5" name="طلاب أونلاين" />
              <Bar dataKey="center" fill="#10b981" name="طلاب السنتر" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">تقرير الدورات</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-3 px-4 font-medium text-gray-700">الدورة</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">عدد الطلاب</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">معدل الإنجاز</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">المتوسط</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">التقييم</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-900">الجبر - الصف الأول</td>
                <td className="py-3 px-4 text-gray-600">156</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-sm text-gray-600">75%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-bold text-green-600">85%</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-yellow-500">★★★★☆</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-900">الهندسة - الصف الأول</td>
                <td className="py-3 px-4 text-gray-600">142</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                    <span className="text-sm text-gray-600">68%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-bold text-green-600">78%</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-yellow-500">★★★★☆</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-900">حساب المثلثات</td>
                <td className="py-3 px-4 text-gray-600">98</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                    </div>
                    <span className="text-sm text-gray-600">82%</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-bold text-green-600">82%</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-yellow-500">★★★★★</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
