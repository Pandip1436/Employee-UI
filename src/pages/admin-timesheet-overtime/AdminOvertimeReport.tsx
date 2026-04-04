import { useState, useEffect } from "react";
import { AlertTriangle, Clock, Users, TrendingUp } from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { OvertimeEntry } from "../../types";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdminOvertimeReport() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 28);
    return fmt(d);
  });
  const [endDate, setEndDate] = useState(() => fmt(new Date()));
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    weeklyTimesheetApi
      .getOvertimeReport(startDate, endDate)
      .then((r) => setEntries(r.data.data || []))
      .catch(() => toast.error("Failed to load overtime report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const totalOvertime = entries.reduce((s, e) => s + e.overtime, 0);
  const uniqueEmployees = new Set(entries.map((e) => e.employee._id)).size;
  const maxOvertime = entries.length ? Math.max(...entries.map((e) => e.overtime)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overtime Report</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Employees who logged more than 40 hours in a week
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
      </div>

      {/* Summary Cards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "OT Instances", value: entries.length, icon: AlertTriangle, color: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-500/20" },
            { label: "Employees", value: uniqueEmployees, icon: Users, color: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-200 dark:border-indigo-500/20" },
            { label: "Total OT Hours", value: totalOvertime.toFixed(1), icon: Clock, color: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/20" },
            { label: "Max OT (week)", value: `${maxOvertime.toFixed(1)}h`, icon: TrendingUp, color: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-500/20" },
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
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
          No overtime entries found for the selected range.
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
                    Week
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total Hours
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Overtime
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {entries.map((e, i) => (
                  <tr
                    key={`${e.employee._id}-${e.weekStart}-${i}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{e.employee.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {e.employee.department || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(e.weekStart).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {e.totalHours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        +{e.overtime.toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {entries.map((e, i) => (
              <div
                key={`${e.employee._id}-${e.weekStart}-${i}`}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{e.employee.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {e.employee.department || "No department"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    +{e.overtime.toFixed(1)}h OT
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      l: "Week of",
                      v: new Date(e.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                      c: "text-gray-900 dark:text-white",
                    },
                    { l: "Total Hours", v: `${e.totalHours.toFixed(1)}h`, c: "text-indigo-600 dark:text-indigo-400" },
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
