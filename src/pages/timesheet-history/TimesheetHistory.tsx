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
  History,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { WeeklyTimesheetData, Pagination } from "../../types";
import { useConfirm } from "../../context/ConfirmContext";

/* ── Status config ── */
const statusConfig: Record<string, { dot: string; badge: string; label: string; gradient: string }> = {
  draft: {
    dot: "bg-gray-400",
    badge:
      "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    label: "Draft",
    gradient: "from-gray-500 to-gray-600",
  },
  submitted: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    label: "Submitted",
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

const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const weekEndFrom = (weekStart: string) => {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return end;
};

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
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <History className="h-10 w-10 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Your submission log
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Timesheet <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">History</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Every weekly timesheet you've submitted, all in one place</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
            <Filter className="h-3.5 w-3.5 text-indigo-200" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-0 bg-transparent px-1 py-0.5 text-sm font-semibold text-white outline-none focus:ring-0 [color-scheme:dark]"
            >
              <option value="" className="bg-gray-900 text-white">All statuses</option>
              <option value="draft" className="bg-gray-900 text-white">Draft</option>
              <option value="submitted" className="bg-gray-900 text-white">Submitted</option>
              <option value="approved" className="bg-gray-900 text-white">Approved</option>
              <option value="rejected" className="bg-gray-900 text-white">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading timesheets...</p>
        </div>
      ) : timesheets.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No timesheets found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {statusFilter ? "Try a different status filter" : "Your submissions will appear here once you start logging hours"}
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <tr>
                    {["Week Range", "Total Hours", "Status", "Entries", ""].map((h, i) => (
                      <th key={i} className={`px-5 py-3 ${labelCls} ${i === 4 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {timesheets.map((ts) => {
                    const sConfig = statusConfig[ts.status] || statusConfig.draft;
                    const start = new Date(ts.weekStart);
                    return (
                      <tr
                        key={ts._id}
                        className="group transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${sConfig.gradient} text-white shadow-lg ring-1 ring-white/10`}>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                                {start.toLocaleDateString(undefined, { month: "short" })}
                              </p>
                              <p className="text-sm font-bold leading-none">{start.getDate()}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {formatDate(ts.weekStart)} — {formatDate(weekEndFrom(ts.weekStart))}
                              </p>
                              <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <CalendarDays className="h-3 w-3" />
                                Week of {formatDate(ts.weekStart)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                            <Clock className="h-3.5 w-3.5" />
                            {ts.totalHours}h
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sConfig.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                            {sConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                            {ts.entries.length} {ts.entries.length === 1 ? "entry" : "entries"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {canDelete(ts.status) && (
                              <button
                                onClick={() =>
                                  requestDelete(
                                    ts._id,
                                    `${formatDate(ts.weekStart)} — ${formatDate(weekEndFrom(ts.weekStart))}`
                                  )
                                }
                                disabled={deletingId === ts._id}
                                title="Delete"
                                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            <Link
                              to={`/timesheet/${ts._id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-700 group-hover:translate-x-0 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-500/40 dark:hover:text-indigo-300"
                            >
                              View
                              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="space-y-3 md:hidden">
            {timesheets.map((ts) => {
              const sConfig = statusConfig[ts.status] || statusConfig.draft;
              const start = new Date(ts.weekStart);
              return (
                <div key={ts._id} className={`${cardCls} p-4`}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${sConfig.gradient} text-white shadow-lg ring-1 ring-white/10`}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                        {start.toLocaleDateString(undefined, { month: "short" })}
                      </p>
                      <p className="text-sm font-bold leading-none">{start.getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDate(ts.weekStart)} — {formatDate(weekEndFrom(ts.weekStart))}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold ${sConfig.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                          {sConfig.label}
                        </span>
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {ts.entries.length} {ts.entries.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                      {ts.totalHours}h
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200/70 pt-3 dark:border-gray-800/80">
                    <Link
                      to={`/timesheet/${ts._id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
                    >
                      View details <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {canDelete(ts.status) && (
                      <button
                        onClick={() =>
                          requestDelete(
                            ts._id,
                            `${formatDate(ts.weekStart)} — ${formatDate(weekEndFrom(ts.weekStart))}`
                          )
                        }
                        disabled={deletingId === ts._id}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
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
    </div>
  );
}
