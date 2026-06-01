import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle, XCircle, CalendarDays, ChevronLeft, ChevronRight, X,
  AlertTriangle, MessageSquare, Sparkles, Inbox, Clock, Clock3, Search,
  Filter, ArrowRight, Loader2,
} from "lucide-react";
import { leaveApi } from "../../api/leaveApi";
import type { LeaveRequest, Pagination } from "../../types";
import toast from "react-hot-toast";
import Avatar from "../../components/Avatar";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

const PALETTES = [
  "from-indigo-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];
const paletteFor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
};

const statusConfig: Record<string, { dot: string; badge: string; label: string; gradient: string; icon: typeof Clock }> = {
  pending: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    label: "Pending",
    gradient: "from-amber-500 to-orange-600",
    icon: Clock,
  },
  approved: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    label: "Approved",
    gradient: "from-emerald-500 to-teal-600",
    icon: CheckCircle,
  },
  rejected: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    label: "Rejected",
    gradient: "from-rose-500 to-pink-600",
    icon: XCircle,
  },
};

const typeConfig: Record<string, { dot: string; badge: string; label: string; gradient: string }> = {
  casual: {
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    label: "Personal",
    gradient: "from-sky-500 to-indigo-600",
  },
  sick: {
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20",
    label: "Sick",
    gradient: "from-orange-500 to-rose-600",
  },
  earned: {
    dot: "bg-purple-500",
    badge: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/20",
    label: "Earned",
    gradient: "from-purple-500 to-fuchsia-600",
  },
  unpaid: {
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    label: "Unpaid",
    gradient: "from-gray-500 to-gray-600",
  },
  compoff: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    label: "Comp-Off",
    gradient: "from-emerald-500 to-teal-600",
  },
};

type Tab = "pending" | "approved" | "rejected";
type TypeFilter = "all" | "casual" | "sick" | "earned" | "unpaid" | "compoff";

const tabs: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const typeFilters: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All Types" },
  { key: "casual", label: "Personal" },
  { key: "sick", label: "Sick" },
  { key: "earned", label: "Earned" },
  { key: "unpaid", label: "Unpaid" },
];

