import { useState, useEffect } from 'react';
import { Bot, MessageCircle, TrendingUp } from 'lucide-react';
import { aiService } from '../../services/ai.service';

export default function ChatbotManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    aiService.getAnalytics()
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch AI analytics', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'إجمالي الرسائل', value: data?.totalMessages || 0 },
    { label: 'الطلاب النشطون', value: data?.activeStudents || 0 },
    { label: 'معدل الرضا', value: data ? `${data.satisfactionRate}%` : '0%' },
  ];

  const conversations = data?.conversations || [];
  const commonQuestions = data?.commonQuestions || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">إدارة المساعد الذكي</h1>
        <p className="text-gray-600 dark:text-gray-400">مراقبة وإدارة المحادثات مع المساعد الذكي</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">جاري تحميل البيانات...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-md p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">المحادثات الأخيرة</h2>
          </div>

          <div className="space-y-4">
            {conversations.map((conv: any, idx: number) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/30 rounded-lg p-4 hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">{conv.student}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    conv.status === 'نشط'
                      ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}>
                    {conv.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{conv.lastMessage}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{conv.time}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">الأسئلة الشائعة</h2>
          </div>

          <div className="space-y-4">
            {commonQuestions.map((q: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{q.question}</p>
                </div>
                <div className="mr-4 text-center">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{q.count}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">مرة</p>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors">
            إدارة قاعدة المعرفة
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
