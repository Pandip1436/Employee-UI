import { useState, useEffect } from "react";
import {
  FileSpreadsheet, FileDown, Users, Clock, AlertTriangle, CheckCircle2,
  BarChart3, Loader2, CalendarDays,
} from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import { userApi } from "../../api/userApi";
import type { User } from "../../types";
import toast from "react-hot-toast";

type Period = "daily" | "weekly" | "monthly";

const cardCls = "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";
const inputCls = "rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const PALETTES = [
  "from-indigo-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];

function paletteFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

function Avatar({ name }: { name: string }) {
  const init = (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 ${paletteFor(name || "?")}`}>
      {init}
    </div>
  );
}

function MiniTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-sm font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

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
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    userApi.getAll({ limit: 500 })
      .then((r) => setEmployees((r.data.data || []).filter((u) => u.role !== "admin")))
      .catch(() => { /* interceptor */ });
  }, []);

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
    setExporting("excel");
    try { const r = await attendanceApi.exportExcel(period, date, userId || undefined); downloadFile(new Blob([r.data]), `attendance-${period}-${date}.xlsx`); toast.success("Excel downloaded!"); }
    catch { /* interceptor */ } finally { setExporting(null); }
  };

  const handlePdf = async () => {
    setExporting("pdf");
    try { const r = await attendanceApi.exportPdf(period, date, userId || undefined); downloadFile(new Blob([r.data], { type: "application/pdf" }), `attendance-${period}-${date}.pdf`); toast.success("PDF downloaded!"); }
    catch { /* interceptor */ } finally { setExporting(null); }
  };

  const emps = report?.employees || [];
  const total = emps.length;
  const avg = (fn: (e: any) => number) => total > 0 ? Math.round(emps.reduce((s: number, e: any) => s + fn(e), 0) / total) : 0;

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
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
              <BarChart3 className="h-3.5 w-3.5" />
              Reports · {period}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Attendance <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Reports</span>
            </h1>
            <p className="mt-1 text-sm text-indigo-200/70">Generate and export daily, weekly, or monthly attendance</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExcel}
              disabled={!!exporting || emps.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting === "excel" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="rounded-md bg-emerald-500/80 p-1">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </span>
              )}
              Excel
            </button>
            <button
              onClick={handlePdf}
              disabled={!!exporting || emps.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
              ) : (
                <span className="rounded-md bg-gradient-to-br from-rose-500 to-red-600 p-1">
                  <FileDown className="h-3.5 w-3.5 text-white" />
                </span>
              )}
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter bar (period + date + employee + label all one row) ── */}
      <div className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        <div>
          <label className={`mb-1.5 block ${labelCls}`}>Period</label>
          <div className="inline-flex gap-1 rounded-lg border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriod(p)}
                className={`rounded-md px-3 py-1.5 text-[13px] font-semibold capitalize transition-all ${
                  period === p
                    ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={`mb-1.5 block ${labelCls}`}>
            {period === "monthly" ? "Month" : period === "weekly" ? "Week of" : "Date"}
          </label>
          {period === "monthly" ? (
            <input type="month" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          ) : (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          )}
        </div>
        <div className="min-w-[180px] flex-1">
          <label className={`mb-1.5 block ${labelCls}`}>Employee</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={`w-full ${inputCls}`}>
            <option value="">All Employees</option>
            {employees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        {report?.label && (
          <div className="ml-auto inline-flex items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/80 px-3 py-2 text-xs text-gray-600 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-300">
            <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
            <span>Showing</span>
            <span className="font-semibold text-gray-900 dark:text-white">{report.label}</span>
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      {emps.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Employees", value: total, icon: Users, gradient: "from-indigo-500 to-purple-600" },
            { label: "Avg Present", value: avg((e) => e.presentDays), icon: CheckCircle2, gradient: "from-emerald-500 to-teal-600" },
            { label: "Avg Late", value: avg((e) => e.lateDays), icon: AlertTriangle, gradient: "from-amber-500 to-orange-600" },
            { label: "Avg Hours", value: `${avg((e) => e.totalHours)}h`, icon: Clock, gradient: "from-sky-500 to-blue-600" },
          ].map((c) => (
            <div key={c.label} className={`${cardCls} group relative overflow-hidden p-5`}>
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
              />
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className={labelCls}>{c.label}</p>
                  <p className="mt-2.5 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{c.value}</p>
                </div>
                <div className={`rounded-xl bg-gradient-to-br ${c.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                  <c.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Breakdown ── */}
      {loading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading report...</p>
        </div>
      ) : emps.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No data for the selected period</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Try another date range or employee filter</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <tr>
                    {["Employee", "Present", "Late", "Half Day", "Absent", "Total Hours"].map((h) => (
                      <th key={h} className={`px-4 py-3 ${labelCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {emps.map((e: any) => (
                    <tr key={e.email} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={e.name} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900 dark:text-white">{e.name}</p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{e.department || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {e.presentDays}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          {e.lateDays}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                          {e.halfDays}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          {e.absentDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold tracking-tight text-gray-900 dark:text-white">{e.totalHours.toFixed(1)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {emps.map((e: any) => (
              <div key={e.email} className={`${cardCls} p-4`}>
                <div className="mb-3 flex items-center gap-3">
                  <Avatar name={e.name} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{e.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{e.department || "No department"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniTile label="Present" value={e.presentDays} color="text-emerald-600 dark:text-emerald-400" />
                  <MiniTile label="Late" value={e.lateDays} color="text-amber-600 dark:text-amber-400" />
                  <MiniTile label="Absent" value={e.absentDays} color="text-rose-600 dark:text-rose-400" />
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg border border-gray-200/70 bg-gray-50/80 px-3 py-2 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <span className={labelCls}>Total Hours</span>
                  <span className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">{e.totalHours.toFixed(1)}h</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
