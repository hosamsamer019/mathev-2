import { useState } from 'react';
import { CreditCard, TrendingUp, Users, DollarSign, Check, Download, Filter } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

const revenueData = [
  { month: 'أكتوبر', revenue: 12400, subscribers: 124 },
  { month: 'نوفمبر', revenue: 15800, subscribers: 158 },
  { month: 'ديسمبر', revenue: 14200, subscribers: 142 },
  { month: 'يناير', revenue: 18900, subscribers: 189 },
  { month: 'فبراير', revenue: 22100, subscribers: 221 },
  { month: 'مارس', revenue: 25600, subscribers: 256 },
  { month: 'أبريل', revenue: 28300, subscribers: 283 },
];

const planDist = [
  { name: 'أساسي', value: 35, color: '#6b7280' },
  { name: 'احترافي', value: 48, color: '#4f46e5' },
  { name: 'مؤسسي', value: 17, color: '#7c3aed' },
];

const recentSubscriptions = [
  { name: 'مدرسة النور الدولية', plan: 'مؤسسي', amount: '٢٩٩ ج.م', date: 'اليوم', status: 'جديد' },
  { name: 'أحمد محمد علي', plan: 'احترافي', amount: '٩٩ ج.م', date: 'اليوم', status: 'تجديد' },
  { name: 'سارة خالد', plan: 'أساسي', amount: '٤٩ ج.م', date: 'أمس', status: 'جديد' },
  { name: 'سنتر المتفوقين', plan: 'مؤسسي', amount: '٢٩٩ ج.م', date: 'أمس', status: 'تجديد' },
  { name: 'فاطمة إبراهيم', plan: 'احترافي', amount: '٩٩ ج.م', date: 'منذ يومين', status: 'إلغاء' },
];

export default function SubscriptionPage() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'subscribers' | 'plans'>('overview');

  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const tooltipStyle = { background: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: 12 };

  return (
    <div className={`p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} min-h-full`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>إدارة الاشتراكات</h1>
          <p className={textSecondary}>مراقبة الإيرادات والمشتركين وخطط الاشتراك</p>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'} hover:bg-gray-50 dark:hover:bg-gray-700`}>
          <Download className="w-4 h-4" /> تصدير Excel
        </button>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إيرادات هذا الشهر', value: '٢٨,٣٠٠ ج.م', change: '+١٠.٥٪', icon: DollarSign, color: 'from-green-500 to-emerald-600' },
          { label: 'إجمالي المشتركين', value: '٢٨٣', change: '+٢٧', icon: Users, color: 'from-blue-500 to-indigo-600' },
          { label: 'معدل التجديد', value: '٨٧٪', change: '+٢٪', icon: TrendingUp, color: 'from-purple-500 to-violet-600' },
          { label: 'متوسط قيمة العميل', value: '٩٩ ج.م', change: '+٥ ج.م', icon: CreditCard, color: 'from-cyan-500 to-blue-600' },
        ].map((kpi, idx) => (
          <div key={idx} className={`${cardBg} border rounded-2xl p-5`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}>
              <kpi.icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-sm ${textSecondary}`}>{kpi.label}</p>
            <div className="flex items-end gap-2 mt-1">
              <span className={`text-xl font-bold ${textPrimary}`}>{kpi.value}</span>
              <span className="text-xs text-green-500 font-medium mb-0.5">{kpi.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className={`lg:col-span-2 ${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>الإيرادات الشهرية</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="month" tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} ج.م`, 'الإيرادات']} />
              <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fill="url(#revGrad)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h2 className={`font-bold ${textPrimary} mb-6`}>توزيع الخطط</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={planDist} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                {planDist.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}٪`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {planDist.map((plan, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: plan.color }} />
                  <span className={`text-sm ${textSecondary}`}>{plan.name}</span>
                </div>
                <span className={`text-sm font-bold ${textPrimary}`}>{plan.value}٪</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Subscriptions */}
      <div className={`${cardBg} border rounded-2xl p-6`}>
        <h2 className={`font-bold ${textPrimary} mb-6`}>أحدث الاشتراكات والمعاملات</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <tr>
                {['العميل', 'الخطة', 'المبلغ', 'التاريخ', 'الحالة'].map((h) => (
                  <th key={h} className={`pb-3 px-3 text-right text-xs font-semibold ${textSecondary}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentSubscriptions.map((sub, idx) => (
                <tr key={idx} className={isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}>
                  <td className="py-4 px-3">
                    <p className={`font-medium ${textPrimary}`}>{sub.name}</p>
                  </td>
                  <td className="py-4 px-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      sub.plan === 'مؤسسي' ? 'bg-purple-100 text-purple-700' :
                      sub.plan === 'احترافي' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{sub.plan}</span>
                  </td>
                  <td className="py-4 px-3">
                    <span className={`font-bold ${textPrimary}`}>{sub.amount}</span>
                  </td>
                  <td className="py-4 px-3">
                    <span className={`text-sm ${textSecondary}`}>{sub.date}</span>
                  </td>
                  <td className="py-4 px-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      sub.status === 'جديد' ? 'bg-green-100 text-green-700' :
                      sub.status === 'تجديد' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>{sub.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
