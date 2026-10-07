import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CourseDetailsPageOnline from '../components/student-online/CourseDetailsPage';
import CourseDetailsPageCenter from '../components/student-center/CourseDetailsPage';
import StudentCenterDashboard from '../components/student-center/StudentCenterDashboard';
import { courseService } from '../services/course.service';
import { userService } from '../services/user.service';
import { homeworkService } from '../services/homework.service';

vi.mock('../services/course.service', () => ({
  courseService: {
    getCourseDetails: vi.fn(),
    getStudentCourseStats: vi.fn(),
    getCourses: vi.fn(),
    getAvailableCourses: vi.fn(),
  },
}));

vi.mock('../services/user.service', () => ({
  userService: {
    getProfile: vi.fn(),
    getAttendance: vi.fn(),
  },
}));

vi.mock('../services/homework.service', () => ({
  homeworkService: {
    getHomeworks: vi.fn(),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 's1', name: 'طالب سنتر تجريبي', role: 'CENTER_STUDENT' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));

vi.mock('../contexts/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

describe('Course Statistics and Student Center Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (userService.getProfile as any).mockResolvedValue({ name: 'طالب سنتر تجريبي' });
    (homeworkService.getHomeworks as any).mockResolvedValue({ data: [] });
  });

  it('renders dynamic course statistics for online students (total, completed, percentage)', async () => {
    const mockCourseData = {
      id: 'c1',
      title: 'رياضيات بحتة - تفاضل وتكامل',
      description: 'شرح كامل',
      totalLessons: 20,
      completedLessons: 7,
      completionPercentage: 35,
      lessons: [
        { id: 'l1', title: 'الدرس الأول', duration: '45 دقيقة', completed: true },
        { id: 'l2', title: 'الدرس الثاني', duration: '30 دقيقة', completed: false },
      ],
    };

    (courseService.getCourseDetails as any).mockResolvedValue({ data: mockCourseData });

    render(
      <MemoryRouter initialEntries={['/student/online/courses/c1']}>
        <Routes>
          <Route path="/student/online/courses/:courseId" element={<CourseDetailsPageOnline />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('رياضيات بحتة - تفاضل وتكامل')).toBeInTheDocument();
    });

    // Check dynamic numbers
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();

    // Verify static values 24, 16, 65% are NOT rendered
    expect(screen.queryByText('24')).not.toBeInTheDocument();
    expect(screen.queryByText('16')).not.toBeInTheDocument();
    expect(screen.queryByText('65%')).not.toBeInTheDocument();
  });

  it('handles zero lessons safely (0%) in center student course details', async () => {
    const mockEmptyCourse = {
      id: 'c2',
      title: 'دورة جديدة فارغة',
      description: 'لا توجد دروس بعد',
      totalLessons: 0,
      completedLessons: 0,
      completionPercentage: 0,
      lessons: [],
    };

    (courseService.getCourseDetails as any).mockResolvedValue({ data: mockEmptyCourse });

    render(
      <MemoryRouter initialEntries={['/student/center/courses/c2']}>
        <Routes>
          <Route path="/student/center/courses/:courseId" element={<CourseDetailsPageCenter />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('دورة جديدة فارغة')).toBeInTheDocument();
    });

    expect(screen.getAllByText('0')).toHaveLength(2); // total and completed
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('confirms Student Center navigation does NOT include "الدروس والفيديوهات" standalone section', async () => {
    render(
      <MemoryRouter initialEntries={['/student/center/home']}>
        <StudentCenterDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('دوراتي').length).toBeGreaterThan(0);
    });

    // Verify "الدروس والفيديوهات" is NOT in the menu
    expect(screen.queryByText('الدروس والفيديوهات')).not.toBeInTheDocument();
  });
});