export default function LeaveApprovals() {
  const [tab, setTab] = useState<Tab>("pending");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<{ pending: number; approved: number; rejected: number }>({ pending: 0, approved: 0, rejected: 0 });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLeaves = () => {
    setLoading(true);
    leaveApi
      .getAll({ page, limit: 10, status: tab, sort: "-createdAt" })
      .then((res) => {
        setLeaves(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchCounts = async () => {
    try {
      const [p, a, r] = await Promise.all([
        leaveApi.getAll({ page: 1, limit: 1, status: "pending" }),
        leaveApi.getAll({ page: 1, limit: 1, status: "approved" }),
        leaveApi.getAll({ page: 1, limit: 1, status: "rejected" }),
      ]);
      setCounts({
        pending: p.data.pagination?.total ?? 0,
        approved: a.data.pagination?.total ?? 0,
        rejected: r.data.pagination?.total ?? 0,
      });
    } catch { /* interceptor */ }
  };

  useEffect(() => { setPage(1); }, [tab, typeFilter]);
  useEffect(() => { fetchLeaves(); }, [page, tab]);
  useEffect(() => { fetchCounts(); }, []);

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      await leaveApi.approve(id, { status: "approved" });
      toast.success("Leave approved!");
      fetchLeaves();
      fetchCounts();
    } catch { /* interceptor */ } finally { setActing(null); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActing(rejectId);
    try {
      await leaveApi.approve(rejectId, {
        status: "rejected",
        rejectionComment: rejectComment.trim() || undefined,
      });
      toast.success("Leave rejected.");
      setRejectId(null);
      setRejectComment("");
      fetchLeaves();
      fetchCounts();
    } catch { /* interceptor */ } finally { setActing(null); }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtShort = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
  const daysUntil = (iso: string) => {
    const ms = new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.round(ms / 86400000);
  };

  // Client-side type + search filtering on top of server-side status filter
  const filteredLeaves = useMemo(() => {
    let list = leaves;
    if (typeFilter !== "all") list = list.filter((l) => l.type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((l) => {
        const u = l.userId as any;
        return (
          u?.name?.toLowerCase().includes(q) ||
          u?.email?.toLowerCase().includes(q) ||
          l.reason?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [leaves, typeFilter, search]);

  // Total days from current pending pool (visible)
  const totalPendingDays = useMemo(
    () => filteredLeaves.filter((l) => l.status === "pending").reduce((sum, l) => sum + (l.days || 0), 0),
    [filteredLeaves]
  );

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
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
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <CalendarDays className="h-10 w-10 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Manager workspace
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Leave <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Approvals</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Review and manage employee leave requests</p>
            </div>
          </div>
          {tab === "pending" && totalPendingDays > 0 && (
            <div className="flex gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Awaiting you</p>
                <p className="text-xl font-bold tracking-tight">{counts.pending}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Total days</p>
                <p className="text-xl font-bold tracking-tight">{totalPendingDays}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary KPIs (clickable) ── */}
      <div className="grid grid-cols-3 gap-3">
        {(["pending", "approved", "rejected"] as const).map((key) => {
          const cfg = statusConfig[key];
          const Icon = cfg.icon;
          const active = tab === key;
          const ringColor =
            key === "pending" ? "shadow-amber-500/30" :
            key === "approved" ? "shadow-emerald-500/30" :
            "shadow-rose-500/30";
          const count = counts[key];
          const sub =
            key === "pending"
              ? count === 0 ? "Inbox zero" : `${count} ${count === 1 ? "request" : "requests"} awaiting`
              : key === "approved"
                ? count === 0 ? "None yet" : `${count} ${count === 1 ? "approval" : "approvals"} on file`
                : count === 0 ? "None declined" : `${count} ${count === 1 ? "rejection" : "rejections"}`;
          const toneChip =
            key === "pending"
              ? count > 0
                ? "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/25"
                : "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25"
              : null;
          const toneLabel = key === "pending" ? (count > 0 ? "Action needed" : "All clear") : null;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`${cardCls} group relative overflow-hidden !p-0 text-left transition-all duration-300 hover:-translate-y-0.5 ${active ? "ring-2 ring-indigo-500/30 dark:ring-indigo-400/40" : ""}`}
            >
              <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${cfg.gradient}`} />
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${cfg.gradient} blur-2xl transition-all duration-500 ${active ? "opacity-30 scale-110" : "opacity-10 group-hover:opacity-30 group-hover:scale-110"}`}
              />
              <div
                aria-hidden
                className={`pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${cfg.gradient} opacity-[0.04] blur-2xl`}
              />
              <div className="relative p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={labelCls}>{cfg.label}</p>
                    <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                      {count}
                    </p>
                  </div>
                  <div
                    className={`relative shrink-0 rounded-xl bg-gradient-to-br ${cfg.gradient} p-2.5 shadow-lg ${ringColor} ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
                    <span aria-hidden className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{sub}</p>
                  {toneLabel && toneChip && (
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${toneChip}`}>
                      <span className="h-1 w-1 rounded-full bg-current" />
                      {toneLabel}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Tabs + Filters Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[t.key].dot}`} />
                {t.label}
                <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, reason..."
              className="w-full rounded-xl border border-gray-200/70 bg-white/80 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none ring-1 ring-black/[0.02] backdrop-blur-sm transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800/80 dark:bg-gray-900/60 dark:text-white dark:ring-white/[0.03]"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="appearance-none rounded-xl border border-gray-200/70 bg-white/80 py-2 pl-9 pr-8 text-sm font-medium text-gray-700 outline-none ring-1 ring-black/[0.02] backdrop-blur-sm transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800/80 dark:bg-gray-900/60 dark:text-gray-200 dark:ring-white/[0.03]"
            >
              {typeFilters.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-gray-400" />
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="space-y-3">
        {loading ? (
          <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading requests...</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <Inbox className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {search || typeFilter !== "all" ? "No matches" : `No ${tab} leave requests`}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {search || typeFilter !== "all" ? "Try adjusting your filters" : "Requests will appear here once submitted"}
            </p>
          </div>
        ) : (
          filteredLeaves.map((leave) => {
            const sConfig = statusConfig[leave.status] || statusConfig.pending;
            const tConfig = typeConfig[leave.type] || typeConfig.casual;
            const user = leave.userId as any;
            const userName: string = user?.name || "Unknown";
            const userEmail: string = user?.email || "";
            const dept: string = user?.department || user?.role || "";
            const start = new Date(leave.startDate);
            const startDays = daysUntil(leave.startDate);
            const upcoming = leave.status === "approved" && startDays >= 0 && startDays <= 7;
            const startingSoon = leave.status === "pending" && startDays >= 0 && startDays <= 3;
            const busy = acting === leave._id;

            return (
              <div key={leave._id} className={`${cardCls} relative overflow-hidden p-5`}>
                {(upcoming || startingSoon) && (
                  <span aria-hidden className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${startingSoon ? "from-amber-400 to-orange-500" : "from-emerald-400 to-teal-500"}`} />
                )}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    {/* Date tile */}
                    <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${tConfig.gradient} text-white shadow-lg ring-1 ring-white/10`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                        {start.toLocaleDateString(undefined, { month: "short" })}
                      </p>
                      <p className="text-lg font-bold leading-none">{start.getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={userName}
                          photo={user?.profilePhotoUrl}
                          gradient={paletteFor(userName || "?")}
                          className="h-10 w-10 shrink-0 rounded-full ring-2 ring-white shadow-sm dark:ring-gray-900"
                          textClassName="text-[11px] font-semibold"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                            {startingSoon && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20">
                                <Clock3 className="h-2.5 w-2.5" />
                                {startDays === 0 ? "Today" : `In ${startDays}d`}
                              </span>
                            )}
                            {upcoming && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                                <Clock3 className="h-2.5 w-2.5" />
                                {startDays === 0 ? "Today" : `In ${startDays}d`}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {userEmail}{dept ? ` · ${dept}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${tConfig.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${tConfig.dot}`} />
                          {tConfig.label}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sConfig.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                          {sConfig.label}
                        </span>
                        <span className="rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                          {leave.days} day{leave.days > 1 ? "s" : ""}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          Submitted {fmtShort(leave.createdAt)}
                        </span>
                      </div>

                      {/* Date range timeline */}
                      <div className="mt-3 rounded-xl border border-gray-200/70 bg-gradient-to-r from-indigo-50/60 via-transparent to-fuchsia-50/60 p-3 dark:border-gray-800/80 dark:from-indigo-500/5 dark:via-transparent dark:to-fuchsia-500/5">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              <CalendarDays className="h-3 w-3" /> From
                            </p>
                            <p className="mt-0.5 truncate text-sm font-bold text-gray-900 dark:text-white">{fmtDate(leave.startDate)}</p>
                          </div>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                            <ArrowRight className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                          </div>
                          <div className="min-w-0 flex-1 text-right">
                            <p className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
                              <CalendarDays className="h-3 w-3" /> To
                            </p>
                            <p className="mt-0.5 truncate text-sm font-bold text-gray-900 dark:text-white">{fmtDate(leave.endDate)}</p>
                          </div>
                        </div>
                      </div>

                      {leave.reason && (
                        <div className="mt-2 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 dark:border-gray-800/80 dark:bg-gray-800/40">
                          <p className={labelCls}>Reason</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{leave.reason}</p>
                        </div>
                      )}
                      {leave.rejectionComment && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-200/70 bg-rose-50/60 px-3 py-2 dark:border-rose-500/20 dark:bg-rose-500/10">
                          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                          <div>
                            <p className={`${labelCls} text-rose-600 dark:text-rose-400`}>Rejection Reason</p>
                            <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{leave.rejectionComment}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {tab === "pending" && leave.status === "pending" && (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
                      <button
                        disabled={busy}
                        onClick={() => handleApprove(leave._id)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-60 sm:w-auto"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Approve
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => { setRejectId(leave._id); setRejectComment(""); }}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:bg-gray-900 dark:text-rose-400 dark:hover:bg-rose-500/10 sm:w-auto"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className={`${cardCls} flex items-center justify-between p-3`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
            <span className="ml-2 hidden sm:inline">· {pagination.total} total</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-rose-50 to-white p-5 dark:border-gray-800/80 dark:from-rose-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-400/25 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 shadow-lg shadow-rose-500/30 ring-1 ring-white/10">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Reject Leave</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Provide a reason for rejection</p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectId(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <textarea
                rows={3}
                placeholder="Reason for rejection (optional)"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="mb-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectId(null)}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  disabled={acting === rejectId}
                  onClick={handleReject}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
                >
                  {acting === rejectId ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
