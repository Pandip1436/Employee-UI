import { useState, useEffect } from "react";
import {
  Download, FileSpreadsheet, FileText, Clock, Users, CheckCircle2, BarChart3,
  Sparkles, Inbox, Building, CalendarDays, Loader2, Filter,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { userApi } from "../../api/userApi";
import type { User, WeeklyTimesheetData } from "../../types";
import toast from "react-hot-toast";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";
const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

const PALETTES = [
  "from-indigo-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];
const paletteFor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
};

function Avatar({ name }: { name: string }) {
  const init = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(name || "?")} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
      {init}
    </div>
  );
}

const statusConfig: Record<string, { dot: string; badge: string; label: string }> = {
  draft: {
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    label: "Draft",
  },
  submitted: {
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    label: "Submitted",
  },
  approved: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    label: "Approved",
  },
  rejected: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    label: "Rejected",
  },
};

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function toCsv(data: WeeklyTimesheetData[]): string {
  const header = "Employee,Email,Department,Week Start,Week End,Total Hours,Status,Submitted At";
  const rows = data.map((ts) => {
    const user = typeof ts.userId === "object" ? ts.userId : null;
    return [
      `"${user?.name || ""}"`,
      `"${user?.email || ""}"`,
      `"${user?.department || ""}"`,
      ts.weekStart.slice(0, 10),
      ts.weekEnd.slice(0, 10),
      ts.totalHours.toFixed(1),
      ts.status,
      ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : "",
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

export default function AdminTimesheetExport() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 28);
    return fmt(d);
  });
  const [endDate, setEndDate] = useState(() => fmt(new Date()));
  const [status, setStatus] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState<User[]>([]);
  const [data, setData] = useState<WeeklyTimesheetData[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "excel" | null>(null);

  useEffect(() => {
    userApi
      .getAll({ limit: 500 })
      .then((r) => setEmployees((r.data.data || []).filter((u) => u.role !== "admin")))
      .catch(() => {});
  }, []);

  const fetchData = () => {
    setLoading(true);
    const params: Record<string, string | number> = { limit: 1000, startDate, endDate };
    if (status) params.status = status;
    if (employeeId) params.userId = employeeId;
    weeklyTimesheetApi
      .getAll(params)
      .then((r) => setData((r.data.data || []).filter((ts) => ts.status !== "draft")))
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [startDate, endDate, status, employeeId]);

  const handleCsv = () => {
    if (!data.length) return toast.error("No data to export");
    setExporting("csv");
    try {
      const csv = toCsv(data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `timesheet-export-${startDate}-to-${endDate}.csv`);
      toast.success("CSV downloaded!");
    } catch { toast.error("Export failed"); }
    finally { setExporting(null); }
  };

  const handleExcel = () => {
    if (!data.length) return toast.error("No data to export");
    setExporting("excel");
    try {
      const header = "Employee\tEmail\tDepartment\tWeek Start\tWeek End\tTotal Hours\tStatus\tSubmitted At";
      const rows = data.map((ts) => {
        const user = typeof ts.userId === "object" ? ts.userId : null;
        return [
          user?.name || "",
          user?.email || "",
          user?.department || "",
          ts.weekStart.slice(0, 10),
          ts.weekEnd.slice(0, 10),
          ts.totalHours.toFixed(1),
          ts.status,
          ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : "",
        ].join("\t");
      });
      const tsv = [header, ...rows].join("\n");
      const blob = new Blob([tsv], { type: "application/vnd.ms-excel" });
      downloadBlob(blob, `timesheet-export-${startDate}-to-${endDate}.xls`);
      toast.success("Excel downloaded!");
    } catch { toast.error("Export failed"); }
    finally { setExporting(null); }
  };

  const totalHours = data.reduce((s, ts) => s + ts.totalHours, 0);
  const approvedCount = data.filter((ts) => ts.status === "approved").length;
  const uniqueEmps = new Set(data.map((ts) => (typeof ts.userId === "object" ? ts.userId._id : ts.userId))).size;

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <Download className="h-10 w-10 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Data export · CSV / Excel
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Export <span className="bg-gradient-to-r from-emerald-200 to-indigo-200 bg-clip-text text-transparent">Timesheets</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Filter and export timesheet data for payroll or reporting</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCsv}
              disabled={!!exporting || !data.length}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting === "csv" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="rounded-md bg-sky-500/80 p-1">
                  <FileText className="h-3.5 w-3.5" />
                </span>
              )}
              CSV
            </button>
            <button
              onClick={handleExcel}
              disabled={!!exporting || !data.length}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting === "excel" ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              ) : (
                <span className="rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 p-1">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-white" />
                </span>
              )}
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={`${cardCls} p-4`}>
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Filter className="h-3.5 w-3.5" />
          <span>Refine the dataset before exporting</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={`${labelCls} mb-1.5 block`}>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
          <div className="min-w-[140px]">
            <label className={`${labelCls} mb-1.5 block`}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className={`${labelCls} mb-1.5 block`}>Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
              <option value="">All Employees</option>
              {employees.map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto inline-flex items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/80 px-3 py-2 text-xs text-gray-600 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-300">
            <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
            <span>
              <span className="font-semibold text-gray-900 dark:text-white">{data.length}</span> record{data.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Records", value: data.length, icon: BarChart3, gradient: "from-indigo-500 to-purple-600" },
          { label: "Employees", value: uniqueEmps, icon: Users, gradient: "from-sky-500 to-blue-600" },
          { label: "Total Hours", value: totalHours.toFixed(1), icon: Clock, gradient: "from-emerald-500 to-teal-600" },
          { label: "Approved", value: approvedCount, icon: CheckCircle2, gradient: "from-amber-500 to-orange-600" },
        ].map((c) => (
          <div key={c.label} className={`${cardCls} group relative overflow-hidden p-4`}>
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
            />
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className={labelCls}>{c.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{c.value}</p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${c.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                <c.icon className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Preview ── */}
      {loading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading dataset...</p>
        </div>
      ) : data.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <Inbox className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No timesheet data</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Try broadening the date range or removing filters</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
            <div className="flex items-center justify-between border-b border-gray-200/70 bg-gray-50/60 px-5 py-3 dark:border-gray-800/80 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-1.5 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:ring-indigo-400/20">
                  <BarChart3 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Preview</p>
                <span className="rounded-md border border-gray-200/70 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-900 dark:text-gray-300">
                  {data.length} records
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {Math.min(20, data.length)} of {data.length}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200/70 bg-gray-50/40 dark:border-gray-800/80 dark:bg-gray-800/20">
                  <tr>
                    {["Employee", "Week", "Hours", "Status"].map((h) => (
                      <th key={h} className={`px-4 py-3 ${labelCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.slice(0, 20).map((ts) => {
                    const user = typeof ts.userId === "object" ? ts.userId : null;
                    const sCfg = statusConfig[ts.status] || statusConfig.submitted;
                    const start = new Date(ts.weekStart);
                    return (
                      <tr key={ts._id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={user?.name || "—"} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900 dark:text-white">{user?.name || "—"}</p>
                              <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
                                <Building className="h-3 w-3 text-gray-400" />
                                {user?.department || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm ring-1 ring-white/10">
                              <p className="text-[8px] font-bold uppercase tracking-wider text-white/90">
                                {start.toLocaleDateString(undefined, { month: "short" })}
                              </p>
                              <p className="text-xs font-bold leading-none">{start.getDate()}</p>
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold tracking-tight text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                            {ts.totalHours.toFixed(1)}h
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sCfg.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sCfg.dot}`} />
                            {sCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.length > 20 && (
              <div className="border-t border-gray-200/70 bg-gray-50/40 px-4 py-2.5 text-center text-xs text-gray-500 dark:border-gray-800/80 dark:bg-gray-800/20 dark:text-gray-400">
                Showing <span className="font-semibold text-gray-900 dark:text-white">20</span> of{" "}
                <span className="font-semibold text-gray-900 dark:text-white">{data.length}</span> records — export to see all
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {data.slice(0, 20).map((ts) => {
              const user = typeof ts.userId === "object" ? ts.userId : null;
              const sCfg = statusConfig[ts.status] || statusConfig.submitted;
              const start = new Date(ts.weekStart);
              return (
                <div key={ts._id} className={`${cardCls} p-4`}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg ring-1 ring-white/10">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                        {start.toLocaleDateString(undefined, { month: "short" })}
                      </p>
                      <p className="text-sm font-bold leading-none">{start.getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user?.name || "—"}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        Week of {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sCfg.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sCfg.dot}`} />
                      {sCfg.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Hours</p>
                      <p className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">{ts.totalHours.toFixed(1)}h</p>
                    </div>
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Department</p>
                      <p className="truncate text-xs font-bold text-gray-900 dark:text-white">{user?.department || "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {data.length > 20 && (
              <div className={`${cardCls} py-3 text-center text-xs text-gray-500 dark:text-gray-400`}>
                Showing <span className="font-semibold text-gray-900 dark:text-white">20</span> of{" "}
                <span className="font-semibold text-gray-900 dark:text-white">{data.length}</span> — export to see all
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
