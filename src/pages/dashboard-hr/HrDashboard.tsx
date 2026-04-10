import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  TrendingDown,
  CheckCircle,
  XCircle,
  Building2,
  ClipboardList,
  FileBarChart,
  Download,
  Mail,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { dashboardApi, type HrStats } from "../../api/dashboardApi";

const ATTENDANCE_COLORS = ["#6366f1", "#ef4444"];
const LEAVE_BAR_COLOR = "#8b5cf6";

export default function HrDashboard() {
  const [stats, setStats] = useState<HrStats | null>(null);
  // Events can be added later when anniversary UI section is built

  useEffect(() => {
    dashboardApi
      .getHrStats()
      .then((r) => setStats(r.data.data ?? null))
      .catch(() => {});
    // Upcoming events can be fetched when anniversary section is added
  }, []);

  /* ── derived data ─────────────────────────────── */

  const leaveData = (stats?.leaveStats ?? []).map((l) => ({
    type: l._id.charAt(0).toUpperCase() + l._id.slice(1),
    totalDays: l.totalDays,
    count: l.count,
  }));

  const attendanceData = stats
    ? [
        { name: "Present", value: stats.todayPresent },
        { name: "Absent", value: stats.todayAbsent },
      ]
    : [];

  const statCards = stats
    ? [
        {
          label: "Total Employees",
          value: stats.totalEmployees,
          icon: Users,
          border: "border-l-indigo-500",
          color: "text-indigo-500",
        },
        {
          label: "Active",
          value: stats.activeEmployees,
          icon: UserCheck,
          border: "border-l-emerald-500",
          color: "text-emerald-500",
        },
        {
          label: "Inactive",
          value: stats.inactiveEmployees,
          icon: UserX,
          border: "border-l-amber-500",
          color: "text-amber-500",
        },
        {
          label: "Attrition Rate",
          value: `${stats.attritionRate.toFixed(1)}%`,
          icon: TrendingDown,
          border: "border-l-rose-500",
          color: "text-rose-500",
        },
        {
          label: "Present Today",
          value: stats.todayPresent,
          icon: CheckCircle,
          border: "border-l-teal-500",
          color: "text-teal-500",
        },
        {
          label: "Absent Today",
          value: stats.todayAbsent,
          icon: XCircle,
          border: "border-l-red-500",
          color: "text-red-500",
        },
      ]
    : [];

  const quickLinks = [
    { label: "Employees", to: "/employees", icon: Building2 },
    { label: "Timesheet Approvals", to: "/timesheet/approvals", icon: ClipboardList },
    { label: "Attendance Reports", to: "/attendance/reports", icon: FileBarChart },
    { label: "Export Timesheet", to: "/admin/timesheet/export", icon: Download },
  ];

  const card =
    "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  /* ── render ────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ── Gradient Hero ────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm text-purple-200">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">HR Dashboard</h1>
          <p className="mt-1 text-sm text-purple-200">
            Organisation overview and workforce analytics
          </p>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border-l-4 ${s.border} border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Charts Row: Leave Bar + Attendance Donut ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leave Statistics */}
        <div className={`${card} lg:col-span-2`}>
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Leave Statistics
          </h3>
          {leaveData.length > 0 ? (
            <div className="h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                <BarChart data={leaveData} layout="horizontal">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    strokeOpacity={0.2}
                  />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#f3f4f6",
                    }}
                  />
                  <Bar
                    dataKey="totalDays"
                    name="Total Days"
                    fill={LEAVE_BAR_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              No leave data available
            </p>
          )}
        </div>

        {/* Attendance Donut */}
        <div className={card}>
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Today's Attendance
          </h3>
          {attendanceData.length > 0 &&
          (attendanceData[0].value > 0 || attendanceData[1].value > 0) ? (
            <div className="h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <PieChart>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {attendanceData.map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={ATTENDANCE_COLORS[idx]}
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-400">{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#f3f4f6",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              No attendance data yet
            </p>
          )}
        </div>
      </div>

      {/* ── New Joiners This Month ───────────────── */}
      <div className={card}>
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          New Joiners This Month
        </h3>

        {(stats?.newJoinersThisMonth ?? []).length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="pb-2 font-medium">Employee</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Department</th>
                    <th className="pb-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stats!.newJoinersThisMonth.map((emp) => (
                    <tr key={emp._id}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40 text-xs font-bold text-purple-600 dark:text-purple-400">
                            {emp.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {emp.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {emp.email}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          {emp.department || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(emp.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {stats!.newJoinersThisMonth.map((emp) => (
                <div
                  key={emp._id}
                  className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40 text-sm font-bold text-purple-600 dark:text-purple-400">
                      {emp.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900 dark:text-white">
                        {emp.name}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {emp.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 font-medium text-indigo-600 dark:text-indigo-400">
                      {emp.department || "N/A"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(emp.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
            No new joiners this month
          </p>
        )}
      </div>

      {/* ── Quick Links ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickLinks.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <l.icon className="h-5 w-5 text-purple-500" />
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
