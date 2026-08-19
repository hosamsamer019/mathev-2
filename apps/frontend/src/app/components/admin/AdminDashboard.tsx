import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Home, Users, BookOpen, Video, ClipboardCheck, FileText,
  MessageCircle, BarChart3, AlertTriangle, CreditCard, Shield, Brain
} from 'lucide-react';
import SharedLayout, { MenuItem } from '../shared/SharedLayout';
import AdminHomePage from './AdminHomePage';
import StudentsPage from './StudentsPage';
import CoursesManagementPage from './CoursesManagementPage';
import ExamsManagementPage from './ExamsManagementPage';
import HomeworkManagementPage from './HomeworkManagementPage';
import ChatbotManagementPage from './ChatbotManagementPage';
import ReportsPage from './ReportsPage';
import RiskDetectionPage from './RiskDetectionPage';
import SubscriptionPage from './SubscriptionPage';
import AdminProfilePage from './AdminProfilePage';
import AdminUsersPage from './AdminUsersPage'; 

const menuItems: MenuItem[] = [
  { path: '/admin/home', icon: Home, label: 'لوحة التحكم' },
  { path: '/admin/profile', icon: Users, label: 'الملف الشخصي' },
  { path: '/admin/users', icon: Shield, label: 'إدارة المستخدمين' },
  { path: '/admin/students', icon: Users, label: 'إدارة الطلاب' },
  { path: '/admin/courses', icon: BookOpen, label: 'إدارة الدورات' },
  { path: '/admin/exams', icon: ClipboardCheck, label: 'الامتحانات' },
  { path: '/admin/homework', icon: FileText, label: 'الواجبات' },
  { path: '/admin/chatbot', icon: MessageCircle, label: 'المساعد الذكي' },
  { path: '/admin/reports', icon: BarChart3, label: 'التقارير' },
  { path: '/admin/risk', icon: AlertTriangle, label: 'كشف الخطر' },
  { path: '/admin/subscriptions', icon: CreditCard, label: 'الاشتراكات' },
];

export default function AdminDashboard() {
  return (
    <SharedLayout
      menuItems={menuItems}
      title="لوحة تحكم الإدارة"
      subtitle="المدير العام"
      accentColor="purple"
      gradientFrom="violet-600"
      gradientTo="purple-700"
      logoutPath="/login"
    >
      <Routes>
        <Route path="/" element={<Navigate to="/admin/home" replace />} />
        <Route path="/home" element={<AdminHomePage />} />
        <Route path="/profile" element={<AdminProfilePage />} />
        <Route path="/users" element={<AdminUsersPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/courses" element={<CoursesManagementPage />} />
        <Route path="/exams" element={<ExamsManagementPage />} />
        <Route path="/homework" element={<HomeworkManagementPage />} />
        <Route path="/chatbot" element={<ChatbotManagementPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/risk" element={<RiskDetectionPage />} />
        <Route path="/subscriptions" element={<SubscriptionPage />} />
      </Routes>
    </SharedLayout>
  );
}
