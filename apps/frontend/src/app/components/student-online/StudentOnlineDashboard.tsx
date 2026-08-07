import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Video, FileText, ClipboardCheck, BarChart3, MessageCircle, User, Home, BookOpen, Brain, Target } from 'lucide-react';
import SharedLayout, { MenuItem } from '../shared/SharedLayout';
import VideosPage from './VideosPage';
import VideoPlayerPage from './VideoPlayerPage';
import HomeworkPage from '../student-shared/HomeworkPage';
import ExamsPage from '../student-shared/ExamsPage';
import ResultsPage from './ResultsPage';
import ChatbotPage from '../student-shared/ChatbotPage';
import ProfilePage from '../student-shared/ProfilePage';
import CoursesPage from './CoursesPage';
import CourseDetailsPage from './CourseDetailsPage';
import StudentHomePage from './StudentHomePage';
import AIMathSolverPage from '../ai/AIMathSolverPage';
import AdaptiveLearningPage from '../ai/AdaptiveLearningPage';
import { userService } from '../../services/user.service';
import { homeworkService } from '../../services/homework.service';

const menuItems: MenuItem[] = [
  { path: '/student/online/home', icon: Home, label: 'الرئيسية' },
  { path: '/student/online/courses', icon: BookOpen, label: 'دوراتي' },
  { path: '/student/online/videos', icon: Video, label: 'الفيديوهات' },
  { path: '/student/online/homework', icon: FileText, label: 'الواجبات', badge: 2 },
  { path: '/student/online/exams', icon: ClipboardCheck, label: 'الامتحانات' },
  { path: '/student/online/results', icon: BarChart3, label: 'نتائجي' },
  { path: '/student/online/solver', icon: Brain, label: 'حل المسائل AI' },
  { path: '/student/online/learning-path', icon: Target, label: 'مسار التعلم' },
  { path: '/student/online/chatbot', icon: MessageCircle, label: 'المساعد الذكي' },
  { path: '/student/online/profile', icon: User, label: 'ملفي الشخصي' },
];

export default function StudentOnlineDashboard() {
  const [profileName, setProfileName] = useState('جاري التحميل...');
  const [pendingHomework, setPendingHomework] = useState(0);

  useEffect(() => {
    userService.getProfile()
      .then(user => setProfileName(user?.name || 'طالب'))
      .catch(() => setProfileName('طالب أونلاين'));

    homeworkService.getHomeworks()
      .then(res => {
        const data = res.data.data ? res.data.data : Array.isArray(res.data) ? res.data : [];
        if(data.length > 0) {
          const pending = data.filter((h: any) => h.status === 'draft' || h.status === 'pending');
          setPendingHomework(pending.length);
        }
      })
      .catch(() => setPendingHomework(0));
  }, []);

  const dynamicMenuItems: MenuItem[] = menuItems.map(item => 
    item.label === 'الواجبات' ? { ...item, badge: pendingHomework > 0 ? pendingHomework : undefined } : item
  );

  return (
    <SharedLayout
      menuItems={dynamicMenuItems}
      title="منصة الطالب الأونلاين"
      subtitle={profileName}
      accentColor="indigo"
      gradientFrom="indigo-600"
      gradientTo="blue-600"
      logoutPath="/login"
    >
      <Routes>
        <Route path="/" element={<Navigate to="/student/online/home" replace />} />
        <Route path="/home" element={<StudentHomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailsPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/videos/:videoId" element={<VideoPlayerPage />} />
        <Route path="/homework" element={<HomeworkPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/solver" element={<AIMathSolverPage />} />
        <Route path="/learning-path" element={<AdaptiveLearningPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </SharedLayout>
  );
}
