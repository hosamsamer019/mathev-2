import { useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  LogOut, Bell, Sun, Moon, ChevronLeft, ChevronRight,
  Search, Settings, Menu, X
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import NotificationsPanel from './NotificationsPanel';

export interface MenuItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}

// Color presets to avoid dynamic Tailwind class generation
const colorPresets: Record<string, { headerBg: string; activeBg: string; avatarBg: string; ring: string }> = {
  'indigo-600': {
    headerBg: 'bg-gradient-to-l from-indigo-600 to-blue-600',
    activeBg: 'bg-gradient-to-l from-indigo-600 to-blue-600',
    avatarBg: 'bg-gradient-to-br from-indigo-500 to-blue-600',
    ring: 'focus:ring-indigo-500',
  },
  'violet-600': {
    headerBg: 'bg-gradient-to-l from-violet-600 to-purple-700',
    activeBg: 'bg-gradient-to-l from-violet-600 to-purple-700',
    avatarBg: 'bg-gradient-to-br from-violet-500 to-purple-700',
    ring: 'focus:ring-violet-500',
  },
  'emerald-600': {
    headerBg: 'bg-gradient-to-l from-emerald-600 to-teal-600',
    activeBg: 'bg-gradient-to-l from-emerald-600 to-teal-600',
    avatarBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    ring: 'focus:ring-emerald-500',
  },
  'cyan-600': {
    headerBg: 'bg-gradient-to-l from-cyan-600 to-blue-600',
    activeBg: 'bg-gradient-to-l from-cyan-600 to-blue-600',
    avatarBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    ring: 'focus:ring-cyan-500',
  },
  'green-600': {
    headerBg: 'bg-gradient-to-l from-green-600 to-emerald-600',
    activeBg: 'bg-gradient-to-l from-green-600 to-emerald-600',
    avatarBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    ring: 'focus:ring-green-500',
  },
};

interface SharedLayoutProps {
  children: ReactNode;
  menuItems: MenuItem[];
  title: string;
  subtitle: string;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  logoutPath?: string;
}

export default function SharedLayout({
  children,
  menuItems,
  title,
  subtitle,
  gradientFrom,
  logoutPath = '/login',
}: SharedLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const colors = colorPresets[gradientFrom] || colorPresets['indigo-600'];

  const handleLogout = () => {
    logout();
    navigate(logoutPath);
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const sidebarContent = (
    <div className={`flex flex-col h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo / Header */}
      <div className={`p-4 ${colors.headerBg} flex items-center gap-3`}>
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">م</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-white text-sm font-bold leading-tight">{title}</h1>
            <p className="text-white/70 text-xs truncate">{subtitle}</p>
          </div>
        )}
      </div>

      {/* User Card */}
      {!collapsed && (
        <div className={`mx-3 mt-4 p-3 rounded-xl ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${colors.avatarBg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {user?.name?.charAt(0) || 'م'}
            </div>
            <div className="overflow-hidden">
              <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {user?.name || 'المستخدم'}
              </p>
              <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {user?.grade || user?.institution || 'منصة التعلم'}
              </p>
            </div>
          </div>
          {user?.subscriptionPlan && (
            <div className="mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                user.subscriptionPlan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                user.subscriptionPlan === 'pro' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {user.subscriptionPlan === 'enterprise' ? '⭐ مؤسسي' : user.subscriptionPlan === 'pro' ? '🚀 احترافي' : '🔹 أساسي'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                active
                  ? `${colors.activeBg} text-white shadow-md`
                  : isDark
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
              {!collapsed && <span className="text-sm font-medium flex-1 text-right">{item.label}</span>}
              {!collapsed && item.badge && item.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge && item.badge > 0 && (
                <span className="absolute top-1 left-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className={`p-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} space-y-1`}>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">الإعدادات</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">تسجيل الخروج</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex flex-col ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-l shadow-lg transition-all duration-300 z-30 flex-shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ left: collapsed ? '-12px' : `${256 - 12}px` }}
          className={`fixed top-20 w-6 h-6 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-500'} border ${isDark ? 'border-gray-600' : 'border-gray-200'} shadow flex items-center justify-center z-50 transition-all duration-300`}
        >
          {collapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {sidebarContent}
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={`fixed top-0 right-0 h-full w-72 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-2xl z-50 lg:hidden transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 left-4 p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-72 h-full overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className={`sticky top-0 z-20 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm px-4 lg:px-6 py-3 flex items-center gap-4`}>
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(true)}
            className={`lg:hidden p-2 rounded-lg ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className={`absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المنصة..."
              className={`w-full pr-10 pl-4 py-2 rounded-lg text-sm ${isDark ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' : 'bg-gray-50 text-gray-900 placeholder-gray-400 border-gray-200'} border focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            />
          </div>

          <div className="flex items-center gap-2 mr-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg relative transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              {showNotifications && (
                <NotificationsPanel onClose={() => setShowNotifications(false)} isDark={isDark} />
              )}
            </div>

            {/* User Avatar */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors cursor-pointer`}>
              <div className={`w-8 h-8 rounded-full ${colors.avatarBg} flex items-center justify-center text-white font-bold text-sm`}>
                {user?.name?.charAt(0) || 'م'}
              </div>
              <span className={`text-sm font-medium hidden md:block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {user?.name?.split(' ')[0] || 'المستخدم'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Click outside notifications */}
      {showNotifications && (
        <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
      )}
    </div>
  );
}
