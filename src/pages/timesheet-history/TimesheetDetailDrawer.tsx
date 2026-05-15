import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  MessageSquare,
  FileText,
  Briefcase,
  Sparkles,
  ExternalLink,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import Drawer from "../../components/Drawer";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { fmtHours } from "../../utils/format";
import type { WeeklyTimesheetData, TimesheetEntry, Project } from "../../types";

interface Props {
  open: boolean;
  weekId: string | null;
  onClose: () => void;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const statusConfig: Record<string, { dot: string; badge: string; label: string; ring: string }> = {
  draft: {
    dot: "bg-gray-400",
    badge:
      "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    label: "Draft",
    ring: "ring-gray-400/40",
  },
  submitted: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    label: "Submitted",
    ring: "ring-amber-400/40",
  },
  approved: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    label: "Approved",
    ring: "ring-emerald-400/40",
  },
  rejected: {
    dot: "bg-rose-500",
    badge:
      "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    label: "Rejected",
    ring: "ring-rose-400/40",
  },
};

const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const weekEndFrom = (weekStart: string) => {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return end;
};

const getProjectName = (entry: TimesheetEntry): string => {
  if (typeof entry.projectId === "object" && entry.projectId !== null) {
    return (entry.projectId as Project).name;
  }
  return String(entry.projectId);
};

const getRowTotal = (hours: number[]): number => hours.reduce((s, h) => s + (h || 0), 0);

