import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users, ChevronLeft, ChevronRight, Search, Building2,
  CheckCircle2, Clock, XCircle, AlertTriangle, BarChart3,
  FileDown, Send, RefreshCw,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { EmployeeTimesheetStatus } from "../../types";

function getMonday(d: Date) {
  const day = d.getDay();
  const m = new Date(d);
  m.setDate(d.getDate() - ((day + 6) % 7));
  m.setHours(0, 0, 0, 0);
  return m;
}
function fmtDate(d: Date) { return d.toLocaleDateString("en-CA"); }
function fmtLabel(d: Date) { return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  approved:    { label: "Approved",    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-emerald-600/20", dot: "bg-emerald-500" },
  submitted:   { label: "Submitted",   cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 ring-1 ring-blue-600/20",               dot: "bg-blue-500" },
  rejected:    { label: "Rejected",    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 ring-1 ring-rose-600/20",                dot: "bg-rose-500" },
  draft:       { label: "In Progress", cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 ring-1 ring-violet-600/20",      dot: "bg-violet-500" },
  not_started: { label: "Not Started", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 ring-1 ring-amber-600/20",           dot: "bg-amber-500" },
};

export default function AdminTimesheetDashboard() {
  const [employees, setEmployees] = useState<EmployeeTimesheetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekDate, setWeekDate] = useState<Date>(() => getMonday(new Date()));
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const sunday = new Date(weekDate); sunday.setDate(weekDate.getDate() + 6);
  const weekLabel = `${fmtLabel(weekDate)} – ${fmtLabel(sunday)}`;
  const isCurrentWeek = fmtDate(weekDate) === fmtDate(getMonday(new Date()));

  const load = (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    weeklyTimesheetApi.getEmployeesStatus(fmtDate(weekDate))
      .then((r) => setEmployees(r.data.data ?? []))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, [weekDate]);

  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department ?? "").filter(Boolean));
    return [...set].sort();
  }, [employees]);

  const filtered = useMemo(() => employees.filter((e) => {
    if (deptFilter && (e.department ?? "") !== deptFilter) return false;
    if (statusFilter && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.name.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [employees, deptFilter, statusFilter, search]);

  const counts = useMemo(() => ({
    total:       employees.length,
    approved:    employees.filter((e) => e.status === "approved").length,
    submitted:   employees.filter((e) => e.status === "submitted").length,
    pending:     employees.filter((e) => e.status === "draft" || e.status === "not_started").length,
    rejected:    employees.filter((e) => e.status === "rejected").length,
    totalHours:  employees.reduce((s, e) => s + e.totalHours, 0),
    compliance:  employees.length > 0
      ? Math.round((employees.filter((e) => e.status === "approved" || e.status === "submitted").length / employees.length) * 100)
      : 0,
  }), [employees]);

  const prevWeek = () => { const d = new Date(weekDate); d.setDate(d.getDate() - 7); setWeekDate(d); };
  const nextWeek = () => { const d = new Date(weekDate); d.setDate(d.getDate() + 7); setWeekDate(d); };

  const complianceColor = counts.compliance >= 90 ? "text-emerald-600 dark:text-emerald-400"
    : counts.compliance >= 70 ? "text-amber-600 dark:text-amber-400"
    : "text-rose-600 dark:text-rose-400";
  const complianceBar = counts.compliance >= 90 ? "bg-emerald-500"
    : counts.compliance >= 70 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Timesheet Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track weekly submissions · {weekLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link to="/admin/timesheet/export" className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <FileDown className="h-4 w-4" /> Export
          </Link>
          <Link to="/timesheet/approvals" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <CheckCircle2 className="h-4 w-4" /> Approvals
            {counts.submitted > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-bold">{counts.submitted}</span>
            )}
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance */}
        <div className="col-span-2 lg:col-span-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Submission Rate</p>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </div>
          <p className={`text-4xl font-bold ${complianceColor}`}>{counts.compliance}%</p>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div className={`h-full rounded-full ${complianceBar} transition-all`} style={{ width: `${counts.compliance}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{counts.approved + counts.submitted} of {counts.total} submitted</p>
        </div>

        {/* Approved */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Approved</p>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{counts.approved}</p>
          <p className="text-xs text-gray-400 mt-1">of {counts.total} employees</p>
        </div>

        {/* Awaiting Review */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Awaiting Review</p>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 p-2">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{counts.submitted}</p>
          <p className="text-xs text-gray-400 mt-1">pending approval</p>
        </div>

        {/* Not Submitted */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Not Submitted</p>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 p-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{counts.pending}</p>
          <p className="text-xs text-gray-400 mt-1">in progress / missing</p>
        </div>

        {/* Total Hours */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Hours</p>
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 p-2">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{counts.totalHours}h</p>
          <p className="text-xs text-gray-400 mt-1">logged this week</p>
        </div>

        {/* Rejected */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Rejected</p>
            <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 p-2">
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{counts.rejected}</p>
          <p className="text-xs text-gray-400 mt-1">needs resubmission</p>
        </div>

        {/* Quick links */}
        <div className="col-span-2 lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Send Reminders", href: "/admin/timesheet/compliance", icon: Send, cls: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10" },
              { label: "Missing Report",  href: "/admin/timesheet/missing",    icon: AlertTriangle, cls: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10" },
              { label: "Overtime",        href: "/admin/timesheet/reports/overtime", icon: BarChart3, cls: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10" },
              { label: "Compliance",      href: "/admin/timesheet/compliance", icon: BarChart3, cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10" },
            ].map((a) => (
              <Link key={a.href} to={a.href} className="flex items-center gap-2.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className={`rounded-md p-1.5 ${a.cls}`}><a.icon className="h-3.5 w-3.5" /></span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Employee Table ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {/* Table toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Employee Timesheets</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {employees.length} employees</p>
          </div>
          {/* Week nav */}
          <div className="flex items-center gap-1.5">
            <button onClick={prevWeek} className="rounded-lg p-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[110px] text-center">{weekLabel}</span>
            <button onClick={nextWeek} disabled={isCurrentWeek} className="rounded-lg p-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="h-4 w-4" />
            </button>
            {!isCurrentWeek && (
              <button onClick={() => setWeekDate(getMonday(new Date()))} className="rounded-lg px-2.5 py-1.5 text-xs font-medium border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                Current
              </button>
            )}
          </div>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white pl-8 pr-3 py-2 w-44 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-gray-400" />
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white px-2.5 py-2 outline-none focus:border-indigo-500">
                <option value="">All Depts</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white px-2.5 py-2 outline-none focus:border-indigo-500">
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="submitted">Submitted</option>
              <option value="rejected">Rejected</option>
              <option value="draft">In Progress</option>
              <option value="not_started">Not Started</option>
            </select>
          </div>
        </div>

        {/* Table body */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">No employees match the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">#</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Department</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hours</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Progress</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((emp, idx) => {
                  const sc = STATUS_CONFIG[emp.status] ?? STATUS_CONFIG.not_started;
                  const pct = Math.min(100, Math.round((emp.totalHours / 40) * 100));
                  const barCls = emp.totalHours >= 40 ? "bg-emerald-500" : emp.totalHours >= 20 ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600";
                  return (
                    <tr key={emp._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white leading-tight">{emp.name}</p>
                            <p className="text-xs text-gray-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {emp.department
                          ? <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">{emp.department}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`font-bold text-sm ${emp.totalHours >= 40 ? "text-emerald-600 dark:text-emerald-400" : emp.totalHours > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                          {emp.totalHours > 0 ? `${emp.totalHours}h` : "—"}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">/ 40h</span>
                      </td>
                      <td className="px-4 py-3.5 w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div className={`h-full rounded-full ${barCls} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 min-w-[2rem] text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                        {emp.submittedAt
                          ? new Date(emp.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
