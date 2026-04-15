import { useState, useEffect } from "react";
import {
  Users, UserCheck, UserX, TrendingDown, TrendingUp, Building2, ClipboardList,
  FileBarChart, Download, Mail, Calendar, PartyPopper, Clock, ArrowRight,
  CheckCircle2, AlertCircle, Sparkles, Briefcase,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { dashboardApi, type HrStats, type PendingApprovalItem } from "../../api/dashboardApi";

type Anniversary = { _id: string; name: string; email: string; department?: string; years: number; eventDate: string };

const ATTENDANCE_COLORS = ["#10b981", "#ef4444"];
const LEAVE_COLORS: Record<string, string> = {
  Casual: "#6366f1",
  Sick: "#f59e0b",
  Earned: "#10b981",
  Unpaid: "#ef4444",
  Compoff: "#8b5cf6",
};

function Initials({ name }: { name: string }) {
  const init = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
      {init}
    </div>
  );
}

export default function HrDashboard() {
  const [stats, setStats] = useState<HrStats | null>(null);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [pending, setPending] = useState<{ leaves: PendingApprovalItem[]; timesheets: PendingApprovalItem[] }>({ leaves: [], timesheets: [] });

  useEffect(() => {
    dashboardApi.getHrStats().then((r) => setStats(r.data.data ?? null)).catch(() => {});
    dashboardApi.getUpcomingEvents().then((r) => setAnniversaries(r.data.data?.anniversaries ?? [])).catch(() => {});
    dashboardApi.getPendingApprovals().then((r) => setPending(r.data.data ?? { leaves: [], timesheets: [] })).catch(() => {});
  }, []);

  const leaveData = (stats?.leaveStats ?? []).map((l) => ({
    type: l._id.charAt(0).toUpperCase() + l._id.slice(1),
    totalDays: l.totalDays,
    count: l.count,
  }));

  const attendanceTotal = (stats?.todayPresent ?? 0) + (stats?.todayAbsent ?? 0);
  const attendanceRate = attendanceTotal > 0 ? Math.round((stats!.todayPresent / attendanceTotal) * 100) : 0;
  const attendancePie = stats ? [
    { name: "Present", value: stats.todayPresent },
    { name: "Absent", value: stats.todayAbsent },
  ] : [];

  const pendingCount = pending.leaves.length + pending.timesheets.length;

  const hero = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const card = "rounded-2xl border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-all";

  /* KPI tiles (premium, gradient accent bar, trend badge) */
  const kpis = stats ? [
    {
      label: "Headcount",
      value: stats.totalEmployees,
      sub: `${stats.activeEmployees} active · ${stats.inactiveEmployees} inactive`,
      icon: Users,
      gradient: "from-indigo-500 to-purple-600",
      trend: null as null | { dir: "up" | "down"; pct: string },
    },
    {
      label: "Attendance Today",
      value: `${attendanceRate}%`,
      sub: `${stats.todayPresent} present · ${stats.todayAbsent} absent`,
      icon: UserCheck,
      gradient: "from-emerald-500 to-teal-600",
      trend: { dir: attendanceRate >= 80 ? "up" : "down", pct: `${attendanceRate}%` } as const,
    },
    {
      label: "Attrition (YTD)",
      value: `${stats.attritionRate.toFixed(1)}%`,
      sub: "Organisation-wide",
      icon: TrendingDown,
      gradient: "from-rose-500 to-pink-600",
      trend: null,
    },
    {
      label: "Pending Approvals",
      value: pendingCount,
      sub: `${pending.leaves.length} leaves · ${pending.timesheets.length} timesheets`,
      icon: AlertCircle,
      gradient: "from-amber-500 to-orange-600",
      trend: null,
    },
  ] : [];

  const quickLinks = [
    { label: "Employees", to: "/employees", icon: Building2, color: "text-indigo-500" },
    { label: "Timesheet Approvals", to: "/timesheet/approvals", icon: ClipboardList, color: "text-emerald-500" },
    { label: "Attendance Reports", to: "/attendance/reports", icon: FileBarChart, color: "text-purple-500" },
    { label: "Export Timesheet", to: "/admin/timesheet/export", icon: Download, color: "text-rose-500" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-white/5 blur-xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">{hero}</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl flex items-center gap-3">
              <Sparkles className="h-8 w-8" /> HR Command Center
            </h1>
            <p className="mt-1 text-sm text-indigo-100">People analytics · Workforce health · Compliance at a glance</p>
          </div>
          <Link to="/employees" className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg hover:scale-105 hover:bg-white transition-all">
            <Users className="h-4 w-4" /> Manage Workforce
          </Link>
        </div>
      </div>

      {/* ── KPI Tiles ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${card} relative overflow-hidden`}>
            <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${k.gradient}`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{k.label}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{k.value}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{k.sub}</p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${k.gradient} p-2.5 shadow-md`}>
                <k.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            {k.trend && (
              <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                k.trend.dir === "up"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
              }`}>
                {k.trend.dir === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {k.trend.pct}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Secondary stats ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat icon={UserCheck} label="Active" value={stats.activeEmployees} color="text-emerald-500" />
          <MiniStat icon={UserX} label="Inactive" value={stats.inactiveEmployees} color="text-gray-500" />
          <MiniStat icon={CheckCircle2} label="Present Today" value={stats.todayPresent} color="text-teal-500" />
          <MiniStat icon={Clock} label="New This Month" value={stats.newJoinersThisMonth.length} color="text-indigo-500" />
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leave distribution */}
        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Leave Distribution (YTD)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Approved leaves by type</p>
            </div>
            <Link to="/attendance/reports" className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
              Report <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {leaveData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.15} />
                  <XAxis dataKey="type" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "12px", color: "#f3f4f6", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} />
                  <Bar dataKey="totalDays" radius={[8, 8, 0, 0]}>
                    {leaveData.map((d, i) => (
                      <Cell key={i} fill={LEAVE_COLORS[d.type] || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="No leave data yet" />
          )}
        </div>

        {/* Attendance radial */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Today's Attendance</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Live status</p>
            </div>
          </div>
          {attendanceTotal > 0 ? (
            <div className="relative h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attendancePie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                    {attendancePie.map((_, idx) => (
                      <Cell key={idx} fill={ATTENDANCE_COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "12px", color: "#f3f4f6" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{attendanceRate}%</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Present</p>
              </div>
            </div>
          ) : (
            <EmptyState label="No attendance data" />
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-2">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats?.todayPresent ?? 0}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Present</p>
            </div>
            <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 p-2">
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats?.todayAbsent ?? 0}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">Absent</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Workforce composition + Headcount gauge ── */}
      {stats && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className={card}>
            <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">Workforce Health</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="40%"
                  outerRadius="100%"
                  data={[{ name: "Active", value: stats.totalEmployees > 0 ? (stats.activeEmployees / stats.totalEmployees) * 100 : 0, fill: "#10b981" }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "#e5e7eb" }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.activeEmployees}</span> of {stats.totalEmployees} employees active
            </p>
          </div>

          {/* Pending approvals list */}
          <div className={`${card} lg:col-span-2`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Pending Approvals</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{pendingCount} awaiting action</p>
              </div>
              <Link to="/approvals" className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {pendingCount === 0 ? (
              <EmptyState label="All caught up! No pending approvals." icon={CheckCircle2} />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {pending.leaves.slice(0, 5).map((l) => (
                  <div key={l._id} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Initials name={l.employee.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{l.employee.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400 capitalize">{l.leaveType} leave · {l.days} day{(l.days ?? 0) > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                      <AlertCircle className="h-3 w-3" /> Leave
                    </span>
                  </div>
                ))}
                {pending.timesheets.slice(0, 5).map((t) => (
                  <div key={t._id} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Initials name={t.employee.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{t.employee.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">Timesheet · {t.totalHours ?? 0}h</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400">
                      <Briefcase className="h-3 w-3" /> Timesheet
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Anniversaries + New Joiners ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Anniversaries */}
        <div className={`${card} lg:col-span-2 bg-gradient-to-br from-amber-50 via-white to-white dark:from-amber-500/5 dark:via-gray-900 dark:to-gray-900`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-500/20 p-2">
              <PartyPopper className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Work Anniversaries</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Next 14 days</p>
            </div>
          </div>
          {anniversaries.length === 0 ? (
            <EmptyState label="No upcoming anniversaries" />
          ) : (
            <div className="space-y-2">
              {anniversaries.slice(0, 5).map((a) => (
                <div key={a._id} className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-800 p-2.5 border border-amber-100 dark:border-amber-500/10">
                  <Initials name={a.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{a.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{a.department || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{a.years} yr{a.years > 1 ? "s" : ""}</p>
                    <p className="text-[10px] text-gray-500">{new Date(a.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Joiners */}
        <div className={`${card} lg:col-span-3`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">New Joiners This Month</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{stats?.newJoinersThisMonth.length ?? 0} new hires</p>
            </div>
            <Link to="/employees" className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(stats?.newJoinersThisMonth ?? []).length === 0 ? (
            <EmptyState label="No new hires yet" />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {stats!.newJoinersThisMonth.map((emp) => (
                <div key={emp._id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <Initials name={emp.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {emp.email}
                    </p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      {emp.department || "N/A"}
                    </span>
                    <p className="mt-1 text-[10px] text-gray-500 flex items-center gap-1 justify-end">
                      <Calendar className="h-3 w-3" />
                      {new Date(emp.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="group flex items-center gap-3 rounded-2xl border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className={`rounded-xl bg-gray-50 dark:bg-gray-800 p-2.5 ${l.color}`}>
                <l.icon className="h-5 w-5" />
              </div>
              <span className="flex-1">{l.label}</span>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function MiniStat({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 hover:shadow-sm transition-all">
      <Icon className={`h-5 w-5 ${color}`} />
      <div>
        <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ label, icon: Icon = AlertCircle }: { label: string; icon?: typeof AlertCircle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3">
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
