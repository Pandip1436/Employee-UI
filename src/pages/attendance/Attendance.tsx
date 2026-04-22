import { useState, useEffect, useRef } from "react";
import { LogIn, LogOut, Clock, Calendar, Timer, X, Activity, Users, AlertTriangle, CheckCircle2, UserX } from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import { userApi } from "../../api/userApi";
import { useAuth } from "../../context/AuthContext";
import type { AttendanceRecord, Pagination, User, LiveStatusData, LiveEmployee } from "../../types";
import toast from "react-hot-toast";
import AttendanceCalendar from "../attendance-calendar/AttendanceCalendar";

const statusStyle: Record<string, { bg: string; dot: string; label: string }> = {
  present: { bg: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20", dot: "bg-emerald-500", label: "Present" },
  absent: { bg: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20", dot: "bg-rose-500", label: "Absent" },
  late: { bg: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20", dot: "bg-amber-500", label: "Late" },
  "half-day": { bg: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20", dot: "bg-orange-500", label: "Half Day" },
  "on-leave": { bg: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20", dot: "bg-sky-500", label: "On Leave" },
};

const liveStyles: Record<string, { bg: string; dot: string; label: string; pulse: boolean }> = {
  "clocked-in": { bg: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20", dot: "bg-emerald-500", label: "Logged In", pulse: true },
  late: { bg: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20", dot: "bg-amber-500", label: "Late Login", pulse: true },
  "clocked-out": { bg: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20", dot: "bg-sky-500", label: "Logged Out", pulse: false },
  "not-marked": { bg: "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/20", dot: "bg-gray-400", label: "Not Marked", pulse: false },
};

const inputCls = "rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const cardCls = "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

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

      {/* ── Hero Clock Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Attendance & <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Time Tracking</span>
            </h1>

            {/* Live timer */}
            {today?.clockIn && !today?.clockOut && (
              <div className="mt-4 inline-flex items-baseline gap-2 rounded-2xl bg-white/5 px-4 py-2.5 ring-1 ring-white/10 backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Elapsed</span>
                <span className="font-mono text-3xl font-bold tracking-wider sm:text-4xl">{fmtTime(elapsed)}</span>
              </div>
            )}

            {/* Time chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                <LogIn className="h-3.5 w-3.5 text-indigo-200" />
                <span className="text-indigo-200/80">In</span>
                <span className="font-semibold">{fmtClock(today?.clockIn ?? null)}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                <LogOut className="h-3.5 w-3.5 text-indigo-200" />
                <span className="text-indigo-200/80">Out</span>
                <span className="font-semibold">{fmtClock(today?.clockOut ?? null)}</span>
              </div>
              {today?.totalHours != null && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                  <Timer className="h-3.5 w-3.5 text-indigo-200" />
                  <span className="text-indigo-200/80">Total</span>
                  <span className="font-semibold">{today.totalHours}h</span>
                </div>
              )}
            </div>

            {/* Late badge */}
            {today?.status === "late" && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-200 ring-1 ring-rose-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                Late — {today?.lateByMinutes ? `${today?.lateByMinutes} min` : "after office hours"}
              </div>
            )}
          </div>

          {/* Clock button */}
          <div className="shrink-0">
            {!today?.clockIn ? (
              <button
                onClick={handleClockIn}
                disabled={loading}
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5">
                  <LogIn className="h-4 w-4 text-white" />
                </span>
                Clock In
              </button>
            ) : !today?.clockOut ? (
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 ring-1 ring-white/15 transition-all hover:shadow-xl hover:shadow-rose-500/40 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="rounded-lg bg-white/15 p-1.5">
                  <LogOut className="h-4 w-4" />
                </span>
                Clock Out
              </button>
            ) : (
              <div className="inline-flex items-center gap-2.5 rounded-2xl bg-emerald-500/15 px-6 py-3.5 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/30 backdrop-blur-sm">
                <span className="rounded-lg bg-emerald-500/25 p-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                Day Complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Timer, label: "Today's Hours", value: today?.totalHours ? `${today.totalHours}h` : today?.clockIn ? fmtTime(elapsed) : "—", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10", ring: "ring-indigo-500/10 dark:ring-indigo-400/20" },
          { icon: Calendar, label: "Status", value: today?.status ? statusStyle[today.status]?.label || today.status : "Not Marked", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", ring: "ring-emerald-500/10 dark:ring-emerald-400/20" },
          { icon: Activity, label: "Clock In", value: fmtClock(today?.clockIn ?? null), color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-500/10", ring: "ring-sky-500/10 dark:ring-sky-400/20" },
          { icon: Clock, label: "Clock Out", value: fmtClock(today?.clockOut ?? null), color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10", ring: "ring-purple-500/10 dark:ring-purple-400/20" },
          { icon: Timer, label: "Weekly Hours", value: `${weeklyHours}h`, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", ring: "ring-amber-500/10 dark:ring-amber-400/20" },
          { icon: Calendar, label: "Monthly Hours", value: `${monthlyHours}h`, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", ring: "ring-rose-500/10 dark:ring-rose-400/20" },
        ].map((s) => (
          <div key={s.label} className={`${cardCls} p-4`}>
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ring-1 ${s.bg} ${s.ring}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className={labelCls}>{s.label}</p>
                <p className="mt-0.5 truncate text-base font-bold capitalize tracking-tight text-gray-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
        {(canViewAll ? (["my", "calendar", "all", "live", "absent"] as const) : (["my", "calendar"] as const)).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition-all sm:flex-none ${
              tab === t
                ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
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
                { label: "Logged In", value: liveData.summary.clockedIn, icon: Users, gradient: "from-emerald-500 to-teal-600" },
                { label: "Late Login", value: liveData.summary.late, icon: AlertTriangle, gradient: "from-amber-500 to-orange-600" },
                { label: "Logged Out", value: liveData.summary.clockedOut, icon: CheckCircle2, gradient: "from-sky-500 to-blue-600" },
                { label: "Not Marked", value: liveData.summary.notMarked, icon: Clock, gradient: "from-gray-500 to-gray-600" },
              ].map((c) => (
                <div key={c.label} className={`${cardCls} group relative overflow-hidden p-4`}>
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${c.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
                  />
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className={labelCls}>{c.label}</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{c.value}</p>
                    </div>
                    <div className={`rounded-xl bg-gradient-to-br ${c.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                      <c.icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Desktop table */}
          <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <tr>
                    {["Employee", "Dept", "Status", "In", "Out", "Hours"].map((h) => (
                      <th key={h} className={`px-4 py-3 ${labelCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {!liveData?.employees?.length ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">No employees found.</td></tr>
                  ) : liveData.employees.map((emp: LiveEmployee) => {
                    const s = liveStyles[emp.liveStatus] || liveStyles["not-marked"];
                    return (
                      <tr key={emp._id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={emp.name} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{emp.department || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />{s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{emp.clockIn ? fmtClock(emp.clockIn) : "—"}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{emp.clockOut ? fmtClock(emp.clockOut) : "—"}</td>
                        <td className="px-4 py-3 font-semibold tracking-tight text-gray-900 dark:text-white">{emp.totalHours ? `${emp.totalHours}h` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards for live status */}
          <div className="space-y-3 md:hidden">
            {!liveData?.employees?.length ? (
              <div className={`${cardCls} py-12 text-center text-sm text-gray-400 dark:text-gray-500`}>No employees found.</div>
            ) : liveData.employees.map((emp: LiveEmployee) => {
              const s = liveStyles[emp.liveStatus] || liveStyles["not-marked"];
              return (
                <div key={emp._id} className={`${cardCls} p-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={emp.name} size="lg" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{emp.department || "No Dept"}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />{s.label}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MiniTile label="In" value={emp.clockIn ? fmtClock(emp.clockIn) : "—"} />
                    <MiniTile label="Out" value={emp.clockOut ? fmtClock(emp.clockOut) : "—"} />
                    <MiniTile label="Hours" value={emp.totalHours ? `${emp.totalHours}h` : "—"} accent />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Auto-refreshes every 30 seconds
          </p>
        </div>
      )}

      {/* ── Admin Filters ── */}
      {canViewAll && tab === "all" && (
        <div className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
          <div className="w-full sm:w-auto">
            <label className={`mb-1.5 block ${labelCls}`}>Date</label>
            <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setPage(1); }} className={`w-full sm:w-auto ${inputCls}`} />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className={`mb-1.5 block ${labelCls}`}>Employee</label>
            <select value={filterUserId} onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }} className={`w-full ${inputCls}`}>
              <option value="">All Employees</option>
              {employees.map((u) => (<option key={u._id} value={u._id}>{u.name}</option>))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className={`mb-1.5 block ${labelCls}`}>Status</label>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className={`w-full sm:w-auto ${inputCls}`}>
              <option value="">All Status</option>
              <option value="present">Present</option><option value="late">Late</option><option value="half-day">Half Day</option><option value="absent">Absent</option><option value="on-leave">On Leave</option>
            </select>
          </div>
          {(filterDate || filterUserId || filterStatus) && (
            <button
              onClick={() => { setFilterDate(""); setFilterUserId(""); setFilterStatus(""); setPage(1); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* ── Today Absents ── */}
      {tab === "absent" && canViewAll && (
        <div className={`${cardCls} overflow-hidden p-0`}>
          <div className="flex items-center gap-3 border-b border-gray-200/70 bg-gray-50/60 px-5 py-4 dark:border-gray-800/80 dark:bg-gray-800/40">
            <div className="rounded-lg bg-rose-50 p-2 ring-1 ring-rose-500/10 dark:bg-rose-500/10 dark:ring-rose-400/20">
              <UserX className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Absent Today — {liveData?.employees.filter((e) => e.status === "absent").length ?? 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
          {(() => {
            const absents = liveData?.employees.filter((e) => e.status === "absent") ?? [];
            if (absents.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <div className="rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 p-3 ring-1 ring-emerald-500/10 dark:from-emerald-500/20 dark:to-emerald-500/5 dark:ring-emerald-400/20">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">All clear!</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">No absent employees today</p>
                </div>
              );
            }
            return (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {absents.map((emp) => (
                  <li key={emp._id} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    <Avatar name={emp.name} palette="rose" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{emp.email}{emp.department ? ` · ${emp.department}` : ""}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Absent
                    </span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      )}

      {/* ── My Status Filter ── */}
      {tab === "my" && (
        <div className="flex flex-wrap gap-1.5">
          {(["all", "present", "late", "half-day", "absent"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setMyStatusFilter(s)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                myStatusFilter === s
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm shadow-indigo-500/30 ring-1 ring-white/10"
                  : "border border-gray-200/70 bg-white/80 text-gray-600 shadow-sm hover:border-gray-300 hover:bg-white dark:border-gray-800/80 dark:bg-gray-900/80 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              {s === "all" ? "All" : s.replace("-", " ")}
            </button>
          ))}
        </div>
      )}

      {/* ── Records ── */}
      {tab !== "live" && tab !== "absent" && tab !== "calendar" && (
        <>
          {/* Desktop table */}
          <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <tr>
                    {tab === "all" && <th className={`px-4 py-3 ${labelCls}`}>Employee</th>}
                    {["Date", "Clock In", "Clock Out", "Hours", "Status"].map((h) => (
                      <th key={h} className={`px-4 py-3 ${labelCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={tab === "all" ? 6 : 5} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                            <Calendar className="h-5 w-5 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">No records found</p>
                        </div>
                      </td>
                    </tr>
                  ) : records.map((r) => {
                    const s = statusStyle[r.status] || statusStyle.present;
                    return (
                      <tr key={r._id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                        {tab === "all" && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={(r.userId as User)?.name || "?"} />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-900 dark:text-white">{(r.userId as User)?.name || "—"}</p>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{(r.userId as User)?.department || ""}</p>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtClock(r.clockIn)}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtClock(r.clockOut)}</td>
                        <td className="px-4 py-3 font-semibold tracking-tight text-gray-900 dark:text-white">{r.totalHours ? `${r.totalHours}h` : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {records.length === 0 ? (
              <div className={`${cardCls} flex flex-col items-center gap-2 py-12 text-center`}>
                <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No records found</p>
              </div>
            ) : records.map((r) => {
              const s = statusStyle[r.status] || statusStyle.present;
              return (
                <div key={r._id} className={`${cardCls} p-4`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {tab === "all" && (
                        <p className="truncate font-semibold text-gray-900 dark:text-white">{(r.userId as User)?.name || "—"}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(r.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MiniTile label="In" value={fmtClock(r.clockIn)} />
                    <MiniTile label="Out" value={fmtClock(r.clockOut)} />
                    <MiniTile label="Hours" value={r.totalHours ? `${r.totalHours}h` : "—"} accent />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className={`${cardCls} flex items-center justify-between p-3`}>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Helpers ── */
const PALETTES = [
  "from-indigo-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];

function paletteFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

function Avatar({ name, size = "md", palette }: { name: string; size?: "md" | "lg"; palette?: "rose" }) {
  const init = (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const sz = size === "lg" ? "h-10 w-10 text-sm" : "h-9 w-9 text-[11px]";
  const grad = palette === "rose" ? "from-rose-500 to-pink-600" : paletteFor(name || "?");
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 ${sz} ${grad}`}>
      {init}
    </div>
  );
}

function MiniTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-sm font-bold tracking-tight ${accent ? "text-indigo-600 dark:text-indigo-400" : "text-gray-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}
