import { useState, useEffect, useMemo } from "react";
import { BarChart3, Users, Clock, CalendarDays } from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { userApi } from "../../api/userApi";
import type { User, WeeklyTimesheetData } from "../../types";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

function mondayOf(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface AggRow {
  userId: string;
  name: string;
  department: string;
  totalHours: number;
  weeksSubmitted: number;
}

export default function AdminTimesheetReports() {
  const [startDate, setStartDate] = useState(() => {
    const d = mondayOf(new Date());
    d.setDate(d.getDate() - 28);
    return fmt(d);
  });
  const [endDate, setEndDate] = useState(() => fmt(new Date()));
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState<User[]>([]);
  const [rows, setRows] = useState<WeeklyTimesheetData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    userApi
      .getAll({ limit: 500 })
      .then((r) => setEmployees(r.data.data))
      .catch(() => {});
  }, []);

  const fetchData = () => {
    setLoading(true);
    const params: Record<string, string | number> = { limit: 500, startDate, endDate };
    if (employeeId) params.userId = employeeId;
    weeklyTimesheetApi
      .getAll(params)
      .then((r) => setRows(r.data.data))
      .catch(() => toast.error("Failed to load report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, employeeId]);

  const aggregated = useMemo<AggRow[]>(() => {
    const map = new Map<string, AggRow>();
    rows.forEach((ts) => {
      const user = typeof ts.userId === "object" ? ts.userId : null;
      const uid = user ? user._id : String(ts.userId);
      const existing = map.get(uid);
      if (existing) {
        existing.totalHours += ts.totalHours;
        if (ts.status === "submitted" || ts.status === "approved") existing.weeksSubmitted += 1;
      } else {
        map.set(uid, {
          userId: uid,
          name: user ? user.name : uid,
          department: user?.department || "—",
          totalHours: ts.totalHours,
          weeksSubmitted: ts.status === "submitted" || ts.status === "approved" ? 1 : 0,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [rows]);

  const totalHours = aggregated.reduce((s, r) => s + r.totalHours, 0);
  const totalWeeks = aggregated.reduce((s, r) => s + r.weeksSubmitted, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Timesheet Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Aggregated timesheet hours by employee
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`w-full sm:w-auto ${inputCls}`}
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`w-full sm:w-auto ${inputCls}`}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Employee
          </label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className={`w-full ${inputCls}`}
          >
            <option value="">All Employees</option>
            {employees.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {aggregated.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Employees", value: aggregated.length, icon: Users, color: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-500/20" },
            { label: "Total Hours", value: totalHours.toFixed(1), icon: Clock, color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/20" },
            { label: "Weeks Submitted", value: totalWeeks, icon: CalendarDays, color: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-500/20" },
            { label: "Avg Hours", value: aggregated.length ? (totalHours / aggregated.length).toFixed(1) : "0", icon: BarChart3, color: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/20" },
          ].map((c) => (
            <div
              key={c.label}
              className={`rounded-xl border ${c.border} bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <c.icon className={`h-5 w-5 ${c.color}`} />
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table / Cards */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400">
          Loading...
        </div>
      ) : aggregated.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
          No timesheet data found for the selected range.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Department
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total Hours
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Weeks Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {aggregated.map((r) => (
                  <tr
                    key={r.userId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.department}</td>
                    <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {r.totalHours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {r.weeksSubmitted}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {aggregated.map((r) => (
              <div
                key={r.userId}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
              >
                <p className="font-semibold text-gray-900 dark:text-white">{r.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{r.department}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: "Total Hours", v: `${r.totalHours.toFixed(1)}h`, c: "text-indigo-600 dark:text-indigo-400" },
                    { l: "Weeks", v: r.weeksSubmitted, c: "text-emerald-600 dark:text-emerald-400" },
                  ].map((d) => (
                    <div
                      key={d.l}
                      className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center"
                    >
                      <p className="text-[10px] uppercase text-gray-400 dark:text-gray-500">{d.l}</p>
                      <p className={`text-sm font-bold ${d.c}`}>{d.v}</p>
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
