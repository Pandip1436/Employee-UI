import { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet, FileDown, Users, Clock, AlertTriangle, CheckCircle2,
  BarChart3, Loader2, CalendarDays, Search, X, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import { userApi } from "../../api/userApi";
import type { User } from "../../types";
import toast from "react-hot-toast";
import { fmtHours } from "../../utils/format";

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

type SortKey = "name" | "department" | "present" | "late" | "halfDay" | "absent" | "hours" | "attendance";
type SortDir = "asc" | "desc";

export default function AttendanceReports() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [date, setDate] = useState(() => currentMonthStr());
  const [employees, setEmployees] = useState<User[]>([]);
  const [userId, setUserId] = useState("");
  const [report, setReport] = useState<any>(null);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("attendance");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  // Attendance % per employee = (present + late + halfDay) / total tracked days × 100
  const pctFor = (e: any): number => {
    const tracked = (e.presentDays || 0) + (e.lateDays || 0) + (e.halfDays || 0) + (e.absentDays || 0);
    if (tracked === 0) return 0;
    return Math.round(((e.presentDays || 0) + (e.lateDays || 0) + (e.halfDays || 0)) / tracked * 100);
  };

  const filteredSortedEmps = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? emps.filter((e: any) => (e.name || "").toLowerCase().includes(q) || (e.email || "").toLowerCase().includes(q))
      : [...emps];
    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a: any, b: any) => {
      switch (sortKey) {
        case "name":        return dir * ((a.name || "").localeCompare(b.name || ""));
        case "department":  return dir * ((a.department || "").localeCompare(b.department || ""));
        case "present":     return dir * ((a.presentDays || 0) - (b.presentDays || 0));
        case "late":        return dir * ((a.lateDays || 0) - (b.lateDays || 0));
        case "halfDay":     return dir * ((a.halfDays || 0) - (b.halfDays || 0));
        case "absent":      return dir * ((a.absentDays || 0) - (b.absentDays || 0));
        case "hours":       return dir * ((a.totalHours || 0) - (b.totalHours || 0));
        case "attendance":  return dir * (pctFor(a) - pctFor(b));
        default: return 0;
      }
    });
    return filtered;
  }, [emps, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "name" || key === "department" ? "asc" : "desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 inline h-3 w-3 text-indigo-500 dark:text-indigo-400" />
      : <ArrowDown className="ml-1 inline h-3 w-3 text-indigo-500 dark:text-indigo-400" />;
  };

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
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* LEFT: identity + KPI chips */}
          <div className="min-w-0 flex-1 lg:max-w-[640px]">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
              <BarChart3 className="h-3.5 w-3.5" />
              Reports · <span className="capitalize">{period}</span>
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Attendance <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Reports</span>
            </h1>
            <p className="mt-1 text-sm text-indigo-200/70">Generate and export daily, weekly, or monthly attendance</p>
          </div>

          {/* RIGHT: export actions */}
          <div className="flex w-full shrink-0 flex-col gap-2.5 sm:flex-row lg:w-auto lg:flex-col">
            <button
              onClick={handleExcel}
              disabled={!!exporting || emps.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 disabled:cursor-not-allowed disabled:opacity-40"
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
        {/* Search */}
        <div className="min-w-[180px] flex-1">
          <label className={`mb-1.5 block ${labelCls}`}>Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or email..."
              className={`w-full ${inputCls} pl-9 ${search ? "pr-8" : ""}`}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
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
      {emps.length > 0 && (() => {
        const avgPresent = avg((e) => e.presentDays);
        const avgLate = avg((e) => e.lateDays);
        const avgHoursRaw = avg((e) => e.totalHours);
        const tiles = [
          {
            label: "Employees",
            value: String(total),
            sub: total === 1 ? "in report" : `${total} in report`,
            icon: Users,
            gradient: "from-indigo-500 to-purple-600",
            ringColor: "shadow-indigo-500/30",
          },
          {
            label: "Avg Present",
            value: String(avgPresent),
            sub: "days per employee",
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-600",
            ringColor: "shadow-emerald-500/30",
            toneChip: avgPresent >= 20
              ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25"
              : avgPresent >= 12
              ? "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/25"
              : "bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/25",
            toneLabel: avgPresent >= 20 ? "Strong" : avgPresent >= 12 ? "Average" : "Low",
          },
          {
            label: "Avg Late",
            value: String(avgLate),
            sub: avgLate === 0 ? "All punctual" : "days per employee",
            icon: AlertTriangle,
            gradient: "from-amber-500 to-orange-600",
            ringColor: "shadow-amber-500/30",
            toneChip: avgLate > 0
              ? "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/25"
              : "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25",
            toneLabel: avgLate > 0 ? "Watch" : "On time",
          },
          {
            label: "Avg Hours",
            value: fmtHours(avgHoursRaw),
            sub: "per employee",
            icon: Clock,
            gradient: "from-sky-500 to-blue-600",
            ringColor: "shadow-sky-500/30",
          },
        ];
        return (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {tiles.map((c) => (
              <div
                key={c.label}
                className={`${cardCls} group relative overflow-hidden !p-0 transition-all duration-300 hover:-translate-y-0.5`}
              >
                <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${c.gradient}`} />
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${c.gradient} opacity-10 blur-2xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-110`}
                />
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${c.gradient} opacity-[0.04] blur-2xl`}
                />
                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={labelCls}>{c.label}</p>
                      <p className="mt-2.5 font-mono text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">{c.value}</p>
                    </div>
                    <div
                      className={`relative shrink-0 rounded-xl bg-gradient-to-br ${c.gradient} p-2.5 shadow-lg ${c.ringColor} ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105`}
                    >
                      <c.icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                      <span aria-hidden className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{c.sub}</p>
                    {c.toneLabel && c.toneChip && (
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${c.toneChip}`}>
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {c.toneLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

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
                    {([
                      { key: "name" as SortKey,       label: "Employee" },
                      { key: "attendance" as SortKey, label: "Attendance" },
                      { key: "present" as SortKey,    label: "Present" },
                      { key: "late" as SortKey,       label: "Late" },
                      { key: "halfDay" as SortKey,    label: "Half" },
                      { key: "absent" as SortKey,     label: "Absent" },
                      { key: "hours" as SortKey,      label: "Total Hours" },
                    ]).map((h) => (
                      <th
                        key={h.label}
                        onClick={() => handleSort(h.key)}
                        className={`cursor-pointer select-none px-4 py-3 ${labelCls} transition-colors hover:text-gray-700 dark:hover:text-gray-200`}
                      >
                        {h.label}
                        <SortIcon k={h.key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredSortedEmps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                        No matches for "{search}"
                      </td>
                    </tr>
                  ) : filteredSortedEmps.map((e: any) => {
                    const pct = pctFor(e);
                    const pctTone = pct >= 90
                      ? { bar: "from-emerald-500 to-teal-600", text: "text-emerald-600 dark:text-emerald-400" }
                      : pct >= 75
                        ? { bar: "from-sky-500 to-blue-600",       text: "text-sky-600 dark:text-sky-400" }
                        : pct >= 50
                          ? { bar: "from-amber-500 to-orange-600", text: "text-amber-600 dark:text-amber-400" }
                          : { bar: "from-rose-500 to-pink-600",     text: "text-rose-600 dark:text-rose-400" };
                    return (
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
                          <div className="flex w-32 items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${pctTone.bar} transition-[width] duration-700`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`font-mono text-xs font-bold tabular-nums ${pctTone.text}`}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="font-mono tabular-nums">{e.presentDays}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="font-mono tabular-nums">{e.lateDays}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            <span className="font-mono tabular-nums">{e.halfDays}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            <span className="font-mono tabular-nums">{e.absentDays}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">{fmtHours(e.totalHours)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filteredSortedEmps.length === 0 ? (
              <div className={`${cardCls} py-12 text-center text-sm text-gray-400 dark:text-gray-500`}>
                No matches for "{search}"
              </div>
            ) : filteredSortedEmps.map((e: any) => {
              const pct = pctFor(e);
              const pctTone = pct >= 90 ? "from-emerald-500 to-teal-600"
                : pct >= 75 ? "from-sky-500 to-blue-600"
                : pct >= 50 ? "from-amber-500 to-orange-600"
                : "from-rose-500 to-pink-600";
              return (
                <div key={e.email} className={`${cardCls} p-4`}>
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar name={e.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">{e.name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{e.department || "No department"}</p>
                    </div>
                    <span className="font-mono text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                      {pct}%
                    </span>
                  </div>
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${pctTone} transition-[width] duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MiniTile label="Present" value={e.presentDays} color="text-emerald-600 dark:text-emerald-400" />
                    <MiniTile label="Late" value={e.lateDays} color="text-amber-600 dark:text-amber-400" />
                    <MiniTile label="Absent" value={e.absentDays} color="text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-gray-200/70 bg-gray-50/80 px-3 py-2 dark:border-gray-800/80 dark:bg-gray-800/40">
                    <span className={labelCls}>Total Hours</span>
                    <span className="font-mono text-sm font-bold tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400">{fmtHours(e.totalHours)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
