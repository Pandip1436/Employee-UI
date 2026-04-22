import { useState, useEffect } from "react";
import {
  Clock, FileCheck, AlertCircle, ArrowRight, Plus, CalendarDays,
  LayoutDashboard, ClipboardList, History, Sparkles, Timer,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { WeeklyTimesheetData } from "../../types";
import TimesheetDaily from "../timesheet-daily/TimesheetDaily";
import TimesheetHistory from "../timesheet-history/TimesheetHistory";

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

type Tab = "overview" | "daily" | "history";

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "daily", label: "Daily Log", icon: ClipboardList },
  { id: "history", label: "History", icon: History },
];

export default function TimesheetHome() {
  const [current, setCurrent] = useState<WeeklyTimesheetData | null>(null);
  const [recent, setRecent] = useState<WeeklyTimesheetData[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

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
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <Timer className="h-10 w-10 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                {currentWeekLabel}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Time <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Tracking</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Track and manage your working hours across projects</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/timesheet/log"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/15"
            >
              <Plus className="h-4 w-4" />
              Quick Log
            </Link>
            <Link
              to="/timesheet/weekly"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
            >
              <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                <CalendarDays className="h-3.5 w-3.5 text-white" />
              </span>
              Weekly Grid
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`group relative inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
                active
                  ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                  : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
              }`}
            >
              <t.icon
                className={`h-4 w-4 transition-colors ${
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                }`}
              />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <>
          {/* ── Current Week Summary ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: "This Week",
                value: current ? `${current.totalHours}h` : "0h",
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
            ].map((s) => (
              <div key={s.label} className={`${cardCls} group relative overflow-hidden p-5`}>
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${s.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
                />
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className={labelCls}>{s.label}</p>
                    <p className="mt-2 text-2xl font-bold capitalize tracking-tight text-gray-900 dark:text-white">{s.value}</p>
                  </div>
                  <div className={`rounded-xl bg-gradient-to-br ${s.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                    <s.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="mt-3 truncate text-xs text-gray-500 dark:text-gray-400">{s.sub}</p>
              </div>
            ))}
          </div>

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
              <button
                onClick={() => setActiveTab("history")}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
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
                          <p className="text-sm font-bold leading-none">{start.getDate()}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {fmtWeek(r.weekStart)} — {fmtWeek(weekEndFrom(r.weekStart))}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {r.entries.length} {r.entries.length === 1 ? "entry" : "entries"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">{r.totalHours}h</span>
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
        </>
      )}

      {activeTab === "daily" && <TimesheetDaily />}
      {activeTab === "history" && <TimesheetHistory />}
    </div>
  );
}
