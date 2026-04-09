import { useEffect, useState } from "react";
import { BarChart3, Send, Users } from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import toast from "react-hot-toast";

interface ComplianceRow {
  _id: string;
  name: string;
  email: string;
  department?: string;
  submitted: number;
  total: number;
  compliance: number;
}

export default function AdminTimesheetCompliance() {
  const [weeks, setWeeks] = useState(8);
  const [rows, setRows] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    weeklyTimesheetApi
      .getCompliance(weeks)
      .then((r) => setRows(r.data.data?.employees ?? []))
      .catch(() => toast.error("Failed to load compliance."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [weeks]);

  const sendReminders = async () => {
    setSending(true);
    try {
      const r = await weeklyTimesheetApi.sendReminders();
      toast.success(r.data.message || "Reminders sent.");
    } catch { toast.error("Failed to send reminders."); }
    finally { setSending(false); }
  };

  const colorFor = (pct: number) =>
    pct >= 90 ? "text-emerald-600 dark:text-emerald-400" :
    pct >= 70 ? "text-amber-600 dark:text-amber-400" :
    "text-rose-600 dark:text-rose-400";
  const barFor = (pct: number) =>
    pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-rose-500";

  const overall = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.compliance, 0) / rows.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" /> Timesheet Compliance
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">On-time submission rate over the last {weeks} weeks</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
            {[4, 8, 12, 26].map((w) => <option key={w} value={w}>{w} weeks</option>)}
          </select>
          <button onClick={sendReminders} disabled={sending} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Reminders"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Overall Compliance</p>
          <p className={`mt-1 text-3xl font-bold ${colorFor(overall)}`}>{overall}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Employees Tracked</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Users className="h-6 w-6 text-gray-400" />{rows.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Below 70%</p>
          <p className="mt-1 text-3xl font-bold text-rose-600 dark:text-rose-400">{rows.filter((r) => r.compliance < 70).length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Department</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Submitted</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-72">Compliance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No data.</td></tr>
            ) : rows.sort((a, b) => a.compliance - b.compliance).map((r) => (
              <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-white">{r.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{r.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.department || "—"}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.submitted} / {r.total}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className={`h-full ${barFor(r.compliance)} transition-all`} style={{ width: `${r.compliance}%` }} />
                    </div>
                    <span className={`min-w-[3rem] text-right font-bold text-sm ${colorFor(r.compliance)}`}>{r.compliance}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
