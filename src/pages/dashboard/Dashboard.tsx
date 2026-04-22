import { useState, useEffect } from "react";
import {
  Clock, FolderKanban, CheckCircle, AlertCircle, CalendarDays, FileText, LogIn,
  ArrowRight, User, UserCheck, History, Home, PartyPopper, TrendingUp, BarChart3,
  Heart,
} from "lucide-react";
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
    { name: "Personal", used: leaveBalance.casual.used, remaining: leaveBalance.casual.remaining },
    { name: "Sick", used: leaveBalance.sick.used, remaining: leaveBalance.sick.remaining },
    { name: "Comp-Off", used: leaveBalance.compoff.used, remaining: leaveBalance.compoff.remaining },
  ] : [];

  const quickActions = [
    { label: "Log Time", to: "/timesheet/log", icon: Clock, gradient: "from-indigo-500 to-purple-600" },
    { label: "Apply Leave", to: "/leave/apply", icon: CalendarDays, gradient: "from-emerald-500 to-teal-600" },
    { label: "Weekly Grid", to: "/timesheet/weekly", icon: FolderKanban, gradient: "from-sky-500 to-blue-600" },
    { label: "Documents", to: "/documents", icon: FileText, gradient: "from-fuchsia-500 to-purple-600" },
  ];

  const card =
    "rounded-2xl border border-gray-200/70 bg-white/80 p-5 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
  const sectionLabel = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">{user?.name?.split(" ")[0]}</span>
            </h1>
            <p className="mt-1 text-sm text-indigo-200/70">Here's your work overview for today</p>
          </div>
          <div className="flex items-center gap-3">
            {kpis?.todayStatus ? (
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Today</p>
                <p className="text-base font-bold capitalize">{kpis.todayStatus.status}</p>
              </div>
            ) : (
              <Link
                to="/attendance"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
              >
                <LogIn className="h-4 w-4" /> Clock In
              </Link>
            )}
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">This Month</p>
              <p className="text-base font-bold">{kpis?.totalHoursThisMonth || 0}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Tiles ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Attendance", value: `${kpis?.attendancePercent || 0}%`, sub: `${kpis?.attendanceDays || 0} days this month`, icon: CheckCircle, gradient: "from-emerald-500 to-teal-600" },
          { label: "Hours Logged", value: `${kpis?.totalHoursThisMonth || 0}h`, sub: "This month", icon: Clock, gradient: "from-indigo-500 to-purple-600" },
          { label: "Leaves Taken", value: `${kpis?.leaveDaysTaken || 0}`, sub: "This month", icon: CalendarDays, gradient: "from-amber-500 to-orange-600" },
          { label: "Pending TS", value: `${kpis?.pendingTimesheets || 0}`, sub: "Draft sheets", icon: AlertCircle, gradient: "from-rose-500 to-pink-600" },
        ].map((s) => (
          <div key={s.label} className={`${card} group relative overflow-hidden`}>
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${s.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20`}
            />
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className={sectionLabel}>{s.label}</p>
                <p className="mt-2.5 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{s.value}</p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${s.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="mt-3 truncate text-xs text-gray-500 dark:text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <p className={`mb-3 ${sectionLabel}`}>Quick Actions</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-gray-200/70 bg-white/80 px-4 py-4 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-800/80 dark:bg-gray-900/80 dark:text-gray-100 dark:ring-white/[0.03] dark:hover:border-gray-700"
            >
              <div className={`rounded-xl bg-gradient-to-br ${a.gradient} p-2.5 shadow-lg shadow-black/10 ring-1 ring-white/10 transition-transform group-hover:scale-105`}>
                <a.icon className="h-5 w-5 text-white" />
              </div>
              <span className="flex-1">{a.label}</span>
              <ArrowRight className="h-4 w-4 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${card} lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:ring-indigo-400/20">
                <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Weekly Hours</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Mon–Fri · current work week</p>
              </div>
            </div>
            <Link to="/timesheet" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={200}>
              <BarChart data={barData} margin={{ top: 10, right: 6, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="barHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.06)" }}
                  contentStyle={{ backgroundColor: "#111827", border: "none", borderRadius: "12px", color: "#f3f4f6", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}
                />
                <Bar dataKey="hours" fill="url(#barHours)" radius={[8, 8, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <TimerWidget />
      </div>

      {/* ── Leave Balance + Quick links ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={card}>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-500/10 dark:bg-emerald-500/10 dark:ring-emerald-400/20">
              <Heart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Leave Balance</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Days remaining</p>
            </div>
          </div>
          {leaveData.length > 0 ? (
            <div className="space-y-4">
              {leaveData.map((l, i) => {
                const total = l.used + l.remaining;
                const pct = total > 0 ? (l.used / total) * 100 : 0;
                const colors = [
                  "from-indigo-500 to-purple-600",
                  "from-amber-500 to-orange-600",
                  "from-sky-500 to-blue-600",
                ];
                return (
                  <div key={l.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{l.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-900 dark:text-white">{l.remaining}</span> / {total} left
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all duration-500`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                <CalendarDays className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">No leave data</p>
            </div>
          )}
        </div>

        <div className={`${card} lg:col-span-2`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2 ring-1 ring-purple-500/10 dark:bg-purple-500/10 dark:ring-purple-400/20">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Links</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your most-used destinations</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "My Profile", to: "/profile", icon: User, color: "text-indigo-500" },
              { label: "Attendance", to: "/attendance", icon: UserCheck, color: "text-emerald-500" },
              { label: "Timesheets", to: "/timesheet", icon: Clock, color: "text-sky-500" },
              { label: "Leave History", to: "/leaves", icon: History, color: "text-amber-500" },
              { label: "WFH Requests", to: "/attendance/wfh", icon: Home, color: "text-fuchsia-500" },
              { label: "Holidays", to: "/attendance/holidays", icon: PartyPopper, color: "text-rose-500" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="group flex items-center gap-2.5 rounded-xl border border-transparent bg-gray-50/70 px-3 py-2.5 text-sm font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:bg-white hover:shadow-sm dark:bg-gray-800/40 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800"
              >
                <div className="rounded-lg bg-white p-1.5 ring-1 ring-gray-200/60 dark:bg-gray-900 dark:ring-gray-700/60">
                  <l.icon className={`h-3.5 w-3.5 ${l.color}`} />
                </div>
                <span className="flex-1 truncate">{l.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
