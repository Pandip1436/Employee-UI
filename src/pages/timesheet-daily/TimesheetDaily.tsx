import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  Folder,
  FileText,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { WeeklyTimesheetData, TimesheetEntry, Project } from "../../types";

/* ─── Helpers ─── */
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

/** Given weekStart (Monday) and selected date, return the 0-based day index (Mon=0). */
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

const labelClasses =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

/* ─── Component ─── */
export default function TimesheetDaily() {
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

  /** Filter entries for selected day and group by project */
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

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Daily Timesheet
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View your timesheet entries for a specific day
          </p>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* ── Summary Card ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={labelClasses}>Selected Date</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {formatDateDisplay(selectedDate)}
              {dayLabel && (
                <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
                  ({dayLabel})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalDayHours}h
            </span>
            <span className="text-sm text-gray-400 dark:text-gray-500">total</span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
        </div>
      ) : dailyEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20 px-4 text-center">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
            <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No entries for this date
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Select a different date or log hours in your weekly timesheet
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table grouped by project ── */}
          <div className="hidden md:block space-y-4">
            {Array.from(groupedByProject.entries()).map(([projectName, entries]) => (
              <div
                key={projectName}
                className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              >
                <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-5 py-3">
                  <Folder className="h-4 w-4 text-indigo-500" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {projectName}
                  </p>
                  <span className="ml-auto rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {entries.reduce((s, e) => s + e.hours, 0)}h
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className={`${labelClasses} px-5 py-2.5 text-left`}>Task</th>
                      <th className={`${labelClasses} px-5 py-2.5 text-left`}>Activity Type</th>
                      <th className={`${labelClasses} px-5 py-2.5 text-right`}>Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {entries.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {entry.task}
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {entry.activityType}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                          {entry.hours}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* ── Mobile Cards ── */}
          <div className="space-y-4 md:hidden">
            {Array.from(groupedByProject.entries()).map(([projectName, entries]) => (
              <div key={projectName}>
                <div className="flex items-center gap-2 mb-2">
                  <Folder className="h-4 w-4 text-indigo-500" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {projectName}
                  </p>
                </div>
                <div className="space-y-2">
                  {entries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {entry.task}
                        </p>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {entry.hours}h
                        </span>
                      </div>
                      <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
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
