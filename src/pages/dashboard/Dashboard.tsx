import { useState, useEffect } from "react";
import { Clock, FolderKanban, CheckCircle, AlertCircle, CalendarDays, FileText, LogIn } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { dashboardApi, type EmployeeKpis } from "../../api/dashboardApi";
import { reportApi } from "../../api/reportApi";
import { leaveApi } from "../../api/leaveApi";
import { attendanceApi } from "../../api/attendanceApi";
import type { AttendanceRecord } from "../../types";
import { useAuth } from "../../context/AuthContext";
import TimerWidget from "../../components/TimerWidget";
import type { WeeklySummary, LeaveBalance } from "../../types";

const WORK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  if (isAdmin) return <Navigate to="/dashboard/hr" replace />;
  const [kpis, setKpis] = useState<EmployeeKpis | null>(null);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [attendanceWeek, setAttendanceWeek] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    dashboardApi.getEmployeeKpis().then((r) => setKpis(r.data.data ?? null)).catch(() => { /* interceptor */ });
    reportApi.getWeeklySummary().then((r) => setWeekly(r.data.data!)).catch(() => { /* interceptor */ });
    leaveApi.getBalance().then((r) => { if (r.data.data) setLeaveBalance(r.data.data); }).catch(() => { /* interceptor */ });
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    attendanceApi.getMyHistory({ month, limit: 200 }).then((r) => setAttendanceWeek(r.data.data || [])).catch(() => {});
  }, []);

  // Build Mon–Fri bars from attendance clock-in hours for current work week
  const barData = (() => {
    const now = new Date();
    const weekStart = new Date(now);
    const dow = now.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    weekStart.setDate(now.getDate() + diffToMon);
    weekStart.setHours(0, 0, 0, 0);
    const ymd = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    // Attendance dates are stored as UTC midnight of the business day — read UTC parts
    const ymdUTC = (dt: Date) =>
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = ymd(d);
      const rec = attendanceWeek.find((r) => ymdUTC(new Date(r.date)) === key);
      return { day: WORK_DAYS[i], hours: rec?.totalHours || 0 };
    });
  })();
  void weekly;

  const leaveData = leaveBalance ? [
    { name: "Casual", used: leaveBalance.casual.used, remaining: leaveBalance.casual.remaining },
    { name: "Sick", used: leaveBalance.sick.used, remaining: leaveBalance.sick.remaining },
    { name: "Earned", used: leaveBalance.earned.used, remaining: leaveBalance.earned.remaining },
    { name: "Comp-Off", used: leaveBalance.compoff.used, remaining: leaveBalance.compoff.remaining },
  ] : [];

  const quickActions = [
    { label: "Log Time", to: "/timesheet/log", icon: Clock, color: "bg-indigo-600 hover:bg-indigo-700" },
    { label: "Apply Leave", to: "/leave/apply", icon: CalendarDays, color: "bg-emerald-600 hover:bg-emerald-700" },
    { label: "Weekly Grid", to: "/timesheet/weekly", icon: FolderKanban, color: "bg-blue-600 hover:bg-blue-700" },
    { label: "Documents", to: "/documents", icon: FileText, color: "bg-purple-600 hover:bg-purple-700" },
  ];

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-indigo-200">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Welcome back, {user?.name?.split(" ")[0]}!</h1>
            <p className="mt-1 text-sm text-indigo-200">Here's your work overview for today</p>
          </div>
          <div className="flex items-center gap-3">
            {kpis?.todayStatus ? (
              <div className="rounded-xl bg-white/10 backdrop-blur-sm px-5 py-3 text-center">
                <p className="text-xs text-indigo-200">Today</p>
                <p className="text-lg font-bold capitalize">{kpis.todayStatus.status}</p>
              </div>
            ) : (
              <Link to="/attendance" className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg hover:scale-105 transition-all">
                <LogIn className="h-4 w-4" /> Clock In
              </Link>
            )}
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-5 py-3 text-center">
              <p className="text-xs text-indigo-200">This Month</p>
              <p className="text-lg font-bold">{kpis?.totalHoursThisMonth || 0}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Attendance", value: `${kpis?.attendancePercent || 0}%`, sub: `${kpis?.attendanceDays || 0} days`, icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/20" },
          { label: "Hours Logged", value: `${kpis?.totalHoursThisMonth || 0}h`, sub: "This month", icon: Clock, color: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-500/20" },
          { label: "Leaves Taken", value: `${kpis?.leaveDaysTaken || 0}`, sub: "This month", icon: CalendarDays, color: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/20" },
          { label: "Pending TS", value: `${kpis?.pendingTimesheets || 0}`, sub: "Draft sheets", icon: AlertCircle, color: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-500/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.border} bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((a) => (
          <Link key={a.to} to={a.to} className={`flex items-center gap-3 rounded-xl ${a.color} px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-100`}>
            <a.icon className="h-5 w-5" /> {a.label}
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${card} lg:col-span-2`}>
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Weekly Hours</h3>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6" }} />
                <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <TimerWidget />
      </div>

      {/* Leave Balance + Quick links */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={card}>
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Leave Balance</h3>
          {leaveData.length > 0 ? (
            <div className="space-y-3">
              {leaveData.map((l) => (
                <div key={l.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{l.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{l.remaining} left</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, (l.used / (l.used + l.remaining)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">No leave data</p>
          )}
        </div>

        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Links</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "My Profile", to: "/profile", icon: "👤" },
              { label: "Attendance", to: "/attendance", icon: "📋" },
              { label: "Timesheets", to: "/timesheet", icon: "⏱️" },
              { label: "Leave History", to: "/leaves", icon: "📅" },
              { label: "WFH Requests", to: "/attendance/wfh", icon: "🏠" },
              { label: "Holidays", to: "/attendance/holidays", icon: "🎉" },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="flex items-center gap-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <span>{l.icon}</span> {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
