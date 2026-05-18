import { useState, useEffect } from "react";
import {
  Clock, FileCheck, AlertCircle, ArrowRight, Plus, CalendarDays,
  ClipboardList, History, Sparkles, Timer,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { WeeklyTimesheetData } from "../../types";
import { fmtHours } from "../../utils/format";

const statusStyle: Record<string, { bg: string; dot: string; gradient: string }> = {
  draft: {
    bg: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    dot: "bg-gray-500",
    gradient: "from-gray-500 to-gray-600",
  },
  submitted: {
    bg: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    dot: "bg-sky-500",
    gradient: "from-sky-500 to-blue-600",
  },
  approved: {
    bg: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
  },
  rejected: {
    bg: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    dot: "bg-rose-500",
    gradient: "from-rose-500 to-pink-600",
  },
};

const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

export default function TimesheetHome() {
  const [current, setCurrent] = useState<WeeklyTimesheetData | null>(null);
  const [recent, setRecent] = useState<WeeklyTimesheetData[]>([]);

  useEffect(() => {
    weeklyTimesheetApi.getCurrentWeek().then((r) => setCurrent(r.data.data ?? null)).catch(() => { /* interceptor */ });
    weeklyTimesheetApi.getHistory({ limit: 5 }).then((r) => setRecent(r.data.data)).catch(() => { /* interceptor */ });
  }, []);

  const fmtWeek = (d: string | Date) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const weekEndFrom = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  };

  const currentWeekLabel = current
    ? `${fmtWeek(current.weekStart)} — ${fmtWeek(weekEndFrom(current.weekStart))}`
    : "Current week";

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
          {/* LEFT: identity + KPI chips + progress */}
          <div className="flex min-w-0 flex-1 items-start gap-4 lg:max-w-[640px]">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <Timer className="h-10 w-10 text-indigo-200" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                {currentWeekLabel}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Time <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Tracking</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Track and manage your working hours across projects</p>

              {/* KPI chips */}
              {current && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                    <Clock className="h-3.5 w-3.5 text-indigo-200" />
                    <span className="text-indigo-200/80">Logged</span>
                    <span className="font-mono font-semibold tabular-nums">{fmtHours(current.totalHours)}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                    <ClipboardList className="h-3.5 w-3.5 text-indigo-200" />
                    <span className="text-indigo-200/80">Entries</span>
                    <span className="font-mono font-semibold tabular-nums">{current.entries.length}</span>
                  </span>
                  {current.status && (() => {
                    const s = statusStyle[current.status];
                    const heroBg =
                      current.status === "approved"  ? "bg-emerald-500/15 ring-emerald-400/30 text-emerald-50"
                      : current.status === "submitted" ? "bg-sky-500/15 ring-sky-400/30 text-sky-50"
                      : current.status === "rejected"  ? "bg-rose-500/15 ring-rose-400/30 text-rose-50"
                      : "bg-white/10 ring-white/15";
                    return (
                      <span className={`inline-flex items-center gap-2 rounded-lg ${heroBg} px-3 py-1.5 text-xs ring-1 backdrop-blur-sm`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        <span className="opacity-90 capitalize">{current.status}</span>
                      </span>
                    );
                  })()}
                </div>
              )}

              {/* 40h progress bar */}
              {current && (() => {
                const target = 40;
                const pct = Math.min(100, (current.totalHours / target) * 100);
                const tone =
                  current.totalHours >= target ? "from-emerald-400 to-teal-400"
                  : current.totalHours >= target * 0.75 ? "from-sky-400 to-blue-400"
                  : current.totalHours >= target * 0.5 ? "from-amber-400 to-orange-400"
                  : "from-rose-400 to-pink-400";
                return (
                  <div className="mt-3 max-w-md">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
                      <span className="text-indigo-200/70">Week progress</span>
                      <span className="font-mono tabular-nums text-indigo-100">
                        {fmtHours(current.totalHours)} <span className="text-indigo-200/50">/ {target}h</span>
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

          {/* RIGHT: action stack */}
          <div className="flex w-full shrink-0 flex-col gap-2.5 sm:flex-row lg:w-auto lg:flex-col">
            <Link
              to="/timesheet/log"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Quick Log
            </Link>
            <Link
              to="/timesheet/history"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.98]"
            >
              <History className="h-4 w-4" />
              History
            </Link>
            <Link
              to="/timesheet/weekly"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 active:scale-[0.98]"
            >
              <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                <CalendarDays className="h-3.5 w-3.5 text-white" />
              </span>
              Weekly Grid
            </Link>
          </div>
        </div>
      </div>

          {/* ── Current Week Summary ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: "This Week",
                value: current ? fmtHours(current.totalHours) : "0h",
                sub: current ? currentWeekLabel : "No entries yet",
                icon: Clock,
                gradient: "from-indigo-500 to-purple-600",
              },
              {
                label: "Status",
                value: current?.status ? current.status : "—",
                sub: current?.status === "draft" ? "Not yet submitted" : current?.status === "approved" ? "Approved by manager" : current?.status === "submitted" ? "Awaiting review" : current?.status === "rejected" ? "Revisions requested" : "No timesheet",
                icon: FileCheck,
                gradient: current?.status ? statusStyle[current.status].gradient : "from-gray-500 to-gray-600",
              },
              {
                label: "Entries",
                value: current?.entries?.length ?? 0,
                sub: "Projects logged",
                icon: CalendarDays,
                gradient: "from-sky-500 to-blue-600",
              },
              {
                label: "Action Needed",
                value: current?.status === "draft" ? "Yes" : "No",
                sub: current?.status === "draft" ? "Submit for approval" : "All up to date",
                icon: AlertCircle,
                gradient: current?.status === "draft" ? "from-amber-500 to-orange-600" : "from-emerald-500 to-teal-600",
              },
            ].map((s) => {
              const ringColor =
                /indigo/.test(s.gradient) ? "shadow-indigo-500/30" :
                /emerald/.test(s.gradient) ? "shadow-emerald-500/30" :
                /amber/.test(s.gradient) ? "shadow-amber-500/30" :
                /sky/.test(s.gradient) ? "shadow-sky-500/30" :
                /rose/.test(s.gradient) ? "shadow-rose-500/30" :
                /orange/.test(s.gradient) ? "shadow-orange-500/30" :
                "shadow-gray-500/30";
              return (
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
                        <p className="mt-2 font-mono text-2xl font-bold capitalize tabular-nums tracking-tight text-gray-900 dark:text-white">{s.value}</p>
                      </div>
                      <div className={`relative shrink-0 rounded-xl bg-gradient-to-br ${s.gradient} p-2.5 shadow-lg ${ringColor} ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105`}>
                        <s.icon className="h-4 w-4 text-white" strokeWidth={2.5} />
                        <span aria-hidden className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </div>
                    <p className="mt-3 truncate text-xs text-gray-500 dark:text-gray-400">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── This Week — day strip ── */}
          {current && (() => {
            const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            const dayTotals = [0, 0, 0, 0, 0, 0, 0];
            for (const e of current.entries) {
              for (let i = 0; i < 7; i++) dayTotals[i] += e.hours?.[i] || 0;
            }
            const maxDay = Math.max(...dayTotals, 1);
            const today = new Date();
            const dayOfWeek = today.getDay();
            const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0..Sun=6
            return (
              <div className={`${cardCls} relative overflow-hidden p-5`}>
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-400/15 blur-3xl" />
                <div className="relative flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:ring-indigo-400/20">
                    <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">This Week</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Hours logged per day</p>
                  </div>
                </div>
                <div className="relative mt-4 grid grid-cols-7 gap-1.5">
                  {DAY_LABELS.map((label, i) => {
                    const hours = dayTotals[i];
                    const heightPct = hours > 0 ? Math.max(8, (hours / maxDay) * 100) : 0;
                    const isToday = i === todayIdx;
                    const isWeekend = i >= 5;
                    return (
                      <div
                        key={i}
                        className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors ${
                          isToday
                            ? "bg-indigo-50/60 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:ring-indigo-400/30"
                            : ""
                        }`}
                      >
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isWeekend ? "text-rose-400 dark:text-rose-400/80" : "text-gray-500 dark:text-gray-400"
                        }`}>{label}</span>
                        {/* Bar */}
                        <div className="flex h-14 w-full items-end justify-center">
                          {hours > 0 ? (
                            <div
                              className={`w-3 rounded-t-md bg-gradient-to-t ${
                                isToday ? "from-indigo-500 to-purple-600"
                                : hours >= 8 ? "from-emerald-500 to-teal-500"
                                : "from-indigo-400 to-purple-500"
                              } shadow-sm`}
                              style={{ height: `${heightPct}%` }}
                            />
                          ) : (
                            <div className="h-1 w-3 rounded-full bg-gray-200 dark:bg-gray-700" />
                          )}
                        </div>
                        <span className={`font-mono text-[10px] font-bold tabular-nums ${
                          hours > 0
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-300 dark:text-gray-600"
                        }`}>
                          {hours > 0 ? fmtHours(hours) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Recent Timesheets ── */}
          <div className={`${cardCls} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:ring-indigo-400/20">
                  <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last 5 weekly timesheets</p>
                </div>
              </div>
              <Link
                to="/timesheet/history"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No timesheets yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Start logging hours in the Weekly Grid</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recent.map((r) => {
                  const s = statusStyle[r.status] || statusStyle.draft;
                  const start = new Date(r.weekStart);
                  return (
                    <Link
                      key={r._id}
                      to={`/timesheet/${r._id}`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-transparent bg-gray-50/70 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:bg-white hover:shadow-sm dark:bg-gray-800/40 dark:hover:border-gray-700 dark:hover:bg-gray-800"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-lg ring-1 ring-white/10`}>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                            {start.toLocaleDateString(undefined, { month: "short" })}
                          </p>
                          <p className="font-mono text-sm font-bold tabular-nums leading-none">{start.getDate()}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {fmtWeek(r.weekStart)} — {fmtWeek(weekEndFrom(r.weekStart))}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-mono tabular-nums">{r.entries.length}</span> {r.entries.length === 1 ? "entry" : "entries"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-mono text-sm font-bold tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400">{fmtHours(r.totalHours)}</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${s.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {r.status}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
    </div>
  );
}
