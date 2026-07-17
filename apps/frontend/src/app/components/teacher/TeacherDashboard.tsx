import { Routes, Route, Navigate } from 'react-router';
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

const menuItems: MenuItem[] = [
  { path: '/teacher/home', icon: Home, label: 'لوحة التحكم' },
  { path: '/teacher/students', icon: Users, label: 'طلابي', badge: 3 },
  { path: '/teacher/courses', icon: BookOpen, label: 'الدورات والمحتوى' },
  { path: '/teacher/videos', icon: Video, label: 'الفيديوهات' },
  { path: '/teacher/exams', icon: ClipboardCheck, label: 'الامتحانات والواجبات' },
  { path: '/teacher/analytics', icon: BarChart3, label: 'التحليلات والتقارير' },
  { path: '/teacher/ai', icon: Brain, label: 'أدوات الذكاء الاصطناعي' },
  { path: '/teacher/profile', icon: User, label: 'الملف الشخصي' },
];

export default function TeacherDashboard() {
  return (
    <SharedLayout
      menuItems={menuItems}
      title="لوحة المعلم"
      subtitle="أ. محمد إبراهيم"
      accentColor="emerald"
      gradientFrom="emerald-600"
      gradientTo="teal-600"
      logoutPath="/login"
    >
      <Routes>
        <Route path="/" element={<Navigate to="/teacher/home" replace />} />
        <Route path="/home" element={<TeacherHomePage />} />
        <Route path="/students" element={<TeacherStudentsPage />} />
        <Route path="/courses" element={<TeacherCoursesPage />} />
        <Route path="/videos" element={<TeacherCoursesPage />} />
        <Route path="/exams" element={<TeacherExamsPage />} />
        <Route path="/analytics" element={<TeacherAnalyticsPage />} />
        <Route path="/ai" element={<TeacherAIPage />} />
        <Route path="/profile" element={<TeacherProfilePage />} />
      </Routes>
    </SharedLayout>
  );
}
