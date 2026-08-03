import { Bot, MessageCircle, TrendingUp } from 'lucide-react';

export default function ChatbotManagementPage() {
  const stats = [
    { label: 'إجمالي الرسائل', value: '2,456' },
    { label: 'الطلاب النشطون', value: '342' },
    { label: 'معدل الرضا', value: '95%' },
  ];

  const conversations = [
    { student: 'أحمد محمد', lastMessage: 'ما هو حل المعادلة x + 5 = 10؟', time: 'منذ 5 دقائق', status: 'نشط' },
    { student: 'فاطمة حسن', lastMessage: 'شكراً على المساعدة', time: 'منذ 15 دقيقة', status: 'مكتمل' },
    { student: 'محمد علي', lastMessage: 'أحتاج مساعدة في الهندسة', time: 'منذ ساعة', status: 'نشط' },
  ];

  const commonQuestions = [
    { question: 'ما هو الجبر؟', count: 45 },
    { question: 'كيف أحل المعادلات؟', count: 38 },
    { question: 'ما الفرق بين المعادلة والمتباينة؟', count: 32 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة المساعد الذكي</h1>
        <p className="text-gray-600">مراقبة وإدارة المحادثات مع المساعد الذكي</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-md p-6">
            <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-purple-600">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">المحادثات الأخيرة</h2>
          </div>

          <div className="space-y-4">
            {conversations.map((conv, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-purple-500 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{conv.student}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    conv.status === 'نشط'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {conv.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{conv.lastMessage}</p>
                <p className="text-xs text-gray-500">{conv.time}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">الأسئلة الشائعة</h2>
          </div>

          <div className="space-y-4">
            {commonQuestions.map((q, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{q.question}</p>
                </div>
                <div className="mr-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{q.count}</p>
                  <p className="text-xs text-gray-600">مرة</p>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700">
            إدارة قاعدة المعرفة
          </button>
        </div>
      </div>
    </div>
  );
}