export default function TimesheetDetailDrawer({ open, weekId, onClose }: Props) {
  const [timesheet, setTimesheet] = useState<WeeklyTimesheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !weekId) return;
    setLoading(true);
    setError(false);
    setTimesheet(null);
    weeklyTimesheetApi
      .getDetail(weekId)
      .then((res) => setTimesheet(res.data.data!))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, weekId]);

  const sConfig = timesheet ? statusConfig[timesheet.status] || statusConfig.draft : statusConfig.draft;

  const dayTotals = timesheet
    ? Array.from({ length: 7 }).map((_, i) =>
        timesheet.entries.reduce((s, e) => s + (e.hours?.[i] || 0), 0),
      )
    : [];
  const daysWorked = dayTotals.filter((h) => h > 0).length;
  const peakDayIdx = dayTotals.reduce((maxIdx, h, i, arr) => (h > arr[maxIdx] ? i : maxIdx), 0);
  const peakDay = dayTotals[peakDayIdx] > 0 ? DAY_LABELS[peakDayIdx] : "—";
  const projects = timesheet
    ? Array.from(
        new Set(
          timesheet.entries.map((e) =>
            typeof e.projectId === "object" && e.projectId !== null
              ? (e.projectId as Project).name
              : String(e.projectId),
          ),
        ),
      )
    : [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="xl"
      icon={<FileText className="h-5 w-5 text-indigo-200" />}
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          Weekly timesheet
        </span>
      }
      title={
        timesheet
          ? `${formatDate(timesheet.weekStart)} — ${formatDate(weekEndFrom(timesheet.weekStart))}`
          : "Loading…"
      }
      footer={
        timesheet && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Updated {formatDate(timesheet.updatedAt)}
            </p>
            <Link
              to={`/timesheet/${timesheet._id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-500/40 dark:hover:text-indigo-300"
            >
              Open full page
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )
      }
    >
      {loading ? (
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/60" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/60" />
            ))}
          </div>
        </div>
      ) : error || !timesheet ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <FileText className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Could not load timesheet
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            It may have been deleted or you may have lost connection.
          </p>
        </div>
      ) : (
        <div className="space-y-5 p-5 sm:p-6">
          {/* Status + KPI chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sConfig.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
              {sConfig.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/25">
              <Clock className="h-3 w-3" />
              <span className="tabular-nums">{fmtHours(timesheet.totalHours)}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/25">
              <Briefcase className="h-3 w-3" />
              <span className="tabular-nums">{projects.length}</span>
              {projects.length === 1 ? " project" : " projects"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25">
              <CalendarDays className="h-3 w-3" />
              <span className="tabular-nums">{daysWorked}</span>
              {daysWorked === 1 ? " day" : " days"}
            </span>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                icon: <Clock className="h-4 w-4" />,
                label: "Total",
                value: fmtHours(timesheet.totalHours),
              },
              {
                icon: <TrendingUp className="h-4 w-4" />,
                label: "Peak day",
                value: peakDay,
                hint: dayTotals[peakDayIdx] > 0 ? fmtHours(dayTotals[peakDayIdx]) : undefined,
              },
              {
                icon: <ListChecks className="h-4 w-4" />,
                label: "Entries",
                value: String(timesheet.entries.length),
              },
              {
                icon: <Briefcase className="h-4 w-4" />,
                label: "Projects",
                value: String(projects.length),
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-gray-200/70 bg-gray-50/60 p-3 ring-1 ring-black/[0.02] dark:border-gray-800/80 dark:bg-gray-800/40 dark:ring-white/[0.03]"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <span className="text-indigo-500 dark:text-indigo-400">{k.icon}</span>
                  {k.label}
                </div>
                <p className="mt-1 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  {k.value}
                </p>
                {k.hint && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{k.hint}</p>
                )}
              </div>
            ))}
          </div>

          {/* Day-by-day distribution */}
          {dayTotals.some((d) => d > 0) && (
            <div>
              <p className={`${labelCls} mb-2`}>Hours per day</p>
              <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-3 ring-1 ring-black/[0.02] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03]">
                <div className="flex items-end gap-1.5">
                  {dayTotals.map((h, i) => {
                    const max = Math.max(...dayTotals, 1);
                    const pct = h > 0 ? Math.max(8, Math.round((h / max) * 100)) : 0;
                    const weekend = i >= 5;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                          {h > 0 ? fmtHours(h) : "—"}
                        </span>
                        <div className="flex h-16 w-full items-end overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`w-full rounded-md transition-all ${
                              h > 0
                                ? weekend
                                  ? "bg-gradient-to-t from-fuchsia-500 to-indigo-500"
                                  : "bg-gradient-to-t from-indigo-500 to-sky-500"
                                : ""
                            }`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          {DAY_LABELS[i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Manager comment */}
          {timesheet.status === "rejected" && timesheet.managerComment && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-rose-100 p-2 dark:bg-rose-500/10">
                  <MessageSquare className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="min-w-0">
                  <p className={`${labelCls} mb-1 text-rose-600 dark:text-rose-400`}>
                    Manager comment
                  </p>
                  <p className="text-sm text-rose-700 dark:text-rose-300">
                    {timesheet.managerComment}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Entries */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className={labelCls}>Entries</p>
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                {timesheet.entries.length} {timesheet.entries.length === 1 ? "row" : "rows"}
              </span>
            </div>

            {timesheet.entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center dark:border-gray-800 dark:bg-gray-800/30">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No entries recorded for this week
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {timesheet.entries.map((entry, idx) => {
                  const rowTotal = getRowTotal(entry.hours);
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-gray-200/70 bg-white/80 p-3.5 ring-1 ring-black/[0.02] transition-all hover:ring-black/[0.05] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]"
                    >
                      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {getProjectName(entry)}
                          </p>
                          {entry.activityType && (
                            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {entry.activityType}
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                          <Clock className="h-3 w-3" />
                          {fmtHours(rowTotal)}
                        </span>
                      </div>
                      {entry.task && (
                        <p className="mb-2.5 text-xs text-gray-600 dark:text-gray-300">
                          {entry.task}
                        </p>
                      )}
                      {entry.notes && (
                        <p className="mb-2.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] italic text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                          {entry.notes}
                        </p>
                      )}
                      <div className="grid grid-cols-7 gap-1">
                        {DAY_LABELS.map((d, i) => {
                          const h = entry.hours?.[i] || 0;
                          return (
                            <div key={d} className="text-center">
                              <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                {d}
                              </p>
                              <div
                                className={`rounded-md py-1.5 text-[11px] font-bold tabular-nums ${
                                  h > 0
                                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-500/15 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20"
                                    : "bg-gray-50 text-gray-300 dark:bg-gray-800/60 dark:text-gray-600"
                                }`}
                              >
                                {h > 0 ? h : "·"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Approval metadata */}
          {(timesheet.submittedAt || timesheet.approvedAt) && (
            <div className="rounded-2xl border border-gray-200/70 bg-gray-50/50 p-3.5 dark:border-gray-800/80 dark:bg-gray-800/30">
              <p className={`${labelCls} mb-1.5`}>Timeline</p>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                {timesheet.submittedAt && (
                  <p>
                    <span className="font-semibold">Submitted:</span> {formatDate(timesheet.submittedAt)}
                  </p>
                )}
                {timesheet.approvedAt && (
                  <p>
                    <span className="font-semibold">
                      {timesheet.status === "rejected" ? "Rejected" : "Approved"}:
                    </span>{" "}
                    {formatDate(timesheet.approvedAt)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
