import { useState, useEffect } from "react";
import {
  CalendarDays,
  BarChart3,
  Clock,
  Briefcase,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { ProjectTimeSummary } from "../../types";

/* ─── Helpers ─── */
const toInputDate = (d: Date) => d.toISOString().split("T")[0];

const getDefaultDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: toInputDate(start),
    endDate: toInputDate(now),
  };
};

const labelClasses =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

/* ─── Component ─── */
export default function TimesheetProjectSummary() {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [projects, setProjects] = useState<ProjectTimeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = () => {
    setLoading(true);
    weeklyTimesheetApi
      .getProjectSummary(startDate, endDate)
      .then((res) => setProjects(res.data.data ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [startDate, endDate]);

  const totalHours = projects.reduce((s, p) => s + p.totalHours, 0);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Project Summary
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Time allocation across projects for the selected period
          </p>
        </div>

        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* ── Stats Card ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className={labelClasses}>Total Projects</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                {projects.length}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-3">
              <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className={labelClasses}>Total Hours</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                {totalHours}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3">
              <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20 px-4 text-center">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
            <BarChart3 className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No project data for this period
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Adjust the date range to see project time summaries
          </p>
        </div>
      ) : (
        <>
          {/* ── Bar Chart ── */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
            <p className={`${labelClasses} mb-4`}>Hours by Project</p>
            <div className="h-80 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <BarChart
                  data={projects.map((p) => ({
                    name: p.projectName.length > 15 ? p.projectName.slice(0, 15) + "..." : p.projectName,
                    hours: p.totalHours,
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    className="text-gray-500 dark:text-gray-400"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-gray-500 dark:text-gray-400"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-gray-900, #111827)",
                      border: "1px solid var(--color-gray-700, #374151)",
                      borderRadius: "0.75rem",
                      fontSize: "0.875rem",
                    }}
                    labelStyle={{ color: "#f3f4f6" }}
                    itemStyle={{ color: "#818cf8" }}
                  />
                  <Bar dataKey="hours" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Project</th>
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Client</th>
                  <th className={`${labelClasses} px-5 py-3 text-right`}>Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {projects.map((project) => (
                  <tr
                    key={project.projectId}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {project.projectName}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {project.client}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {project.totalHours}h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="space-y-3 md:hidden">
            {projects.map((project) => (
              <div
                key={project.projectId}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {project.projectName}
                  </p>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {project.totalHours}h
                  </span>
                </div>
                <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {project.client}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
