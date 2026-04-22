import { useState, useEffect, useMemo } from "react";
import { Search, Users, UserCheck, UserX, Clock, AlertTriangle, CheckCircle2, X, Filter } from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import type { LiveStatusData, LiveEmployee } from "../../types";

const liveStyles: Record<string, { bg: string; dot: string; label: string; pulse: boolean }> = {
  "clocked-in": { bg: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20", dot: "bg-emerald-500", label: "Logged In", pulse: true },
  late: { bg: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20", dot: "bg-amber-500", label: "Late Login", pulse: true },
  "clocked-out": { bg: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20", dot: "bg-sky-500", label: "Logged Out", pulse: false },
  "not-marked": { bg: "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600/20", dot: "bg-gray-400", label: "Not Marked", pulse: false },
  absent: { bg: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20", dot: "bg-rose-500", label: "Absent", pulse: false },
};

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

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const init = (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const sz = size === "lg" ? "h-10 w-10 text-sm" : "h-9 w-9 text-[11px]";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 ${sz} ${paletteFor(name || "?")}`}>
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
  const presentCount = useMemo(() => (liveData?.employees || []).filter((e) => presentStatuses.includes(e.liveStatus)).length, [liveData]);

  const filtered = (liveData?.employees || [])
    .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()))
    .filter((e) => !deptFilter || e.department === deptFilter)
    .filter((e) => {
      if (viewTab === "absent") return absentStatuses.includes(e.liveStatus);
      if (viewTab === "present") return presentStatuses.includes(e.liveStatus);
      return true;
    });

  const fmtClock = (d: string | null) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  const total = liveData?.employees.length ?? 0;

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
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </span>
              Live · Auto-refresh 30s
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Team <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Attendance</span>
            </h1>
            <p className="mt-1 text-sm text-indigo-200/70">Real-time view of your team's attendance today</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Total</p>
              <p className="text-xl font-bold tracking-tight">{total}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/15 px-4 py-2.5 text-center ring-1 ring-emerald-400/30 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/90">Present</p>
              <p className="text-xl font-bold tracking-tight text-emerald-100">{presentCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Tiles ── */}
      {liveData?.summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Logged In", value: liveData.summary.clockedIn, icon: UserCheck, gradient: "from-emerald-500 to-teal-600" },
            { label: "Late Login", value: liveData.summary.late, icon: AlertTriangle, gradient: "from-amber-500 to-orange-600" },
            { label: "Logged Out", value: liveData.summary.clockedOut, icon: CheckCircle2, gradient: "from-sky-500 to-blue-600" },
            { label: "Not Marked", value: liveData.summary.notMarked, icon: Clock, gradient: "from-gray-500 to-gray-600" },
            { label: "Absent", value: absentCount, icon: UserX, gradient: "from-rose-500 to-pink-600" },
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

      {/* ── Tabs + Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
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
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team members..."
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
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className={`${inputCls} pl-8`}
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Desktop table ── */}
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
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
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtClock(emp.clockIn)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtClock(emp.clockOut)}</td>
                    <td className="px-4 py-3 font-semibold tracking-tight text-gray-900 dark:text-white">{emp.totalHours ? `${emp.totalHours}h` : "—"}</td>
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
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />{s.label}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniTile label="In" value={fmtClock(emp.clockIn)} />
                <MiniTile label="Out" value={fmtClock(emp.clockOut)} />
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
  );
}
