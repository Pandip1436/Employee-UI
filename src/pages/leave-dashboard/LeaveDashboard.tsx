import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  CalendarDays,
  Clock,
  Briefcase,
  Heart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Palmtree,
} from "lucide-react";
import { leaveApi } from "../../api/leaveApi";
import type { LeaveRequest, LeaveBalance, Pagination } from "../../types";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

/* ── Status badge config ── */
const statusConfig: Record<string, { dot: string; badge: string; label: string; gradient: string }> = {
  pending: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    label: "Pending",
    gradient: "from-amber-500 to-orange-600",
  },
  approved: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    label: "Approved",
    gradient: "from-emerald-500 to-teal-600",
  },
  rejected: {
    dot: "bg-rose-500",
    badge:
      "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    label: "Rejected",
    gradient: "from-rose-500 to-pink-600",
  },
};

/* ── Type badge config ── */
const typeConfig: Record<string, { dot: string; badge: string; label: string; gradient: string }> = {
  casual: {
    dot: "bg-sky-500",
    badge:
      "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    label: "Personal",
    gradient: "from-sky-500 to-indigo-600",
  },
  sick: {
    dot: "bg-orange-500",
    badge:
      "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20",
    label: "Sick",
    gradient: "from-orange-500 to-rose-600",
  },
  earned: {
    dot: "bg-purple-500",
    badge:
      "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/20",
    label: "Earned",
    gradient: "from-purple-500 to-fuchsia-600",
  },
  unpaid: {
    dot: "bg-gray-400",
    badge:
      "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    label: "Unpaid",
    gradient: "from-gray-500 to-gray-600",
  },
};

/* ── Balance card config ── */
const balanceCardConfig: Record<
  string,
  { icon: typeof CalendarDays; gradient: string; label: string }
> = {
  casual: { icon: Briefcase, gradient: "from-sky-500 to-indigo-600", label: "Personal Leave" },
  sick: { icon: Heart, gradient: "from-orange-500 to-rose-600", label: "Sick Leave" },
  earned: { icon: Clock, gradient: "from-purple-500 to-fuchsia-600", label: "Earned Leave" },
};

/* ── Helpers ── */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const isFutureDate = (iso: string) => new Date(iso) > new Date();

const daysUntil = (iso: string) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/* ── Component ── */
export default function LeaveDashboard() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  const fetchLeaves = () => {
    leaveApi
      .getMyLeaves({ page, limit: 10 })
      .then((res) => {
        setLeaves(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => {});
  };

  const fetchBalance = () => {
    leaveApi
      .getBalance()
      .then((res) => setBalance(res.data.data!))
      .catch(() => {});
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [page]);

  const upcomingLeaves = leaves.filter(
    (l) => l.status === "approved" && isFutureDate(l.startDate)
  );

  const totalRemaining = balance
    ? (balance.casual?.remaining ?? 0) + (balance.sick?.remaining ?? 0)
    : 0;

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
              <Palmtree className="h-10 w-10 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Time off & balances
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Leave <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">
                Your balances, history, and upcoming time off
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Days remaining</p>
              <p className="text-xl font-bold tracking-tight">{totalRemaining}</p>
            </div>
            <Link
              to="/leave/apply"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
            >
              <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                <Plus className="h-3.5 w-3.5 text-white" />
              </span>
              Apply Leave
            </Link>
          </div>
        </div>
      </div>

      {/* ── Leave Balance Cards ── */}
      {balance && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className={labelCls}>Leave Balances</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(["casual", "sick"] as const).map((type) => {
              const config = balanceCardConfig[type];
              const Icon = config.icon;
              const used = balance[type]?.used ?? 0;
              const total = balance[type]?.total ?? 0;
              const remaining = balance[type]?.remaining ?? 0;
              const pct = total > 0 ? (used / total) * 100 : 0;

              return (
                <div key={type} className={`${cardCls} group relative overflow-hidden p-5`}>
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${config.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30`}
                  />
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className={labelCls}>{config.label}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                          {remaining}
                        </span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">
                          / {total}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {used} used this year
                      </p>
                    </div>
                    <div className={`rounded-xl bg-gradient-to-br ${config.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      <span>Used</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-200">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Upcoming Leaves ── */}
      {upcomingLeaves.length > 0 && (
        <div>
          <p className={`${labelCls} mb-3`}>Upcoming Leaves</p>
          <div className="space-y-2">
            {upcomingLeaves.map((leave) => {
              const tConfig = typeConfig[leave.type] || typeConfig.casual;
              const startDate = new Date(leave.startDate);
              const days = daysUntil(leave.startDate);
              return (
                <div
                  key={leave._id}
                  className={`${cardCls} group flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4`}
                >
                  {/* Date tile */}
                  <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${tConfig.gradient} text-white shadow-lg ring-1 ring-white/10`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                      {startDate.toLocaleDateString(undefined, { month: "short" })}
                    </p>
                    <p className="text-lg font-bold leading-none">{startDate.getDate()}</p>
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${tConfig.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${tConfig.dot}`} />
                        {tConfig.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                        {leave.days} day{leave.days > 1 ? "s" : ""}
                      </span>
                      {days > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                          In {days} day{days > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                      {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                    </p>
                    {leave.reason && (
                      <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                        {leave.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Leave History ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className={labelCls}>Leave History</p>
          <Link
            to="/leave/apply"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
          >
            Apply new <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {leaves.length === 0 ? (
          <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <CalendarDays className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No leave requests yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Your leave history will appear here once you apply</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
                    <tr>
                      {["Date", "Type", "Status", "Days", "Reason"].map((h) => (
                        <th key={h} className={`px-5 py-3 text-left ${labelCls}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {leaves.map((leave) => {
                      const sConfig = statusConfig[leave.status] || statusConfig.pending;
                      const tConfig = typeConfig[leave.type] || typeConfig.casual;
                      const start = new Date(leave.startDate);
                      return (
                        <tr
                          key={leave._id}
                          className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${tConfig.gradient} text-white shadow-lg ring-1 ring-white/10`}>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                                  {start.toLocaleDateString(undefined, { month: "short" })}
                                </p>
                                <p className="text-sm font-bold leading-none">{start.getDate()}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                  {formatShortDate(leave.startDate)} — {formatShortDate(leave.endDate)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {start.getFullYear()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${tConfig.badge}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${tConfig.dot}`} />
                              {tConfig.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sConfig.badge}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                              {sConfig.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                              {leave.days} day{leave.days > 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="max-w-xs truncate px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {leave.reason || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 md:hidden">
              {leaves.map((leave) => {
                const sConfig = statusConfig[leave.status] || statusConfig.pending;
                const tConfig = typeConfig[leave.type] || typeConfig.casual;
                const start = new Date(leave.startDate);
                return (
                  <div key={leave._id} className={`${cardCls} p-4`}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${tConfig.gradient} text-white shadow-lg ring-1 ring-white/10`}>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                          {start.toLocaleDateString(undefined, { month: "short" })}
                        </p>
                        <p className="text-sm font-bold leading-none">{start.getDate()}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {formatShortDate(leave.startDate)} — {formatShortDate(leave.endDate)}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold ${tConfig.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${tConfig.dot}`} />
                            {tConfig.label}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold ${sConfig.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                            {sConfig.label}
                          </span>
                          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {leave.days} day{leave.days > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    {leave.reason && (
                      <p className="border-t border-gray-200/70 pt-3 text-sm leading-relaxed text-gray-500 dark:border-gray-800/80 dark:text-gray-400">
                        {leave.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className={`${cardCls} flex items-center justify-between p-3`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
