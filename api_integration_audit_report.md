# API Integration Audit Report

## 1. Backend Endpoint Discovery

- **POST** `/api/ai/solve` (Found in `\services\ai-service\src\index.ts`)
- **POST** `/api/ai/history/save` (Found in `\services\ai-service\src\index.ts`)
- **GET** `/api/ai/history` (Found in `\services\ai-service\src\index.ts`)
- **POST** `/api/ai/sessions` (Found in `\services\ai-service\src\index.ts`)
- **GET** `/api/ai/sessions` (Found in `\services\ai-service\src\index.ts`)
- **GET** `/api/ai/sessions/:id` (Found in `\services\ai-service\src\index.ts`)
- **POST** `/api/ai/chat` (Found in `\services\ai-service\src\index.ts`)
- **POST** `/api/ai/generate-questions` (Found in `\services\ai-service\src\index.ts`)
- **GET** `/health` (Found in `\services\ai-service\src\index.ts`)
- **GET** `/health` (Found in `\services\analytics-service\src\index.ts`)
- **POST** `/stripe/webhook` (Found in `\services\analytics-service\src\routes\analytics.routes.ts`)
- **GET** `/admin` (Found in `\services\analytics-service\src\routes\analytics.routes.ts`)
- **GET** `/parent` (Found in `\services\analytics-service\src\routes\analytics.routes.ts`)
- **GET** `/parent/child/:id/overview` (Found in `\services\analytics-service\src\routes\analytics.routes.ts`)
- **GET** `/teacher/:id/overview` (Found in `\services\analytics-service\src\routes\analytics.routes.ts`)
- **GET** `/student/overview` (Found in `\services\analytics-service\src\routes\analytics.routes.ts`)
- **GET** `/student/charts` (Found in `\services\analytics-service\src\routes\analytics.routes.ts`)
- **GET** `/student/recent` (Found in `\services\analytics-service\src\routes\analytics.routes.ts`)
- **GET** `/health` (Found in `\services\auth-service\src\index.ts`)
- **POST** `/register` (Found in `\services\auth-service\src\routes\auth.routes.ts`)
- **POST** `/login` (Found in `\services\auth-service\src\routes\auth.routes.ts`)
- **POST** `/logout` (Found in `\services\auth-service\src\routes\auth.routes.ts`)
- **POST** `/refresh-token` (Found in `\services\auth-service\src\routes\auth.routes.ts`)
- **GET** `/me` (Found in `\services\auth-service\src\routes\auth.routes.ts`)
- **POST** `/forgot-password` (Found in `\services\auth-service\src\routes\auth.routes.ts`)
- **POST** `/reset-password` (Found in `\services\auth-service\src\routes\auth.routes.ts`)
- **GET** `/health` (Found in `\services\course-service\src\index.ts`)
- **GET** `/` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **GET** `/lessons` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **GET** `/lessons/:id` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **GET** `/:id` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **POST** `/lessons/:id/quiz/:quizId/submit` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **POST** `/` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **POST** `/lessons` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **DELETE** `/:id` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **DELETE** `/lessons/:id` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **POST** `/lessons/:id/progress` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **GET** `/lessons/:id/analytics` (Found in `\services\course-service\src\routes\course.routes.ts`)
- **GET** `/` (Found in `\services\course-service\src\routes\exam.routes.ts`)
- **POST** `/` (Found in `\services\course-service\src\routes\exam.routes.ts`)
- **GET** `/course/:courseId` (Found in `\services\course-service\src\routes\exam.routes.ts`)
- **GET** `/:id` (Found in `\services\course-service\src\routes\exam.routes.ts`)
- **PUT** `/:id` (Found in `\services\course-service\src\routes\exam.routes.ts`)
- **DELETE** `/:id` (Found in `\services\course-service\src\routes\exam.routes.ts`)
- **POST** `/:id/start` (Found in `\services\course-service\src\routes\exam.routes.ts`)
- **POST** `/:id/submit` (Found in `\services\course-service\src\routes\exam.routes.ts`)
- **POST** `/:id/sync` (Found in `\services\course-service\src\routes\exam.routes.ts`)
- **POST** `/:id/violation` (Found in `\services\course-service\src\routes\exam.routes.ts`)
- **GET** `/` (Found in `\services\course-service\src\routes\homework.routes.ts`)
- **GET** `/course/:courseId` (Found in `\services\course-service\src\routes\homework.routes.ts`)
- **GET** `/:id` (Found in `\services\course-service\src\routes\homework.routes.ts`)
- **POST** `/:id/submit` (Found in `\services\course-service\src\routes\homework.routes.ts`)
- **GET** `/:id/submission` (Found in `\services\course-service\src\routes\homework.routes.ts`)
- **POST** `/` (Found in `\services\course-service\src\routes\homework.routes.ts`)
- **POST** `/questions` (Found in `\services\course-service\src\routes\homework.routes.ts`)
- **POST** `/` (Found in `\services\course-service\src\routes\question.routes.ts`)
- **GET** `/` (Found in `\services\course-service\src\routes\question.routes.ts`)
- **PUT** `/:id` (Found in `\services\course-service\src\routes\question.routes.ts`)
- **DELETE** `/:id` (Found in `\services\course-service\src\routes\question.routes.ts`)
- **GET** `/info` (Found in `\services\course-service\src\routes\upload.routes.ts`)
- **POST** `/image` (Found in `\services\course-service\src\routes\upload.routes.ts`)
- **POST** `/video` (Found in `\services\course-service\src\routes\upload.routes.ts`)
- **POST** `/document` (Found in `\services\course-service\src\routes\upload.routes.ts`)
- **POST** `/file` (Found in `\services\course-service\src\routes\upload.routes.ts`)
- **GET** `/health` (Found in `\services\user-service\src\index.ts`)
- **POST** `/` (Found in `\services\user-service\src\routes\attendance.routes.ts`)
- **GET** `/my-attendance` (Found in `\services\user-service\src\routes\attendance.routes.ts`)
- **GET** `/:studentId/percentage` (Found in `\services\user-service\src\routes\attendance.routes.ts`)
- **GET** `/` (Found in `\services\user-service\src\routes\notification.routes.ts`)
- **PUT** `/:id/read` (Found in `\services\user-service\src\routes\notification.routes.ts`)
- **GET** `/users` (Found in `\services\user-service\src\routes\user.routes.ts`)
- **POST** `/users` (Found in `\services\user-service\src\routes\user.routes.ts`)
- **PUT** `/users/:id` (Found in `\services\user-service\src\routes\user.routes.ts`)
- **DELETE** `/users/:id` (Found in `\services\user-service\src\routes\user.routes.ts`)
- **GET** `/parent/children` (Found in `\services\user-service\src\routes\user.routes.ts`)
- **GET** `/profile` (Found in `\services\user-service\src\routes\user.routes.ts`)

