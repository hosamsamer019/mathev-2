import { Routes, Route, Navigate } from 'react-router-dom';
import { Home, Video, FileText, ClipboardCheck, MessageCircle, User, Brain, Target } from 'lucide-react';
import SharedLayout, { MenuItem } from '../shared/SharedLayout';
import LessonsPage from './LessonsPage';
import HomeworkPage from '../student-shared/HomeworkPage';
import ExamsPage from '../student-shared/ExamsPage';
import ChatbotPage from '../student-shared/ChatbotPage';
import AttendancePage from './AttendancePage';
import ProfilePage from '../student-shared/ProfilePage';
import AIMathSolverPage from '../ai/AIMathSolverPage';
import AdaptiveLearningPage from '../ai/AdaptiveLearningPage';
import { useState, useEffect } from 'react';
import { userService } from '../../services/user.service';
import { homeworkService } from '../../services/homework.service';

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
    userService.getProfile()
      .then(user => setProfileName(user?.name || 'طالب سنتر'))
      .catch(() => setProfileName('طالب سنتر'));

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
