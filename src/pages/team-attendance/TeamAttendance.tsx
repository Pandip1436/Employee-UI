import { useState, useEffect, useMemo } from "react";
import {
  Search, Users, UserCheck, UserX, Clock, AlertTriangle, CheckCircle2,
  X, Filter, Calendar, CalendarDays as CalendarIcon, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp,
  ArrowDown, LayoutList, Rows3, Circle, MinusCircle, Moon,
} from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import type { LiveStatusData, LiveEmployee } from "../../types";
import { fmtHours } from "../../utils/format";
import { useCompany } from "../../context/CompanyContext";

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Shift a YYYY-MM-DD string by N days (local time). */
function shiftIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse "HH:MM" and return minutes since midnight. */
function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  if (isNaN(h) || isNaN(m)) return 9 * 60;
  return h * 60 + m;
}

type ActiveStatus = "online" | "away" | "dnd" | "offline";

const activeStatusConfig: Record<ActiveStatus, {
  label: string;
  short: string;
  dot: string;
  ring: string;
  badge: string;
  icon: typeof Circle;
}> = {
  online: {
    label: "Online",
    short: "Online",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    icon: Circle,
  },
  away: {
    label: "Away",
    short: "Away",
    dot: "bg-amber-500",
    ring: "ring-amber-500/30",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25",
    icon: Moon,
  },
  dnd: {
    label: "Do not disturb",
    short: "DND",
    dot: "bg-rose-500",
    ring: "ring-rose-500/30",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/25",
    icon: MinusCircle,
  },
  offline: {
    label: "Offline",
    short: "Offline",
    dot: "bg-gray-400 dark:bg-gray-500",
    ring: "ring-gray-400/30",
    badge: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600/30",
    icon: Circle,
  },
};

/** Inferred presence (used only as a fallback when the backend doesn't supply
 *  a user-set status, e.g. legacy users without the field populated). */
function inferActiveStatus(liveStatus: string): ActiveStatus {
  switch (liveStatus) {
    case "clocked-in":
    case "late":        return "online";
    case "clocked-out": return "away";
    default:            return "offline";
  }
}

/** Resolve the active status to show. Prefers the user's own-set `userStatus`,
 *  but downgrades to "offline" when there's no attendance activity today. */
function resolveActiveStatus(emp: LiveEmployee): ActiveStatus {
  // Hard signal: never show "online" for someone who hasn't shown up today.
  if (emp.liveStatus === "not-marked" || emp.liveStatus === "absent" || emp.liveStatus === "on-leave") {
    return "offline";
  }
  if (emp.userStatus) return emp.userStatus;
  return inferActiveStatus(emp.liveStatus);
}

