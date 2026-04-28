import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  ScrollText,
  Sparkles,
  Database,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import type { AuditLogEntry } from "../../api/adminSettingsApi";
import toast from "react-hot-toast";
import ConfirmDialog from "../../components/ConfirmDialog";

const MODULES = [
  "all",
  "auth",
  "attendance",
  "timesheet",
  "leave",
  "documents",
  "employees",
  "approvals",
  "settings",
  "roles",
  "reports",
];

const PAGE_SIZE = 15;

const MODULE_CFG: Record<
  string,
  { dot: string; bg: string; text: string; ring: string }
> = {
  auth: { dot: "bg-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-500/20" },
  attendance: { dot: "bg-sky-400", bg: "bg-sky-50 dark:bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", ring: "ring-sky-500/20" },
  timesheet: { dot: "bg-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-300", ring: "ring-cyan-500/20" },
  leave: { dot: "bg-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-500/20" },
  documents: { dot: "bg-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", ring: "ring-amber-500/20" },
  employees: { dot: "bg-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", ring: "ring-indigo-500/20" },
  approvals: { dot: "bg-fuchsia-400", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10", text: "text-fuchsia-700 dark:text-fuchsia-300", ring: "ring-fuchsia-500/20" },
  settings: { dot: "bg-gray-400", bg: "bg-gray-100 dark:bg-gray-800/60", text: "text-gray-700 dark:text-gray-300", ring: "ring-gray-500/20" },
  roles: { dot: "bg-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", ring: "ring-rose-500/20" },
  reports: { dot: "bg-teal-400", bg: "bg-teal-50 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", ring: "ring-teal-500/20" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tint,
}: {
  icon: any;
  label: string;
  value: string | number;
  sublabel?: string;
  tint: "indigo" | "emerald" | "amber" | "rose";
}) {
  const tints: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/0 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    rose: "from-rose-500/20 to-rose-500/0 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${tints[tint]} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">{value}</p>
          {sublabel && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tints[tint]} ring-1`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
      </div>
    </div>
  );
}

const input =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

export default function AdminAuditLog() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionSearch, setActionSearch] = useState("");
  const [debouncedAction, setDebouncedAction] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AuditLogEntry | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAction(actionSearch), 400);
    return () => clearTimeout(timer);
  }, [actionSearch]);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = {
      page,
      limit: PAGE_SIZE,
    };
    if (moduleFilter !== "all") params.module = moduleFilter;
    if (debouncedAction.trim()) params.action = debouncedAction.trim();

    adminSettingsApi
      .getAuditLogs(params)
      .then((r) => {
        setLogs(r.data.data || []);
        setTotalPages(r.data.pagination?.pages || 1);
        setTotalCount(r.data.pagination?.total || 0);
      })
      .catch(() => toast.error("Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, [page, moduleFilter, debouncedAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [moduleFilter, debouncedAction]);

  const handleDeleteOne = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await adminSettingsApi.deleteAuditLog(deleteTarget._id);
      toast.success("Audit log deleted");
      setDeleteTarget(null);
      // If the only row on this page was deleted, step back a page
      if (logs.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchLogs();
    } catch {
      toast.error("Failed to delete audit log");
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      const params: Record<string, string> = {};
      if (moduleFilter !== "all") params.module = moduleFilter;
      if (debouncedAction.trim()) params.action = debouncedAction.trim();
      const res = await adminSettingsApi.clearAuditLogs(params);
      toast.success(`Cleared ${res.data.data?.deletedCount ?? 0} entries`);
      setConfirmClear(false);
      setPage(1);
      fetchLogs();
    } catch {
      toast.error("Failed to clear audit logs");
    } finally {
      setBusy(false);
    }
  };

  const isFiltered = moduleFilter !== "all" || debouncedAction.trim().length > 0;

  // Stats from current page (best-effort — full counts come from totalCount)
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last24h = logs.filter(
      (l) => Date.now() - new Date(l.createdAt).getTime() < 24 * 3600 * 1000
    ).length;
    const uniqueUsers = new Set(logs.map((l) => l.userId?._id).filter(Boolean)).size;
    const moduleCounts = logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.module] = (acc[l.module] || 0) + 1;
      return acc;
    }, {});
    const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      totalCount,
      last24h,
      uniqueUsers,
      topModule: topModule ? topModule[0] : "—",
    };
  }, [logs, totalCount]);

  return (
    <div className="space-y-6">
      {/* ━━━ Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-200 backdrop-blur-sm ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" /> Admin · Compliance
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <ScrollText className="h-8 w-8 text-indigo-300" />
              Audit Log
            </h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/80 sm:text-base">
              Trace every administrative action across the platform — who did what, when, and where.
              Immutable, time-stamped, and ready for review.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/15 backdrop-blur-sm">
            <Database className="h-4 w-4 text-indigo-200" />
            <span className="tabular-nums">{totalCount.toLocaleString()}</span>
            <span className="text-indigo-200/80 font-medium">total records</span>
          </div>
        </div>
      </div>

      {/* ━━━ Stats ━━━ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Database} label="All-time records" value={stats.totalCount.toLocaleString()} sublabel="In current filter" tint="indigo" />
        <StatCard icon={Clock} label="Last 24h" value={stats.last24h} sublabel="On this page" tint="emerald" />
        <StatCard icon={User} label="Active users" value={stats.uniqueUsers} sublabel="Distinct actors here" tint="amber" />
        <StatCard
          icon={TrendingUp}
          label="Top module"
          value={stats.topModule.charAt(0).toUpperCase() + stats.topModule.slice(1)}
          sublabel="Most active here"
          tint="rose"
        />
      </div>

      {/* ━━━ Toolbar ━━━ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Module filter pills */}
        <div className="flex items-center gap-1 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 p-1 backdrop-blur-sm overflow-x-auto max-w-full">
          {MODULES.map((m) => {
            const active = moduleFilter === m;
            const cfg = MODULE_CFG[m];
            return (
              <button
                key={m}
                onClick={() => setModuleFilter(m)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {cfg && !active && <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
                {m === "all" ? "All" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-1 gap-2 sm:flex-initial sm:max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search actions…"
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              className={`${input} pl-10`}
            />
          </div>
          <button
            onClick={() => setConfirmClear(true)}
            disabled={totalCount === 0}
            title={isFiltered ? "Clear filtered logs" : "Clear all logs"}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">{isFiltered ? "Clear filtered" : "Clear all"}</span>
          </button>
        </div>
      </div>

      {/* ━━━ Content ━━━ */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <ScrollText className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">No audit logs found</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your module filter or search term.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200/70 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-800/40">
                  <tr>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">User</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Action</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Module</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Details</th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">When</th>
                    <th className="px-2 py-3.5 w-10" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {logs.map((log) => {
                    const cfg = MODULE_CFG[log.module] || MODULE_CFG.settings;
                    return (
                      <tr key={log._id} className="group transition-colors duration-150 hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md">
                              {log.userId?.name ? initials(log.userId.name) : <User className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                {log.userId?.name || "Unknown"}
                              </p>
                              <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                                {log.userId?.email || ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-900 dark:text-white">{log.action}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {log.module}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 max-w-[260px]">
                          {log.details ? (
                            <p className="truncate text-xs text-gray-600 dark:text-gray-400 font-mono" title={log.details}>
                              {log.details}
                            </p>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                              {timeAgo(log.createdAt)}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums" title={new Date(log.createdAt).toLocaleString()}>
                              {formatDate(log.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3.5 text-right">
                          <button
                            onClick={() => setDeleteTarget(log)}
                            title="Delete entry"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => {
              const cfg = MODULE_CFG[log.module] || MODULE_CFG.settings;
              return (
                <div
                  key={log._id}
                  className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 backdrop-blur-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md">
                        {log.userId?.name ? initials(log.userId.name) : <User className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                          {log.userId?.name || "Unknown"}
                        </p>
                        <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                          {log.userId?.email || ""}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {log.module}
                    </span>
                  </div>
                  <p className="mb-1 text-sm font-bold text-gray-900 dark:text-white">{log.action}</p>
                  {log.details && (
                    <p className="mb-2 text-xs text-gray-600 dark:text-gray-400 font-mono line-clamp-2">{log.details}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(log.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{formatDate(log.createdAt)}</span>
                      <button
                        onClick={() => setDeleteTarget(log)}
                        title="Delete entry"
                        className="rounded-md p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 backdrop-blur-sm px-5 py-3.5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                Page <span className="font-bold text-gray-900 dark:text-white">{page}</span> of{" "}
                <span className="font-bold text-gray-900 dark:text-white">{totalPages}</span>{" "}
                <span className="text-xs">· {totalCount.toLocaleString()} total</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this audit log entry?"
        description={
          deleteTarget ? (
            <>
              <span className="font-semibold text-gray-900 dark:text-white">{deleteTarget.action}</span>
              {deleteTarget.userId?.name ? <> by {deleteTarget.userId.name}</> : null}
              <span className="block text-xs text-gray-400 mt-1">{formatDate(deleteTarget.createdAt)}</span>
            </>
          ) : null
        }
        confirmLabel="Delete"
        variant="danger"
        loading={busy}
        onConfirm={handleDeleteOne}
        onCancel={() => !busy && setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={confirmClear}
        title={isFiltered ? "Clear filtered audit logs?" : "Clear all audit logs?"}
        description={
          <>
            This will permanently delete{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{totalCount.toLocaleString()}</span>{" "}
            {isFiltered ? "matching entr" : "entr"}{totalCount === 1 ? "y" : "ies"}. This action cannot be undone.
          </>
        }
        confirmLabel={isFiltered ? "Clear filtered" : "Clear all"}
        variant="danger"
        loading={busy}
        onConfirm={handleClear}
        onCancel={() => !busy && setConfirmClear(false)}
      />
    </div>
  );
}
