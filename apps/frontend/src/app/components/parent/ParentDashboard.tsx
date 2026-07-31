import { Routes, Route, Navigate } from 'react-router-dom';
import { Home, Users, BarChart3, MessageCircle, CreditCard, User } from 'lucide-react';
import SharedLayout, { MenuItem } from '../shared/SharedLayout';
import ParentHomePage from './ParentHomePage';
import ParentChildrenPage from './ParentChildrenPage';
import ParentReportsPage from './ParentReportsPage';
import ParentSubscriptionPage from './ParentSubscriptionPage';
import { useState, useEffect } from 'react';
import { userApi, notificationApi } from '../../services/api';

const menuItems: MenuItem[] = [
  { path: '/parent/home', icon: Home, label: 'الرئيسية' },
  { path: '/parent/children', icon: Users, label: 'متابعة أبنائي' },
  { path: '/parent/reports', icon: BarChart3, label: 'التقارير والنتائج' },
  { path: '/parent/messages', icon: MessageCircle, label: 'التواصل مع المعلم', badge: 2 },
  { path: '/parent/subscription', icon: CreditCard, label: 'الاشتراك والفواتير' },
  { path: '/parent/profile', icon: User, label: 'الملف الشخصي' },
];

export default function ParentDashboard() {
  const [profileName, setProfileName] = useState('جاري التحميل...');
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    userApi.get('/profile')
      .then(res => setProfileName(res.data?.name || (res.data?.firstName ? `${res.data.firstName} ${res.data.lastName || ''}`.trim() : null) || 'ولي أمر'))
      .catch(() => setProfileName('ولي أمر'));

    notificationApi.get('/')
      .then(res => {
        if (Array.isArray(res.data)) {
          setUnreadMessages(res.data.filter((n: any) => !n.read).length);
        }
      })
      .catch(err => console.error('Failed to fetch notifications', err));
  }, []);

  const dynamicMenuItems: MenuItem[] = menuItems.map(item => 
    item.label === 'التواصل مع المعلم' ? { ...item, badge: unreadMessages > 0 ? unreadMessages : undefined } : item
  );

  return (
    <SharedLayout
      menuItems={dynamicMenuItems}
      title="بوابة ولي الأمر"
      subtitle={profileName}
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
