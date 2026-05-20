import { useState, useEffect, useRef } from "react";
import { LogIn, LogOut, Clock, Calendar, Timer, X, Users, AlertTriangle, CheckCircle2, UserX, Power, Loader2, Flame, Sparkles } from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import { userApi } from "../../api/userApi";
import { leaveApi } from "../../api/leaveApi";
import { useAuth } from "../../context/AuthContext";
import { useCompany } from "../../context/CompanyContext";
import type { AttendanceRecord, Pagination, User, LiveStatusData, LiveEmployee } from "../../types";

function formatHHMMTo12h(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return hhmm;
  const h24 = Number(m[1]);
  const min = m[2];
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min} ${period}`;
}
import toast from "react-hot-toast";
import AttendanceCalendar from "../attendance-calendar/AttendanceCalendar";
import { fmtHours } from "../../utils/format";

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
  const { attendancePolicy } = useCompany();
  const autoClockOutLabel = formatHHMMTo12h(attendancePolicy.autoClockOutTime);
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
  // Premium "My Attendance" extras
  const [weekDayStatus, setWeekDayStatus] = useState<(string | undefined)[]>([]); // Mon..Sun
  const [monthCounts, setMonthCounts] = useState({ present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0 });
  const [streak, setStreak] = useState(0);
  const [employees, setEmployees] = useState<User[]>([]);
  const [autoClockOut, setAutoClockOut] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
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

  const toggleAutoClockOut = async () => {
    const next = !autoClockOut;
    setAutoClockOut(next);
    setPrefSaving(true);
    try {
      await attendanceApi.updatePreferences(next);
      toast.success(next ? "Auto clock-out enabled" : "Auto clock-out disabled");
    } catch {
      setAutoClockOut(!next); // revert
    } finally {
      setPrefSaving(false);
    }
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

  useEffect(() => {
    fetchToday();
    attendanceApi
      .getPreferences()
      .then((r) => setAutoClockOut(r.data.data?.autoClockOutEnabled ?? true))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month

    Promise.all([
      attendanceApi.getMyHistory({ month, limit: 200 }),
      leaveApi.getMyLeaves({ limit: 200 }),
    ]).then(([histRes, leaveRes]) => {
      const recs = histRes.data.data || [];
      const leaves = (leaveRes.data.data || []).filter((l) => l.status === "approved");

      // Start of current work week (Monday 00:00 local)
      const weekStart = new Date(now);
      const dow = now.getDay(); // 0=Sun..6=Sat
      const diffToMon = dow === 0 ? -6 : 1 - dow;
      weekStart.setDate(now.getDate() + diffToMon);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      let week = 0, month_ = 0;
      const counts = { present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0 };
      const dayMap: (string | undefined)[] = [undefined, undefined, undefined, undefined, undefined, undefined, undefined]; // Mon..Sun
      const leaveDaysAlreadyCounted = new Set<string>(); // ISO date strings of records with status="on-leave"

      for (const rec of recs) {
        const h = rec.totalHours || 0;
        month_ += h;
        const recDate = new Date(rec.date);
        if (recDate >= weekStart) {
          week += h;
          const idx = (recDate.getDay() + 6) % 7; // Mon=0..Sun=6
          dayMap[idx] = rec.status;
        }
        if (rec.status === "present")       counts.present++;
        else if (rec.status === "late")     counts.late++;
        else if (rec.status === "half-day") counts.halfDay++;
        else if (rec.status === "absent")   counts.absent++;
        else if (rec.status === "on-leave") {
          counts.onLeave++;
          leaveDaysAlreadyCounted.add(recDate.toISOString().slice(0, 10));
        }
      }

      // Overlay approved leaves on top of attendance records — covers days where
      // the auto-mark cron didn't create an on-leave row (early in the day, or
      // leaves approved after the cron ran). Skip dates already counted as on-leave
      // via attendance records to avoid double-counting.
      const isoKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      for (const lv of leaves) {
        const lStart = new Date(lv.startDate);
        const lEnd = new Date(lv.endDate);
        // Walk each day in the leave range
        for (let d = new Date(lStart); d <= lEnd; d.setDate(d.getDate() + 1)) {
          if (d < monthStart || d > monthEnd) continue; // only count days within this month
          const key = isoKey(d);
          if (leaveDaysAlreadyCounted.has(key)) continue;
          counts.onLeave++;
          leaveDaysAlreadyCounted.add(key);
          // Reflect in the weekly day strip too
          if (d >= weekStart && d <= weekEnd) {
            const idx = (d.getDay() + 6) % 7;
            if (!dayMap[idx]) dayMap[idx] = "on-leave";
          }
        }
      }

      setWeeklyHours(Math.round(week * 100) / 100);
      setMonthlyHours(Math.round(month_ * 100) / 100);
      setWeekDayStatus(dayMap);
      setMonthCounts(counts);

      // On-time streak: walk back from most recent record, count consecutive
      // "present" / "half-day" (i.e., non-late, non-absent) days. Stops at the
      // first late/absent or as soon as we run out of records.
      const sorted = [...recs].sort((a, b) => +new Date(b.date) - +new Date(a.date));
      let s = 0;
      for (const rec of sorted) {
        if (rec.status === "present" || rec.status === "half-day") s++;
        else break;
      }
      setStreak(s);
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

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* ── LEFT: identity + status ── */}
          <div className="min-w-0 flex-1 lg:max-w-[520px]">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Attendance & <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Time Tracking</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-indigo-200/70">
              Track your day, manage your shifts, and keep your timesheet in sync.
            </p>

            {/* Late badge */}
            {today?.status === "late" && (
              <div className="mt-4 flex w-fit items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-200 ring-1 ring-rose-400/30">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                Late — {today?.lateByMinutes ? fmtHours(today.lateByMinutes / 60) : "after office hours"}
              </div>
            )}
          </div>

          {/* ── RIGHT: action stack (timer + clock button + auto toggle) ── */}
          <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[360px]">
            {/* Live timer — only while clocked-in, big and prominent */}
            {today?.clockIn && !today?.clockOut && (
              <div className="flex items-baseline justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                  Elapsed
                </span>
                <span className="font-mono text-3xl font-bold tabular-nums tracking-wider sm:text-4xl">
                  {fmtTime(elapsed)}
                </span>
              </div>
            )}

            {/* Clock action button — fills the column width */}
            {!today?.clockIn ? (
              <button
                onClick={handleClockIn}
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 active:scale-[0.98] disabled:opacity-50"
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
                className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 ring-1 ring-white/15 transition-all hover:shadow-xl hover:shadow-rose-500/40 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="rounded-lg bg-white/15 p-1.5">
                  <LogOut className="h-4 w-4" />
                </span>
                Clock Out
              </button>
            ) : (
              <div className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500/15 px-6 py-3.5 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/30 backdrop-blur-sm">
                <span className="rounded-lg bg-emerald-500/25 p-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                Day Complete
              </div>
            )}

            {/* Auto clock-out toggle — compact, fills column width */}
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3.5 py-2.5 ring-1 ring-white/10 backdrop-blur-sm">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  autoClockOut
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30"
                    : "bg-gray-500/20 text-gray-300 ring-1 ring-gray-400/20"
                }`}
              >
                <Power className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  Auto clock-out at {autoClockOutLabel}
                </p>
                <p className="truncate text-[11px] leading-snug text-indigo-200/70">
                  {autoClockOut ? "Open shifts close automatically" : "Manual clock-out only"}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAutoClockOut}
                disabled={prefSaving}
                aria-pressed={autoClockOut}
                aria-label="Toggle auto clock-out"
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                  autoClockOut ? "bg-emerald-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md transition-transform ${
                    autoClockOut ? "translate-x-5" : "translate-x-0.5"
                  }`}
                >
                  {prefSaving && <Loader2 className="h-3 w-3 animate-spin text-gray-500" />}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Clock In / Clock Out Cards ── */}
      {(() => {
        const officeStartMin = (() => {
          const [h, m] = (attendancePolicy?.officeStartTime ?? "09:00").split(":").map(Number);
          return (h || 9) * 60 + (m || 0);
        })();
        const inDate = today?.clockIn ? new Date(today.clockIn) : null;
        const outDate = today?.clockOut ? new Date(today.clockOut) : null;
        const inMinutes = inDate ? inDate.getHours() * 60 + inDate.getMinutes() : null;
        const lateBy = inMinutes != null ? inMinutes - officeStartMin : null;
        const isLate = today?.status === "late" || (lateBy != null && lateBy > 0);
        const earlyBy = lateBy != null && lateBy < 0 ? Math.abs(lateBy) : 0;
        const stillWorking = !!today?.clockIn && !today?.clockOut;
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Clock In */}
            <div className={`${cardCls} relative overflow-hidden p-5`}>
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl ${
                  isLate
                    ? "bg-gradient-to-br from-amber-500 to-orange-600 opacity-[0.12]"
                    : inDate
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 opacity-[0.12]"
                      : "bg-gradient-to-br from-indigo-500 to-purple-600 opacity-[0.08]"
                }`}
              />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={labelCls}>Clock In</p>
                    <p className="mt-1.5 font-mono text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                      {inDate
                        ? inDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : <span className="text-gray-300 dark:text-gray-700">— : —</span>}
                    </p>
                    {inDate && (
                      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                        {inDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div
                    className={`rounded-xl p-2.5 shadow-lg ring-1 ring-white/10 ${
                      isLate
                        ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25"
                        : inDate
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
                          : "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/25"
                    }`}
                  >
                    <LogIn className="h-4 w-4 text-white" />
                  </div>
                </div>

                {/* Status row */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {!inDate ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        Not yet clocked in
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        Office starts at {formatHHMMTo12h(attendancePolicy?.officeStartTime ?? "09:00")}
                      </span>
                    </>
                  ) : isLate ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                        Late
                      </span>
                      <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        +{fmtHours((today?.lateByMinutes ?? lateBy ?? 0) / 60)} after {formatHHMMTo12h(attendancePolicy?.officeStartTime ?? "09:00")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                        <CheckCircle2 className="h-3 w-3" />
                        On time
                      </span>
                      {earlyBy > 0 && (
                        <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          {earlyBy} min early
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Clock Out */}
            <div className={`${cardCls} relative overflow-hidden p-5`}>
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl ${
                  outDate
                    ? "bg-gradient-to-br from-sky-500 to-blue-600 opacity-[0.12]"
                    : stillWorking
                      ? "bg-gradient-to-br from-rose-500 to-pink-600 opacity-[0.10]"
                      : "bg-gradient-to-br from-gray-400 to-gray-600 opacity-[0.06]"
                }`}
              />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={labelCls}>Clock Out</p>
                    <p className="mt-1.5 font-mono text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                      {outDate
                        ? outDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : stillWorking
                          ? <span className="text-rose-500 dark:text-rose-400">{fmtTime(elapsed)}</span>
                          : <span className="text-gray-300 dark:text-gray-700">— : —</span>}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      {outDate
                        ? `Worked ${today?.totalHours ? fmtHours(today.totalHours) : "—"} today`
                        : stillWorking
                          ? "Still active · live elapsed"
                          : "Day not started"}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-2.5 shadow-lg ring-1 ring-white/10 ${
                      outDate
                        ? "bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25"
                        : stillWorking
                          ? "bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25"
                          : "bg-gradient-to-br from-gray-400 to-gray-600 shadow-gray-500/20"
                    }`}
                  >
                    <LogOut className="h-4 w-4 text-white" />
                  </div>
                </div>

                {/* Status row */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {outDate ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Day complete
                      </span>
                      <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
                        {outDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                      </span>
                    </>
                  ) : stillWorking ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                        </span>
                        Live
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        Auto clock-out at <span className="font-semibold text-gray-700 dark:text-gray-300">{autoClockOutLabel}</span>
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      Not yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Premium "My Attendance" Stats ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* This Week — day strip + weekly progress */}
        <div className={`${cardCls} group relative overflow-hidden !p-0 transition-all duration-300 hover:-translate-y-0.5`}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-500 to-purple-600" />
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10 blur-2xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-110" />
          <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-[0.04] blur-2xl" />
          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className={labelCls}>This Week</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                  {fmtHours(weeklyHours)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  of <span className="font-semibold text-gray-700 dark:text-gray-300">40h</span> target
                </p>
              </div>
              <div className="relative rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
                <Timer className="h-4 w-4 text-white" strokeWidth={2.5} />
                <span aria-hidden className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-[width] duration-700"
                style={{ width: `${Math.min(100, (weeklyHours / 40) * 100)}%` }}
              />
            </div>

            {/* Day strip: Mon..Sun */}
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {["M", "T", "W", "T", "F", "S", "S"].map((dayLetter, i) => {
                const status = weekDayStatus[i];
                const dayDate = new Date();
                const dow = dayDate.getDay();
                const diffToMon = dow === 0 ? -6 : 1 - dow;
                dayDate.setDate(dayDate.getDate() + diffToMon + i);
                dayDate.setHours(0, 0, 0, 0);
                const now = new Date(); now.setHours(0, 0, 0, 0);
                const isToday = dayDate.getTime() === now.getTime();
                const isFuture = dayDate > now;
                const isWeekend = i >= 5;
                // Color
                let dotCls = "bg-gray-200 dark:bg-gray-700";
                let labelCol = "text-gray-400 dark:text-gray-500";
                if (status === "present")  { dotCls = "bg-emerald-500"; labelCol = "text-emerald-600 dark:text-emerald-400"; }
                else if (status === "late") { dotCls = "bg-amber-500";   labelCol = "text-amber-600 dark:text-amber-400"; }
                else if (status === "half-day") { dotCls = "bg-orange-500"; labelCol = "text-orange-600 dark:text-orange-400"; }
                else if (status === "absent")   { dotCls = "bg-rose-500";   labelCol = "text-rose-600 dark:text-rose-400"; }
                else if (status === "on-leave") { dotCls = "bg-sky-500";    labelCol = "text-sky-600 dark:text-sky-400"; }
                else if (isWeekend) { dotCls = "bg-gray-200/60 dark:bg-gray-700/40"; }
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-colors ${
                      isToday
                        ? "bg-indigo-50 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:ring-indigo-400/30"
                        : ""
                    }`}
                    title={dayDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${labelCol}`}>{dayLetter}</span>
                    <span className={`h-2 w-2 rounded-full ${dotCls} ${isToday && (status === "present" || status === "late") ? "animate-pulse" : ""}`} />
                    {isFuture && !isToday && <span className="text-[8px] text-gray-300 dark:text-gray-600">—</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* This Month — stacked status bar + counts */}
        <div className={`${cardCls} group relative overflow-hidden !p-0 transition-all duration-300 hover:-translate-y-0.5`}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-600" />
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-10 blur-2xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-110" />
          <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-[0.04] blur-2xl" />
          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className={labelCls}>This Month</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                  {fmtHours(monthlyHours)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {monthCounts.present + monthCounts.late + monthCounts.halfDay + monthCounts.onLeave}
                  </span>{" "}
                  days logged
                </p>
              </div>
              <div className="relative rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 shadow-lg shadow-emerald-500/30 ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
                <Calendar className="h-4 w-4 text-white" strokeWidth={2.5} />
                <span aria-hidden className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>

            {/* Stacked status bar */}
            {(() => {
              const tot = monthCounts.present + monthCounts.late + monthCounts.halfDay + monthCounts.absent + monthCounts.onLeave;
              const segs = [
                { v: monthCounts.present,  c: "bg-emerald-500" },
                { v: monthCounts.late,     c: "bg-amber-500" },
                { v: monthCounts.halfDay,  c: "bg-orange-500" },
                { v: monthCounts.onLeave,  c: "bg-sky-500" },
                { v: monthCounts.absent,   c: "bg-rose-500" },
              ];
              return (
                <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  {tot > 0 && segs.map((s, i) => (
                    s.v > 0 && (
                      <div
                        key={i}
                        className={`${s.c} h-full transition-[width] duration-700`}
                        style={{ width: `${(s.v / tot) * 100}%` }}
                      />
                    )
                  ))}
                </div>
              );
            })()}

            {/* Counts grid */}
            <div className="mt-4 grid grid-cols-5 gap-1.5 text-center">
              {[
                { v: monthCounts.present, c: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", l: "Present" },
                { v: monthCounts.late,    c: "text-amber-600 dark:text-amber-400",     dot: "bg-amber-500",   l: "Late" },
                { v: monthCounts.halfDay, c: "text-orange-600 dark:text-orange-400",   dot: "bg-orange-500",  l: "Half" },
                { v: monthCounts.onLeave, c: "text-sky-600 dark:text-sky-400",         dot: "bg-sky-500",     l: "Leave" },
                { v: monthCounts.absent,  c: "text-rose-600 dark:text-rose-400",       dot: "bg-rose-500",    l: "Absent" },
              ].map((s) => (
                <div key={s.l} className="rounded-lg border border-gray-200/60 bg-gray-50/60 px-1 py-1.5 dark:border-gray-800/60 dark:bg-gray-800/40">
                  <span className={`mx-auto mb-0.5 block h-1 w-1 rounded-full ${s.dot}`} />
                  <p className={`font-mono text-sm font-bold tabular-nums ${s.c}`}>{s.v}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className={`${cardCls} group relative overflow-hidden !p-0 transition-all duration-300 hover:-translate-y-0.5`}>
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-500 to-orange-600" />
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 opacity-[0.12] blur-2xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-110" />
          <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 opacity-[0.04] blur-2xl" />
          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className={labelCls}>On-time streak</p>
                <p className="mt-1 flex items-baseline gap-1.5 font-mono text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                  {streak}
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    day{streak === 1 ? "" : "s"}
                  </span>
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {streak === 0
                    ? "Clock in on time to start a streak"
                    : streak < 5
                      ? "Keep it going!"
                      : streak < 10
                        ? "On a roll 🔥"
                        : "Unstoppable!"}
                </p>
              </div>
              <div className="relative rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 shadow-lg shadow-amber-500/30 ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
                <Flame className="h-4 w-4 text-white" strokeWidth={2.5} />
                {streak >= 5 && (
                  <span aria-hidden className="absolute inset-0 rounded-xl bg-amber-400/30 blur-md" />
                )}
                <span aria-hidden className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>

            {/* Streak progress towards milestones */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-[width] duration-700"
                style={{ width: `${Math.min(100, (streak / 10) * 100)}%` }}
              />
            </div>

            {/* Milestone chips */}
            <div className="mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
              {[
                { n: 3,  label: "Spark" },
                { n: 5,  label: "Fire" },
                { n: 10, label: "Blaze" },
              ].map((m) => {
                const hit = streak >= m.n;
                return (
                  <span
                    key={m.n}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors ${
                      hit
                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25"
                        : "bg-gray-100 text-gray-400 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:ring-gray-700"
                    }`}
                  >
                    {hit && <Sparkles className="h-2.5 w-2.5" />}
                    {m.n}d {m.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
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
                        <td className="px-4 py-3 font-semibold tracking-tight text-gray-900 dark:text-white">{emp.totalHours ? fmtHours(emp.totalHours) : "—"}</td>
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
                    <MiniTile label="Hours" value={emp.totalHours ? fmtHours(emp.totalHours) : "—"} accent />
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
                        <td className="px-4 py-3 font-semibold tracking-tight text-gray-900 dark:text-white">{r.totalHours ? fmtHours(r.totalHours) : "—"}</td>
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
                    <MiniTile label="Hours" value={r.totalHours ? fmtHours(r.totalHours) : "—"} accent />
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
