import { useState, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, Clock, Users, CheckCircle2, BarChart3 } from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { userApi } from "../../api/userApi";
import type { User, WeeklyTimesheetData } from "../../types";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

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
  const [exporting, setExporting] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, status, employeeId]);

  const handleCsv = () => {
    if (!data.length) return toast.error("No data to export");
    setExporting(true);
    try {
      const csv = toCsv(data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `timesheet-export-${startDate}-to-${endDate}.csv`);
      toast.success("CSV downloaded!");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExcel = () => {
    if (!data.length) return toast.error("No data to export");
    setExporting(true);
    try {
      // Generate tab-separated file with .xls extension for basic Excel compatibility
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
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const totalHours = data.reduce((s, ts) => s + ts.totalHours, 0);
  const approvedCount = data.filter((ts) => ts.status === "approved").length;
  const uniqueEmps = new Set(data.map((ts) => (typeof ts.userId === "object" ? ts.userId._id : ts.userId))).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Export Timesheets</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Filter and export timesheet data as CSV or Excel
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`w-full sm:w-auto ${inputCls}`}
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`w-full sm:w-auto ${inputCls}`}
          />
        </div>
        <div className="w-full sm:w-auto min-w-[140px]">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Status
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`w-full ${inputCls}`}>
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Employee
          </label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={`w-full ${inputCls}`}>
            <option value="">All Employees</option>
            {employees.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCsv}
          disabled={exporting || !data.length}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white hover:shadow-md disabled:opacity-50 transition-all"
        >
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Export CSV
        </button>
        <button
          onClick={handleExcel}
          disabled={exporting || !data.length}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white hover:shadow-md disabled:opacity-50 transition-all"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Export Excel
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Records", value: data.length, icon: Download, color: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-500/20" },
          { label: "Employees", value: uniqueEmps, icon: Users, color: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-500/20" },
          { label: "Total Hours", value: totalHours.toFixed(1), icon: Clock, color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/20" },
          { label: "Approved", value: approvedCount, icon: CheckCircle2, color: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/20" },
        ].map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border ${c.border} bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Preview */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
          No timesheet data matches the current filters.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Preview ({data.length} records)
              </p>
              <BarChart3 className="h-4 w-4 text-gray-400" />
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Week</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hours</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.slice(0, 20).map((ts) => {
                  const user = typeof ts.userId === "object" ? ts.userId : null;
                  const statusStyles: Record<string, string> = {
                    draft: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
                    submitted: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
                    approved: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                    rejected: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
                  };
                  const dotStyles: Record<string, string> = {
                    draft: "bg-gray-400",
                    submitted: "bg-blue-500",
                    approved: "bg-emerald-500",
                    rejected: "bg-rose-500",
                  };
                  return (
                    <tr key={ts._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{user?.name || "—"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.department || ""}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {new Date(ts.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{ts.totalHours.toFixed(1)}h</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[ts.status] || ""}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[ts.status] || ""}`} />
                          {ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.length > 20 && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2.5 text-center text-xs text-gray-400">
                Showing 20 of {data.length} records. Export to see all.
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data.slice(0, 20).map((ts) => {
              const user = typeof ts.userId === "object" ? ts.userId : null;
              const dotColor: Record<string, string> = {
                draft: "bg-gray-400",
                submitted: "bg-blue-500",
                approved: "bg-emerald-500",
                rejected: "bg-rose-500",
              };
              return (
                <div
                  key={ts._id}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{user?.name || "—"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Week of{" "}
                        {new Date(ts.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                      <span className={`h-1.5 w-1.5 rounded-full ${dotColor[ts.status] || ""}`} />
                      {ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center">
                      <p className="text-[10px] uppercase text-gray-400 dark:text-gray-500">Hours</p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{ts.totalHours.toFixed(1)}h</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center">
                      <p className="text-[10px] uppercase text-gray-400 dark:text-gray-500">Dept</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{user?.department || "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {data.length > 20 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-3 text-center text-xs text-gray-400">
                Showing 20 of {data.length}. Export to see all.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
