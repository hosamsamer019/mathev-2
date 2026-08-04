import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Plus, MessageCircle } from 'lucide-react';
import { aiApi } from '../../services/api';

export default function ChatbotPage() {
  const [messages, setMessages] = useState<any[]>([
    { id: 'welcome', text: 'مرحباً! أنا المساعد الذكي. كيف يمكنني مساعدتك اليوم؟', sender: 'bot', time: '10:00' },
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'ما هو الجبر؟',
    'كيف أحل معادلة من الدرجة الأولى؟',
    'أعطني أمثلة على المتباينات',
    'ما الفرق بين المعادلة والمتباينة؟',
  ];

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await aiApi.get('/sessions');
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await aiApi.post('/sessions');
      setSessionId(res.data.id);
      setSessions(prev => [res.data, ...prev]);
      setMessages([
        { id: 'welcome', text: 'مرحباً! أنا المساعد الذكي. كيف يمكنني مساعدتك اليوم؟', sender: 'bot', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } catch (err) {
      console.error('Failed to create session', err);
    }
  };

  const loadSession = async (id: string) => {
    try {
      const res = await aiApi.get(`/sessions/${id}`);
      setSessionId(id);
      if (res.data?.messages && Array.isArray(res.data.messages)) {
        setMessages(res.data.messages.map((m: any) => ({
          id: m.id,
          text: m.content,
          sender: m.role === 'user' ? 'user' : 'bot',
          time: new Date(m.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        })));
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load session', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Auto-create session if none exists
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        const res = await aiApi.post('/sessions');
        currentSessionId = res.data.id;
        setSessionId(currentSessionId);
        setSessions(prev => [res.data, ...prev]);
      } catch (err) {
        alert('فشل إنشاء جلسة محادثة جديدة.');
        return;
      }
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      text: input,
      sender: 'user',
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(aiApi.defaults.baseURL + '/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: userInput
        })
      });

      if (!response.ok) {
        throw new Error(response.status === 429 ? '429' : 'Error');
      }

      setLoading(false);
      const botMessageId = `bot-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: botMessageId,
        text: '',
        sender: 'bot',
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.replace('data: ', ''));
                if (data.content) {
                  setMessages(prev => (Array.isArray(prev) ? prev : []).map(m => m.id === botMessageId ? { ...m, text: m.text + data.content } : m));
                }
                if (data.error) {
                   setMessages(prev => (Array.isArray(prev) ? prev : []).map(m => m.id === botMessageId ? { ...m, text: m.text + '\n[خطأ: ' + data.error + ']' } : m));
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (err: any) {
      setLoading(false);
      const errorMsg = err.message === '429'
        ? 'تم تجاوز الحد المسموح من الرسائل. انتظر قليلاً.'
        : 'حدث خطأ أثناء الاتصال بالمساعد الذكي.';
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        text: errorMsg,
        sender: 'bot',
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">المساعد الذكي</h1>
          <p className="text-gray-600">اسأل أي سؤال متعلق بالرياضيات</p>
        </div>
        <button onClick={createNewSession} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          <span>محادثة جديدة</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden">
        {/* Sessions sidebar */}
        {sessions.length > 0 && (
          <div className="hidden md:block w-64 bg-white rounded-xl shadow-md p-4 overflow-y-auto flex-shrink-0">
            <h3 className="font-bold text-gray-700 mb-3 text-sm">المحادثات السابقة</h3>
            <div className="space-y-2">
              {(Array.isArray(sessions) ? sessions : []).map(s => (
                <button
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className={`w-full text-right p-3 rounded-lg text-sm transition-colors flex items-center gap-2 ${sessionId === s.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{s.messages?.[0]?.content?.substring(0, 30) || 'محادثة جديدة'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 bg-white rounded-xl shadow-md flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {(Array.isArray(messages) ? messages : []).map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'bot' ? 'bg-indigo-100' : 'bg-green-100'
                }`}>
                  {message.sender === 'bot' ? (
                    <Bot className="w-6 h-6 text-indigo-600" />
                  ) : (
                    <User className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <div className={`flex flex-col max-w-md ${
                  message.sender === 'user' ? 'items-end' : 'items-start'
                }`}>
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.sender === 'bot'
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-indigo-600 text-white'
                  }`}>
                    <p>{message.text}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">{message.time}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100">
                  <Bot className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-gray-100">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-6 pb-4">
              <p className="text-sm text-gray-600 mb-3">أسئلة مقترحة:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Array.isArray(suggestedQuestions) ? suggestedQuestions : []).map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(question)}
                    className="text-right p-3 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-sm"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 sm:p-6 border-t border-gray-200">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="اكتب سؤالك هنا..."
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
