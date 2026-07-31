import { createContext, useContext, useState, ReactNode } from 'react';
import { authApi } from '../services/api';

export type UserRole = 'ONLINE_STUDENT' | 'CENTER_STUDENT' | 'TEACHER' | 'ADMIN' | 'PARENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  grade?: string;
  institution?: string;
  subscriptionPlan?: 'basic' | 'pro' | 'enterprise';
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('edu-user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const response = await authApi.post('/login', { email, password, role });
      const { token, user: loggedUser } = response.data;
      
      setUser(loggedUser);
      localStorage.setItem('token', token);
      localStorage.setItem('edu-user', JSON.stringify(loggedUser));
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('edu-user');
  };

  const checkAuth = async () => {
    try {
      const res = await authApi.get('/me').catch(async () => {
        // Fallback to user-service profile if auth /me isn't available
        const { userApi } = await import('../services/api');
        return await userApi.get('/profile');
      });
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('edu-user', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('checkAuth failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, checkAuth, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
