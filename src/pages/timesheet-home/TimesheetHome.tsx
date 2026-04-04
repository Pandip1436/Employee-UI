import { useState, useEffect } from "react";
import { Clock, FileCheck, AlertCircle, ArrowRight, Plus, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { WeeklyTimesheetData } from "../../types";

const statusStyle: Record<string, { bg: string; dot: string }> = {
  draft: { bg: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300", dot: "bg-gray-500" },
  submitted: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", dot: "bg-blue-500" },
  approved: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500" },
  rejected: { bg: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400", dot: "bg-rose-500" },
};

export default function TimesheetHome() {
  const [current, setCurrent] = useState<WeeklyTimesheetData | null>(null);
  const [recent, setRecent] = useState<WeeklyTimesheetData[]>([]);

  useEffect(() => {
    weeklyTimesheetApi.getCurrentWeek().then((r) => setCurrent(r.data.data ?? null)).catch(() => { /* interceptor */ });
    weeklyTimesheetApi.getHistory({ limit: 5 }).then((r) => setRecent(r.data.data)).catch(() => { /* interceptor */ });
  }, []);

  const fmtWeek = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-2xl font-bold sm:text-3xl">Timesheet</h1>
          <p className="mt-1 text-sm text-indigo-200">Track and manage your working hours</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/timesheet/weekly" className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-lg hover:scale-105 transition-all active:scale-100">
              <CalendarDays className="h-4 w-4" /> Weekly Grid
            </Link>
            <Link to="/timesheet/log" className="flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold hover:bg-white/25 transition-all">
              <Plus className="h-4 w-4" /> Quick Log
            </Link>
          </div>
        </div>
      </div>

      {/* Current Week Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "This Week", value: current ? `${current.totalHours}h` : "0h", icon: Clock, color: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-500/20" },
          { label: "Status", value: current?.status || "—", icon: FileCheck, color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/20" },
          { label: "Entries", value: current?.entries?.length || 0, icon: CalendarDays, color: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-500/20" },
          { label: "Pending", value: current?.status === "draft" ? "Yes" : "No", icon: AlertCircle, color: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.border} bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <p className={`text-xl font-bold capitalize ${s.color}`}>{s.value}</p>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Timesheets */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Recent Activity</h3>
          <Link to="/timesheet/history" className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View All <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No timesheets yet.</p>
        ) : (
          <div className="space-y-2.5">
            {recent.map((r) => {
              const s = statusStyle[r.status] || statusStyle.draft;
              return (
                <Link key={r._id} to={`/timesheet/${r._id}`} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 hover:shadow-md transition-all">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtWeek(r.weekStart)} — {fmtWeek(r.weekEnd)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.entries.length} entries</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{r.totalHours}h</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${s.bg}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{r.status}
                    </span>
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
