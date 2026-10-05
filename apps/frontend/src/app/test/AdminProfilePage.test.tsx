import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminProfilePage from '../components/admin/AdminProfilePage';
import { userService } from '../services/user.service';
import { analyticsService } from '../services/analytics.service';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

vi.mock('../services/user.service', () => ({
  userService: {
    getProfile: vi.fn().mockResolvedValue({ id: 'admin-123', name: 'المدير العام', email: 'admin@edu.com', role: 'ADMIN' }),
    updateProfile: vi.fn().mockResolvedValue({ id: 'admin-123', name: 'المدير العام', email: 'admin@edu.com', role: 'ADMIN' }),
    changePassword: vi.fn()
  }
}));

vi.mock('../services/analytics.service', () => ({
  analyticsService: {
    getAdminAnalytics: vi.fn().mockResolvedValue({
      data: {
        overview: {
          totalUsers: 1,
          totalCourses: 0
        }
      }
    })
  }
}));

const mockUser = { id: 'admin-123', name: 'المدير العام', email: 'admin@edu.com', role: 'ADMIN' };
const mockCheckAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    checkAuth: mockCheckAuth
  }),
  AuthProvider: ({ children }: any) => children
}));


const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
};

describe('AdminProfilePage - Password Change Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders profile data and change password card in Arabic RTL', async () => {
    renderWithProviders(<AdminProfilePage />);


    expect(await screen.findByText('الملف الشخصي للمسؤول')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /تغيير كلمة المرور/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تغيير كلمة المرور/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('أدخل كلمة المرور الحالية')).toBeInTheDocument();

    expect(screen.getByPlaceholderText('6 أحرف على الأقل')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('أعد إدخال كلمة المرور الجديدة')).toBeInTheDocument();
  });

  it('shows validation error when fields are empty', async () => {
    renderWithProviders(<AdminProfilePage />);

    const submitBtn = await screen.findByRole('button', { name: /تغيير كلمة المرور/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('يرجى إدخال كلمة المرور الحالية')).toBeInTheDocument();
    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  it('shows error when new password is too short (< 6 characters)', async () => {
    renderWithProviders(<AdminProfilePage />);

    const currentInput = await screen.findByPlaceholderText('أدخل كلمة المرور الحالية');
    const newInput = screen.getByPlaceholderText('6 أحرف على الأقل');
    const confirmInput = screen.getByPlaceholderText('أعد إدخال كلمة المرور الجديدة');

    fireEvent.change(currentInput, { target: { value: 'CurrentPass123' } });
    fireEvent.change(newInput, { target: { value: '123' } });
    fireEvent.change(confirmInput, { target: { value: '123' } });

    const submitBtn = screen.getByRole('button', { name: /تغيير كلمة المرور/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف')).toBeInTheDocument();
    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  it('shows error when confirmation password does not match', async () => {
    renderWithProviders(<AdminProfilePage />);

    const currentInput = await screen.findByPlaceholderText('أدخل كلمة المرور الحالية');
    const newInput = screen.getByPlaceholderText('6 أحرف على الأقل');
    const confirmInput = screen.getByPlaceholderText('أعد إدخال كلمة المرور الجديدة');

    fireEvent.change(currentInput, { target: { value: 'CurrentPass123' } });
    fireEvent.change(newInput, { target: { value: 'NewPass123456' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass123456' } });

    const submitBtn = screen.getByRole('button', { name: /تغيير كلمة المرور/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('كلمة المرور الجديدة وتأكيدها غير متطابقين')).toBeInTheDocument();
    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  it('successfully submits password change and shows success banner', async () => {
    (userService.changePassword as any).mockResolvedValue({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });

    renderWithProviders(<AdminProfilePage />);

    const currentInput = await screen.findByPlaceholderText('أدخل كلمة المرور الحالية');
    const newInput = screen.getByPlaceholderText('6 أحرف على الأقل');
    const confirmInput = screen.getByPlaceholderText('أعد إدخال كلمة المرور الجديدة');

    fireEvent.change(currentInput, { target: { value: 'OldPassword123' } });
    fireEvent.change(newInput, { target: { value: 'NewSecurePassword123!' } });
    fireEvent.change(confirmInput, { target: { value: 'NewSecurePassword123!' } });

    const submitBtn = screen.getByRole('button', { name: /تغيير كلمة المرور/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(userService.changePassword).toHaveBeenCalledWith('OldPassword123', 'NewSecurePassword123!');
    });

    expect(await screen.findByText('تم تغيير كلمة المرور بنجاح')).toBeInTheDocument();
  });
});
