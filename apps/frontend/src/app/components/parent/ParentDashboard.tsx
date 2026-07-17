import { Routes, Route, Navigate } from 'react-router';
import { Home, Users, BarChart3, MessageCircle, CreditCard, User } from 'lucide-react';
import SharedLayout, { MenuItem } from '../shared/SharedLayout';
import ParentHomePage from './ParentHomePage';
import ParentChildrenPage from './ParentChildrenPage';
import ParentReportsPage from './ParentReportsPage';
import ParentSubscriptionPage from './ParentSubscriptionPage';

const menuItems: MenuItem[] = [
  { path: '/parent/home', icon: Home, label: 'الرئيسية' },
  { path: '/parent/children', icon: Users, label: 'متابعة أبنائي' },
  { path: '/parent/reports', icon: BarChart3, label: 'التقارير والنتائج' },
  { path: '/parent/messages', icon: MessageCircle, label: 'التواصل مع المعلم', badge: 2 },
  { path: '/parent/subscription', icon: CreditCard, label: 'الاشتراك والفواتير' },
  { path: '/parent/profile', icon: User, label: 'الملف الشخصي' },
];

export default function ParentDashboard() {
  return (
    <SharedLayout
      menuItems={menuItems}
      title="بوابة ولي الأمر"
      subtitle="محمد علي"
      accentColor="cyan"
      gradientFrom="cyan-600"
      gradientTo="blue-600"
      logoutPath="/login"
    >
      <Routes>
        <Route path="/" element={<Navigate to="/parent/home" replace />} />
        <Route path="/home" element={<ParentHomePage />} />
        <Route path="/children" element={<ParentChildrenPage />} />
        <Route path="/reports" element={<ParentReportsPage />} />
        <Route path="/messages" element={<ParentHomePage />} />
        <Route path="/subscription" element={<ParentSubscriptionPage />} />
        <Route path="/profile" element={<ParentHomePage />} />
      </Routes>
    </SharedLayout>
  );
}
