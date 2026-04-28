import { useState, useEffect } from "react";
import {
  Users, UserCheck, UserX, TrendingDown, TrendingUp, Building2, ClipboardList,
  FileBarChart, Download, Mail, Calendar, PartyPopper, Clock, ArrowRight,
  CheckCircle2, AlertCircle, Briefcase,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { dashboardApi, type HrStats, type PendingApprovalItem } from "../../api/dashboardApi";
import { useCompany } from "../../context/CompanyContext";

type Anniversary = { _id: string; name: string; email: string; department?: string; years: number; eventDate: string };

const ATTENDANCE_COLORS = ["#10b981", "#ef4444"];
const LEAVE_COLORS: Record<string, string> = {
  Personal: "#6366f1",
  Sick: "#f59e0b",
  Earned: "#10b981",
  Unpaid: "#ef4444",
  Compoff: "#8b5cf6",
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: "Personal",
};

function Initials({ name }: { name: string }) {
  const init = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  // Deterministic gradient per name for visual distinction across lists.
  const palettes = [
    "from-indigo-500 to-purple-600",
    "from-sky-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-fuchsia-500 to-purple-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const palette = palettes[Math.abs(hash) % palettes.length];
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${palette} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
      {init}
    </div>
  );
}

export default function HrDashboard() {
  const { companyName, logo } = useCompany();
  const logoSrc = logo ? (/^(https?:|\/)/.test(logo) ? logo : `/${logo}`) : "/logodarkmode.png";
  const [stats, setStats] = useState<HrStats | null>(null);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [pending, setPending] = useState<{ leaves: PendingApprovalItem[]; timesheets: PendingApprovalItem[] }>({ leaves: [], timesheets: [] });

  useEffect(() => {
    dashboardApi.getHrStats().then((r) => setStats(r.data.data ?? null)).catch(() => {});
    dashboardApi.getUpcomingEvents().then((r) => setAnniversaries(r.data.data?.anniversaries ?? [])).catch(() => {});
    dashboardApi.getPendingApprovals().then((r) => setPending(r.data.data ?? { leaves: [], timesheets: [] })).catch(() => {});
  }, []);

  const leaveData = (stats?.leaveStats ?? [])
    .filter((l) => l._id !== "earned")
    .map((l) => ({
      type: LEAVE_TYPE_LABELS[l._id] ?? l._id.charAt(0).toUpperCase() + l._id.slice(1),
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

  const card =
    "rounded-2xl border border-gray-200/70 bg-white/80 p-5 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
  const sectionLabel = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

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
      trend: { dir: attendanceRate >= 50 ? "up" : "down", pct: `${attendanceRate}%` } as const,
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        {/* Decorative aurora blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        {/* Subtle grid */}
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
          <div className="flex items-center gap-4">
            <div className="relative shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <img src={logoSrc} alt={`${companyName} logo`} className="h-12 w-12 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                {hero}
              </p>
              <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {companyName}
              </h1>
              <p className="mt-0.5 text-xs text-indigo-200/70">Workforce overview & operations</p>
            </div>
          </div>
          <Link
            to="/employees"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
          >
            <Users className="h-4 w-4" /> Manage Workforce
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ── KPI Tiles ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${card} group relative overflow-hidden`}>
            {/* Corner glow accent */}
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${k.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20`}
            />
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className={sectionLabel}>{k.label}</p>
                <p className="mt-2.5 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {k.value}
                </p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${k.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                <k.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {k.trend && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                    k.trend.dir === "up"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20"
                      : "bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20"
                  }`}
                >
                  {k.trend.dir === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {k.trend.pct}
                </span>
              )}
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{k.sub}</p>
            </div>
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
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:ring-indigo-400/20">
                <FileBarChart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Leave Distribution</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Approved leaves by type · YTD</p>
              </div>
            </div>
            <Link to="/attendance/reports" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
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
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-500/10 dark:bg-emerald-500/10 dark:ring-emerald-400/20">
                <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Today's Attendance</h3>
                <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live status
                </p>
              </div>
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
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-500/10 dark:bg-emerald-500/10 dark:ring-emerald-400/20">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Workforce Health</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active employees ratio</p>
              </div>
            </div>
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="62%"
                  outerRadius="100%"
                  data={[{ name: "Active", value: stats.totalEmployees > 0 ? (stats.activeEmployees / stats.totalEmployees) * 100 : 0, fill: "#10b981" }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "rgba(148,163,184,0.15)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {stats.totalEmployees > 0 ? Math.round((stats.activeEmployees / stats.totalEmployees) * 100) : 0}
                  <span className="text-lg font-semibold text-gray-400">%</span>
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Active</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span><span className="font-semibold text-gray-700 dark:text-gray-200">{stats.activeEmployees}</span> of {stats.totalEmployees} employees active</span>
            </div>
          </div>

          {/* Pending approvals list */}
          <div className={`${card} lg:col-span-2`}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-2 ring-1 ring-amber-500/10 dark:bg-amber-500/10 dark:ring-amber-400/20">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pending Approvals</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{pendingCount} awaiting action</p>
                </div>
              </div>
              <Link to="/approvals" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {pendingCount === 0 ? (
              <EmptyState label="All caught up! No pending approvals." icon={CheckCircle2} />
            ) : (
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {pending.leaves.slice(0, 5).map((l) => (
                  <div key={l._id} className="group flex items-center justify-between gap-3 rounded-xl border border-transparent bg-gray-50/70 px-3 py-2.5 transition-all hover:border-gray-200 hover:bg-white hover:shadow-sm dark:bg-gray-800/40 dark:hover:border-gray-700 dark:hover:bg-gray-800">
                    <div className="flex min-w-0 items-center gap-3">
                      <Initials name={l.employee.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{l.employee.name}</p>
                        <p className="truncate text-xs capitalize text-gray-500 dark:text-gray-400">{(l.leaveType && LEAVE_TYPE_LABELS[l.leaveType]) ?? l.leaveType} leave · {l.days} day{(l.days ?? 0) > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20">
                      <AlertCircle className="h-3 w-3" /> Leave
                    </span>
                  </div>
                ))}
                {pending.timesheets.slice(0, 5).map((t) => (
                  <div key={t._id} className="group flex items-center justify-between gap-3 rounded-xl border border-transparent bg-gray-50/70 px-3 py-2.5 transition-all hover:border-gray-200 hover:bg-white hover:shadow-sm dark:bg-gray-800/40 dark:hover:border-gray-700 dark:hover:bg-gray-800">
                    <div className="flex min-w-0 items-center gap-3">
                      <Initials name={t.employee.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{t.employee.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">Timesheet · {t.totalHours ?? 0}h</p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
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
        <div className={`${card} lg:col-span-2 relative overflow-hidden`}>
          <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="relative mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 ring-1 ring-amber-500/10 dark:bg-amber-500/10 dark:ring-amber-400/20">
              <PartyPopper className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Work Anniversaries</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Next 14 days</p>
            </div>
          </div>
          {anniversaries.length === 0 ? (
            <EmptyState label="No upcoming anniversaries" />
          ) : (
            <div className="relative space-y-1.5">
              {anniversaries.slice(0, 5).map((a) => (
                <div key={a._id} className="flex items-center gap-3 rounded-xl border border-amber-100/60 bg-gradient-to-r from-amber-50/50 to-white p-2.5 transition-all hover:from-amber-50 hover:shadow-sm dark:border-amber-500/10 dark:from-amber-500/5 dark:to-gray-900 dark:hover:from-amber-500/10">
                  <Initials name={a.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{a.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{a.department || "—"}</p>
                  </div>
                  <div className="shrink-0 text-right">
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
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:ring-indigo-400/20">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">New Joiners This Month</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{stats?.newJoinersThisMonth.length ?? 0} new hires</p>
              </div>
            </div>
            <Link to="/employees" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(stats?.newJoinersThisMonth ?? []).length === 0 ? (
            <EmptyState label="No new hires yet" />
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {stats!.newJoinersThisMonth.map((emp) => (
                <div key={emp._id} className="group flex items-center gap-3 rounded-xl border border-transparent bg-gray-50/70 px-3 py-2.5 transition-all hover:border-gray-200 hover:bg-white hover:shadow-sm dark:bg-gray-800/40 dark:hover:border-gray-700 dark:hover:bg-gray-800">
                  <Initials name={emp.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
                      <Mail className="h-3 w-3 shrink-0" /> {emp.email}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                      {emp.department || "N/A"}
                    </span>
                    <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-500">
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
        <p className={`mb-3 ${sectionLabel}`}>Quick Actions</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-gray-200/70 bg-white/80 px-4 py-4 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-800/80 dark:bg-gray-900/80 dark:text-gray-200 dark:ring-white/[0.03] dark:hover:border-gray-700"
            >
              <div className={`rounded-xl bg-gray-50 p-2.5 ring-1 ring-gray-200/60 transition-all group-hover:scale-105 dark:bg-gray-800 dark:ring-gray-700/60 ${l.color}`}>
                <l.icon className="h-5 w-5" />
              </div>
              <span className="flex-1">{l.label}</span>
              <ArrowRight className="h-4 w-4 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" />
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
    <div className="flex items-center gap-3 rounded-xl border border-gray-200/70 bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:border-gray-700">
      <div className={`rounded-lg bg-gray-50 p-1.5 ring-1 ring-gray-200/60 dark:bg-gray-800 dark:ring-gray-700/60 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight tracking-tight text-gray-900 dark:text-white">{value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ label, icon: Icon = AlertCircle }: { label: string; icon?: typeof AlertCircle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
