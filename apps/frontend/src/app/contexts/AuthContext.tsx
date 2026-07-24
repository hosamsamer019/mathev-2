import { createContext, useContext, useState, ReactNode } from 'react';
import { authApi } from '../services/api';

export type UserRole = 'student_online' | 'student_center' | 'teacher' | 'admin' | 'parent';

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
      
      const roleMap: Record<string, UserRole> = {
        'ADMIN': 'admin',
        'TEACHER': 'teacher',
        'ONLINE_STUDENT': 'student_online',
        'CENTER_STUDENT': 'student_center',
        'PARENT': 'parent'
      };
      
      // Ensure the role is mapped to frontend format
      if (loggedUser && loggedUser.role && roleMap[loggedUser.role]) {
        loggedUser.role = roleMap[loggedUser.role];
      }
      
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

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
