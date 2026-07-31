import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import AdminLoginPage from './components/auth/AdminLoginPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import LandingPage from './components/landing/LandingPage';
import { lazy, Suspense } from 'react';
import ErrorBoundary from './components/shared/ErrorBoundary';

const StudentOnlineDashboard = lazy(() => import('./components/student-online/StudentOnlineDashboard'));
const StudentCenterDashboard = lazy(() => import('./components/student-center/StudentCenterDashboard'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./components/teacher/TeacherDashboard'));
const ParentDashboard = lazy(() => import('./components/parent/ParentDashboard'));
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SocketProvider>
          <AuthProvider>
            <BrowserRouter>
            <div className="size-full" dir="rtl">
              <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <Routes>
                  {/* Landing & Auth */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Student Online Dashboard */}
                  <Route element={<ProtectedRoute allowedRoles={['ONLINE_STUDENT']} />}>
                    <Route path="/student/online/*" element={<StudentOnlineDashboard />} />
                  </Route>

                  {/* Student Center Dashboard */}
                  <Route element={<ProtectedRoute allowedRoles={['CENTER_STUDENT']} />}>
                    <Route path="/student/center/*" element={<StudentCenterDashboard />} />
                  </Route>

                  {/* Teacher Dashboard */}
                  <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
                    <Route path="/teacher/*" element={<TeacherDashboard />} />
                  </Route>

                  {/* Parent Dashboard */}
                  <Route element={<ProtectedRoute allowedRoles={['PARENT']} />}>
                    <Route path="/parent/*" element={<ParentDashboard />} />
                  </Route>

                  {/* Admin Dashboard */}
                  <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                    <Route path="/admin/*" element={<AdminDashboard />} />
                  </Route>

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
            </BrowserRouter>
          </AuthProvider>
        </SocketProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
