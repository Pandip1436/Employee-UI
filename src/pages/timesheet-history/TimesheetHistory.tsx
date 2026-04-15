import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileText,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { WeeklyTimesheetData, Pagination } from "../../types";
import { useConfirm } from "../../context/ConfirmContext";

/* ─── Status badge config ─── */
const statusConfig: Record<string, { dot: string; badge: string; label: string }> = {
  draft: {
    dot: "bg-gray-400",
    badge:
      "bg-gray-50 text-gray-600 ring-1 ring-gray-500/20 dark:bg-gray-500/10 dark:text-gray-300 dark:ring-gray-500/20",
    label: "Draft",
  },
  submitted: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    label: "Submitted",
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

/* ─── Helpers ─── */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const labelClasses =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

/* ─── Component ─── */
export default function TimesheetHistory() {
  const [timesheets, setTimesheets] = useState<WeeklyTimesheetData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirm = useConfirm();

  const requestDelete = async (id: string, range: string) => {
    const ok = await confirm({
      title: "Delete timesheet?",
      description: (
        <>
          You're about to delete the timesheet for{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{range}</span>. This action
          cannot be undone.
        </>
      ),
      confirmLabel: "Delete",
      cancelLabel: "Keep",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await weeklyTimesheetApi.delete(id);
      toast.success("Timesheet deleted.");
      setTimesheets((prev) => prev.filter((t) => t._id !== id));
    } catch {
      // interceptor
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (status: string) => status === "draft" || status === "rejected";

  const fetchHistory = () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 10 };
    if (statusFilter) params.status = statusFilter;

    weeklyTimesheetApi
      .getHistory(params)
      .then((res) => {
        setTimesheets(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchHistory();
  }, [page, statusFilter]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Timesheet History
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View and track all your weekly timesheet submissions
          </p>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
        </div>
      ) : timesheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20 px-4 text-center">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
            <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No timesheets found
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Your timesheet history will appear here once you start logging hours
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Week Range</th>
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Total Hours</th>
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Status</th>
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Entries</th>
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {timesheets.map((ts) => {
                  const sConfig = statusConfig[ts.status] || statusConfig.draft;
                  return (
                    <tr
                      key={ts._id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                          <CalendarDays className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                          {formatDate(ts.weekStart)} &mdash; {formatDate(ts.weekEnd)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                          {ts.totalHours}h
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
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {ts.entries.length} {ts.entries.length === 1 ? "entry" : "entries"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/timesheet/${ts._id}`}
                            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                          >
                            View Details
                          </Link>
                          {canDelete(ts.status) && (
                            <button
                              onClick={() =>
                                requestDelete(
                                  ts._id,
                                  `${formatDate(ts.weekStart)} — ${formatDate(ts.weekEnd)}`
                                )
                              }
                              disabled={deletingId === ts._id}
                              title="Delete"
                              className="inline-flex items-center gap-1 rounded-md p-1.5 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="space-y-3 md:hidden">
            {timesheets.map((ts) => {
              const sConfig = statusConfig[ts.status] || statusConfig.draft;
              return (
                <div
                  key={ts._id}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${sConfig.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                      {sConfig.label}
                    </span>
                    <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {ts.entries.length} {ts.entries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <CalendarDays className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                    {formatDate(ts.weekStart)} &mdash; {formatDate(ts.weekEnd)}
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                    {ts.totalHours} hours
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                    <Link
                      to={`/timesheet/${ts._id}`}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      View Details
                    </Link>
                    {canDelete(ts.status) && (
                      <button
                        onClick={() =>
                          requestDelete(
                            ts._id,
                            `${formatDate(ts.weekStart)} — ${formatDate(ts.weekEnd)}`
                          )
                        }
                        disabled={deletingId === ts._id}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

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
