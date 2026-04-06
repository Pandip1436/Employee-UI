import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import ManagerDashboard from "./pages/dashboard-manager/ManagerDashboard";
import HrDashboard from "./pages/dashboard-hr/HrDashboard";
import Projects from "./pages/projects/Projects";
import Approvals from "./pages/approvals/Approvals";
import Users from "./pages/users/Users";
import Employees from "./pages/employees/Employees";
import Attendance from "./pages/attendance/Attendance";
import AttendanceCalendar from "./pages/attendance-calendar/AttendanceCalendar";
import TeamAttendance from "./pages/team-attendance/TeamAttendance";
import HolidayCalendar from "./pages/holiday-calendar/HolidayCalendar";
import AttendanceReports from "./pages/attendance-reports/AttendanceReports";
import Leaves from "./pages/leaves/Leaves";
import LeaveApply from "./pages/leave-apply/LeaveApply";
import LeaveApprovals from "./pages/leave-approvals/LeaveApprovals";
import WFHRequests from "./pages/wfh-requests/WFHRequests";
import CompOff from "./pages/comp-off/CompOff";
import Documents from "./pages/documents/Documents";
import Profile from "./pages/profile/Profile";

// Timesheet Module
import TimesheetHome from "./pages/timesheet-home/TimesheetHome";
import TimesheetWeekly from "./pages/timesheet-weekly/TimesheetWeekly";
import TimesheetDaily from "./pages/timesheet-daily/TimesheetDaily";
import TimesheetLogModal from "./pages/timesheet-home/TimesheetLogModal";
import TimesheetHistory from "./pages/timesheet-history/TimesheetHistory";
import TimesheetDetail from "./pages/timesheet-detail/TimesheetDetail";
import TimesheetApprovals from "./pages/timesheet-approvals/TimesheetApprovals";
import TimesheetProjectSummary from "./pages/timesheet-project-summary/TimesheetProjectSummary";
import AdminTimesheetDashboard from "./pages/admin-timesheet/AdminTimesheetDashboard";
import AdminTimesheetReports from "./pages/admin-timesheet-reports/AdminTimesheetReports";
import AdminOvertimeReport from "./pages/admin-timesheet-overtime/AdminOvertimeReport";
import AdminMissingTimesheet from "./pages/admin-timesheet-missing/AdminMissingTimesheet";
import AdminTimesheetExport from "./pages/admin-timesheet-export/AdminTimesheetExport";
import AdminTimesheetConfig from "./pages/admin-timesheet-config/AdminTimesheetConfig";

// Engagement Module
import AnnouncementsFeed from "./pages/announcements/AnnouncementsFeed";
import AnnouncementDetail from "./pages/announcement-detail/AnnouncementDetail";
import AdminAnnouncements from "./pages/admin-announcements/AdminAnnouncements";
import RecognitionWall from "./pages/recognition/RecognitionWall";
import SendRecognition from "./pages/recognition-send/SendRecognition";
import SurveysList from "./pages/surveys/SurveysList";
import SurveyForm from "./pages/survey-form/SurveyForm";
import SurveyResults from "./pages/survey-results/SurveyResults";

// Admin Settings
import AdminCompanySettings from "./pages/admin-company/AdminCompanySettings";
import AdminDesignations from "./pages/admin-designations/AdminDesignations";
import AdminRoles from "./pages/admin-roles/AdminRoles";
import AdminLeavePolicy from "./pages/admin-leave-policy/AdminLeavePolicy";
import AdminEmailTemplates from "./pages/admin-emails/AdminEmailTemplates";
import AdminAuditLog from "./pages/admin-audit/AdminAuditLog";

// Performance Module
import MyGoals from "./pages/perf-goals/MyGoals";
import GoalForm from "./pages/perf-goal-form/GoalForm";
import SelfReview from "./pages/perf-self-review/SelfReview";
import ManagerReview from "./pages/perf-mgr-review/ManagerReview";
import FeedbackPage from "./pages/perf-feedback/FeedbackPage";
import PIPDetail from "./pages/perf-pip/PIPDetail";
import Calibration from "./pages/perf-calibrate/Calibration";
import ReviewCycles from "./pages/perf-cycles/ReviewCycles";

// Daily Updates Module
import DailyUpdates from "./pages/daily-updates/DailyUpdates";
import TeamDailyUpdates from "./pages/daily-updates/TeamDailyUpdates";

// Chat Module
import TeamChat from "./pages/chat/TeamChat";

// Learning Module
import LearningHub from "./pages/learning-hub/LearningHub";
import MyCertifications from "./pages/learning-certs/MyCertifications";
import Teaching from "./pages/learning-teaching/Teaching";
import LearningCalendar from "./pages/learning-calendar/LearningCalendar";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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
          <Route path="/performance/reviews/:id/self" element={<SelfReview />} />
          <Route path="/performance/feedback" element={<FeedbackPage />} />
          <Route path="/performance/pip/:id" element={<PIPDetail />} />

          {/* Learning */}
          <Route path="/learning" element={<LearningHub />} />
          <Route path="/learning/certifications" element={<MyCertifications />} />
          <Route path="/learning/teaching" element={<Teaching />} />
          <Route path="/learning/calendar" element={<LearningCalendar />} />

          {/* Chat */}
          <Route path="/chat" element={<TeamChat />} />

          {/* Daily Updates */}
          <Route path="/daily-updates" element={<DailyUpdates />} />

          {/* Engagement */}
          <Route path="/announcements" element={<AnnouncementsFeed />} />
          <Route path="/announcements/:id" element={<AnnouncementDetail />} />
          <Route path="/recognition" element={<RecognitionWall />} />
          <Route path="/recognition/send" element={<SendRecognition />} />
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
          <Route path="/timesheet/team/projects" element={<TimesheetProjectSummary />} />
          <Route path="/daily-updates/team" element={<TeamDailyUpdates />} />
          <Route path="/dashboard/manager" element={<ManagerDashboard />} />
          <Route path="/admin/announcements" element={<AdminAnnouncements />} />
          <Route path="/admin/surveys/:id/results" element={<SurveyResults />} />
          <Route path="/performance/reviews/:id/mgr" element={<ManagerReview />} />
        </Route>
      </Route>

      {/* Admin only */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/users" element={<Users />} />
          <Route path="/dashboard/hr" element={<HrDashboard />} />
          <Route path="/admin/timesheet" element={<AdminTimesheetDashboard />} />
          <Route path="/admin/timesheet/reports/employee" element={<AdminTimesheetReports />} />
          <Route path="/admin/timesheet/reports/overtime" element={<AdminOvertimeReport />} />
          <Route path="/admin/timesheet/missing" element={<AdminMissingTimesheet />} />
          <Route path="/admin/timesheet/export" element={<AdminTimesheetExport />} />
          <Route path="/admin/timesheet/config" element={<AdminTimesheetConfig />} />
          <Route path="/admin/settings/company" element={<AdminCompanySettings />} />
          <Route path="/admin/settings/designations" element={<AdminDesignations />} />
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
  );
}
