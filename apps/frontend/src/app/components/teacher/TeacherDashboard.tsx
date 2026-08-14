import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Home, Users, BookOpen, ClipboardCheck, BarChart3,
  MessageCircle, User, FileText, Brain, Video
} from 'lucide-react';
import SharedLayout, { MenuItem } from '../shared/SharedLayout';
import TeacherHomePage from './TeacherHomePage';
import TeacherStudentsPage from './TeacherStudentsPage';
import TeacherCoursesPage from './TeacherCoursesPage';
import TeacherAnalyticsPage from './TeacherAnalyticsPage';
import TeacherExamsPage from './TeacherExamsPage';
import TeacherAIPage from './TeacherAIPage';
import TeacherProfilePage from './TeacherProfilePage';
import TeacherQuestionBankPage from './TeacherQuestionBankPage';
import StudentReportPage from './StudentReportPage';
import { Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const menuItems: MenuItem[] = [
    { path: '/teacher/home', icon: Home, label: t('dashboard') as string },
    { path: '/teacher/students', icon: Users, label: t('students') as string },
    { path: '/teacher/courses', icon: BookOpen, label: t('courses') as string },
    { path: '/teacher/exams', icon: ClipboardCheck, label: t('exams') as string },
    { path: '/teacher/questions', icon: Database, label: t('questionBank') as string },
    { path: '/teacher/analytics', icon: BarChart3, label: t('summary') as string },
    { path: '/teacher/ai', icon: Brain, label: t('aiTools') as string },
    { path: '/teacher/profile', icon: User, label: t('profile') as string },
  ];

  return (
    <SharedLayout
      menuItems={menuItems}
      title={t('teacherDashboard') as string}
      subtitle={user?.name || ''}
      accentColor="emerald"
      gradientFrom="emerald-600"
      gradientTo="teal-600"
      logoutPath="/login"
    >
      <Routes>
        <Route path="/" element={<Navigate to="/teacher/home" replace />} />
        <Route path="/home" element={<TeacherHomePage />} />
        <Route path="/students" element={<TeacherStudentsPage />} />
        <Route path="/students/:id" element={<StudentReportPage />} />
        <Route path="/courses" element={<TeacherCoursesPage />} />
        <Route path="/exams" element={<TeacherExamsPage />} />
        <Route path="/questions" element={<TeacherQuestionBankPage />} />
        <Route path="/analytics" element={<TeacherAnalyticsPage />} />
        <Route path="/ai" element={<TeacherAIPage />} />
        <Route path="/profile" element={<TeacherProfilePage />} />
      </Routes>
    </SharedLayout>
  );
}
