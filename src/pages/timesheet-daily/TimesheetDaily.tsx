import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
  Users,
  Mail,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { WeeklyTimesheetData, TimesheetEntry, Project, AdminDailyRow } from "../../types";
import { useAuth } from "../../context/AuthContext";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDateDisplay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const toInputDate = (d: Date) => d.toISOString().split("T")[0];

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
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                {dateObj.toLocaleDateString(undefined, { month: "short" })}
              </p>
              <p className="text-lg font-bold leading-none">{dateObj.getDate()}</p>
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
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Logged</p>
              <p className="text-xl font-bold tracking-tight">{totalDayHours}h</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <CalendarDays className="h-4 w-4 text-indigo-200" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-md border-0 bg-transparent px-1 py-0.5 text-sm font-semibold text-white outline-none [color-scheme:dark] focus:ring-0"
              />
            </div>
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
                      {total}h
                    </span>
                  </div>
                  <table className="w-full">
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
                          <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{entry.task}</td>
                          <td className="px-5 py-3">
                            <span className="rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                              {entry.activityType}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-bold tracking-tight text-gray-900 dark:text-white">
                            {entry.hours}
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
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {entries.reduce((s, e) => s + e.hours, 0)}h
                  </span>
                </div>
                <div className="space-y-2">
                  {entries.map((entry, idx) => (
                    <div key={idx} className={`${cardCls} p-4`}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{entry.task}</p>
                        <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">{entry.hours}h</span>
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
function AdminDailyView() {
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [rows, setRows] = useState<AdminDailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                {dateObj.toLocaleDateString(undefined, { month: "short" })}
              </p>
              <p className="text-lg font-bold leading-none">{dateObj.getDate()}</p>
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
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-sm">
            <CalendarDays className="h-4 w-4 text-indigo-200" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border-0 bg-transparent px-1 py-0.5 text-sm font-semibold text-white outline-none [color-scheme:dark] focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "Employees with entries", value: totals.employees, icon: Users, gradient: "from-indigo-500 to-purple-600" },
          { label: "Total hours logged", value: `${totals.totalHours}h`, icon: Clock, gradient: "from-emerald-500 to-teal-600" },
        ].map((s) => (
          <div key={s.label} className={`${cardCls} group relative overflow-hidden p-5`}>
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${s.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
            />
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className={labelCls}>{s.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{s.value}</p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${s.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading activity...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No employees logged hours on this date</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Pick a different date using the selector above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
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
                      {row.totalHours}h
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-200/70 bg-gray-50/40 dark:border-gray-800/80 dark:bg-gray-800/20">
                    <table className="w-full">
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
                                <div className={`rounded-md bg-gradient-to-br ${paletteFor(entry.projectName)} p-1 shadow-sm ring-1 ring-white/10`}>
                                  <Briefcase className="h-3 w-3 text-white" />
                                </div>
                                <span className="truncate text-sm text-gray-700 dark:text-gray-300">{entry.projectName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-2.5 text-sm text-gray-700 dark:text-gray-300">{entry.task}</td>
                            <td className="px-5 py-2.5">
                              <span className="rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                                {entry.activityType}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-right text-sm font-bold tracking-tight text-gray-900 dark:text-white">
                              {entry.hours}
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
