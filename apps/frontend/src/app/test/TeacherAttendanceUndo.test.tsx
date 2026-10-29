import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import TeacherAttendancePage from '../components/teacher/TeacherAttendancePage';
import { courseService } from '../services/course.service';
import { userService } from '../services/user.service';

vi.mock('../services/course.service', () => ({
  courseService: {
    getCourses: vi.fn(),
  },
}));

vi.mock('../services/user.service', () => ({
  userService: {
    getUsers: vi.fn(),
    getAttendanceByDate: vi.fn(),
    bulkMarkAttendance: vi.fn(),
    deleteAttendance: vi.fn(),
  },
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));

describe('TeacherAttendancePage — Course Coverage & Attendance Undo', () => {
  const mockStudents = [
    {
      id: 'student-1',
      name: 'أحمد محمود',
      email: 'ahmed@test.com',
      role: 'ONLINE_STUDENT',
      gradeLevel: 'SECONDARY_1',
      enrollments: [{ courseId: 'c1' }, { courseId: 'c2' }]
    },
    {
      id: 'student-2',
      name: 'سارة إبراهيم',
      email: 'sara@test.com',
      role: 'CENTER_STUDENT',
      gradeLevel: 'SECONDARY_1',
      enrollments: [{ courseId: 'c1' }]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: 1 page of courses
    (courseService.getCourses as any).mockResolvedValue({
      data: {
        data: [
          { id: 'c1', title: 'جبر وتفاضل أولى ثانوي' },
          { id: 'c2', title: 'هندسة فراغية تانية ثانوي' }
        ],
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1
      }
    });

    // Default mock: 1 page of students
    (userService.getUsers as any).mockResolvedValue({
      data: mockStudents,
      total: 2,
      page: 1,
      limit: 100,
      totalPages: 1
    });

    // Default mock: Date attendance with 1 saved PRESENT record for student-1
    (userService.getAttendanceByDate as any).mockResolvedValue({
      date: '2026-10-29',
      data: [
        {
          id: 'att-record-uuid-1',
          studentId: 'student-1',
          date: '2026-10-29T00:00:00.000Z',
          status: 'PRESENT',
          student: mockStudents[0]
        }
      ]
    });
  });

  it('loads and deduplicates courses across multiple pages when totalPages > 1', async () => {
    // Mock multi-page course response
    (courseService.getCourses as any)
      .mockResolvedValueOnce({
        data: {
          data: [
            { id: 'c1', title: 'كورس 1' },
            { id: 'c2', title: 'كورس 2' }
          ],
          total: 3,
          page: 1,
          limit: 100,
          totalPages: 2
        }
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            { id: 'c2', title: 'كورس 2 مكرر' }, // duplicate to test deduplication
            { id: 'c3', title: 'كورس 3' }
          ],
          total: 3,
          page: 2,
          limit: 100,
          totalPages: 2
        }
      });

    render(<TeacherAttendancePage />);

    await waitFor(() => {
      expect(screen.getAllByText('أحمد محمود').length).toBeGreaterThanOrEqual(1);
    });

    // Verify courseService.getCourses was called twice (for page 1 and page 2)
    expect(courseService.getCourses).toHaveBeenCalledTimes(2);
    expect(courseService.getCourses).toHaveBeenNthCalledWith(1, { page: 1, limit: 100 });
    expect(courseService.getCourses).toHaveBeenNthCalledWith(2, { page: 2, limit: 100 });
  });

  it('renders the "التراجع" button only for students with a saved database attendance record', async () => {
    render(<TeacherAttendancePage />);

    // Wait for attendance records to load and the undo button to appear
    await waitFor(() => {
      const undoButtons = screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات');
      expect(undoButtons.length).toBeGreaterThanOrEqual(1);
    });

    // student-2 has NO attendance record -> no undo button in student-2's desktop row
    const student2Element = screen.getAllByText('سارة إبراهيم')[0];
    const student2Row = student2Element.closest('tr');
    expect(student2Row).not.toBeNull();
    const student2Undo = student2Row?.querySelector('button[title*="التراجع"]');
    expect(student2Undo).toBeNull();
  });

  it('canceling the confirmation dialog closes the modal without calling deleteAttendance', async () => {
    render(<TeacherAttendancePage />);

    await waitFor(() => {
      expect(screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات').length).toBeGreaterThanOrEqual(1);
    });

    const undoBtn = screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات')[0];
    fireEvent.click(undoBtn);

    // Confirmation dialog appears
    expect(screen.getByText('تأكيد التراجع عن تسجيل الحضور')).toBeInTheDocument();
    expect(screen.getByText(/سيتم حذف هذا السجل نهائياً من قاعدة البيانات/)).toBeInTheDocument();

    // Click "إلغاء"
    const cancelBtn = screen.getByText('إلغاء');
    fireEvent.click(cancelBtn);

    // Dialog closes
    await waitFor(() => {
      expect(screen.queryByText('تأكيد التراجع عن تسجيل الحضور')).not.toBeInTheDocument();
    });

    // deleteAttendance was NOT called
    expect(userService.deleteAttendance).not.toHaveBeenCalled();
  });

  it('confirming undo calls deleteAttendance with exact record ID and returns student to unrecorded state', async () => {
    (userService.deleteAttendance as any).mockResolvedValue({
      message: 'Attendance record deleted successfully',
      id: 'att-record-uuid-1'
    });

    render(<TeacherAttendancePage />);

    await waitFor(() => {
      expect(screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات').length).toBeGreaterThanOrEqual(1);
    });

    const undoBtn = screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات')[0];
    fireEvent.click(undoBtn);

    // Click "تأكيد التراجع وحذف السجل"
    const confirmBtn = screen.getByText('تأكيد التراجع وحذف السجل');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(userService.deleteAttendance).toHaveBeenCalledWith('att-record-uuid-1');
    });

    // Modal closes and success feedback is shown
    await waitFor(() => {
      expect(screen.getByText(/تم التراجع عن تسجيل حضور الطالب \(أحمد محمود\) بنجاح/)).toBeInTheDocument();
    });

    // The undo button for student-1 is now gone because record is reverted
    expect(screen.queryByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات')).not.toBeInTheDocument();
  });

  it('retains persisted status and displays error message if deleteAttendance API fails', async () => {
    (userService.deleteAttendance as any).mockRejectedValue(new Error('Network error on delete'));

    render(<TeacherAttendancePage />);

    await waitFor(() => {
      expect(screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات').length).toBeGreaterThanOrEqual(1);
    });

    const undoBtn = screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات')[0];
    fireEvent.click(undoBtn);

    const confirmBtn = screen.getByText('تأكيد التراجع وحذف السجل');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('فشل التراجع عن تسجيل الحضور. يرجى المحاولة مرة أخرى.')).toBeInTheDocument();
    });

    // The undo button is STILL available so the user can retry
    expect(screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات')[0]).toBeInTheDocument();
  });

  it('local unsaved status changes do not call deleteAttendance on cancel', async () => {
    render(<TeacherAttendancePage />);

    await waitFor(() => {
      expect(screen.getAllByText('سارة إبراهيم').length).toBeGreaterThanOrEqual(1);
    });

    // Student 2 has no saved record; teacher clicks "حاضر" locally in desktop row
    const student2Element = screen.getAllByText('سارة إبراهيم')[0];
    const student2Row = student2Element.closest('tr');
    const allButtons = student2Row?.querySelectorAll('button') || [];
    const presentButton = Array.from(allButtons).find(b => b.textContent?.includes('حاضر'));

    expect(presentButton).toBeDefined();
    if (presentButton) {
      fireEvent.click(presentButton);
    }

    // Local reset button "إلغاء" should now appear for student 2
    await waitFor(() => {
      const resetBtn = student2Row?.querySelector('button[title="إلغاء التحديد غير المحفوظ"]');
      expect(resetBtn).not.toBeNull();
    });

    const resetBtn = student2Row?.querySelector('button[title="إلغاء التحديد غير المحفوظ"]');
    if (resetBtn) {
      fireEvent.click(resetBtn);
    }

    // Still never calls deleteAttendance
    expect(userService.deleteAttendance).not.toHaveBeenCalled();
  });

  it('bulk-save response containing data: [{ id, studentId, status, date }] immediately displays Undo action for the saved student', async () => {
    (userService.bulkMarkAttendance as any).mockResolvedValue({
      success: true,
      count: 2,
      summary: { total: 2, present: 2, late: 0, absent: 0 },
      data: [
        { id: 'att-record-uuid-1', studentId: 'student-1', status: 'PRESENT', date: '2026-10-29T00:00:00.000Z' },
        { id: 'att-record-uuid-2', studentId: 'student-2', status: 'PRESENT', date: '2026-10-29T00:00:00.000Z' }
      ]
    });
    (userService.deleteAttendance as any).mockResolvedValue({
      message: 'Attendance record deleted successfully',
      id: 'att-record-uuid-2'
    });

    render(<TeacherAttendancePage />);

    await waitFor(() => {
      expect(screen.getAllByText('سارة إبراهيم').length).toBeGreaterThanOrEqual(1);
    });

    // Student 2 starts without an Undo button
    const student2Element = screen.getAllByText('سارة إبراهيم')[0];
    const student2Row = student2Element.closest('tr');
    expect(student2Row?.querySelector('button[title*="التراجع"]')).toBeNull();

    // Mark Student 2 as PRESENT
    const allButtons = student2Row?.querySelectorAll('button') || [];
    const presentButton = Array.from(allButtons).find(b => b.textContent?.includes('حاضر'));
    expect(presentButton).toBeDefined();
    if (presentButton) fireEvent.click(presentButton);

    // Click Save Attendance
    const saveBtn = screen.getByText(/حفظ الحضور/).closest('button');
    expect(saveBtn).not.toBeNull();
    if (saveBtn) fireEvent.click(saveBtn);

    // Success feedback appears
    await waitFor(() => {
      expect(screen.getByText('تم حفظ الحضور بنجاح!')).toBeInTheDocument();
    });

    // The Undo button immediately appears in student 2's row without page reload
    const student2Undo = student2Row?.querySelector('button[title*="التراجع"]');
    expect(student2Undo).not.toBeNull();

    // Clicking Undo opens modal and confirms with exact ID from data array
    if (student2Undo) fireEvent.click(student2Undo);
    expect(screen.getByText('تأكيد التراجع عن تسجيل الحضور')).toBeInTheDocument();

    const confirmBtn = screen.getByText('تأكيد التراجع وحذف السجل');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(userService.deleteAttendance).toHaveBeenCalledWith('att-record-uuid-2');
    });
  });

  it('backward-compatible bulk-save response containing records: [...] immediately displays Undo action', async () => {
    (userService.bulkMarkAttendance as any).mockResolvedValue({
      success: true,
      count: 2,
      summary: { total: 2, present: 1, late: 0, absent: 1 },
      records: [
        { id: 'att-record-uuid-1', studentId: 'student-1', status: 'PRESENT', date: '2026-10-29T00:00:00.000Z' },
        { id: 'att-record-legacy-uuid-2', studentId: 'student-2', status: 'ABSENT', date: '2026-10-29T00:00:00.000Z' }
      ]
    });
    (userService.deleteAttendance as any).mockResolvedValue({
      message: 'Attendance record deleted successfully',
      id: 'att-record-legacy-uuid-2'
    });

    render(<TeacherAttendancePage />);

    await waitFor(() => {
      expect(screen.getAllByText('سارة إبراهيم').length).toBeGreaterThanOrEqual(1);
    });

    const student2Element = screen.getAllByText('سارة إبراهيم')[0];
    const student2Row = student2Element.closest('tr');

    // Mark Student 2 as ABSENT
    const allButtons = student2Row?.querySelectorAll('button') || [];
    const absentButton = Array.from(allButtons).find(b => b.textContent?.includes('غائب'));
    expect(absentButton).toBeDefined();
    if (absentButton) fireEvent.click(absentButton);

    // Click Save
    const saveBtn = screen.getByText(/حفظ الحضور/).closest('button');
    if (saveBtn) fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('تم حفظ الحضور بنجاح!')).toBeInTheDocument();
    });

    // The Undo button appears for student 2 using records fallback
    const student2Undo = student2Row?.querySelector('button[title*="التراجع"]');
    expect(student2Undo).not.toBeNull();

    if (student2Undo) fireEvent.click(student2Undo);
    const confirmBtn = screen.getByText('تأكيد التراجع وحذف السجل');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(userService.deleteAttendance).toHaveBeenCalledWith('att-record-legacy-uuid-2');
    });
  });

  it('successful bulk-save response with no usable records does not corrupt existing record IDs', async () => {
    // Response with empty data array or null
    (userService.bulkMarkAttendance as any).mockResolvedValue({
      success: true,
      count: 0,
      data: null,
      records: null
    });

    render(<TeacherAttendancePage />);

    await waitFor(() => {
      expect(screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات').length).toBeGreaterThanOrEqual(1);
    });

    // Student 1 has existing record att-record-uuid-1
    const undoBtn = screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات')[0];
    expect(undoBtn).toBeInTheDocument();

    // Trigger save (student-1 is in attendanceMap)
    const saveBtn = screen.getByText(/حفظ الحضور/).closest('button');
    if (saveBtn) fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('تم حفظ الحضور بنجاح!')).toBeInTheDocument();
    });

    // Existing undo button is still present and valid
    expect(screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات')[0]).toBeInTheDocument();

    fireEvent.click(screen.getAllByTitle('التراجع عن تسجيل الحضور وحذف السجل من قاعدة البيانات')[0]);
    const confirmBtn = screen.getByText('تأكيد التراجع وحذف السجل');
    fireEvent.click(confirmBtn);

    // Existing ID was not corrupted or lost
    await waitFor(() => {
      expect(userService.deleteAttendance).toHaveBeenCalledWith('att-record-uuid-1');
    });
  });
});
