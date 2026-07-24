import { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { aiApi } from '../../services/api';

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'أهلاً بك! أنا المساعد الذكي. كيف يمكنني مساعدتك؟',
      sender: 'bot',
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: messages.length + 1,
      text: input,
      sender: 'user',
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.post('/chat', { message: input });
      const botResponse = {
        id: messages.length + 2,
        text: res.data?.reply || 'عذراً، لم أتمكن من فهم ذلك.',
        sender: 'bot',
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (err) {
      console.error(err);
      const errResponse = {
        id: messages.length + 2,
        text: 'حدث خطأ في الاتصال بالخادم.',
        sender: 'bot',
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errResponse]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">المساعد الذكي</h1>
        <p className="text-gray-600">اسأل عن أي شيء</p>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-md flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                message.sender === 'bot' ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {message.sender === 'bot' ? (
                  <Bot className="w-6 h-6 text-green-600" />
                ) : (
                  <User className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div className={`flex flex-col max-w-md ${
                message.sender === 'user' ? 'items-end' : 'items-start'
              }`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  message.sender === 'bot'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-green-600 text-white'
                }`}>
                  <p>{message.text}</p>
                </div>
                <span className="text-xs text-gray-500 mt-1">{message.time}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="اكتب رسالتك..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center min-w-[50px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
