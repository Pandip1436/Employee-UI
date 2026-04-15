import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MessageSquare,
  FileText,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { WeeklyTimesheetData, TimesheetEntry, Project } from "../../types";

/* ─── Status badge config ─── */
const statusConfig: Record<string, { dot: string; badge: string; label: string }> = {
  draft: {
    dot: "bg-gray-400",
    badge:
      "bg-gray-50 text-gray-600 ring-1 ring-gray-500/20 dark:bg-gray-500/10 dark:text-gray-300 dark:ring-gray-500/20",
    label: "Draft",
  },
  submitted: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    label: "Submitted",
  },
  approved: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    label: "Approved",
  },
  rejected: {
    dot: "bg-rose-500",
    badge:
      "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
    label: "Rejected",
  },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ─── Helpers ─── */
const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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

const getRowTotal = (hours: number[]): number =>
  hours.reduce((sum, h) => sum + h, 0);

const labelClasses =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

/* ─── Component ─── */
export default function TimesheetDetail() {
  const { weekId } = useParams<{ weekId: string }>();
  const [timesheet, setTimesheet] = useState<WeeklyTimesheetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!weekId) return;
    setLoading(true);
    weeklyTimesheetApi
      .getDetail(weekId)
      .then((res) => setTimesheet(res.data.data!))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weekId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!timesheet) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20 px-4 text-center">
        <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
          <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Timesheet not found
        </p>
        <Link
          to="/timesheet/history"
          className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
        >
          Back to History
        </Link>
      </div>
    );
  }

  const sConfig = statusConfig[timesheet.status] || statusConfig.draft;

  return (
    <div className="space-y-6">
      {/* ── Back button ── */}
      <Link
        to="/timesheet/history"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to History
      </Link>

      {/* ── Header Card ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Weekly Timesheet
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${sConfig.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                {sConfig.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                {formatDate(timesheet.weekStart)} &mdash; {formatDate(weekEndFrom(timesheet.weekStart))}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                {timesheet.totalHours} total hours
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className={labelClasses}>Entries</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {timesheet.entries.length}
            </p>
          </div>
        </div>
      </div>

      {/* ── Manager Comment (if rejected) ── */}
      {timesheet.status === "rejected" && timesheet.managerComment && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-rose-100 dark:bg-rose-500/10 p-2">
              <MessageSquare className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className={`${labelClasses} mb-1`}>Manager Comment</p>
              <p className="text-sm text-rose-700 dark:text-rose-300">
                {timesheet.managerComment}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Entries ── */}
      <div>
        <p className={`${labelClasses} mb-3`}>Timesheet Entries</p>

        {timesheet.entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-16 px-4 text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No entries recorded for this week
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table ── */}
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Project</th>
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Task</th>
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Activity</th>
                    {DAY_LABELS.map((d) => (
                      <th key={d} className={`${labelClasses} px-3 py-3 text-center`}>
                        {d}
                      </th>
                    ))}
                    <th className={`${labelClasses} px-4 py-3 text-center`}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {timesheet.entries.map((entry, idx) => {
                    const rowTotal = getRowTotal(entry.hours);
                    return (
                      <tr
                        key={idx}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {getProjectName(entry)}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {entry.task}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {entry.activityType}
                          </span>
                        </td>
                        {entry.hours.map((h, i) => (
                          <td
                            key={i}
                            className={`px-3 py-4 text-center text-sm ${
                              h > 0
                                ? "font-medium text-gray-700 dark:text-gray-300"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                          >
                            {h > 0 ? h : "-"}
                          </td>
                        ))}
                        <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">
                          {rowTotal}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Cards ── */}
            <div className="space-y-3 lg:hidden">
              {timesheet.entries.map((entry, idx) => {
                const rowTotal = getRowTotal(entry.hours);
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {getProjectName(entry)}
                      </p>
                      <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {entry.activityType}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {entry.task}
                    </p>

                    {/* 7-day grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {DAY_LABELS.map((d, i) => (
                        <div key={d} className="text-center">
                          <p className="text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500 mb-1">
                            {d}
                          </p>
                          <div
                            className={`rounded-lg py-1.5 text-sm font-semibold ${
                              entry.hours[i] > 0
                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                                : "bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600"
                            }`}
                          >
                            {entry.hours[i] > 0 ? entry.hours[i] : "-"}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {rowTotal}h total
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
