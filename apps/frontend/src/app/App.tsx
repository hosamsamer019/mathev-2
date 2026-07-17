import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import AdminLoginPage from './components/auth/AdminLoginPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import LandingPage from './components/landing/LandingPage';
import StudentOnlineDashboard from './components/student-online/StudentOnlineDashboard';
import StudentCenterDashboard from './components/student-center/StudentCenterDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import ParentDashboard from './components/parent/ParentDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="size-full" dir="rtl">
            <Routes>
              {/* Landing & Auth */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Student Online Dashboard */}
              <Route element={<ProtectedRoute allowedRoles={['student_online']} />}>
                <Route path="/student/online/*" element={<StudentOnlineDashboard />} />
              </Route>

              {/* Student Center Dashboard */}
              <Route element={<ProtectedRoute allowedRoles={['student_center']} />}>
                <Route path="/student/center/*" element={<StudentCenterDashboard />} />
              </Route>

              {/* Teacher Dashboard */}
              <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                <Route path="/teacher/*" element={<TeacherDashboard />} />
              </Route>

              {/* Parent Dashboard */}
              <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
                <Route path="/parent/*" element={<ParentDashboard />} />
              </Route>

              {/* Admin Dashboard */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/*" element={<AdminDashboard />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
