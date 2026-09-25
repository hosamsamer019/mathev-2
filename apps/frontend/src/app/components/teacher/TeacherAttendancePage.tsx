import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, CheckCircle, Clock, XCircle, Save, Search, Users,
  Filter, CheckSquare, AlertCircle, RotateCcw, BookOpen, RefreshCw, Check, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { userService } from '../../services/user.service';
import { courseService } from '../../services/course.service';

type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

interface StudentItem {
  id: string;
  name: string;
  email: string;
  role: string;
  gradeLevel?: string;
  educationLevel?: string;
  type: string;
  courseIds: string[];
}

interface CourseItem {
  id: string;
  title: string;
  gradeLevel?: string;
}

export default function TeacherAttendancePage() {
  const { isDark } = useTheme();

  // Selected attendance date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Courses & Students data
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  
  // Local Attendance State: Map studentId -> AttendanceStatus
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [originalMap, setOriginalMap] = useState<Record<string, AttendanceStatus>>({});

  // UI States
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT' | 'UNSET'>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; details?: string } | null>(null);

  // Styling helpers
  const cardBg = isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-100 shadow-sm';
  const textPrimary = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800';

  // 1. Initial Load: Fetch Courses and Students
  useEffect(() => {
    fetchCoursesAndStudents();
  }, []);

  const fetchCoursesAndStudents = async () => {
    try {
      setLoadingData(true);
      setFeedback(null);

      // Fetch teacher's courses
      const courseRes = await courseService.getCourses({ limit: 100 });
      const courseList: CourseItem[] = Array.isArray(courseRes.data?.data)
        ? courseRes.data.data
        : Array.isArray(courseRes.data)
        ? courseRes.data
        : [];
      setCourses(courseList);
      // Default to select all courses
      setSelectedCourseIds(courseList.map(c => c.id));

      // Fetch all students
      const usersRes = await userService.getUsers({ limit: 1000 });
      const userList = Array.isArray(usersRes.data) ? usersRes.data : [];
      const studentList: StudentItem[] = userList
        .filter((u: any) => u.role === 'ONLINE_STUDENT' || u.role === 'CENTER_STUDENT')
        .map((u: any) => ({
          id: u.id,
          name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'طالب',
          email: u.email,
          role: u.role,
          gradeLevel: u.gradeLevel || u.grade || 'غير محدد',
          educationLevel: u.educationLevel || '',
          type: u.role === 'CENTER_STUDENT' ? 'سنتر' : 'أونلاين',
          courseIds: u.enrollments ? u.enrollments.map((e: any) => e.courseId) : []
        }));

      setAllStudents(studentList);
    } catch (err: any) {
      console.error('Error loading courses/students:', err);
      setFeedback({
        type: 'error',
        message: 'فشل في تحميل بيانات الطلاب والمجموعات. يرجى المحاولة مرة أخرى.'
      });
    } finally {
      setLoadingData(false);
    }
  };

  // 2. Fetch existing attendance records whenever selectedDate changes
  useEffect(() => {
    if (!loadingData) {
      fetchDateAttendance(selectedDate);
    }
  }, [selectedDate, loadingData]);

  const fetchDateAttendance = async (dateStr: string) => {
    try {
      setLoadingAttendance(true);
      const res = await userService.getAttendanceByDate(dateStr);
      const records = res?.data || [];
      const newMap: Record<string, AttendanceStatus> = {};
      for (const rec of records) {
        if (rec.studentId && rec.status) {
          newMap[rec.studentId] = rec.status as AttendanceStatus;
        }
      }
      setAttendanceMap(newMap);
      setOriginalMap(newMap);
    } catch (err: any) {
      console.error('Error fetching date attendance:', err);
      // Keep existing map if fetch fails, but inform user
    } finally {
      setLoadingAttendance(false);
    }
  };

  // 3. Deduplicate active students across selected groups/courses
  const activeRoster = useMemo(() => {
    if (selectedCourseIds.length === 0 && courses.length > 0) {
      return [];
    }

    // Deduplicate by student.id
    const studentMap = new Map<string, StudentItem>();
    for (const student of allStudents) {
      // If no courses defined or "all" selected, include all students
      if (selectedCourseIds.length === 0 || selectedCourseIds.length === courses.length) {
        studentMap.set(student.id, student);
      } else {
        // If student has courseIds, match with selectedCourseIds
        const hasMatchingCourse = student.courseIds.some(cId => selectedCourseIds.includes(cId));
        // Also fallback if enrollment info is not populated on user object
        if (hasMatchingCourse || student.courseIds.length === 0) {
          studentMap.set(student.id, student);
        }
      }
    }
    return Array.from(studentMap.values());
  }, [allStudents, selectedCourseIds, courses]);

  // 4. Filtered students based on search and status filter
  const visibleStudents = useMemo(() => {
    return activeRoster.filter(student => {
      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.gradeLevel?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Status match
      const currentStatus = attendanceMap[student.id];
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'UNSET') return !currentStatus;
      return currentStatus === statusFilter;
    });
  }, [activeRoster, searchQuery, statusFilter, attendanceMap]);

  // 5. Live Summary Statistics
  const summary = useMemo(() => {
    const total = activeRoster.length;
    let present = 0;
    let late = 0;
    let absent = 0;
    let unset = 0;

    for (const s of activeRoster) {
      const st = attendanceMap[s.id];
      if (st === 'PRESENT') present++;
      else if (st === 'LATE') late++;
      else if (st === 'ABSENT') absent++;
      else unset++;
    }

    const setTotal = present + late + absent;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { total, present, late, absent, unset, setTotal, percentage };
  }, [activeRoster, attendanceMap]);

  // 6. Bulk Action Handlers
  const handleBulkSetStatus = (status: AttendanceStatus) => {
    setAttendanceMap(prev => {
      const next = { ...prev };
      // Apply to all students in active roster (or visible ones)
      for (const s of visibleStudents) {
        next[s.id] = status;
      }
      return next;
    });
  };

  const handleResetToSaved = () => {
    setAttendanceMap({ ...originalMap });
  };

  const handleSingleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // 7. Group Toggle Handlers
  const handleToggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleSelectAllCourses = () => {
    if (selectedCourseIds.length === courses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(courses.map(c => c.id));
    }
  };

  // 8. Bulk Save Handler
  const handleSaveAttendance = async () => {
    // Build payload of students with selected status
    const recordsToSave: Array<{ studentId: string; status: AttendanceStatus }> = [];

    for (const student of activeRoster) {
      const status = attendanceMap[student.id];
      if (status) {
        recordsToSave.push({
          studentId: student.id,
          status
        });
      }
    }

    if (recordsToSave.length === 0) {
      setFeedback({
        type: 'error',
        message: 'لم يتم تحديد حالة الحضور لأي طالب. يرجى تحديد الحالات قبل الحفظ.'
      });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const res = await userService.bulkMarkAttendance({
        records: recordsToSave,
        date: selectedDate
      });

      if (res && res.success) {
        setOriginalMap({ ...attendanceMap });
        setFeedback({
          type: 'success',
          message: 'تم حفظ الحضور بنجاح!',
          details: `حاضر: ${res.summary?.present ?? summary.present} | متأخر: ${res.summary?.late ?? summary.late} | غائب: ${res.summary?.absent ?? summary.absent}`
        });
      }
    } catch (err: any) {
      console.error('Save attendance error:', err);
      setFeedback({
        type: 'error',
        message: 'حدث خطأ أثناء حفظ الحضور. تم الاحتفاظ بتعديلاتك، يرجى المحاولة مرة أخرى.',
        details: err.response?.data?.message || err.message
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary} flex items-center gap-2.5`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            سجل الحضور والغياب
          </h1>
          <p className={`text-sm ${textSecondary} mt-1`}>
            تسجيل ومتابعة حضور الطلاب حسب التاريخ والمجموعات مع إمكانية الحفظ الجماعي
          </p>
        </div>

        {/* Date Selector & Fast Save in Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3.5 py-2">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">تاريخ الحضور:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className={`text-sm font-semibold rounded-lg px-2.5 py-1 border outline-none transition-all ${inputBg}`}
            />
          </div>

          <button
            onClick={handleSaveAttendance}
            disabled={saving || loadingAttendance || activeRoster.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ الحضور ({summary.setTotal}/{summary.total})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 transition-all ${
            feedback.type === 'success'
              ? 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-bold text-sm">{feedback.message}</p>
              {feedback.details && <p className="text-xs opacity-90 mt-1 font-medium">{feedback.details}</p>}
            </div>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}

      {/* Group / Class Selector Filter */}
      {courses.length > 0 && (
        <div className={`p-4 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-xs font-bold ${textPrimary} flex items-center gap-1.5`}>
              <BookOpen className="w-4 h-4 text-emerald-600" />
              تحديد المجموعة / الدورة:
            </span>
            <button
              onClick={handleSelectAllCourses}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              {selectedCourseIds.length === courses.length ? 'إلغاء تحديد الكل' : 'تحديد جميع المجموعات'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {courses.map(course => {
              const isSelected = selectedCourseIds.includes(course.id);
              return (
                <button
                  key={course.id}
                  onClick={() => handleToggleCourse(course.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : isDark
                      ? 'bg-gray-750 border-gray-700 text-gray-300 hover:border-gray-600'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${isSelected ? 'bg-white text-emerald-700' : 'bg-gray-300 dark:bg-gray-600 text-transparent'}`}>
                    ✓
                  </span>
                  {course.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-medium">إجمالي الطلاب</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className={`text-xl font-bold ${textPrimary}`}>{summary.total}</p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between text-green-500 mb-1">
            <span className="text-xs font-medium">حاضر</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{summary.present}</p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-xs font-medium">متأخر</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{summary.late}</p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between text-red-500 mb-1">
            <span className="text-xs font-medium">غائب</span>
            <XCircle className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{summary.absent}</p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-medium">مكتمل</span>
            <CheckSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <p className={`text-xl font-bold ${summary.unset === 0 ? 'text-emerald-600 dark:text-emerald-400' : textPrimary}`}>
            {summary.setTotal} / {summary.total}
          </p>
        </div>

        <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-medium">نسبة الحضور</span>
            <span className="text-xs font-bold text-emerald-600">{summary.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-l from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${summary.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Warning if there are unselected students */}
      {summary.unset > 0 && summary.total > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            تنبيه: يوجد <strong>{summary.unset}</strong> طالب لم يتم تحديد حالة حضورهم بعد.
          </span>
        </div>
      )}

      {/* Controls Bar: Search, Status Filters, & Fast Bulk Actions */}
      <div className={`p-4 rounded-2xl border ${cardBg} space-y-4`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن طالب بالاسم أو البريد..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pr-10 pl-4 py-2 text-sm rounded-xl border outline-none transition-all ${inputBg}`}
            />
          </div>

          {/* Status View Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <span className={`text-xs font-bold ${textSecondary} ml-2 whitespace-nowrap`}>عرض:</span>
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'PRESENT', label: 'حاضر' },
              { id: 'LATE', label: 'متأخر' },
              { id: 'ABSENT', label: 'غائب' },
              { id: 'UNSET', label: 'غير محدد' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-emerald-600 text-white'
                    : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-650'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fast Bulk Status Buttons */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold ${textSecondary} ml-1`}>تحديد سريع للكل:</span>
            <button
              onClick={() => handleBulkSetStatus('PRESENT')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 hover:bg-green-200 transition-colors border border-green-200 dark:border-green-800/60"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              حاضر للكل
            </button>

            <button
              onClick={() => handleBulkSetStatus('LATE')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200 transition-colors border border-amber-200 dark:border-amber-800/60"
            >
              <Clock className="w-3.5 h-3.5" />
              متأخر للكل
            </button>

            <button
              onClick={() => handleBulkSetStatus('ABSENT')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors border border-red-200 dark:border-red-800/60"
            >
              <XCircle className="w-3.5 h-3.5" />
              غائب للكل
            </button>
          </div>

          <button
            onClick={handleResetToSaved}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            استعادة السجل المحفوظ
          </button>
        </div>
      </div>

      {/* Student Attendance Sheet */}
      {loadingData || loadingAttendance ? (
        <div className={`p-12 rounded-2xl border ${cardBg} text-center space-y-3`}>
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className={`text-sm font-medium ${textSecondary}`}>جاري تحميل بيانات الحضور والطلاب...</p>
        </div>
      ) : visibleStudents.length === 0 ? (
        <div className={`p-12 rounded-2xl border ${cardBg} text-center space-y-3`}>
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <p className={`text-base font-bold ${textPrimary}`}>لا يوجد طلاب يطابقون معايير البحث أو التحديد</p>
          <p className={`text-xs ${textSecondary}`}>جرب تغيير فلتر المجموعات أو مسح نص البحث</p>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 text-xs font-bold text-gray-500 dark:text-gray-400">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-6">اسم الطالب</th>
                  <th className="py-3.5 px-4">نوع الطالب</th>
                  <th className="py-3.5 px-4">الصف / المرحلة</th>
                  <th className="py-3.5 px-6 text-center w-80">تسجيل الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {visibleStudents.map((student, idx) => {
                  const currentStatus = attendanceMap[student.id];
                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors ${
                        !currentStatus ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="py-4 px-4 text-center text-xs font-medium text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            {student.name.charAt(0) || 'ط'}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${textPrimary}`}>{student.name}</p>
                            <p className="text-xs text-gray-400">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            student.type === 'سنتر'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {student.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                        {student.gradeLevel || 'غير محدد'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-750 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => handleSingleStatusChange(student.id, 'PRESENT')}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              currentStatus === 'PRESENT'
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            حاضر
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSingleStatusChange(student.id, 'LATE')}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              currentStatus === 'LATE'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-400'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            متأخر
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSingleStatusChange(student.id, 'ABSENT')}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              currentStatus === 'ABSENT'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            غائب
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700 p-3 space-y-3">
            {visibleStudents.map((student, idx) => {
              const currentStatus = attendanceMap[student.id];
              return (
                <div key={student.id} className="pt-3 first:pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        {student.name.charAt(0) || 'ط'}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${textPrimary}`}>{student.name}</p>
                        <p className="text-[11px] text-gray-400">{student.gradeLevel || 'غير محدد'}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        student.type === 'سنتر'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {student.type}
                    </span>
                  </div>

                  {/* Segmented Status Selector */}
                  <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-750 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => handleSingleStatusChange(student.id, 'PRESENT')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        currentStatus === 'PRESENT'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      حاضر
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSingleStatusChange(student.id, 'LATE')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        currentStatus === 'LATE'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      متأخر
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSingleStatusChange(student.id, 'ABSENT')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        currentStatus === 'ABSENT'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      غائب
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Floating/Sticky Save Action Bar */}
      {visibleStudents.length > 0 && (
        <div className={`p-4 rounded-2xl border ${cardBg} flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-xl`}>
          <div className="flex items-center gap-3">
            <div className="text-xs">
              <span className={`font-bold ${textPrimary}`}>ملخص التحديد: </span>
              <span className="text-green-600 font-bold">{summary.present} حاضر</span>
              <span className="mx-1.5 text-gray-400">•</span>
              <span className="text-amber-500 font-bold">{summary.late} متأخر</span>
              <span className="mx-1.5 text-gray-400">•</span>
              <span className="text-red-600 font-bold">{summary.absent} غائب</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveAttendance}
              disabled={saving || loadingAttendance}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  جاري حفظ السجلات...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  حفظ سجلات الحضور ({summary.setTotal} طالب)
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
