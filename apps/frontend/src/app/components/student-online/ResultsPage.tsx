import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Award, Target, Star, Loader2, Download } from 'lucide-react';
import { analyticsService } from '../../services/analytics.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ResultsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({
    overallRate: 0,
    examsCompleted: 0,
    homeworksCompleted: 0,
    rank: 0
  });
  const [charts, setCharts] = useState({
    examResults: [],
    homeworkResults: []
  });
  const [recentResults, setRecentResults] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewRes, chartsRes, recentRes] = await Promise.all([
        analyticsService.getStudentOverview(),
        analyticsService.getStudentCharts(),
        analyticsService.getStudentRecent()
      ]);

      setOverview(overviewRes.data);
      setCharts(chartsRes.data);
      setRecentResults(recentRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #report-content, #report-content * { visibility: visible; }
        #report-content { position: absolute; left: 0; top: 0; width: 100%; }
        /* Prevent charts from being cut off */
        .recharts-wrapper { max-width: 100% !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.head.removeChild(style), 1000);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">النتائج والتقارير</h1>
          <p className="text-gray-600">تابع أداءك وتقدمك الدراسي</p>
        </div>
        <button 
          onClick={handleExportPDF}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>تصدير تقرير PDF</span>
        </button>
      </div>

      <div id="report-content" className="bg-gray-50 p-4 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{overview.overallRate}%</div>
              <div className="text-sm text-gray-600">المعدل العام</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{overview.examsCompleted}</div>
              <div className="text-sm text-gray-600">امتحانات مكتملة</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Target className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{overview.homeworksCompleted}</div>
              <div className="text-sm text-gray-600">واجبات مكتملة</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">المرتبة {overview.rank}</div>
              <div className="text-sm text-gray-600">الترتيب التقريبي</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">نتائج الامتحانات</h2>
          {Array.isArray(charts?.examResults) && charts.examResults.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.examResults}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">لا توجد نتائج امتحانات بعد</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">نتائج الواجبات</h2>
          {Array.isArray(charts?.homeworkResults) && charts.homeworkResults.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.homeworkResults}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">لا توجد نتائج واجبات بعد</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">النتائج الأخيرة</h2>
        {Array.isArray(recentResults) && recentResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 font-medium text-gray-700">العنوان</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">النوع</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">النتيجة</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">التاريخ</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((result, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{result.title}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        result.type === 'امتحان'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {result.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${
                        result.score >= 90
                          ? 'text-green-600'
                          : result.score >= 70
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {result.score}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{result.date}</td>
                    <td className="py-3 px-4">
                      {result.assessmentId && result.id && (
                        <button
                          onClick={() => navigate(`/student/online/assessment/${result.assessmentId}/review/${result.id}`)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold text-sm bg-indigo-50 px-3 py-1 rounded-md transition-colors"
                        >
                          عرض النتيجة التفصيلية
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">لا توجد أنشطة مسجلة بعد</div>
        )}
      </div>
      </div>
    </div>
  );
}
