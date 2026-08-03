import { useState } from 'react';
import { Upload, Video, Youtube, X } from 'lucide-react';

export default function VideosManagementPage() {
  const [activeTab, setActiveTab] = useState<'online' | 'center'>('online');
  const [showModal, setShowModal] = useState(false);

  const onlineVideos = [
    { id: 1, title: 'مقدمة في الجبر', course: 'الجبر', duration: '15:30', status: 'نشط' },
    { id: 2, title: 'المعادلات الخطية', course: 'الجبر', duration: '20:15', status: 'نشط' },
  ];

  const centerVideos = [
    { id: 1, title: 'الهندسة الإقليدية', course: 'الهندسة', youtubeId: 'dQw4w9WgXcQ', status: 'نشط' },
    { id: 2, title: 'حساب المثلثات', course: 'الرياضيات', youtubeId: 'dQw4w9WgXcQ', status: 'نشط' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة الفيديوهات</h1>
          <p className="text-gray-600">رفع وإدارة فيديوهات الدروس</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
        >
          <Upload className="w-5 h-5" />
          <span>إضافة فيديو</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('online')}
              className={`flex-1 px-6 py-4 font-medium ${
                activeTab === 'online'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Video className="w-5 h-5" />
                <span>فيديوهات الأونلاين</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('center')}
              className={`flex-1 px-6 py-4 font-medium ${
                activeTab === 'center'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Youtube className="w-5 h-5" />
                <span>فيديوهات السنتر (يوتيوب)</span>
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'online' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4 font-medium text-gray-700">العنوان</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">الدورة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">المدة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {onlineVideos.map((video) => (
                    <tr key={video.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{video.title}</td>
                      <td className="py-3 px-4 text-gray-600">{video.course}</td>
                      <td className="py-3 px-4 text-gray-600">{video.duration}</td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                          {video.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-red-600 hover:text-red-800">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4 font-medium text-gray-700">العنوان</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">الدورة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">معرف يوتيوب</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {centerVideos.map((video) => (
                    <tr key={video.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{video.title}</td>
                      <td className="py-3 px-4 text-gray-600">{video.course}</td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-sm">{video.youtubeId}</td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                          {video.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-red-600 hover:text-red-800">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'online' ? 'رفع فيديو للأونلاين' : 'إضافة فيديو يوتيوب'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عنوان الفيديو</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الدورة</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option>الجبر</option>
                  <option>الهندسة</option>
                  <option>حساب المثلثات</option>
                </select>
              </div>

              {activeTab === 'online' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رفع الفيديو</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">اضغط لرفع الفيديو</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رابط يوتيوب</label>
                  <input
                    type="text"
                    placeholder="أدخل رابط الفيديو على يوتيوب"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  رفع
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
