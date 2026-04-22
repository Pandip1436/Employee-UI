import { useState, useEffect, useMemo } from "react";
import {
  BarChart3, Users, Clock, CalendarDays, Sparkles, Inbox, Building, Trophy,
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
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(name || "?")} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
      {init}
    </div>
  );
}

function mondayOf(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface AggRow {
  userId: string;
  name: string;
  department: string;
  totalHours: number;
  weeksSubmitted: number;
}

export default function AdminTimesheetReports() {
  const [startDate, setStartDate] = useState(() => {
    const d = mondayOf(new Date());
    d.setDate(d.getDate() - 28);
    return fmt(d);
  });
  const [endDate, setEndDate] = useState(() => fmt(new Date()));
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState<User[]>([]);
  const [rows, setRows] = useState<WeeklyTimesheetData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    userApi.getAll({ limit: 500 })
      .then((r) => setEmployees(r.data.data))
      .catch(() => {});
  }, []);

  const fetchData = () => {
    setLoading(true);
    const params: Record<string, string | number> = { limit: 500, startDate, endDate };
    if (employeeId) params.userId = employeeId;
    weeklyTimesheetApi.getAll(params)
      .then((r) => setRows(r.data.data))
      .catch(() => toast.error("Failed to load report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [startDate, endDate, employeeId]);

  const aggregated = useMemo<AggRow[]>(() => {
    const map = new Map<string, AggRow>();
    rows.forEach((ts) => {
      const user = typeof ts.userId === "object" ? ts.userId : null;
      const uid = user ? user._id : String(ts.userId);
      const existing = map.get(uid);
      if (existing) {
        existing.totalHours += ts.totalHours;
        if (ts.status === "submitted" || ts.status === "approved") existing.weeksSubmitted += 1;
      } else {
        map.set(uid, {
          userId: uid,
          name: user ? user.name : uid,
          department: user?.department || "—",
          totalHours: ts.totalHours,
          weeksSubmitted: ts.status === "submitted" || ts.status === "approved" ? 1 : 0,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [rows]);

  const totalHours = aggregated.reduce((s, r) => s + r.totalHours, 0);
  const totalWeeks = aggregated.reduce((s, r) => s + r.weeksSubmitted, 0);
  const topHours = aggregated.length > 0 ? aggregated[0].totalHours : 0;

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <BarChart3 className="h-10 w-10 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Aggregated analytics
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Timesheet <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Reports</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Hours logged by employee over the selected range</p>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Total Hours</p>
            <p className="text-xl font-bold tracking-tight">{totalHours.toFixed(0)}h</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        <div>
          <label className={`${labelCls} mb-1.5 block`}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={`${labelCls} mb-1.5 block`}>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className={`${labelCls} mb-1.5 block`}>Employee</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
            <option value="">All Employees</option>
            {employees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      {aggregated.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Employees", value: aggregated.length, icon: Users, gradient: "from-indigo-500 to-purple-600" },
            { label: "Total Hours", value: totalHours.toFixed(1), icon: Clock, gradient: "from-emerald-500 to-teal-600" },
            { label: "Weeks Submitted", value: totalWeeks, icon: CalendarDays, gradient: "from-sky-500 to-blue-600" },
            { label: "Avg Hours", value: aggregated.length ? (totalHours / aggregated.length).toFixed(1) : "0", icon: BarChart3, gradient: "from-amber-500 to-orange-600" },
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
      ) : aggregated.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <Inbox className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No timesheet data</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Try a different date range or employee filter</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <tr>
                    {["Rank", "Employee", "Department", "Total Hours", "Weeks Submitted", "Share"].map((h) => (
                      <th key={h} className={`px-4 py-3 ${labelCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {aggregated.map((r, idx) => {
                    const sharePct = topHours > 0 ? (r.totalHours / topHours) * 100 : 0;
                    return (
                      <tr key={r.userId} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          {idx === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm ring-1 ring-white/10">
                              <Trophy className="h-3 w-3" /> #1
                            </span>
                          ) : (
                            <span className="rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                              #{idx + 1}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={r.name} />
                            <span className="font-semibold text-gray-900 dark:text-white">{r.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <Building className="h-3.5 w-3.5 text-gray-400" />
                            {r.department}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold tracking-tight text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                            {r.totalHours.toFixed(1)}h
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {r.weeksSubmitted}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                                style={{ width: `${Math.min(100, sharePct)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                              {Math.round(sharePct)}%
                            </span>
                          </div>
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
            {aggregated.map((r, idx) => {
              const sharePct = topHours > 0 ? (r.totalHours / topHours) * 100 : 0;
              return (
                <div key={r.userId} className={`${cardCls} p-4`}>
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar name={r.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {idx === 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            <Trophy className="h-2.5 w-2.5" /> #1
                          </span>
                        )}
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{r.name}</p>
                      </div>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{r.department}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Total Hours</p>
                      <p className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">{r.totalHours.toFixed(1)}h</p>
                    </div>
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Weeks</p>
                      <p className="text-sm font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{r.weeksSubmitted}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                      <span>Share of top</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(sharePct)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, sharePct)}%` }}
                      />
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
