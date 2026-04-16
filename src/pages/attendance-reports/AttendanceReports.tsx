import { useState, useEffect } from "react";
import { FileSpreadsheet, FileDown, Users, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import { userApi } from "../../api/userApi";
import type { User } from "../../types";
import toast from "react-hot-toast";

type Period = "daily" | "weekly" | "monthly";
const inputCls = "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

// Pick a sensible default date for each period: today (daily/weekly), current month (monthly).
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function AttendanceReports() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [date, setDate] = useState(() => currentMonthStr());
  const [employees, setEmployees] = useState<User[]>([]);
  const [userId, setUserId] = useState("");
  const [report, setReport] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    userApi.getAll({ limit: 500 })
      .then((r) => setEmployees((r.data.data || []).filter((u) => u.role !== "admin")))
      .catch(() => { /* interceptor */ });
  }, []);

  // When the period changes, reset the date to a sensible default for that period.
  const handlePeriod = (p: Period) => {
    setPeriod(p);
    setDate(p === "monthly" ? currentMonthStr() : todayStr());
  };

  const fetchReport = () => {
    setLoading(true);
    attendanceApi.getReport(period, date, userId || undefined)
      .then((r) => setReport(r.data.data))
      .catch(() => { /* interceptor */ })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, [period, date, userId]);

  const downloadFile = (data: Blob, filename: string) => {
    const url = window.URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExcel = async () => {
    setExporting(true);
    try { const r = await attendanceApi.exportExcel(period, date, userId || undefined); downloadFile(new Blob([r.data]), `attendance-${period}-${date}.xlsx`); toast.success("Excel downloaded!"); }
    catch { /* interceptor */ } finally { setExporting(false); }
  };

  const handlePdf = async () => {
    setExporting(true);
    try { const r = await attendanceApi.exportPdf(period, date, userId || undefined); downloadFile(new Blob([r.data], { type: "application/pdf" }), `attendance-${period}-${date}.pdf`); toast.success("PDF downloaded!"); }
    catch { /* interceptor */ } finally { setExporting(false); }
  };

  const emps = report?.employees || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Generate and export daily, weekly, or monthly attendance reports</p>
      </div>

      {/* Period tabs */}
      <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => handlePeriod(p)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all ${
              period === p
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Filters + Export */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {period === "monthly" ? "Month" : period === "weekly" ? "Week of" : "Date"}
          </label>
          {period === "monthly" ? (
            <input type="month" value={date} onChange={(e) => setDate(e.target.value)} className={`w-full sm:w-auto ${inputCls}`} />
          ) : (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`w-full sm:w-auto ${inputCls}`} />
          )}
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Employee</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={`w-full ${inputCls}`}>
            <option value="">All Employees</option>
            {employees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handleExcel} disabled={exporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button onClick={handlePdf} disabled={exporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors">
            <FileDown className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {/* Range label */}
      {report?.label && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing: <span className="font-semibold text-gray-700 dark:text-gray-300">{report.label}</span>
        </p>
      )}

      {/* Summary Cards */}
      {emps.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Employees", value: emps.length, icon: Users, color: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-500/20" },
            { label: "Avg Present", value: Math.round(emps.reduce((s: number, e: any) => s + e.presentDays, 0) / emps.length), icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/20" },
            { label: "Avg Late", value: Math.round(emps.reduce((s: number, e: any) => s + e.lateDays, 0) / emps.length), icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/20" },
            { label: "Avg Hours", value: Math.round(emps.reduce((s: number, e: any) => s + e.totalHours, 0) / emps.length), icon: Clock, color: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-500/20" },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border ${c.border} bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md`}>
              <div className="flex items-center justify-between">
                <c.icon className={`h-5 w-5 ${c.color}`} />
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Employee breakdown */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400">Loading...</div>
      ) : emps.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">No data for the selected period.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Present</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Late</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Half Day</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Absent</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {emps.map((e: any) => (
                  <tr key={e.email} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{e.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{e.department || ""}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{e.presentDays}</td>
                    <td className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400">{e.lateDays}</td>
                    <td className="px-4 py-3 font-semibold text-orange-600 dark:text-orange-400">{e.halfDays}</td>
                    <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">{e.absentDays}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{e.totalHours.toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {emps.map((e: any) => (
              <div key={e.email} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md">
                <p className="font-semibold text-gray-900 dark:text-white">{e.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{e.department || "No department"}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: "Present", v: e.presentDays, c: "text-emerald-600 dark:text-emerald-400" },
                    { l: "Late", v: e.lateDays, c: "text-amber-600 dark:text-amber-400" },
                    { l: "Hours", v: `${e.totalHours.toFixed(1)}h`, c: "text-indigo-600 dark:text-indigo-400" },
                  ].map((d) => (
                    <div key={d.l} className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center">
                      <p className="text-[10px] uppercase text-gray-400 dark:text-gray-500">{d.l}</p>
                      <p className={`text-sm font-bold ${d.c}`}>{d.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
