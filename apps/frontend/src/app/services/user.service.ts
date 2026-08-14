import { userApi } from './api';
import { User, UserRole } from '../contexts/AuthContext';

export interface UpdateProfileData {
  name?: string;
  email?: string;
  password?: string;
}

export interface UserFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export const userService = {
  getProfile: async (): Promise<User> => {
    const response = await userApi.get('/profile');
    return response.data;
  },

  updateProfile: async (id: string, data: UpdateProfileData): Promise<User> => {
    const response = await userApi.put(`/users/${id}`, data);
    return response.data.user;
  },

  getUsers: async (filters: UserFilters): Promise<{ data: User[], total: number, page: number, limit: number, totalPages: number }> => {
    const response = await userApi.get('/users', { params: filters });
    return response.data;
  },

  createUser: async (data: any): Promise<User> => {
    const response = await userApi.post('/users', data);
    return response.data.user;
  },

  updateUser: async (id: string, data: any): Promise<User> => {
    const response = await userApi.put(`/users/${id}`, data);
    return response.data.user;
  },

  deleteUser: async (id: string): Promise<void> => {
    await userApi.delete(`/users/${id}`);
  },

  getChildren: async (): Promise<User[]> => {
    const response = await userApi.get('/parent/children');
    return response.data;
  },

  getAttendance: async (): Promise<any[]> => {
    // Assuming attendance routes are nested under users or we can just use the userApi wrapper for authorized requests
    const response = await userApi.get('/attendance/my-attendance');
    return response.data;
  },

  getRisks: async (): Promise<any[]> => {
    const response = await userApi.get('/risks');
    return response.data;
  }
};
