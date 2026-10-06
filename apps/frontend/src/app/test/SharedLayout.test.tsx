import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SharedLayout, { MenuItem } from '../components/shared/SharedLayout';
import { ThemeProvider } from '../contexts/ThemeContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Home } from 'lucide-react';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'الأستاذ أحمد', role: 'TEACHER' },
    logout: vi.fn(),
  }),
}));

vi.mock('../services/notification.service', () => ({
  notificationService: {
    getUnreadCount: vi.fn().mockResolvedValue({ data: { unreadCount: 0 } }),
    getNotifications: vi.fn().mockResolvedValue({ data: [] }),
    markAsRead: vi.fn().mockResolvedValue({ data: {} }),
    markAllAsRead: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('SharedLayout Sidebar RTL & Collapse/Expand Direction', () => {
  const mockMenuItems: MenuItem[] = [
    { path: '/dashboard', label: 'الرئيسية', icon: Home },
  ];

  const renderLayout = () => {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          <SharedLayout
            menuItems={mockMenuItems}
            title="منصة المعلم الذكي"
            subtitle="لوحة التحكم"
            accentColor="indigo-600"
            gradientFrom="indigo-600"
            gradientTo="blue-600"
          >
            <div>محتوى الصفحة الرئيسية</div>
          </SharedLayout>
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sidebar in expanded state with collapse indicator (ChevronRight)', () => {
    const { container } = renderLayout();

    const desktopAside = container.querySelector('aside.hidden.lg\\:flex');
    expect(desktopAside).toBeInTheDocument();
    expect(desktopAside?.className).toContain('w-64');
    expect(desktopAside?.className).toContain('relative');

    const toggleButton = screen.getByLabelText('طي القائمة الجانبية');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton.className).toContain('absolute');
    expect(toggleButton.className).toContain('-left-3');

    // In expanded state, chevron icon is lucide-chevron-right (indicating collapse into right edge)
    const chevronRight = toggleButton.querySelector('.lucide-chevron-right');
    expect(chevronRight).toBeInTheDocument();
  });

  it('collapses sidebar to w-16 and switches icon to expand indicator (ChevronLeft) on click', async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = renderLayout();
    });

    const desktopAside = renderResult.container.querySelector('aside.hidden.lg\\:flex');
    const toggleButton = screen.getByLabelText('طي القائمة الجانبية');

    // Click to collapse
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(desktopAside?.className).toContain('w-16');
    expect(desktopAside?.className).not.toContain('w-64');

    // Now button aria-label should be expand
    expect(screen.getByLabelText('توسيع القائمة الجانبية')).toBeInTheDocument();

    // In collapsed state, chevron icon is lucide-chevron-left (indicating expand towards the left into view)
    const chevronLeft = toggleButton.querySelector('.lucide-chevron-left');
    expect(chevronLeft).toBeInTheDocument();

    // Click again to expand back
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    expect(desktopAside?.className).toContain('w-64');
    expect(screen.getByLabelText('طي القائمة الجانبية')).toBeInTheDocument();
  });

  it('toggles mobile sidebar between closed (Menu / hamburger) and open (X) icon state', async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = renderLayout();
    });

    const mobileToggle = screen.getByLabelText('Open menu');
    expect(mobileToggle).toBeInTheDocument();
    expect(mobileToggle.getAttribute('aria-expanded')).toBe('false');
    expect(mobileToggle.querySelector('.lucide-menu')).toBeInTheDocument();
    expect(mobileToggle.querySelector('.lucide-x')).toBeNull();

    const mobileAside = renderResult.container.querySelector('aside.lg\\:hidden');
    expect(mobileAside?.className).toContain('translate-x-full');

    // Click to open mobile menu
    await act(async () => {
      fireEvent.click(mobileToggle);
    });

    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
    expect(mobileToggle.getAttribute('aria-expanded')).toBe('true');
    expect(mobileToggle.querySelector('.lucide-x')).toBeInTheDocument();
    expect(mobileToggle.querySelector('.lucide-menu')).toBeNull();
    expect(mobileAside?.className).toContain('translate-x-0');

    // Click to close mobile menu
    await act(async () => {
      fireEvent.click(mobileToggle);
    });

    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
    expect(mobileToggle.getAttribute('aria-expanded')).toBe('false');
    expect(mobileToggle.querySelector('.lucide-menu')).toBeInTheDocument();
    expect(mobileToggle.querySelector('.lucide-x')).toBeNull();
    expect(mobileAside?.className).toContain('translate-x-full');
  });
});

