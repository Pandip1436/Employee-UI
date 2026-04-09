import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  Users, FileDown, ChevronLeft, ChevronRight, Search, Building2,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { TimesheetDashboardStats, EmployeeTimesheetStatus } from "../../types";

const labelClasses = "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

function getMonday(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - ((day + 6) % 7);
  const m = new Date(d);
  m.setDate(diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  approved:    { label: "Approved",    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 ring-emerald-600/20 dark:ring-emerald-500/20", dot: "bg-emerald-500" },
  submitted:   { label: "Submitted",   cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 ring-blue-600/20 dark:ring-blue-500/20", dot: "bg-blue-500" },
  rejected:    { label: "Rejected",    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 ring-rose-600/20 dark:ring-rose-500/20", dot: "bg-rose-500" },
  draft:       { label: "Draft",       cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 ring-gray-400/20", dot: "bg-gray-400" },
  not_started: { label: "Not Started", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 ring-amber-600/20 dark:ring-amber-500/20", dot: "bg-amber-500" },
};

const statCards = [
  { key: "submitted" as const, label: "Submitted",  icon: FileText,     iconBg: "bg-blue-50 dark:bg-blue-500/10",    iconColor: "text-blue-600 dark:text-blue-400",    border: "border-l-4 border-blue-500" },
  { key: "pending"   as const, label: "Pending",    icon: Clock,        iconBg: "bg-amber-50 dark:bg-amber-500/10",  iconColor: "text-amber-600 dark:text-amber-400",  border: "border-l-4 border-amber-500" },
  { key: "approved"  as const, label: "Approved",   icon: CheckCircle2, iconBg: "bg-emerald-50 dark:bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400", border: "border-l-4 border-emerald-500" },
  { key: "rejected"  as const, label: "Rejected",   icon: XCircle,      iconBg: "bg-rose-50 dark:bg-rose-500/10",   iconColor: "text-rose-600 dark:text-rose-400",    border: "border-l-4 border-rose-500" },
];

const quickLinks = [
  { label: "Timesheet Approvals", description: "Review pending submissions", href: "/timesheet/approvals", icon: CheckCircle2, iconBg: "bg-emerald-50 dark:bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { label: "Export Reports",      description: "Download timesheet data",    href: "/admin/timesheet/export", icon: FileDown, iconBg: "bg-purple-50 dark:bg-purple-500/10", iconColor: "text-purple-600 dark:text-purple-400" },
  { label: "Overtime Report",     description: "View overtime entries",      href: "/admin/timesheet/reports/overtime", icon: AlertTriangle, iconBg: "bg-orange-50 dark:bg-orange-500/10", iconColor: "text-orange-600 dark:text-orange-400" },
];

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}
function fmtLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdminTimesheetDashboard() {
  const [stats, setStats] = useState<TimesheetDashboardStats | null>(null);
  const [employees, setEmployees] = useState<EmployeeTimesheetStatus[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingEmp, setLoadingEmp] = useState(true);

  // Week navigation
  const [weekDate, setWeekDate] = useState<Date>(() => getMonday(new Date()));

  // Filters
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Load stats (auto-refresh)
  useEffect(() => {
    const load = () => {
      setLoadingStats(true);
      weeklyTimesheetApi.getDashboardStats()
        .then((r) => setStats(r.data.data ?? null))
        .catch(() => {})
        .finally(() => setLoadingStats(false));
    };
    load();
    const id = setInterval(load, 30_000);
    window.addEventListener("focus", load);
    return () => { clearInterval(id); window.removeEventListener("focus", load); };
  }, []);

  // Load employees for selected week
  useEffect(() => {
    setLoadingEmp(true);
    weeklyTimesheetApi.getEmployeesStatus(fmtDate(weekDate))
      .then((r) => setEmployees(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingEmp(false));
  }, [weekDate]);

  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department ?? "").filter(Boolean));
    return [...set].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (deptFilter && (e.department ?? "") !== deptFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.name.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [employees, deptFilter, statusFilter, search]);

  const prevWeek = () => { const d = new Date(weekDate); d.setDate(d.getDate() - 7); setWeekDate(d); };
  const nextWeek = () => { const d = new Date(weekDate); d.setDate(d.getDate() + 7); setWeekDate(d); };
  const isCurrentWeek = fmtDate(weekDate) === fmtDate(getMonday(new Date()));

  const sunday = new Date(weekDate); sunday.setDate(weekDate.getDate() + 6);
  const weekLabel = `${fmtLabel(weekDate)} – ${fmtLabel(sunday)}`;

  // Summary counts for the selected week employees table
  const empCounts = useMemo(() => ({
    total: filtered.length,
    approved: filtered.filter((e) => e.status === "approved").length,
    submitted: filtered.filter((e) => e.status === "submitted").length,
    draft: filtered.filter((e) => e.status === "draft").length,
    not_started: filtered.filter((e) => e.status === "not_started" || e.status === "rejected").length,
  }), [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Timesheet Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Admin overview of timesheet submissions and compliance
          {stats?.weekStart && (
            <span className="ml-1">&mdash; Week of {new Date(stats.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          )}
        </p>
      </div>

      {/* Stats Cards */}
      {!loadingStats && stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.key} className={`${card.border} rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:shadow-md transition-all`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className={labelClasses}>{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats[card.key]}</p>
                  </div>
                  <div className={`rounded-xl ${card.iconBg} p-3`}><Icon className={`h-5 w-5 ${card.iconColor}`} /></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Links */}
      <div>
        <p className={`${labelClasses} mb-3`}>Quick Links</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} to={link.href} className="group flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md">
                <div className={`rounded-xl ${link.iconBg} p-3`}><Icon className={`h-5 w-5 ${link.iconColor}`} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{link.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{link.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── All Employees Timesheet Section ── */}
      <div className="space-y-4">
        {/* Section header + week nav */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className={labelClasses}>All Employees Timesheet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Week: {weekLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="rounded-lg p-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[130px] text-center">{weekLabel}</span>
            <button onClick={nextWeek} disabled={isCurrentWeek} className="rounded-lg p-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="h-4 w-4" />
            </button>
            {!isCurrentWeek && (
              <button onClick={() => setWeekDate(getMonday(new Date()))} className="rounded-lg px-3 py-1.5 text-xs font-medium border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                This Week
              </button>
            )}
          </div>
        </div>

        {/* Mini summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Approved", count: empCounts.approved, cls: "text-emerald-600 dark:text-emerald-400" },
            { label: "Submitted", count: empCounts.submitted, cls: "text-blue-600 dark:text-blue-400" },
            { label: "Draft", count: empCounts.draft, cls: "text-gray-600 dark:text-gray-400" },
            { label: "Not Started / Rejected", count: empCounts.not_started, cls: "text-amber-600 dark:text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <p className={labelClasses}>{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.cls}`}>{s.count}</p>
            </div>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name or email..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white pl-9 pr-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white px-3 py-2 outline-none focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="submitted">Submitted</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
            <option value="not_started">Not Started</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {loadingEmp ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-400">No employees match the current filters.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className={`${labelClasses} px-4 py-3`}>Employee</th>
                  <th className={`${labelClasses} px-4 py-3`}>Department</th>
                  <th className={`${labelClasses} px-4 py-3`}>Status</th>
                  <th className={`${labelClasses} px-4 py-3`}>Hours</th>
                  <th className={`${labelClasses} px-4 py-3`}>Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((emp) => {
                  const sc = STATUS_CONFIG[emp.status] ?? STATUS_CONFIG.not_started;
                  return (
                    <tr key={emp._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{emp.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{emp.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {emp.department ? (
                          <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {emp.department}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${sc.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${emp.totalHours >= 40 ? "text-emerald-600 dark:text-emerald-400" : emp.totalHours > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                          {emp.totalHours > 0 ? `${emp.totalHours}h` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {emp.submittedAt ? new Date(emp.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
          Showing {filtered.length} of {employees.length} employees
        </p>
      </div>
    </div>
  );
}
