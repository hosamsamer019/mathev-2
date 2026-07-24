import { Routes, Route, Navigate } from 'react-router';
import { Home, Video, FileText, ClipboardCheck, MessageCircle, User, Brain, Target } from 'lucide-react';
import SharedLayout, { MenuItem } from '../shared/SharedLayout';
import LessonsPage from './LessonsPage';
import HomeworkPage from './HomeworkPage';
import ExamsPage from './ExamsPage';
import ChatbotPage from './ChatbotPage';
import AttendancePage from './AttendancePage';
import ProfilePage from './ProfilePage';
import AIMathSolverPage from '../ai/AIMathSolverPage';
import AdaptiveLearningPage from '../ai/AdaptiveLearningPage';
import { useState, useEffect } from 'react';
import { userApi, courseApi, homeworkApi } from '../../services/api';

const menuItems: MenuItem[] = [
  { path: '/student/center/home', icon: Home, label: 'الرئيسية' },
  { path: '/student/center/lessons', icon: Video, label: 'الدروس والفيديوهات' },
  { path: '/student/center/homework', icon: FileText, label: 'الواجبات', badge: 1 },
  { path: '/student/center/exams', icon: ClipboardCheck, label: 'الامتحانات' },
  { path: '/student/center/solver', icon: Brain, label: 'حل المسائل AI' },
  { path: '/student/center/learning-path', icon: Target, label: 'مسار التعلم' },
  { path: '/student/center/chatbot', icon: MessageCircle, label: 'المساعد الذكي' },
  { path: '/student/center/attendance', icon: ClipboardCheck, label: 'الغياب والحضور' },
  { path: '/student/center/profile', icon: User, label: 'ملفي الشخصي' },
];

export default function StudentCenterDashboard() {
  const [profileName, setProfileName] = useState('جاري التحميل...');
  const [pendingHomework, setPendingHomework] = useState(0);

  useEffect(() => {
    userApi.get('/profile')
      .then(res => setProfileName(res.data?.name || res.data?.firstName + ' ' + res.data?.lastName || 'طالب سنتر'))
      .catch(() => setProfileName('طالب سنتر'));

    homeworkApi.get('/')
      .then(res => {
        if(res.data) {
          const pending = res.data.filter((h: any) => h.status === 'draft' || h.status === 'pending');
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
      title="منصة طالب السنتر"
      subtitle={profileName}
      accentColor="green"
      gradientFrom="green-600"
      gradientTo="emerald-600"
      logoutPath="/login"
    >
      <Routes>
        <Route path="/" element={<Navigate to="/student/center/lessons" replace />} />
        <Route path="/home" element={<LessonsPage />} />
        <Route path="/lessons" element={<LessonsPage />} />
        <Route path="/homework" element={<HomeworkPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/solver" element={<AIMathSolverPage />} />
        <Route path="/learning-path" element={<AdaptiveLearningPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </SharedLayout>
  );
}
