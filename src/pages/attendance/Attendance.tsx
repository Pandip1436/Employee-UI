import { useState, useEffect, useRef } from "react";
import { LogIn, LogOut, Clock, Calendar, Timer, X, Activity, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import { userApi } from "../../api/userApi";
import { useAuth } from "../../context/AuthContext";
import type { AttendanceRecord, Pagination, User, LiveStatusData, LiveEmployee } from "../../types";
import toast from "react-hot-toast";
import AttendanceCalendar from "../attendance-calendar/AttendanceCalendar";

const statusStyle: Record<string, { bg: string; dot: string; label: string }> = {
  present: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500", label: "Present" },
  absent: { bg: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400", dot: "bg-red-500", label: "Absent" },
  late: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-500", label: "Late" },
  "half-day": { bg: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400", dot: "bg-orange-500", label: "Half Day" },
  "on-leave": { bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", dot: "bg-blue-500", label: "On Leave" },
};

const liveStyles: Record<string, { bg: string; dot: string; label: string; pulse: boolean }> = {
  "clocked-in": { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500", label: "Logged In", pulse: true },
  late: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-500", label: "Late Login", pulse: true },
  "clocked-out": { bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", dot: "bg-blue-500", label: "Logged Out", pulse: false },
  "not-marked": { bg: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400", dot: "bg-gray-400", label: "Not Marked", pulse: false },
};

const inputCls = "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export default function Attendance() {
  const { isAdmin, isManager } = useAuth();
  const canViewAll = isAdmin || isManager;
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"my" | "calendar" | "all" | "live" | "absent">("my");
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState<LiveStatusData | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [myStatusFilter, setMyStatusFilter] = useState<"all" | "present" | "late" | "half-day" | "absent">("all");
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [monthlyHours, setMonthlyHours] = useState(0);
  const [employees, setEmployees] = useState<User[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ──
  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };
  const fmtClock = (d: string | null) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  // ── Handlers ──
  const handleClockIn = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.clockIn();
      const data = res.data.data!;
      setToday(data);
      if (data.isLate) toast.error(`You're late by ${data.lateByMinutes} minutes!`, { duration: 5000 });
      else toast.success("Clocked in on time!");
      fetchHistory();
    } catch { /* handled by interceptor */ } finally { setLoading(false); }
  };
  const handleClockOut = async () => {
    setLoading(true);
    try { const r = await attendanceApi.clockOut(); setToday(r.data.data!); toast.success("Clocked out!"); fetchHistory(); }
    catch { /* handled by interceptor */ } finally { setLoading(false); }
  };

  // ── Fetchers ──
  const fetchToday = () => { attendanceApi.getMyToday().then((r) => setToday(r.data.data ?? null)).catch(() => {}); };
  const fetchHistory = () => { attendanceApi.getMyHistory({ page, limit: 10 }).then((r) => { setHistory(r.data.data); setPagination(r.data.pagination); }).catch(() => {}); };
  const fetchAll = () => {
    if (!canViewAll) return;
    const p: Record<string, string | number> = { page, limit: 10, sort: "-date" };
    if (filterDate) p.date = filterDate; if (filterUserId) p.userId = filterUserId; if (filterStatus) p.status = filterStatus;
    attendanceApi.getAll(p).then((r) => { setAllRecords(r.data.data); setPagination(r.data.pagination); }).catch(() => {});
  };
  const fetchLive = () => { if (canViewAll) attendanceApi.getLiveStatus().then((r) => setLiveData(r.data.data ?? null)).catch(() => {}); };

  useEffect(() => { fetchToday(); }, []);
  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    attendanceApi.getMyHistory({ month, limit: 200 }).then((r) => {
      const recs = r.data.data || [];
      // Start of current work week (Monday 00:00 local)
      const weekStart = new Date(now);
      const dow = now.getDay(); // 0=Sun..6=Sat
      const diffToMon = dow === 0 ? -6 : 1 - dow;
      weekStart.setDate(now.getDate() + diffToMon);
      weekStart.setHours(0, 0, 0, 0);
      let week = 0, month_ = 0;
      for (const rec of recs) {
        const h = rec.totalHours || 0;
        month_ += h;
        if (new Date(rec.date) >= weekStart) week += h;
      }
      setWeeklyHours(Math.round(week * 100) / 100);
      setMonthlyHours(Math.round(month_ * 100) / 100);
    }).catch(() => {});
  }, [today]);
  useEffect(() => { if (canViewAll) userApi.getAll({ limit: 200 }).then((r) => setEmployees(r.data.data)).catch(() => {}); }, [canViewAll]);
  useEffect(() => { if (tab === "my") fetchHistory(); else if (tab === "all") fetchAll(); else if (tab === "live" || tab === "absent") fetchLive(); /* calendar: self-contained */ }, [page, tab, filterDate, filterUserId, filterStatus]);
  useEffect(() => { if (tab !== "live") return; const id = setInterval(fetchLive, 30000); return () => clearInterval(id); }, [tab]);
  useEffect(() => {
    if (today?.clockIn && !today?.clockOut) {
      const start = new Date(today.clockIn).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick(); intervalRef.current = setInterval(tick, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else { setElapsed(0); }
  }, [today]);

  const records = tab === "my"
    ? (myStatusFilter === "all" ? history : history.filter((r) => r.status === myStatusFilter))
    : allRecords;

  return (
    <div className="space-y-6">

      {/* ━━━ Hero Clock Card ━━━ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-200">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Attendance & Time Tracking</h1>

            {/* Live timer */}
            {today?.clockIn && !today?.clockOut && (
              <p className="mt-3 font-mono text-4xl font-bold tracking-wider sm:text-5xl">{fmtTime(elapsed)}</p>
            )}

            {/* Time chips */}
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-lg bg-white/10 backdrop-blur-sm px-3 py-1.5 text-sm">
                <span className="text-indigo-200">In:</span> <strong>{fmtClock(today?.clockIn ?? null)}</strong>
              </div>
              <div className="rounded-lg bg-white/10 backdrop-blur-sm px-3 py-1.5 text-sm">
                <span className="text-indigo-200">Out:</span> <strong>{fmtClock(today?.clockOut ?? null)}</strong>
              </div>
              {today?.totalHours != null && (
                <div className="rounded-lg bg-white/10 backdrop-blur-sm px-3 py-1.5 text-sm">
                  <span className="text-indigo-200">Total:</span> <strong>{today.totalHours}h</strong>
                </div>
              )}
            </div>

            {/* Late badge */}
            {today?.status === "late" && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                Late — {today?.lateByMinutes ? `${today?.lateByMinutes} min` : "after office hours"}
              </div>
            )}
          </div>

          {/* Clock button */}
          <div className="shrink-0">
            {!today?.clockIn ? (
              <button onClick={handleClockIn} disabled={loading} className="flex items-center gap-2.5 rounded-xl bg-white px-6 py-4 text-base font-bold text-indigo-700 shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-100 disabled:opacity-50">
                <LogIn className="h-5 w-5" /> Clock In
              </button>
            ) : !today?.clockOut ? (
              <button onClick={handleClockOut} disabled={loading} className="flex items-center gap-2.5 rounded-xl bg-rose-500 px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-rose-600 hover:shadow-xl active:scale-100 disabled:opacity-50">
                <LogOut className="h-5 w-5" /> Clock Out
              </button>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl bg-white/10 backdrop-blur-sm px-6 py-4 text-base font-semibold">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" /> Day Complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ Quick Stats ━━━ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Timer, label: "Today's Hours", value: today?.totalHours ? `${today.totalHours}h` : today?.clockIn ? fmtTime(elapsed) : "—", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
          { icon: Calendar, label: "Status", value: today?.status ? statusStyle[today.status]?.label || today.status : "Not Marked", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { icon: Activity, label: "Clock In", value: fmtClock(today?.clockIn ?? null), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
          { icon: Clock, label: "Clock Out", value: fmtClock(today?.clockOut ?? null), color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" },
          { icon: Timer, label: "Weekly Hours", value: `${weeklyHours}h`, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
          { icon: Calendar, label: "Monthly Hours", value: `${monthlyHours}h`, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md dark:hover:shadow-gray-800/30">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="truncate text-base font-bold text-gray-900 dark:text-white capitalize">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ━━━ Tabs ━━━ */}
      <div className="flex overflow-x-auto gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 scrollbar-hide">
        {((canViewAll ? ["my", "calendar", "all", "live", "absent"] : ["my", "calendar"]) as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            className={`flex-1 sm:flex-none whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t === "my" ? "My Attendance" : t === "calendar" ? "Calendar" : t === "all" ? "All Employees" : t === "live" ? "Live Status" : "Today Absents"}
          </button>
        ))}
      </div>

      {/* ━━━ Calendar ━━━ */}
      {tab === "calendar" && <AttendanceCalendar />}

      {/* ━━━ Live Status ━━━ */}
      {tab === "live" && canViewAll && (
        <div className="space-y-4">
          {liveData?.summary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Logged In", value: liveData.summary.clockedIn, icon: Users, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20" },
                { label: "Late Login", value: liveData.summary.late, icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20" },
                { label: "Logged Out", value: liveData.summary.clockedOut, icon: CheckCircle2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/20" },
                { label: "Not Marked", value: liveData.summary.notMarked, icon: Clock, color: "text-gray-500 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-800", border: "border-gray-200 dark:border-gray-700" },
              ].map((c) => (
                <div key={c.label} className={`rounded-xl border ${c.border} bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md`}>
                  <div className="flex items-center justify-between">
                    <div className={`rounded-lg p-2 ${c.bg}`}><c.icon className={`h-4 w-4 ${c.color}`} /></div>
                    <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                  </div>
                  <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
                </div>
              ))}
            </div>
          )}

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
                {!liveData?.employees?.length ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">No employees found.</td></tr>
                ) : liveData.employees.map((emp: LiveEmployee) => {
                  const s = liveStyles[emp.liveStatus] || liveStyles["not-marked"];
                  return (
                    <tr key={emp._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">{emp.name?.charAt(0).toUpperCase()}</div>
                          <div className="min-w-0"><p className="truncate font-medium text-gray-900 dark:text-white">{emp.name}</p><p className="truncate text-xs text-gray-500 dark:text-gray-400">{emp.email}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{emp.department || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />{s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{emp.clockIn ? fmtClock(emp.clockIn) : "—"}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{emp.clockOut ? fmtClock(emp.clockOut) : "—"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{emp.totalHours ? `${emp.totalHours}h` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards for live status */}
          <div className="md:hidden space-y-3">
            {!liveData?.employees?.length ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">No employees found.</div>
            ) : liveData.employees.map((emp: LiveEmployee) => {
              const s = liveStyles[emp.liveStatus] || liveStyles["not-marked"];
              return (
                <div key={emp._id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">{emp.name?.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{emp.department || "No Dept"}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />{s.label}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">In</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{emp.clockIn ? fmtClock(emp.clockIn) : "—"}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Out</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{emp.clockOut ? fmtClock(emp.clockOut) : "—"}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Hours</p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{emp.totalHours ? `${emp.totalHours}h` : "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Auto-refreshes every 30 seconds</p>
        </div>
      )}

      {/* ━━━ Admin Filters ━━━ */}
      {canViewAll && tab === "all" && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="w-full sm:w-auto">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Date</label>
            <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setPage(1); }} className={`w-full sm:w-auto ${inputCls}`} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Employee</label>
            <select value={filterUserId} onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }} className={`w-full ${inputCls}`}>
              <option value="">All Employees</option>
              {employees.map((u) => (<option key={u._id} value={u._id}>{u.name}</option>))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</label>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className={`w-full sm:w-auto ${inputCls}`}>
              <option value="">All Status</option>
              <option value="present">Present</option><option value="late">Late</option><option value="half-day">Half Day</option><option value="absent">Absent</option><option value="on-leave">On Leave</option>
            </select>
          </div>
          {(filterDate || filterUserId || filterStatus) && (
            <button onClick={() => { setFilterDate(""); setFilterUserId(""); setFilterStatus(""); setPage(1); }}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* ━━━ Today Absents ━━━ */}
      {tab === "absent" && canViewAll && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="border-b border-gray-200 dark:border-gray-800 px-5 py-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Absent Today — {liveData?.employees.filter((e) => e.status === "absent").length ?? 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
          {(() => {
            const absents = liveData?.employees.filter((e) => e.status === "absent") ?? [];
            if (absents.length === 0) {
              return <div className="py-12 text-center text-gray-400 dark:text-gray-500">No absent employees today 🎉</div>;
            }
            return (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {absents.map((emp) => (
                  <li key={emp._id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                      {emp.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{emp.email}{emp.department ? ` · ${emp.department}` : ""}</p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">Absent</span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      )}

      {/* ━━━ My Status Filter ━━━ */}
      {tab === "my" && (
        <div className="flex flex-wrap gap-2">
          {(["all", "present", "late", "half-day", "absent"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setMyStatusFilter(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                myStatusFilter === s
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {s === "all" ? "All" : s.replace("-", " ")}
            </button>
          ))}
        </div>
      )}

      {/* ━━━ Records ━━━ */}
      {tab !== "live" && tab !== "absent" && tab !== "calendar" && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {tab === "all" && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</th>}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Clock In</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Clock Out</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hours</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {records.length === 0 ? (
                  <tr><td colSpan={tab === "all" ? 6 : 5} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">No records found.</td></tr>
                ) : records.map((r) => {
                  const s = statusStyle[r.status] || statusStyle.present;
                  return (
                    <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      {tab === "all" && (
                        <td className="px-4 py-3"><p className="font-medium text-gray-900 dark:text-white">{(r.userId as User)?.name || "—"}</p><p className="text-xs text-gray-500 dark:text-gray-400">{(r.userId as User)?.department || ""}</p></td>
                      )}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtClock(r.clockIn)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtClock(r.clockOut)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{r.totalHours ? `${r.totalHours}h` : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {records.length === 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">No records found.</div>
            ) : records.map((r) => {
              const s = statusStyle[r.status] || statusStyle.present;
              return (
                <div key={r._id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="min-w-0">
                      {tab === "all" && <p className="truncate font-semibold text-gray-900 dark:text-white">{(r.userId as User)?.name || "—"}</p>}
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(r.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">In</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtClock(r.clockIn)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Out</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtClock(r.clockOut)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Hours</p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{r.totalHours ? `${r.totalHours}h` : "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">Previous</button>
                <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
