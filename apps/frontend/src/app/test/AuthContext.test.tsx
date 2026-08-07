import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { vi } from 'vitest';

vi.mock('../services/api', () => ({
  authApi: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../services/user.service', () => ({
  userService: {
    getProfile: vi.fn().mockResolvedValue({ id: '1', name: 'Test User' }),
  }
}));

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('initializes with null user when no token', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logs in successfully and sets user', async () => {
    (authApi.post as any).mockResolvedValue({
      data: {
        token: 'test-token',
        user: { id: '1', role: 'STUDENT', email: 'test@test.com' }
      }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const success = await result.current.login('test@test.com', 'password', 'ONLINE_STUDENT');
      expect(success).toBe(true);
    });

    expect(localStorage.getItem('token')).toBe('test-token');
    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
