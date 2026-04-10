import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import type { LiveStatusData, LiveEmployee } from "../../types";

const liveStyles: Record<string, { bg: string; dot: string; label: string; pulse: boolean }> = {
  "clocked-in": { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500", label: "Logged In", pulse: true },
  late: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-500", label: "Late Login", pulse: true },
  "clocked-out": { bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", dot: "bg-blue-500", label: "Logged Out", pulse: false },
  "not-marked": { bg: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400", dot: "bg-gray-400", label: "Not Marked", pulse: false },
  absent: { bg: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400", dot: "bg-rose-500", label: "Absent", pulse: false },
};

type ViewTab = "all" | "present" | "absent";

export default function TeamAttendance() {
  const [liveData, setLiveData] = useState<LiveStatusData | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [viewTab, setViewTab] = useState<ViewTab>("all");

  const fetchData = () => {
    attendanceApi.getLiveStatus().then((r) => {
      setLiveData(r.data.data ?? null);
      const depts = [...new Set((r.data.data?.employees || []).map((e: LiveEmployee) => e.department).filter(Boolean))] as string[];
      setDepartments(depts);
    }).catch(() => { /* interceptor */ });
  };

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 30000); return () => clearInterval(id); }, []);

  const absentStatuses = ["not-marked"];
  const presentStatuses = ["clocked-in", "late", "clocked-out"];

  const absentCount = useMemo(() => (liveData?.employees || []).filter((e) => absentStatuses.includes(e.liveStatus)).length, [liveData]);

  const filtered = (liveData?.employees || [])
    .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()))
    .filter((e) => !deptFilter || e.department === deptFilter)
    .filter((e) => {
      if (viewTab === "absent") return absentStatuses.includes(e.liveStatus);
      if (viewTab === "present") return presentStatuses.includes(e.liveStatus);
      return true;
    });

  const fmtClock = (d: string | null) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Attendance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Real-time view of your team's attendance today</p>
      </div>

      {/* Summary */}
      {liveData?.summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Logged In", value: liveData.summary.clockedIn, color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/20" },
            { label: "Late Login", value: liveData.summary.late, color: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/20" },
            { label: "Logged Out", value: liveData.summary.clockedOut, color: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-500/20" },
            { label: "Not Marked", value: liveData.summary.notMarked, color: "text-gray-500 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700" },
            { label: "Absent", value: absentCount, color: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-500/20" },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border ${c.border} bg-white dark:bg-gray-900 p-4 text-center`}>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* View Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800/60 p-1 w-fit">
        {([
          { key: "all" as ViewTab, label: "All", count: liveData?.employees.length ?? 0 },
          { key: "present" as ViewTab, label: "Present", count: (liveData?.employees || []).filter((e) => presentStatuses.includes(e.liveStatus)).length },
          { key: "absent" as ViewTab, label: "Absent", count: absentCount },
        ]).map((t) => (
          <button key={t.key} onClick={() => setViewTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${viewTab === t.key ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
            {t.label} <span className="ml-1 text-xs opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team members..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500">
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Dept</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">In</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Out</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No team members found.</td></tr>
            ) : filtered.map((emp) => {
              const s = liveStyles[emp.liveStatus] || liveStyles["not-marked"];
              return (
                <tr key={emp._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">{emp.name?.charAt(0).toUpperCase()}</div>
                      <div><p className="font-medium text-gray-900 dark:text-white">{emp.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{emp.department || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />{s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtClock(emp.clockIn)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtClock(emp.clockOut)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{emp.totalHours ? `${emp.totalHours}h` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400">No team members found.</div>
        ) : filtered.map((emp) => {
          const s = liveStyles[emp.liveStatus] || liveStyles["not-marked"];
          return (
            <div key={emp._id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">{emp.name?.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0"><p className="truncate font-semibold text-gray-900 dark:text-white">{emp.name}</p><p className="truncate text-xs text-gray-500 dark:text-gray-400">{emp.department || "No Dept"}</p></div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />{s.label}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[{ l: "In", v: fmtClock(emp.clockIn) }, { l: "Out", v: fmtClock(emp.clockOut) }, { l: "Hours", v: emp.totalHours ? `${emp.totalHours}h` : "—" }].map((d) => (
                  <div key={d.l} className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center">
                    <p className="text-[10px] uppercase text-gray-400 dark:text-gray-500">{d.l}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.v}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Auto-refreshes every 30 seconds</p>
    </div>
  );
}