const liveStyles: Record<string, { bg: string; dot: string; label: string; pulse: boolean }> = {
  "clocked-in": { bg: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20", dot: "bg-emerald-500", label: "Logged In", pulse: true },
  late: { bg: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20", dot: "bg-amber-500", label: "Late Login", pulse: true },
  "clocked-out": { bg: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20", dot: "bg-sky-500", label: "Logged Out", pulse: false },
  present: { bg: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20", dot: "bg-emerald-500", label: "Present", pulse: false },
  "half-day": { bg: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20", dot: "bg-orange-500", label: "Half Day", pulse: false },
  "on-leave": { bg: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20", dot: "bg-indigo-500", label: "On Leave", pulse: false },
  absent: { bg: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20", dot: "bg-rose-500", label: "Absent", pulse: false },
  "not-marked": { bg: "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/20", dot: "bg-gray-400", label: "Not Marked", pulse: false },
};

/** Pick the right badge for the STATUS column. For employees who have clocked out,
 *  surface the attendance outcome (Present / Half Day) instead of the generic
 *  "Logged Out", so users can see at a glance whether the shift counted as full. */
function statusBadgeKey(emp: LiveEmployee): string {
  if (emp.liveStatus === "clocked-out") {
    if (emp.status === "half-day") return "half-day";
    return "present";
  }
  return emp.liveStatus;
}

const cardCls = "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";
const inputCls = "rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

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

function Avatar({ name, size = "md", presence }: { name: string; size?: "sm" | "md" | "lg"; presence?: ActiveStatus }) {
  const init = (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const sz =
    size === "lg" ? "h-10 w-10 text-sm"
    : size === "sm" ? "h-7 w-7 text-[10px]"
    : "h-9 w-9 text-[11px]";
  const dotSz = size === "lg" ? "h-3 w-3" : size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const cfg = presence ? activeStatusConfig[presence] : null;
  return (
    <div className="relative shrink-0">
      <div className={`flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 ${sz} ${paletteFor(name || "?")}`}>
        {init}
      </div>
      {cfg && (
        <span
          aria-label={cfg.label}
          title={cfg.label}
          className={`absolute -bottom-0.5 -right-0.5 ${dotSz} rounded-full ${cfg.dot} ring-2 ring-white dark:ring-gray-900 ${presence === "online" ? "animate-pulse" : ""}`}
        />
      )}
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

/** Animated ring gauge displaying a percentage. */
function RingGauge({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative flex h-[112px] w-[112px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold tabular-nums leading-none text-white">{pct}%</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">{label}</span>
      </div>
    </div>
  );
}

/** Compute elapsed "Xh Ym" between an ISO timestamp and now. */
function elapsedFrom(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
  if (ms < 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

type ViewTab =
  | "all"
  | "present"
  | "absent"
  | "clocked-in"
  | "late"
  | "clocked-out"
  | "half-day"
  | "on-leave"
  | "not-marked";

function matchesTab(tab: ViewTab, emp: LiveEmployee): boolean {
  switch (tab) {
    case "all":         return true;
    case "present":     return ["clocked-in", "late", "clocked-out"].includes(emp.liveStatus);
    case "absent":      return emp.liveStatus === "absent";
    case "half-day":    return emp.status === "half-day";
    default:            return emp.liveStatus === tab;
  }
}
type SortKey = "name" | "department" | "status" | "in" | "hours";
type SortDir = "asc" | "desc";
type Density = "comfy" | "compact";

const statusOrder: Record<string, number> = {
  "clocked-in": 0,
  late: 1,
  "clocked-out": 2,
  "on-leave": 3,
  absent: 4,
  "not-marked": 5,
};

export default function TeamAttendance() {
  const { attendancePolicy } = useCompany();
  const [liveData, setLiveData] = useState<LiveStatusData | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [viewTab, setViewTab] = useState<ViewTab>("all");
  const [dateFilter, setDateFilter] = useState<string>(todayKey());
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [density, setDensity] = useState<Density>(() => {
    const saved = localStorage.getItem("teamAttendance.density");
    return saved === "compact" ? "compact" : "comfy";
  });
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const isToday = dateFilter === todayKey();

  useEffect(() => {
    localStorage.setItem("teamAttendance.density", density);
  }, [density]);

  // Tick once a minute to refresh "live elapsed" labels
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchData = () => {
      const params = isToday ? undefined : { date: dateFilter };
      attendanceApi.getLiveStatus(params).then((r) => {
        setLiveData(r.data.data ?? null);
        const depts = [...new Set((r.data.data?.employees || []).map((e: LiveEmployee) => e.department).filter(Boolean))] as string[];
        setDepartments(depts);
      }).catch(() => { /* interceptor */ });
    };
    fetchData();
    if (!isToday) return;
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [dateFilter, isToday]);

  const presentStatuses = ["clocked-in", "late", "clocked-out"];
  const absentStatuses = ["absent"];
  const onLeaveStatuses = ["on-leave"];
  const notMarkedStatuses = ["not-marked"];

  const presentCount = useMemo(() => (liveData?.employees || []).filter((e) => presentStatuses.includes(e.liveStatus)).length, [liveData]);
  const absentCount = useMemo(() => (liveData?.employees || []).filter((e) => absentStatuses.includes(e.liveStatus)).length, [liveData]);
  const onLeaveCount = useMemo(() => (liveData?.employees || []).filter((e) => onLeaveStatuses.includes(e.liveStatus)).length, [liveData]);
  const notMarkedCount = useMemo(() => (liveData?.employees || []).filter((e) => notMarkedStatuses.includes(e.liveStatus)).length, [liveData]);

  const officeStartMin = useMemo(
    () => parseHHMM(attendancePolicy?.officeStartTime ?? "09:00"),
    [attendancePolicy?.officeStartTime]
  );

  /** Compute "late by N minutes" — only meaningful when status === "late". */
  const lateMinutes = (clockIn: string | null): number | null => {
    if (!clockIn) return null;
    const d = new Date(clockIn);
    const min = d.getHours() * 60 + d.getMinutes();
    return Math.max(0, min - officeStartMin);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = (liveData?.employees || [])
      .filter((e) =>
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.userId ?? "").toLowerCase().includes(q)
      )
      .filter((e) => !deptFilter || e.department === deptFilter)
      .filter((e) => matchesTab(viewTab, e));

    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name":       return dir * a.name.localeCompare(b.name);
        case "department": return dir * ((a.department || "").localeCompare(b.department || ""));
        case "status":     return dir * ((statusOrder[a.liveStatus] ?? 9) - (statusOrder[b.liveStatus] ?? 9));
        case "in":         return dir * ((a.clockIn ? new Date(a.clockIn).getTime() : Infinity) - (b.clockIn ? new Date(b.clockIn).getTime() : Infinity));
        case "hours":      return dir * ((a.totalHours ?? -1) - (b.totalHours ?? -1));
        default: return 0;
      }
    });
    return arr;
  }, [liveData, search, deptFilter, viewTab, sortKey, sortDir]);

  const fmtClock = (d: string | null) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  const total = liveData?.employees.length ?? 0;
  const summary = liveData?.summary;

  // Status segments for the stacked bar (in the hero)
  const segments = useMemo(() => {
    if (!summary || total === 0) return [];
    return [
      { key: "clocked-in", label: "In",         value: summary.clockedIn, color: "bg-emerald-500", lightColor: "bg-emerald-400" },
      { key: "late",       label: "Late",       value: summary.late,      color: "bg-amber-500",   lightColor: "bg-amber-400" },
      { key: "clocked-out",label: "Out",        value: summary.clockedOut,color: "bg-sky-500",     lightColor: "bg-sky-400" },
      { key: "on-leave",   label: "Leave",      value: summary.onLeave,   color: "bg-indigo-500",  lightColor: "bg-indigo-400" },
      { key: "absent",     label: "Absent",     value: summary.absent,    color: "bg-rose-500",    lightColor: "bg-rose-400" },
      { key: "not-marked", label: "Not Marked", value: summary.notMarked, color: "bg-gray-400",    lightColor: "bg-gray-300" },
    ];
  }, [summary, total]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 inline h-3 w-3 text-indigo-500 dark:text-indigo-400" />
      : <ArrowDown className="ml-1 inline h-3 w-3 text-indigo-500 dark:text-indigo-400" />;
  };

  const rowPad = density === "compact" ? "py-2" : "py-3";

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
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
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Title + meta */}
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
              {isToday ? (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  </span>
                  Live · Auto-refresh 30s
                </>
              ) : (
                <>
                  <Calendar className="h-3 w-3" />
                  Historical View
                </>
              )}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Team <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Attendance</span>
            </h1>
            <p className="mt-1 text-sm text-indigo-200/70">
              {isToday
                ? "Real-time view of your team's attendance today"
                : `Attendance for ${new Date(dateFilter + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`}
            </p>

            {/* Status stacked bar */}
            {total > 0 && (
              <div className="mt-5 max-w-md">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                  {segments.map((s) => {
                    const pct = (s.value / total) * 100;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={s.key}
                        className={`${s.color} h-full transition-[width] duration-700`}
                        style={{ width: `${pct}%` }}
                        title={`${s.label}: ${s.value}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  {segments.map((s) => (
                    <span key={s.key} className="inline-flex items-center gap-1.5 text-indigo-100/80">
                      <span className={`h-2 w-2 rounded-full ${s.color}`} />
                      <span className="font-medium">{s.label}</span>
                      <span className="font-mono tabular-nums opacity-80">{s.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ring + counters */}
          <div className="flex shrink-0 items-center justify-center gap-4 lg:justify-start">
            <RingGauge value={presentCount} total={total} label="Present" />
            <div className="flex gap-2 lg:flex-col">
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Total</p>
                <p className="font-mono text-xl font-bold tabular-nums tracking-tight">{total}</p>
              </div>
              <div className="rounded-xl bg-rose-500/15 px-4 py-2.5 text-center ring-1 ring-rose-400/30 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-200/90">Absent</p>
                <p className="font-mono text-xl font-bold tabular-nums tracking-tight text-rose-100">{absentCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Tiles ── */}
      {summary && (() => {
        const totalTeam = total;
        const presentPct = totalTeam > 0 ? Math.round((presentCount / totalTeam) * 100) : 0;
        const tiles: Array<{
          tab: ViewTab;
          label: string;
          value: number;
          sub: string;
          icon: typeof UserCheck;
          gradient: string;
          ringColor: string;
          progress?: number;
          toneChip?: string;
          toneLabel?: string;
        }> = [
          {
            tab: "clocked-in",
            label: "Logged In",
            value: summary.clockedIn,
            sub: totalTeam > 0 ? `${Math.round((summary.clockedIn / totalTeam) * 100)}% of team` : "—",
            icon: UserCheck,
            gradient: "from-emerald-500 to-teal-600",
            ringColor: "shadow-emerald-500/30",
            progress: presentPct,
            toneChip:
              presentPct >= 80 ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25" :
              presentPct >= 50 ? "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/25" :
              "bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/25",
            toneLabel: presentPct >= 80 ? "Strong" : presentPct >= 50 ? "Steady" : "Low",
          },
          {
            tab: "late",
            label: "Late Login",
            value: summary.late,
            sub: summary.late === 0 ? "All punctual" : `${summary.late} late ${summary.late === 1 ? "arrival" : "arrivals"}`,
            icon: AlertTriangle,
            gradient: "from-amber-500 to-orange-600",
            ringColor: "shadow-amber-500/30",
            toneChip: summary.late > 0
              ? "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/25"
              : "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25",
            toneLabel: summary.late > 0 ? "Watch list" : "On time",
          },
          {
            tab: "clocked-out",
            label: "Logged Out",
            value: summary.clockedOut,
            sub: summary.clockedOut === 0
              ? "Still active"
              : summary.halfDay > 0
                ? `Shift complete · ${summary.halfDay} half day`
                : "Shift complete",
            icon: CheckCircle2,
            gradient: "from-sky-500 to-blue-600",
            ringColor: "shadow-sky-500/30",
          },
          {
            tab: "half-day",
            label: "Half Day",
            value: summary.halfDay,
            sub: summary.halfDay === 0 ? "No half days" : `${summary.halfDay} short shift (incl. in Logged Out)`,
            icon: Clock,
            gradient: "from-orange-500 to-amber-600",
            ringColor: "shadow-orange-500/30",
            toneChip: summary.halfDay > 0
              ? "bg-orange-50 text-orange-700 ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/25"
              : "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25",
            toneLabel: summary.halfDay > 0 ? "Partial" : "—",
          },
          {
            tab: "on-leave",
            label: "On Leave",
            value: onLeaveCount,
            sub: onLeaveCount === 0 ? "No approved leaves" : `${onLeaveCount} on approved leave`,
            icon: CalendarIcon,
            gradient: "from-indigo-500 to-violet-600",
            ringColor: "shadow-indigo-500/30",
            toneChip: onLeaveCount > 0
              ? "bg-indigo-50 text-indigo-700 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/25"
              : "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25",
            toneLabel: onLeaveCount > 0 ? "Approved" : "—",
          },
          {
            tab: "not-marked",
            label: "Not Marked",
            value: notMarkedCount,
            sub: notMarkedCount === 0 ? "Everyone accounted for" : "Pending check-in",
            icon: Clock,
            gradient: "from-gray-500 to-gray-600",
            ringColor: "shadow-gray-500/30",
            toneChip: notMarkedCount > 0
              ? "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/25"
              : "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25",
            toneLabel: notMarkedCount > 0 ? "Awaiting" : "Complete",
          },
          {
            tab: "absent",
            label: "Absent",
            value: absentCount,
            sub: absentCount === 0 ? "Full attendance" : `${absentCount} ${absentCount === 1 ? "member" : "members"} out`,
            icon: UserX,
            gradient: "from-rose-500 to-pink-600",
            ringColor: "shadow-rose-500/30",
            toneChip: absentCount > 0
              ? "bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/25"
              : "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25",
            toneLabel: absentCount > 0 ? "Follow up" : "All here",
          },
        ];
        return (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-4 xl:grid-cols-7">
            {tiles.map((c) => {
              const isActive = viewTab === c.tab;
              return (
              <button
                key={c.label}
                type="button"
                onClick={() => setViewTab(isActive ? "all" : c.tab)}
                aria-pressed={isActive}
                title={isActive ? `Showing ${c.label} · click to clear` : `Filter to ${c.label}`}
                className={`${cardCls} group relative overflow-hidden !p-0 text-left transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${isActive ? "ring-2 ring-indigo-500/60 shadow-md -translate-y-0.5" : ""}`}
              >
                {/* Top gradient stripe */}
                <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${c.gradient}`} />

                {/* Decorative halos */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${c.gradient} opacity-10 blur-2xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-110`}
                />
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${c.gradient} opacity-[0.04] blur-2xl`}
                />

                <div className="relative p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={labelCls}>{c.label}</p>
                      <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">{c.value}</p>
                    </div>
                    <div
                      className={`relative shrink-0 rounded-lg bg-gradient-to-br ${c.gradient} p-2 shadow-md ${c.ringColor} ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105`}
                    >
                      <c.icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                      <span aria-hidden className="absolute inset-0 rounded-lg bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">{c.sub}</p>
                    {c.toneLabel && c.toneChip && (
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 text-[9px] font-bold ring-1 ring-inset ${c.toneChip}`}>
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {c.toneLabel}
                      </span>
                    )}
                  </div>

                  {typeof c.progress === "number" && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${c.gradient} transition-[width] duration-700`}
                        style={{ width: `${Math.min(100, c.progress)}%` }}
                      />
                    </div>
                  )}
                </div>
              </button>
            );
            })}
          </div>
        );
      })()}

      {/* ── Tabs + Filters ── */}
      <div className="space-y-3">
        {/* Row 1: tabs on the left, view controls + export on the right */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
            {([
              { key: "all" as ViewTab, label: "All", count: total },
              { key: "present" as ViewTab, label: "Present", count: presentCount },
              { key: "absent" as ViewTab, label: "Absent", count: absentCount },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setViewTab(t.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all ${
                  viewTab === t.key
                    ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`inline-flex min-w-[20px] items-center justify-center rounded-md px-1.5 py-0 text-[10px] font-bold ${
                    viewTab === t.key
                      ? "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-300"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/* Density toggle */}
            <div className="hidden items-center gap-0.5 rounded-lg border border-gray-300 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800 md:inline-flex">
              <button
                onClick={() => setDensity("comfy")}
                title="Comfortable rows"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                  density === "comfy"
                    ? "bg-indigo-500/15 text-indigo-600 ring-1 ring-indigo-500/30 dark:bg-indigo-400/20 dark:text-indigo-300"
                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDensity("compact")}
                title="Compact rows"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                  density === "compact"
                    ? "bg-indigo-500/15 text-indigo-600 ring-1 ring-indigo-500/30 dark:bg-indigo-400/20 dark:text-indigo-300"
                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>

        {/* Row 2: date nav · search · department filter */}
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {/* Date navigator: ◄  date  ► + Today shortcut */}
          <div className="flex w-full gap-2 sm:w-auto">
            <div className="flex flex-1 items-center gap-1 rounded-lg border border-gray-300 bg-white px-1 py-0.5 dark:border-gray-700 dark:bg-gray-800 sm:flex-none">
              <button
                type="button"
                onClick={() => setDateFilter((d) => shiftIsoDate(d, -1))}
                aria-label="Previous day"
                className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 active:scale-95 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="relative flex flex-1 items-center sm:flex-none">
                <Calendar className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={dateFilter}
                  max={todayKey()}
                  onChange={(e) => setDateFilter(e.target.value || todayKey())}
                  className="w-full bg-transparent pl-7 pr-1 py-1.5 text-sm text-gray-900 outline-none focus:ring-0 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setDateFilter((d) => shiftIsoDate(d, 1))}
                disabled={dateFilter >= todayKey()}
                aria-label="Next day"
                className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {!isToday && (
              <button
                onClick={() => setDateFilter(todayKey())}
                className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Today
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full sm:min-w-[220px] sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or email..."
              className={`${inputCls} w-full pl-9 ${search ? "pr-8" : ""}`}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Department filter */}
          <div className="relative w-full sm:w-auto">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className={`${inputCls} w-full pl-8`}
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* ── Desktop table ── */}
      <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-gray-200/70 bg-gray-50/95 backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-800/95">
              <tr>
                {([
                  { key: "name" as SortKey,       label: "Employee" },
                  { key: null,                    label: "Employee ID" },
                  { key: "department" as SortKey, label: "Dept" },
                  { key: null,                    label: "Active" },
                  { key: "status" as SortKey,     label: "Status" },
                  { key: "in" as SortKey,         label: "In" },
                  { key: null,                    label: "Out" },
                  { key: "hours" as SortKey,      label: "Hours" },
                ]).map((h) => (
                  <th key={h.label} className={`px-4 py-3 ${labelCls} ${h.key ? "cursor-pointer select-none transition-colors hover:text-gray-700 dark:hover:text-gray-200" : ""}`}
                      onClick={h.key ? () => handleSort(h.key as SortKey) : undefined}>
                    {h.label}
                    {h.key && <SortIcon k={h.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No team members found</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((emp) => {
                const s = liveStyles[statusBadgeKey(emp)] || liveStyles["not-marked"];
                const active = resolveActiveStatus(emp);
                const aCfg = activeStatusConfig[active];
                const ActiveIcon = aCfg.icon;
                const isLive = emp.liveStatus === "clocked-in" || emp.liveStatus === "late";
                const elapsed = isToday && isLive && emp.clockIn ? elapsedFrom(emp.clockIn, nowMs) : null;
                const lateMin = emp.liveStatus === "late" ? lateMinutes(emp.clockIn) : null;
                return (
                  <tr key={emp._id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    <td className={`px-4 ${rowPad}`}>
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.name} size={density === "compact" ? "sm" : "md"} presence={active} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                          {density === "comfy" && (
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{emp.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 ${rowPad}`}>
                      {emp.userId ? (
                        <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{emp.userId}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className={`px-4 ${rowPad} text-gray-600 dark:text-gray-400`}>{emp.department || "—"}</td>
                    <td className={`px-4 ${rowPad}`}>
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${aCfg.badge}`}>
                        <ActiveIcon
                          className="h-2.5 w-2.5"
                          fill={active === "online" ? "currentColor" : "none"}
                          strokeWidth={2.5}
                        />
                        {aCfg.short}
                      </span>
                    </td>
                    <td className={`px-4 ${rowPad}`}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />{s.label}
                        </span>
                        {lateMin != null && lateMin > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30">
                            +{fmtHours(lateMin / 60)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 ${rowPad} text-gray-700 dark:text-gray-300`}>
                      <div className="flex flex-col">
                        <span className="font-mono tabular-nums">{fmtClock(emp.clockIn)}</span>
                        {elapsed && (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="mr-1 inline-block h-1 w-1 animate-pulse rounded-full bg-emerald-500 align-middle" />
                            {elapsed} active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 ${rowPad} font-mono tabular-nums text-gray-700 dark:text-gray-300`}>{fmtClock(emp.clockOut)}</td>
                    <td className={`px-4 ${rowPad} font-mono font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white`}>{emp.totalHours ? fmtHours(emp.totalHours) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className={`${cardCls} flex flex-col items-center gap-2 py-12 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No team members found</p>
          </div>
        ) : filtered.map((emp) => {
          const s = liveStyles[statusBadgeKey(emp)] || liveStyles["not-marked"];
          const active = resolveActiveStatus(emp);
          const aCfg = activeStatusConfig[active];
          const ActiveIcon = aCfg.icon;
          const isLive = emp.liveStatus === "clocked-in" || emp.liveStatus === "late";
          const elapsed = isToday && isLive && emp.clockIn ? elapsedFrom(emp.clockIn, nowMs) : null;
          const lateMin = emp.liveStatus === "late" ? lateMinutes(emp.clockIn) : null;
          return (
            <div key={emp._id} className={`${cardCls} p-4`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={emp.name} size="lg" presence={active} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                    {emp.userId && (
                      <p className="truncate font-mono text-[11px] text-gray-500 dark:text-gray-400">{emp.userId}</p>
                    )}
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${aCfg.badge}`}>
                        <ActiveIcon
                          className="h-2 w-2"
                          fill={active === "online" ? "currentColor" : "none"}
                          strokeWidth={2.5}
                        />
                        {aCfg.short}
                      </span>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{emp.department || "No Dept"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />{s.label}
                  </span>
                  {lateMin != null && lateMin > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30">
                      Late +{fmtHours(lateMin / 60)}
                    </span>
                  )}
                </div>
              </div>
              {elapsed && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {elapsed} active session
                </p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniTile label="In" value={fmtClock(emp.clockIn)} />
                <MiniTile label="Out" value={fmtClock(emp.clockOut)} />
                <MiniTile label="Hours" value={emp.totalHours ? fmtHours(emp.totalHours) : "—"} accent />
              </div>
            </div>
          );
        })}
      </div>

      {isToday && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Auto-refreshes every 30 seconds
        </p>
      )}
    </div>
  );
}
