import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Award, Target, Star, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';

// API Instances
const userApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/users' });
const analyticsApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/analytics' });

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
analyticsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function ParentReportsPage() {
  const { isDark } = useTheme();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildIdx, setSelectedChildIdx] = useState(0);
  const [childData, setChildData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (children.length > 0) {
      fetchChildAnalytics(children[selectedChildIdx].id);
    }
  }, [selectedChildIdx, children]);

  const fetchChildren = async () => {
    try {
      const res = await userApi.get('/parent/children');
      setChildren(res.data);
    } catch (err) {
      console.error('Failed to fetch children', err);
    } finally {
      if (children.length === 0) setLoading(false);
    }
  };

  const fetchChildAnalytics = async (childId: string) => {
    setLoading(true);
    try {
      const res = await analyticsApi.get(`/parent/child/${childId}/overview`);
      setChildData(res.data);
    } catch (err) {
      console.error('Failed to fetch child analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && children.length === 0) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <Loader2 className="w-12 h-12 text-cyan-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>التقارير التحليلية</h1>
        <p className={textSecondary}>تحليل مفصل لأداء ومستوى كل ابن</p>
      </div>

      {children.length === 0 ? (
        <div className={`text-center py-12 ${cardBg} rounded-2xl border`}>
          <p className={textSecondary}>لا يوجد أبناء مرتبطين بحسابك بعد.</p>
        </div>
      ) : (
        <>
          {/* Child Selector */}
          <div className="flex gap-3 mb-8">
            {children.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildIdx(idx)}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${
                  selectedChildIdx === idx
                    ? 'bg-gradient-to-l from-cyan-600 to-blue-600 text-white border-transparent shadow-lg'
                    : isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${selectedChildIdx === idx ? 'bg-white/20' : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'}`}>
                  {c.name.charAt(0)}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{c.name}</p>
                </div>
              </button>
            ))}
          </div>

          {loading ? (
             <div className="flex justify-center items-center py-12">
               <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
             </div>
          ) : childData && (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'المعدل العام', value: `${childData.overview.overallRate}٪`, icon: TrendingUp, color: 'from-indigo-500 to-purple-600' },
                  { label: 'إجمالي الامتحانات', value: childData.overview.examsCompleted, icon: Award, color: 'from-green-500 to-emerald-600' },
                  { label: 'إجمالي الواجبات', value: childData.overview.homeworksCompleted, icon: Target, color: 'from-yellow-400 to-orange-500' },
                  { label: 'المرتبة', value: childData.overview.rank, icon: Star, color: 'from-purple-500 to-pink-600' },
                ].map((stat, idx) => (
                  <div key={idx} className={`${cardBg} border rounded-2xl p-5`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-sm ${textSecondary}`}>{stat.label}</p>
                    <p className={`text-2xl font-bold ${textPrimary} mt-1`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Exam Chart */}
                <div className={`${cardBg} border rounded-2xl p-6`}>
                  <h2 className={`text-lg font-bold ${textPrimary} mb-6`}>تطور درجات الامتحانات</h2>
                  {childData.charts.examResults.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={childData.charts.examResults}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#374151' : '#e5e7eb'} />
                        <XAxis dataKey="name" stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', borderRadius: '12px' }}
                          itemStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
                        />
                        <Bar dataKey="score" fill="#0891b2" radius={[6, 6, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={`flex items-center justify-center h-[300px] ${textSecondary}`}>لا توجد نتائج امتحانات بعد</div>
                  )}
                </div>

                {/* Homework Chart */}
                <div className={`${cardBg} border rounded-2xl p-6`}>
                  <h2 className={`text-lg font-bold ${textPrimary} mb-6`}>تطور درجات الواجبات</h2>
                  {childData.charts.homeworkResults.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={childData.charts.homeworkResults}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#374151' : '#e5e7eb'} />
                        <XAxis dataKey="name" stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderColor: isDark ? '#374151' : '#e5e7eb', borderRadius: '12px' }}
                          itemStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
                        />
                        <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className={`flex items-center justify-center h-[300px] ${textSecondary}`}>لا توجد نتائج واجبات بعد</div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
