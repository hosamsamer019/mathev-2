import { userApi, attendanceApi, authApi } from './api';
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

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const response = await authApi.post('/change-password', { currentPassword, newPassword });
    return response.data;
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

  getDeletionImpact: async (payload: { userIds?: string[], selectAll?: boolean, search?: string, role?: string, excludedIds?: string[] }): Promise<any> => {
    const response = await userApi.post('/users/deletion-impact', payload);
    return response.data;
  },

  bulkDeleteUsers: async (payload: { userIds?: string[], selectAll?: boolean, search?: string, role?: string, excludedIds?: string[] }): Promise<{ count: number }> => {
    const response = await userApi.post('/users/bulk-delete', payload);
    return response.data;
  },

  getChildren: async (): Promise<User[]> => {
    const response = await userApi.get('/parent/children');
    return response.data;
  },

  getAttendance: async (): Promise<any> => {
    const response = await attendanceApi.get('/my-attendance');
    return response.data;
  },

  getStudentAttendanceById: async (studentId: string): Promise<any> => {
    const response = await attendanceApi.get(`/student/${studentId}`);
    return response.data;
  },

  getAttendancePercentage: async (studentId: string): Promise<any> => {
    const response = await attendanceApi.get(`/${studentId}/percentage`);
    return response.data;
  },

  markAttendance: async (payload: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE'; date?: string }): Promise<any> => {
    const response = await attendanceApi.post('/', payload);
    return response.data;
  },

  updateAttendance: async (id: string, payload: { status?: 'PRESENT' | 'ABSENT' | 'LATE'; date?: string }): Promise<any> => {
    const response = await attendanceApi.put(`/${id}`, payload);
    return response.data;
  },

  deleteAttendance: async (id: string): Promise<any> => {
    const response = await attendanceApi.delete(`/${id}`);
    return response.data;
  },

  bulkMarkAttendance: async (payload: { records: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' }>; date?: string }): Promise<any> => {
    const response = await attendanceApi.post('/bulk', payload);
    return response.data;
  },

  getAttendanceByDate: async (date: string): Promise<any> => {
    const response = await attendanceApi.get('/by-date', { params: { date } });
    return response.data;
  },

  getRisks: async (): Promise<any[]> => {
    const response = await userApi.get('/risks');
    return response.data;
  }
};

