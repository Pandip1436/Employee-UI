import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  Folder,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Mail,
  Sparkles,
  Briefcase,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { WeeklyTimesheetData, TimesheetEntry, Project, AdminDailyRow } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { fmtHours } from "../../utils/format";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDateDisplay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const toInputDate = (d: Date) => d.toISOString().split("T")[0];

/** Shift a YYYY-MM-DD string by N days (positive or negative). Stays in local time. */
const shiftIsoDate = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getProjectName = (entry: TimesheetEntry): string => {
  if (typeof entry.projectId === "object" && entry.projectId !== null) {
    return (entry.projectId as Project).name;
  }
  return String(entry.projectId);
};

const getProjectId = (entry: TimesheetEntry): string => {
  if (typeof entry.projectId === "object" && entry.projectId !== null) {
    return (entry.projectId as Project)._id;
  }
  return String(entry.projectId);
};

const getDayIndex = (weekStart: string, selectedDate: string): number => {
  const ws = new Date(weekStart);
  const sd = new Date(selectedDate);
  const diffMs = sd.getTime() - ws.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

interface DailyEntry {
  projectName: string;
  projectId: string;
  task: string;
  activityType: string;
  hours: number;
}

const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

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

/* ─── Top component ─── */
export default function TimesheetDaily() {
  const { isAdmin, isManager } = useAuth();
  if (isAdmin || isManager) return <AdminDailyView />;
  return <PersonalDailyView />;
}

/* ─── Personal View ─── */
function PersonalDailyView() {
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [weekData, setWeekData] = useState<WeeklyTimesheetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    weeklyTimesheetApi
      .getCurrentWeek(selectedDate)
      .then((res) => setWeekData(res.data.data ?? null))
      .catch(() => setWeekData(null))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const { dailyEntries, groupedByProject, totalDayHours } = useMemo(() => {
    if (!weekData) return { dailyEntries: [], groupedByProject: new Map<string, DailyEntry[]>(), totalDayHours: 0 };

    const dayIdx = getDayIndex(weekData.weekStart, selectedDate);
    if (dayIdx < 0 || dayIdx > 6) return { dailyEntries: [], groupedByProject: new Map<string, DailyEntry[]>(), totalDayHours: 0 };

    const entries: DailyEntry[] = weekData.entries
      .filter((e) => e.hours[dayIdx] > 0)
      .map((e) => ({
        projectName: getProjectName(e),
        projectId: getProjectId(e),
        task: e.task,
        activityType: e.activityType,
        hours: e.hours[dayIdx],
      }));

    const grouped = new Map<string, DailyEntry[]>();
    for (const e of entries) {
      const existing = grouped.get(e.projectName) || [];
      existing.push(e);
      grouped.set(e.projectName, existing);
    }

    const total = entries.reduce((s, e) => s + e.hours, 0);
    return { dailyEntries: entries, groupedByProject: grouped, totalDayHours: total };
  }, [weekData, selectedDate]);

  const dayLabel =
    weekData ? DAY_LABELS[getDayIndex(weekData.weekStart, selectedDate)] ?? "" : "";
  const dateObj = new Date(selectedDate);

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
          <div className="flex min-w-0 flex-1 items-start gap-4 lg:max-w-[640px]">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                {dateObj.toLocaleDateString(undefined, { month: "short" })}
              </p>
              <p className="font-mono text-lg font-bold tabular-nums leading-none">{dateObj.getDate()}</p>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                {dayLabel ? `${dayLabel} · Your log` : "Your daily log"}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Daily <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Timesheet</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">{formatDateDisplay(selectedDate)}</p>

              {/* KPI chips */}
              {dailyEntries.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                    <Clock className="h-3.5 w-3.5 text-indigo-200" />
                    <span className="text-indigo-200/80">Logged</span>
                    <span className="font-mono font-semibold tabular-nums">{fmtHours(totalDayHours)}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                    <FileText className="h-3.5 w-3.5 text-indigo-200" />
                    <span className="text-indigo-200/80">Entries</span>
                    <span className="font-mono font-semibold tabular-nums">{dailyEntries.length}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                    <Folder className="h-3.5 w-3.5 text-indigo-200" />
                    <span className="text-indigo-200/80">Projects</span>
                    <span className="font-mono font-semibold tabular-nums">{groupedByProject.size}</span>
                  </span>
                </div>
              )}

              {/* Progress toward 8h target */}
              {dailyEntries.length > 0 && (() => {
                const target = 8;
                const pct = Math.min(100, (totalDayHours / target) * 100);
                const tone =
                  totalDayHours >= target ? "from-emerald-400 to-teal-400"
                  : totalDayHours >= target * 0.75 ? "from-sky-400 to-blue-400"
                  : totalDayHours >= target * 0.5 ? "from-amber-400 to-orange-400"
                  : "from-rose-400 to-pink-400";
                return (
                  <div className="mt-3 max-w-md">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
                      <span className="text-indigo-200/70">Day progress</span>
                      <span className="font-mono tabular-nums text-indigo-100">
                        {fmtHours(totalDayHours)} <span className="text-indigo-200/50">/ {target}h</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${tone} transition-[width] duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* RIGHT: date navigator */}
          <div className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftIsoDate(d, -1))}
              aria-label="Previous day"
              className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center gap-1.5 px-1">
              <CalendarDays className="h-4 w-4 text-indigo-200" />
              <input
                type="date"
                value={selectedDate}
                max={todayIso()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-md border-0 bg-transparent px-1 py-0.5 text-sm font-semibold text-white outline-none [color-scheme:dark] focus:ring-0"
              />
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftIsoDate(d, 1))}
              disabled={selectedDate >= todayIso()}
              aria-label="Next day"
              className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading entries...</p>
        </div>
      ) : dailyEntries.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No entries for this date</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Pick a different date or log hours in your weekly timesheet</p>
        </div>
      ) : (
        <>
          {/* ── Desktop — project groups ── */}
          <div className="hidden space-y-4 md:block">
            {Array.from(groupedByProject.entries()).map(([projectName, entries]) => {
              const total = entries.reduce((s, e) => s + e.hours, 0);
              return (
                <div key={projectName} className={`${cardCls} overflow-hidden p-0`}>
                  <div className="flex items-center gap-3 border-b border-gray-200/70 bg-gray-50/60 px-5 py-3 dark:border-gray-800/80 dark:bg-gray-800/40">
                    <div className={`rounded-lg bg-gradient-to-br ${paletteFor(projectName)} p-2 shadow-sm ring-1 ring-white/10`}>
                      <Folder className="h-3.5 w-3.5 text-white" />
                    </div>
                    <p className="flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{projectName}</p>
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono tabular-nums">{fmtHours(total)}</span>
                    </span>
                  </div>
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[55%]" />
                      <col className="w-[30%]" />
                      <col className="w-[15%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-200/70 dark:border-gray-800/80">
                        <th className={`px-5 py-2.5 text-left ${labelCls}`}>Task</th>
                        <th className={`px-5 py-2.5 text-left ${labelCls}`}>Activity Type</th>
                        <th className={`px-5 py-2.5 text-right ${labelCls}`}>Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {entries.map((entry, idx) => (
                        <tr key={idx} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                          <td className="truncate px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{entry.task}</td>
                          <td className="px-5 py-3">
                            <span className="inline-block max-w-full truncate rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                              {entry.activityType}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-sm font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                            {fmtHours(entry.hours)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* ── Mobile Cards ── */}
          <div className="space-y-4 md:hidden">
            {Array.from(groupedByProject.entries()).map(([projectName, entries]) => (
              <div key={projectName}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <div className={`rounded-lg bg-gradient-to-br ${paletteFor(projectName)} p-1.5 shadow-sm ring-1 ring-white/10`}>
                    <Folder className="h-3 w-3 text-white" />
                  </div>
                  <p className="flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{projectName}</p>
                  <span className="font-mono text-xs font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                    {fmtHours(entries.reduce((s, e) => s + e.hours, 0))}
                  </span>
                </div>
                <div className="space-y-2">
                  {entries.map((entry, idx) => (
                    <div key={idx} className={`${cardCls} p-4`}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{entry.task}</p>
                        <span className="font-mono text-sm font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">{fmtHours(entry.hours)}</span>
                      </div>
                      <span className="rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                        {entry.activityType}
                      </span>
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

/* ─── Admin View ─── */
type SortKey = "name" | "hours" | "status";
type SortDir = "asc" | "desc";

function AdminDailyView() {
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [rows, setRows] = useState<AdminDailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("hours");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    setLoading(true);
    weeklyTimesheetApi
      .getDailyEntries(selectedDate)
      .then((res) => setRows(res.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totals = useMemo(() => {
    const totalHours = rows.reduce((s, r) => s + r.totalHours, 0);
    return { employees: rows.length, totalHours };
  }, [rows]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.user.department) set.add(r.user.department);
    return [...set].sort();
  }, [rows]);

  const filteredSortedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = rows.filter((r) => {
      if (q && !r.user.name.toLowerCase().includes(q) && !r.user.email.toLowerCase().includes(q)) return false;
      if (deptFilter && r.user.department !== deptFilter) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name":   return dir * a.user.name.localeCompare(b.user.name);
        case "hours":  return dir * (a.totalHours - b.totalHours);
        case "status": return dir * String(a.status).localeCompare(String(b.status));
        default: return 0;
      }
    });
    return arr;
  }, [rows, search, deptFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
      : <ArrowDown className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />;
  };

  const dateObj = new Date(selectedDate);

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
          <div className="flex min-w-0 flex-1 items-start gap-4 lg:max-w-[640px]">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                {dateObj.toLocaleDateString(undefined, { month: "short" })}
              </p>
              <p className="font-mono text-lg font-bold tabular-nums leading-none">{dateObj.getDate()}</p>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Users className="h-3.5 w-3.5" />
                Team activity
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Daily <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Activity</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Every employee's logged hours for {formatDateDisplay(selectedDate)}</p>

              {/* KPI chips */}
              {rows.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                    <Users className="h-3.5 w-3.5 text-indigo-200" />
                    <span className="text-indigo-200/80">Employees</span>
                    <span className="font-mono font-semibold tabular-nums">{totals.employees}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs ring-1 ring-emerald-400/30 backdrop-blur-sm">
                    <Clock className="h-3.5 w-3.5 text-emerald-200" />
                    <span className="text-emerald-200/90">Total hours</span>
                    <span className="font-mono font-semibold tabular-nums text-emerald-50">{fmtHours(totals.totalHours)}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs ring-1 ring-sky-400/30 backdrop-blur-sm">
                    <Sparkles className="h-3.5 w-3.5 text-sky-200" />
                    <span className="text-sky-200/90">Avg per emp</span>
                    <span className="font-mono font-semibold tabular-nums text-sky-50">
                      {fmtHours(totals.employees > 0 ? totals.totalHours / totals.employees : 0)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: date navigator */}
          <div className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftIsoDate(d, -1))}
              aria-label="Previous day"
              className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center gap-1.5 px-1">
              <CalendarDays className="h-4 w-4 text-indigo-200" />
              <input
                type="date"
                value={selectedDate}
                max={todayIso()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-md border-0 bg-transparent px-1 py-0.5 text-sm font-semibold text-white outline-none [color-scheme:dark] focus:ring-0"
              />
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftIsoDate(d, 1))}
              disabled={selectedDate >= todayIso()}
              aria-label="Next day"
              className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            label: "Employees with entries",
            value: String(totals.employees),
            sub: totals.employees === 1 ? "logged today" : "logged today",
            icon: Users,
            gradient: "from-indigo-500 to-purple-600",
            ringColor: "shadow-indigo-500/30",
          },
          {
            label: "Total hours logged",
            value: fmtHours(totals.totalHours),
            sub: totals.employees > 0 ? `${fmtHours(totals.totalHours / totals.employees)} avg per employee` : "No entries",
            icon: Clock,
            gradient: "from-emerald-500 to-teal-600",
            ringColor: "shadow-emerald-500/30",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`${cardCls} group relative overflow-hidden !p-0 transition-all duration-300 hover:-translate-y-0.5`}
          >
            <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${s.gradient}`} />
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 blur-2xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-110`}
            />
            <div
              aria-hidden
              className={`pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${s.gradient} opacity-[0.04] blur-2xl`}
            />
            <div className="relative p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={labelCls}>{s.label}</p>
                  <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">{s.value}</p>
                  <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">{s.sub}</p>
                </div>
                <div
                  className={`relative shrink-0 rounded-xl bg-gradient-to-br ${s.gradient} p-2.5 shadow-lg ${s.ringColor} ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105`}
                >
                  <s.icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                  <span aria-hidden className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter / Sort bar ── */}
      {!loading && rows.length > 0 && (
        <div className={`${cardCls} p-3`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full rounded-lg border border-gray-200/70 bg-white/80 py-2 pl-9 ${search ? "pr-8" : "pr-3"} text-sm text-gray-900 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800/80 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-500 dark:ring-white/[0.03]`}
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

            {/* Department dropdown */}
            {departments.length > 0 && (
              <div className="relative lg:min-w-[180px]">
                <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-200/70 bg-white/80 py-2 pl-8 pr-8 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800/80 dark:bg-gray-900/80 dark:text-white dark:ring-white/[0.03]"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </div>
            )}

            {/* Sort chips */}
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-gray-50/60 p-1 dark:border-gray-800/80 dark:bg-gray-800/40">
              <span className="ml-1 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Sort
              </span>
              {([
                { key: "name" as SortKey,   label: "Name" },
                { key: "hours" as SortKey,  label: "Hours" },
                { key: "status" as SortKey, label: "Status" },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleSort(f.key)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    sortKey === f.key
                      ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60"
                  }`}
                >
                  {f.label}
                  <SortIcon k={f.key} />
                </button>
              ))}
            </div>

            {(search || deptFilter || sortKey !== "hours" || sortDir !== "desc") && (
              <button
                onClick={() => { setSearch(""); setDeptFilter(""); setSortKey("hours"); setSortDir("desc"); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading activity...</p>
        </div>
      ) : filteredSortedRows.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {rows.length === 0 ? "No employees logged hours on this date" : `No matches for "${search}"`}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {rows.length === 0 ? "Pick a different date using the selector above" : "Try clearing search or pick a different date"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSortedRows.map((row) => {
            const isOpen = expanded.has(row.user._id);
            return (
              <div key={row.user._id} className={`${cardCls} overflow-hidden p-0`}>
                <button
                  type="button"
                  onClick={() => toggle(row.user._id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <Avatar name={row.user.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{row.user.name}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{row.user.email}</span>
                        {row.user.department && (
                          <>
                            <span className="mx-1 hidden sm:inline">·</span>
                            <span className="hidden truncate sm:inline">{row.user.department}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-[11px] font-semibold capitalize text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                      {row.status}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold tracking-tight text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono tabular-nums">{fmtHours(row.totalHours)}</span>
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-200/70 bg-gray-50/40 dark:border-gray-800/80 dark:bg-gray-800/20">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-[32%]" />
                        <col className="w-[38%]" />
                        <col className="w-[18%]" />
                        <col className="w-[12%]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-gray-200/70 dark:border-gray-800/80">
                          <th className={`px-5 py-2.5 text-left ${labelCls}`}>Project</th>
                          <th className={`px-5 py-2.5 text-left ${labelCls}`}>Task</th>
                          <th className={`px-5 py-2.5 text-left ${labelCls}`}>Activity</th>
                          <th className={`px-5 py-2.5 text-right ${labelCls}`}>Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {row.entries.map((entry, idx) => (
                          <tr key={idx} className="transition-colors hover:bg-white/80 dark:hover:bg-gray-800/40">
                            <td className="px-5 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className={`shrink-0 rounded-md bg-gradient-to-br ${paletteFor(entry.projectName)} p-1 shadow-sm ring-1 ring-white/10`}>
                                  <Briefcase className="h-3 w-3 text-white" />
                                </div>
                                <span className="truncate text-sm text-gray-700 dark:text-gray-300">{entry.projectName}</span>
                              </div>
                            </td>
                            <td className="truncate px-5 py-2.5 text-sm text-gray-700 dark:text-gray-300">{entry.task}</td>
                            <td className="px-5 py-2.5">
                              <span className="inline-block max-w-full truncate rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                                {entry.activityType}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono text-sm font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                              {fmtHours(entry.hours)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