## 2. Frontend Component Audit & Missing Connections

### ❌ `AdminDashboard.tsx`
- **Path:** `\apps\frontend\src\app\components\admin\AdminDashboard.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `AdminHomePage.tsx`
- **Path:** `\apps\frontend\src\app\components\admin\AdminHomePage.tsx`
- **Issue:** Contains hardcoded/mocked data.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `ChatbotManagementPage.tsx`
- **Path:** `\apps\frontend\src\app\components\admin\ChatbotManagementPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `RiskDetectionPage.tsx`
- **Path:** `\apps\frontend\src\app\components\admin\RiskDetectionPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `SubscriptionPage.tsx`
- **Path:** `\apps\frontend\src\app\components\admin\SubscriptionPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `VideosManagementPage.tsx`
- **Path:** `\apps\frontend\src\app\components\admin\VideosManagementPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `AdaptiveLearningPage.tsx`
- **Path:** `\apps\frontend\src\app\components\ai\AdaptiveLearningPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `AdminLoginPage.tsx`
- **Path:** `\apps\frontend\src\app\components\auth\AdminLoginPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `ForgotPasswordPage.tsx`
- **Path:** `\apps\frontend\src\app\components\auth\ForgotPasswordPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `LoginPage.tsx`
- **Path:** `\apps\frontend\src\app\components\auth\LoginPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `ProtectedRoute.tsx`
- **Path:** `\apps\frontend\src\app\components\auth\ProtectedRoute.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `ResetPasswordPage.tsx`
- **Path:** `\apps\frontend\src\app\components\auth\ResetPasswordPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `ImageWithFallback.tsx`
- **Path:** `\apps\frontend\src\app\components\figma\ImageWithFallback.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `LandingPage.tsx`
- **Path:** `\apps\frontend\src\app\components\landing\LandingPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `ErrorBoundary.tsx`
- **Path:** `\apps\frontend\src\app\components\shared\ErrorBoundary.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `SharedLayout.tsx`
- **Path:** `\apps\frontend\src\app\components\shared\SharedLayout.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `CoursesPage.tsx`
- **Path:** `\apps\frontend\src\app\components\student-online\CoursesPage.tsx`
- **Issue:** Contains hardcoded/mocked data.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `TeacherAIPage.tsx`
- **Path:** `\apps\frontend\src\app\components\teacher\TeacherAIPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `TeacherAnalyticsPage.tsx`
- **Path:** `\apps\frontend\src\app\components\teacher\TeacherAnalyticsPage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `TeacherDashboard.tsx`
- **Path:** `\apps\frontend\src\app\components\teacher\TeacherDashboard.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `TeacherProfilePage.tsx`
- **Path:** `\apps\frontend\src\app\components\teacher\TeacherProfilePage.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `accordion.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\accordion.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `alert-dialog.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\alert-dialog.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `alert.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\alert.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `aspect-ratio.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\aspect-ratio.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `avatar.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\avatar.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `badge.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\badge.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `breadcrumb.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\breadcrumb.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `button.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\button.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `calendar.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\calendar.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `card.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\card.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `carousel.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\carousel.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `chart.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\chart.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `checkbox.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\checkbox.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `collapsible.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\collapsible.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `command.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\command.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `context-menu.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\context-menu.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `dialog.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\dialog.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `drawer.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\drawer.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `dropdown-menu.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\dropdown-menu.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `EmptyState.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\EmptyState.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `form.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\form.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `hover-card.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\hover-card.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `input-otp.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\input-otp.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Issue:** Contains hardcoded/mocked data.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `input.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\input.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `label.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\label.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `LoadingState.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\LoadingState.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `menubar.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\menubar.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `navigation-menu.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\navigation-menu.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `pagination.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\pagination.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `popover.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\popover.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `progress.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\progress.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `radio-group.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\radio-group.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `resizable.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\resizable.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `scroll-area.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\scroll-area.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `select.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\select.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `separator.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\separator.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `sheet.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\sheet.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `sidebar.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\sidebar.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `skeleton.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\skeleton.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `slider.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\slider.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `sonner.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\sonner.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `SplashScreen.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\SplashScreen.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `SupabaseUploader.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\SupabaseUploader.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `switch.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\switch.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `table.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\table.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `tabs.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\tabs.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `textarea.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\textarea.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `toggle-group.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\toggle-group.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `toggle.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\toggle.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.

### ❌ `tooltip.tsx`
- **Path:** `\apps\frontend\src\app\components\ui\tooltip.tsx`
- **Issue:** No API connection found. Page never calls backend.
- **Severity:** High
- **Recommended Fix:** Implement actual API integration using the corresponding service.


## 3. Summary

- **Total frontend pages checked:** 101
- **Total backend endpoints found:** 76
- **Total connected frontend pages:** 32
- **Total disconnected/mocked frontend pages:** 69
- **Overall integration health score:** 32%
