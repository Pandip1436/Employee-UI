import { useState, useEffect } from "react";
import {
  AlertTriangle, Clock, Users, TrendingUp, Sparkles, CalendarDays, Inbox, Building,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { OvertimeEntry } from "../../types";
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
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(name || "?")} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
      {init}
    </div>
  );
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdminOvertimeReport() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 28);
    return fmt(d);
  });
  const [endDate, setEndDate] = useState(() => fmt(new Date()));
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    weeklyTimesheetApi
      .getOvertimeReport(startDate, endDate)
      .then((r) => setEntries(r.data.data || []))
      .catch(() => toast.error("Failed to load overtime report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const totalOvertime = entries.reduce((s, e) => s + e.overtime, 0);
  const uniqueEmployees = new Set(entries.map((e) => e.employee._id)).size;
  const maxOvertime = entries.length ? Math.max(...entries.map((e) => e.overtime)) : 0;

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/25 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-orange-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <TrendingUp className="h-10 w-10 text-amber-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                40h threshold · weekly
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Overtime <span className="bg-gradient-to-r from-amber-200 to-rose-200 bg-clip-text text-transparent">Report</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Employees who logged more than 40 hours in a week</p>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Total OT</p>
            <p className="text-xl font-bold tracking-tight">{totalOvertime.toFixed(1)}h</p>
          </div>
        </div>
      </div>

      {/* ── Date range ── */}
      <div className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        <div>
          <label className={`${labelCls} mb-1.5 block`}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={`${labelCls} mb-1.5 block`}>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="ml-auto inline-flex items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/80 px-3 py-2 text-xs text-gray-600 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-300">
          <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
          Range: {entries.length} instances
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "OT Instances", value: entries.length, icon: AlertTriangle, gradient: "from-rose-500 to-pink-600" },
            { label: "Employees", value: uniqueEmployees, icon: Users, gradient: "from-indigo-500 to-purple-600" },
            { label: "Total OT Hours", value: totalOvertime.toFixed(1), icon: Clock, gradient: "from-amber-500 to-orange-600" },
            { label: "Max OT (week)", value: `${maxOvertime.toFixed(1)}h`, icon: TrendingUp, gradient: "from-orange-500 to-rose-600" },
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
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading report...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <Inbox className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No overtime entries</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">No one exceeded 40h/week in this range</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <tr>
                    {["Employee", "Week", "Total Hours", "Overtime"].map((h) => (
                      <th key={h} className={`px-4 py-3 ${labelCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {entries.map((e, i) => {
                    const weekStart = new Date(e.weekStart);
                    return (
                      <tr
                        key={`${e.employee._id}-${e.weekStart}-${i}`}
                        className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={e.employee.name} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900 dark:text-white">{e.employee.name}</p>
                              <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
                                <Building className="h-3 w-3 text-gray-400" />
                                {e.employee.department || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg ring-1 ring-white/10">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                                {weekStart.toLocaleDateString(undefined, { month: "short" })}
                              </p>
                              <p className="text-sm font-bold leading-none">{weekStart.getDate()}</p>
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold tracking-tight text-gray-900 dark:text-white">
                          {e.totalHours.toFixed(1)}h
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            +{e.overtime.toFixed(1)}h
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {entries.map((e, i) => {
              const weekStart = new Date(e.weekStart);
              return (
                <div key={`${e.employee._id}-${e.weekStart}-${i}`} className={`${cardCls} p-4`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={e.employee.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{e.employee.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{e.employee.department || "No dept"}</p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      +{e.overtime.toFixed(1)}h
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Week of</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Total Hours</p>
                      <p className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                        {e.totalHours.toFixed(1)}h
                      </p>
                    </div>
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
