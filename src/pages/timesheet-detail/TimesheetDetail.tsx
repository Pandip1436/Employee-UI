import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MessageSquare,
  FileText,
  Plane,
  PartyPopper,
  Lock,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { leaveApi } from "../../api/leaveApi";
import { holidayApi } from "../../api/holidayApi";
import type { WeeklyTimesheetData, TimesheetEntry, Project, LeaveRequest, Holiday, User } from "../../types";
import { fmtHours } from "../../utils/format";

const LEAVE_DAY_HOURS: number = 9;
const HOLIDAY_DAY_HOURS: number = 9;

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
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    if (!weekId) return;
    setLoading(true);
    weeklyTimesheetApi
      .getDetail(weekId)
      .then((res) => setTimesheet(res.data.data!))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weekId]);

  useEffect(() => {
    // Fetch own leaves (employees own view); admins/managers using the standalone
    // page can fall back to getAll. getMyLeaves works for the common case.
    leaveApi.getMyLeaves({ status: "approved", limit: 500 }).then((r) => setLeaves(r.data.data || [])).catch(() => {
      // Admin/manager viewing someone else's sheet: fall back to getAll filtered to that user
      if (timesheet?.userId) {
        const uid = typeof timesheet.userId === "object" ? (timesheet.userId as User)._id : String(timesheet.userId);
        leaveApi.getAll({ status: "approved", userId: uid, limit: 500 }).then((r) => setLeaves(r.data.data || [])).catch(() => {});
      }
    });
    const year = new Date().getFullYear();
    Promise.all([holidayApi.getAll(year - 1), holidayApi.getAll(year), holidayApi.getAll(year + 1)])
      .then(([a, b, c]) => setHolidays([...(a.data.data || []), ...(b.data.data || []), ...(c.data.data || [])]))
      .catch(() => {});
  }, [timesheet?.userId]);

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
          to="/timesheet"
          className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
        >
          Back to History
        </Link>
      </div>
    );
  }

  const sConfig = statusConfig[timesheet.status] || statusConfig.draft;

  // Approved leave + holiday overlay for this week.
  const overlay = (() => {
    const start = new Date(timesheet.weekStart);
    start.setHours(0, 0, 0, 0);
    const tsUid = typeof timesheet.userId === "object" ? (timesheet.userId as User)._id : String(timesheet.userId);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const leaveDayInfo = days.map((d) => {
      const dMs = d.getTime();
      const match = leaves.find((l) => {
        if (l.status !== "approved") return false;
        const lUid = typeof l.userId === "object" && l.userId !== null ? (l.userId as User)._id : String(l.userId);
        if (lUid && lUid !== tsUid) return false;
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        const sMs = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
        const eMs = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
        return dMs >= sMs && dMs <= eMs;
      });
      return match ? { type: match.type as string } : null;
    });
    const holidayDayInfo = days.map((d) => {
      const ymd = d.toLocaleDateString("en-CA");
      const match = holidays.find((h) => new Date(h.date).toLocaleDateString("en-CA") === ymd);
      return match ? { name: match.name } : null;
    });
    const leaveDayHours = leaveDayInfo.map((i) => (i ? LEAVE_DAY_HOURS : 0));
    const holidayDayHours = holidayDayInfo.map((i) => (i ? HOLIDAY_DAY_HOURS : 0));
    return {
      leaveDayInfo,
      holidayDayInfo,
      leaveDayHours,
      holidayDayHours,
      leaveTotal: leaveDayHours.reduce((s, h) => s + h, 0),
      holidayTotal: holidayDayHours.reduce((s, h) => s + h, 0),
    };
  })();
  const hasLeave = overlay.leaveTotal > 0;
  const hasHoliday = overlay.holidayTotal > 0;
  const leaveTypes = Array.from(new Set(overlay.leaveDayInfo.flatMap((i) => (i ? [i.type] : []))));
  const holidayNames = Array.from(new Set(overlay.holidayDayInfo.flatMap((i) => (i ? [i.name] : []))));
  const combinedTotal = timesheet.totalHours + overlay.leaveTotal + overlay.holidayTotal;

  return (
    <div className="space-y-6">
      {/* ── Back button ── */}
      <Link
        to="/timesheet"
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
              <span className="inline-flex items-center gap-1.5" title={(hasLeave || hasHoliday) ? `${fmtHours(timesheet.totalHours)} work + ${fmtHours(overlay.leaveTotal)} leave + ${fmtHours(overlay.holidayTotal)} holiday` : undefined}>
                <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                {fmtHours(combinedTotal)} total
              </span>
              {hasLeave && (
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/25">
                  <Plane className="h-3 w-3" />
                  {fmtHours(overlay.leaveTotal)} leave
                </span>
              )}
              {hasHoliday && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25">
                  <PartyPopper className="h-3 w-3" />
                  {fmtHours(overlay.holidayTotal)} holiday
                </span>
              )}
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

        {timesheet.entries.length === 0 && !hasLeave && !hasHoliday ? (
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
                  {hasLeave && (
                    <tr className="bg-sky-50/40 dark:bg-sky-500/[0.05]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 shadow-sm ring-1 ring-white/15">
                            <Plane className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">Leave</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-sky-700 dark:text-sky-300 capitalize">
                        {leaveTypes.join(", ") || "Time off"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-sky-100/80 dark:bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                          Time off
                        </span>
                      </td>
                      {overlay.leaveDayHours.map((h, i) => (
                        <td key={i} className="px-3 py-4 text-center">
                          {h > 0 ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-100/80 px-1.5 py-0.5 text-xs font-bold text-sky-700 ring-1 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/25">
                              <Lock className="h-2 w-2" />
                              {h}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-300 dark:text-gray-600">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-4 text-center text-sm font-bold text-sky-700 dark:text-sky-300">
                        {fmtHours(overlay.leaveTotal)}
                      </td>
                    </tr>
                  )}
                  {hasHoliday && (
                    <tr className="bg-amber-50/40 dark:bg-amber-500/[0.05]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-1.5 shadow-sm ring-1 ring-white/15">
                            <PartyPopper className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Holiday</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-amber-700 dark:text-amber-300 truncate" title={holidayNames.join(", ")}>
                        {holidayNames.join(", ") || "Holiday"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-amber-100/80 dark:bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          Day off
                        </span>
                      </td>
                      {overlay.holidayDayHours.map((h, i) => (
                        <td key={i} className="px-3 py-4 text-center">
                          {h > 0 ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100/80 px-1.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25">
                              <Lock className="h-2 w-2" />
                              {h}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-300 dark:text-gray-600">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-4 text-center text-sm font-bold text-amber-700 dark:text-amber-300">
                        {fmtHours(overlay.holidayTotal)}
                      </td>
                    </tr>
                  )}
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
                          {fmtHours(rowTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {(hasLeave || hasHoliday || timesheet.entries.length > 0) && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gradient-to-r from-indigo-50/40 via-transparent to-transparent dark:border-gray-800 dark:from-indigo-500/5">
                      <td colSpan={3} className={`${labelClasses} px-5 py-3 text-right`}>Day Totals</td>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const t = timesheet.entries.reduce((s, e) => s + (e.hours?.[i] || 0), 0)
                          + overlay.leaveDayHours[i]
                          + overlay.holidayDayHours[i];
                        return (
                          <td key={i} className={`px-3 py-3 text-center text-sm font-bold ${t > 0 ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                            {t > 0 ? t : "-"}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 px-2.5 py-0.5 text-sm font-bold tracking-tight text-white shadow-sm ring-1 ring-white/10">
                          {fmtHours(combinedTotal)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* ── Mobile Cards ── */}
            <div className="space-y-3 lg:hidden">
              {hasLeave && (
                <div className="rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50/60 via-white to-blue-50/30 p-4 dark:border-sky-500/20 dark:from-sky-500/10 dark:via-gray-900 dark:to-blue-500/5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 shadow-sm ring-1 ring-white/15">
                        <Plane className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                        Leave {leaveTypes.length > 0 && <span className="capitalize">· {leaveTypes.join(", ")}</span>}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-sky-600 dark:text-sky-400">
                      <Clock className="h-3.5 w-3.5" />
                      {fmtHours(overlay.leaveTotal)}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_LABELS.map((d, i) => {
                      const h = overlay.leaveDayHours[i];
                      return (
                        <div key={d} className="text-center">
                          <p className="text-[10px] font-medium uppercase text-sky-600/70 dark:text-sky-400/70 mb-1">{d}</p>
                          <div className={`rounded-lg py-1.5 text-sm font-semibold ${
                            h > 0
                              ? "bg-sky-100/80 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/25"
                              : "bg-gray-50 text-gray-300 dark:bg-gray-800 dark:text-gray-600"
                          }`}>
                            {h > 0 ? <span className="inline-flex items-center gap-0.5"><Lock className="h-2 w-2" />{h}</span> : "-"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {hasHoliday && (
                <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 p-4 dark:border-amber-500/20 dark:from-amber-500/10 dark:via-gray-900 dark:to-orange-500/5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-1.5 shadow-sm ring-1 ring-white/15">
                        <PartyPopper className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300" title={holidayNames.join(", ")}>
                        Holiday {holidayNames.length > 0 && `· ${holidayNames.join(", ")}`}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5" />
                      {fmtHours(overlay.holidayTotal)}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_LABELS.map((d, i) => {
                      const h = overlay.holidayDayHours[i];
                      return (
                        <div key={d} className="text-center">
                          <p className="text-[10px] font-medium uppercase text-amber-600/70 dark:text-amber-400/70 mb-1">{d}</p>
                          <div className={`rounded-lg py-1.5 text-sm font-semibold ${
                            h > 0
                              ? "bg-amber-100/80 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25"
                              : "bg-gray-50 text-gray-300 dark:bg-gray-800 dark:text-gray-600"
                          }`}>
                            {h > 0 ? <span className="inline-flex items-center gap-0.5"><Lock className="h-2 w-2" />{h}</span> : "-"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                      {fmtHours(rowTotal)} total
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
