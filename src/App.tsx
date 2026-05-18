import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PremiumLoader, { PremiumPageLoader } from "./components/PremiumLoader";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";

// Lazy-loaded pages — each becomes its own chunk fetched on first navigation.
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const ManagerDashboard = lazy(() => import("./pages/dashboard-manager/ManagerDashboard"));
const HrDashboard = lazy(() => import("./pages/dashboard-hr/HrDashboard"));
const Projects = lazy(() => import("./pages/projects/Projects"));
const Approvals = lazy(() => import("./pages/approvals/Approvals"));
const Users = lazy(() => import("./pages/users/Users"));
const Employees = lazy(() => import("./pages/employees/Employees"));
const Attendance = lazy(() => import("./pages/attendance/Attendance"));
const AttendanceCalendar = lazy(() => import("./pages/attendance-calendar/AttendanceCalendar"));
const TeamAttendance = lazy(() => import("./pages/team-attendance/TeamAttendance"));
const HolidayCalendar = lazy(() => import("./pages/holiday-calendar/HolidayCalendar"));
const AttendanceReports = lazy(() => import("./pages/attendance-reports/AttendanceReports"));
const Leaves = lazy(() => import("./pages/leaves/Leaves"));
const LeaveApply = lazy(() => import("./pages/leave-apply/LeaveApply"));
const LeaveApprovals = lazy(() => import("./pages/leave-approvals/LeaveApprovals"));
const WFHRequests = lazy(() => import("./pages/wfh-requests/WFHRequests"));
const WFHApprovals = lazy(() => import("./pages/wfh/WFHApprovals"));
const CompOffApprovals = lazy(() => import("./pages/comp-off/CompOffApprovals"));
const CompOff = lazy(() => import("./pages/comp-off/CompOff"));
const Documents = lazy(() => import("./pages/documents/Documents"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Notifications = lazy(() => import("./pages/notifications/Notifications"));

// Timesheet Module
const TimesheetHome = lazy(() => import("./pages/timesheet-home/TimesheetHome"));
const TimesheetWeekly = lazy(() => import("./pages/timesheet-weekly/TimesheetWeekly"));
const TimesheetDaily = lazy(() => import("./pages/timesheet-daily/TimesheetDaily"));
const TimesheetLogModal = lazy(() => import("./pages/timesheet-home/TimesheetLogModal"));
const TimesheetHistory = lazy(() => import("./pages/timesheet-history/TimesheetHistory"));
const TimesheetDetail = lazy(() => import("./pages/timesheet-detail/TimesheetDetail"));
const TimesheetApprovals = lazy(() => import("./pages/timesheet-approvals/TimesheetApprovals"));
const AdminTimesheetReports = lazy(() => import("./pages/admin-timesheet-reports/AdminTimesheetReports"));
const AdminOvertimeReport = lazy(() => import("./pages/admin-timesheet-overtime/AdminOvertimeReport"));
const AdminMissingTimesheet = lazy(() => import("./pages/admin-timesheet-missing/AdminMissingTimesheet"));
const AdminTimesheetExport = lazy(() => import("./pages/admin-timesheet-export/AdminTimesheetExport"));
const AdminTimesheetConfig = lazy(() => import("./pages/admin-timesheet-config/AdminTimesheetConfig"));

// Engagement Module
const AnnouncementsFeed = lazy(() => import("./pages/announcements/AnnouncementsFeed"));
const AnnouncementDetail = lazy(() => import("./pages/announcement-detail/AnnouncementDetail"));
const AdminAnnouncements = lazy(() => import("./pages/admin-announcements/AdminAnnouncements"));
const RecognitionWall = lazy(() => import("./pages/recognition/RecognitionWall"));
const SendRecognition = lazy(() => import("./pages/recognition-send/SendRecognition"));
const SurveysList = lazy(() => import("./pages/surveys/SurveysList"));
const SurveyForm = lazy(() => import("./pages/survey-form/SurveyForm"));
const SurveyResults = lazy(() => import("./pages/survey-results/SurveyResults"));

// Admin Settings
const AdminCompanySettings = lazy(() => import("./pages/admin-company/AdminCompanySettings"));
const AdminOrgStructure = lazy(() => import("./pages/admin-org-structure/AdminOrgStructure"));
const AdminRoles = lazy(() => import("./pages/admin-roles/AdminRoles"));
const AdminLeavePolicy = lazy(() => import("./pages/admin-leave-policy/AdminLeavePolicy"));
const AdminEmailTemplates = lazy(() => import("./pages/admin-emails/AdminEmailTemplates"));
const AdminAuditLog = lazy(() => import("./pages/admin-audit/AdminAuditLog"));

// Performance Module
const MyGoals = lazy(() => import("./pages/perf-goals/MyGoals"));
const TeamGoals = lazy(() => import("./pages/perf-goals/TeamGoals"));
const GoalForm = lazy(() => import("./pages/perf-goal-form/GoalForm"));
const SelfReview = lazy(() => import("./pages/perf-self-review/SelfReview"));
const MyReviews = lazy(() => import("./pages/perf-my-reviews/MyReviews"));
const ManagerReview = lazy(() => import("./pages/perf-mgr-review/ManagerReview"));
const FeedbackPage = lazy(() => import("./pages/perf-feedback/FeedbackPage"));
const PIPDetail = lazy(() => import("./pages/perf-pip/PIPDetail"));
const Calibration = lazy(() => import("./pages/perf-calibrate/Calibration"));
const ReviewCycles = lazy(() => import("./pages/perf-cycles/ReviewCycles"));

// Daily Updates Module
const DailyUpdates = lazy(() => import("./pages/daily-updates/DailyUpdates"));
const TeamDailyUpdates = lazy(() => import("./pages/daily-updates/TeamDailyUpdates"));

// Learning Module
const LearningHub = lazy(() => import("./pages/learning-hub/LearningHub"));
const CourseDetail = lazy(() => import("./pages/course-detail/CourseDetail"));
const MyCertifications = lazy(() => import("./pages/learning-certs/MyCertifications"));

export default function App() {
  return (
    <>
    <PremiumLoader />
    <Suspense fallback={<PremiumPageLoader />}>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* All authenticated users */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/attendance/calendar" element={<AttendanceCalendar />} />
          <Route path="/attendance/holidays" element={<HolidayCalendar />} />
          <Route path="/attendance/wfh" element={<WFHRequests />} />
          <Route path="/attendance/compoff" element={<CompOff />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/leaves" element={<Leaves />} />
          <Route path="/leave/apply" element={<LeaveApply />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Timesheet */}
          <Route path="/timesheet" element={<TimesheetHome />} />
          <Route path="/timesheet/weekly" element={<TimesheetWeekly />} />
          <Route path="/timesheet/daily" element={<TimesheetDaily />} />
          <Route path="/timesheet/log" element={<TimesheetLogModal />} />
          <Route path="/timesheet/history" element={<TimesheetHistory />} />
          <Route path="/timesheet/:weekId" element={<TimesheetDetail />} />

          {/* Performance */}
          <Route path="/performance/goals" element={<MyGoals />} />
          <Route path="/performance/goals/new" element={<GoalForm />} />
          <Route path="/performance/reviews/my" element={<MyReviews />} />
          <Route path="/performance/reviews/:id/self" element={<SelfReview />} />
          <Route path="/performance/feedback" element={<FeedbackPage />} />
          <Route path="/performance/pip/:id" element={<PIPDetail />} />

          {/* Learning */}
          <Route path="/learning" element={<LearningHub />} />
          <Route path="/learning/courses/:id" element={<CourseDetail />} />
          <Route path="/learning/certifications" element={<MyCertifications />} />

          {/* Daily Updates */}
          <Route path="/daily-updates" element={<DailyUpdates />} />

          {/* Engagement */}
          <Route path="/announcements" element={<AnnouncementsFeed />} />
          <Route path="/announcements/:id" element={<AnnouncementDetail />} />
          <Route path="/recognition" element={<RecognitionWall />} />
          <Route path="/surveys" element={<SurveysList />} />
          <Route path="/surveys/:id" element={<SurveyForm />} />
        </Route>
      </Route>

      {/* Manager + Admin */}
      <Route element={<ProtectedRoute roles={["admin", "manager"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/employees" element={<Employees />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/attendance/team" element={<TeamAttendance />} />
          <Route path="/attendance/reports" element={<AttendanceReports />} />
          <Route path="/leave/approvals" element={<LeaveApprovals />} />
          <Route path="/timesheet/approvals" element={<TimesheetApprovals />} />
          <Route path="/daily-updates/team" element={<TeamDailyUpdates />} />
          <Route path="/dashboard/manager" element={<ManagerDashboard />} />
          <Route path="/admin/announcements" element={<AdminAnnouncements />} />
          <Route path="/admin/surveys/:id/results" element={<SurveyResults />} />
          <Route path="/performance/reviews/:id/mgr" element={<ManagerReview />} />
          <Route path="/performance/goals/team" element={<TeamGoals />} />
          <Route path="/wfh/approvals" element={<WFHApprovals />} />
          <Route path="/compoff/approvals" element={<CompOffApprovals />} />
        </Route>
      </Route>

      {/* Admin only */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/users" element={<Users />} />
          <Route path="/recognition/send" element={<SendRecognition />} />
          <Route path="/dashboard/hr" element={<HrDashboard />} />
          <Route path="/admin/timesheet/reports/employee" element={<AdminTimesheetReports />} />
          <Route path="/admin/timesheet/reports/overtime" element={<AdminOvertimeReport />} />
          <Route path="/admin/timesheet/missing" element={<AdminMissingTimesheet />} />
          <Route path="/admin/timesheet/export" element={<AdminTimesheetExport />} />
          <Route path="/admin/timesheet/config" element={<AdminTimesheetConfig />} />
          <Route path="/admin/settings/company" element={<AdminCompanySettings />} />
          <Route path="/admin/settings/org-structure" element={<AdminOrgStructure />} />
          <Route path="/admin/settings/departments" element={<Navigate to="/admin/settings/org-structure" replace />} />
          <Route path="/admin/settings/designations" element={<Navigate to="/admin/settings/org-structure" replace />} />
          <Route path="/admin/settings/roles" element={<AdminRoles />} />
          <Route path="/admin/settings/leave" element={<AdminLeavePolicy />} />
          <Route path="/admin/performance/calibrate" element={<Calibration />} />
          <Route path="/admin/performance/cycles" element={<ReviewCycles />} />
          <Route path="/admin/settings/emails" element={<AdminEmailTemplates />} />
          <Route path="/admin/audit" element={<AdminAuditLog />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
    </>
  );
}
