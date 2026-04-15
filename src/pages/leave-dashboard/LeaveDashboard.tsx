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
} from "lucide-react";
import { leaveApi } from "../../api/leaveApi";
import type { LeaveRequest, LeaveBalance, Pagination } from "../../types";

/* ─── Status badge config ─── */
const statusConfig: Record<string, { dot: string; badge: string; label: string }> = {
  pending: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    label: "Pending",
  },
  approved: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    label: "Approved",
  },
  rejected: {
    dot: "bg-rose-500",
    badge:
      "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
    label: "Rejected",
  },
};

/* ─── Type badge config ─── */
const typeConfig: Record<string, { dot: string; badge: string; label: string }> = {
  casual: {
    dot: "bg-blue-500",
    badge:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
    label: "Casual",
  },
  sick: {
    dot: "bg-orange-500",
    badge:
      "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20",
    label: "Sick",
  },
  earned: {
    dot: "bg-purple-500",
    badge:
      "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20",
    label: "Earned",
  },
  unpaid: {
    dot: "bg-gray-400",
    badge:
      "bg-gray-50 text-gray-600 ring-1 ring-gray-500/20 dark:bg-gray-500/10 dark:text-gray-300 dark:ring-gray-500/20",
    label: "Unpaid",
  },
};

/* ─── Balance card config ─── */
const balanceCardConfig: Record<
  string,
  {
    border: string;
    icon: typeof CalendarDays;
    iconBg: string;
    iconColor: string;
    progressBar: string;
  }
> = {
  casual: {
    border: "border-l-4 border-blue-500",
    icon: Briefcase,
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    progressBar: "bg-blue-500",
  },
  sick: {
    border: "border-l-4 border-orange-500",
    icon: Heart,
    iconBg: "bg-orange-50 dark:bg-orange-500/10",
    iconColor: "text-orange-600 dark:text-orange-400",
    progressBar: "bg-orange-500",
  },
  earned: {
    border: "border-l-4 border-purple-500",
    icon: Clock,
    iconBg: "bg-purple-50 dark:bg-purple-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
    progressBar: "bg-purple-500",
  },
};

/* ─── Helpers ─── */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const isFutureDate = (iso: string) => new Date(iso) > new Date();

const labelClasses =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

/* ─── Component ─── */
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

  /* Derived: upcoming approved leaves with future start dates */
  const upcomingLeaves = leaves.filter(
    (l) => l.status === "approved" && isFutureDate(l.startDate)
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Leave Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of your leave balances, history, and upcoming time off
          </p>
        </div>
        <Link
          to="/leave/apply"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Apply Leave
        </Link>
      </div>

      {/* ── Leave Balance Cards ── */}
      {balance && (
        <div>
          <p className={`${labelClasses} mb-3`}>Leave Balances</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(["casual", "sick"] as const).map((type) => {
              const config = balanceCardConfig[type];
              const Icon = config.icon;
              const used = balance[type].used;
              const total = balance[type].total;
              const remaining = balance[type].remaining;
              const pct = total > 0 ? (used / total) * 100 : 0;

              return (
                <div
                  key={type}
                  className={`${config.border} rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className={labelClasses}>{type} Leave</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                          {remaining}
                        </span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">
                          / {total}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        days remaining
                      </p>
                    </div>
                    <div className={`rounded-xl ${config.iconBg} p-3`}>
                      <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      <span>{used} used</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full ${config.progressBar} transition-all duration-500`}
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
          <p className={`${labelClasses} mb-3`}>Upcoming Leaves</p>
          <div className="space-y-3">
            {upcomingLeaves.map((leave) => {
              const tConfig = typeConfig[leave.type] || typeConfig.casual;

              return (
                <div
                  key={leave._id}
                  className="flex flex-col gap-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tConfig.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${tConfig.dot}`} />
                      {tConfig.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <CalendarDays className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      {formatDate(leave.startDate)} &mdash; {formatDate(leave.endDate)}
                    </span>
                    <span className="rounded-md bg-white dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-700">
                      {leave.days} day{leave.days > 1 ? "s" : ""}
                    </span>
                  </div>
                  {leave.reason && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-right sm:max-w-xs truncate">
                      {leave.reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Leave History ── */}
      <div>
        <p className={`${labelClasses} mb-3`}>Leave History</p>

        {leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20 px-4 text-center">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
              <CalendarDays className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No leave requests found
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Your leave history will appear here once you apply for leave
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table (hidden on mobile) ── */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Type</th>
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Date Range</th>
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Days</th>
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Status</th>
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {leaves.map((leave) => {
                    const sConfig = statusConfig[leave.status] || statusConfig.pending;
                    const tConfig = typeConfig[leave.type] || typeConfig.casual;

                    return (
                      <tr
                        key={leave._id}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tConfig.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${tConfig.dot}`} />
                            {tConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(leave.startDate)} &mdash; {formatDate(leave.endDate)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {leave.days} day{leave.days > 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${sConfig.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                            {sConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {leave.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Card List (hidden on desktop) ── */}
            <div className="space-y-3 md:hidden">
              {leaves.map((leave) => {
                const sConfig = statusConfig[leave.status] || statusConfig.pending;
                const tConfig = typeConfig[leave.type] || typeConfig.casual;

                return (
                  <div
                    key={leave._id}
                    className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
                  >
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tConfig.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${tConfig.dot}`} />
                        {tConfig.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${sConfig.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                        {sConfig.label}
                      </span>
                    </div>

                    {/* Date range + days */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        {formatDate(leave.startDate)} &mdash; {formatDate(leave.endDate)}
                      </span>
                      <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {leave.days} day{leave.days > 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Reason */}
                    <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                      {leave.reason}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {pagination.page}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {pagination.pages}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
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
