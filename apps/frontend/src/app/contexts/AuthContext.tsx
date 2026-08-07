import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApi } from '../services/api';

export type UserRole = 'ONLINE_STUDENT' | 'CENTER_STUDENT' | 'TEACHER' | 'ADMIN' | 'PARENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  grade?: string;
  institution?: string;
  subscriptionPlan?: 'basic' | 'pro' | 'enterprise';
  isActive: boolean;
  parentId?: string;
  centerGroupId?: string;
  centerGroup?: any; // extended data from profile
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string; role: UserRole }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('edu-user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const syncAuth = (e: StorageEvent) => {
      if (e.key === 'edu-user') {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
      if (e.key === 'token' && !e.newValue) {
        setUser(null);
      }
    };
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  const fetchExtendedProfile = async (baseUser: Partial<User>) => {
    try {
      const { userService } = await import('../services/user.service');
      const profile = await userService.getProfile();
      return { ...baseUser, ...profile };
    } catch (e) {
      console.warn('Failed to fetch extended profile, using base user');
      return baseUser as User;
    }
  };

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const response = await authApi.post('/login', { email, password, role });
      const { token, user: loggedUser } = response.data;
      
      localStorage.setItem('token', token);
      
      // Fetch extended profile
      const fullUser = await fetchExtendedProfile(loggedUser);
      
      setUser(fullUser);
      localStorage.setItem('edu-user', JSON.stringify(fullUser));
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (data: { name: string; email: string; password: string; role: UserRole }): Promise<void> => {
    const response = await authApi.post('/register', data);
    const { token, user: registeredUser } = response.data;
    
    localStorage.setItem('token', token);
    
    const fullUser = await fetchExtendedProfile(registeredUser);
    
    setUser(fullUser);
    localStorage.setItem('edu-user', JSON.stringify(fullUser));
  };

  const logout = async () => {
    try {
      await authApi.post('/logout');
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('edu-user');
    }
  };

  const checkAuth = async () => {
    try {
      let baseUser: any = null;
      try {
        const res = await authApi.get('/me');
        baseUser = res.data;
      } catch (authErr) {
        // Fallback if /me fails
        const { userService } = await import('../services/user.service');
        baseUser = await userService.getProfile();
      }
      
      if (baseUser) {
        const fullUser = await fetchExtendedProfile(baseUser);
        setUser(fullUser);
        localStorage.setItem('edu-user', JSON.stringify(fullUser));
      }
    } catch (err) {
      console.error('checkAuth failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, checkAuth, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
