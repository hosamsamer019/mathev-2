import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';
import { vi } from 'vitest';

// Mock AuthContext
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext') as any;
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

import { useAuth } from '../contexts/AuthContext';

describe('ProtectedRoute', () => {
  const renderWithRouter = (ui: React.ReactElement, initialEntry = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
            <Route path="/teacher" element={<div>Teacher Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login if not authenticated', () => {
    (useAuth as any).mockReturnValue({ isAuthenticated: false, user: null });
    renderWithRouter(<div />, '/teacher');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to unauthorized if role does not match', () => {
    (useAuth as any).mockReturnValue({ 
      isAuthenticated: true, 
      user: { role: 'STUDENT' } 
    });
    renderWithRouter(<div />, '/teacher');
    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
  });

  it('renders outlet if authenticated and role matches', () => {
    (useAuth as any).mockReturnValue({ 
      isAuthenticated: true, 
      user: { role: 'TEACHER' } 
    });
    renderWithRouter(<div />, '/teacher');
    expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
  });
});
