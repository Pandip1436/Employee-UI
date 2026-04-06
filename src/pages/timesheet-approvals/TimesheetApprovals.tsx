import { useState, useEffect } from "react";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText,
  X,
  Users,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { WeeklyTimesheetData, Pagination, User, Project } from "../../types";

/* ─── Helpers ─── */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getUserName = (userId: User | string): string => {
  if (typeof userId === "object" && userId !== null) return (userId as User).name;
  return String(userId);
};

const getProjectName = (p: Project | string): string => {
  if (typeof p === "object" && p !== null) return (p as Project).name;
  return String(p);
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const labelClasses =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

/* ─── Component ─── */
export default function TimesheetApprovals() {
  const [timesheets, setTimesheets] = useState<WeeklyTimesheetData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Reject modal state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Preview modal
  const [previewSheet, setPreviewSheet] = useState<WeeklyTimesheetData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchApprovals = () => {
    setLoading(true);
    weeklyTimesheetApi
      .getPendingApprovals({ page, limit: 10 })
      .then((res) => {
        setTimesheets(res.data.data);
        setPagination(res.data.pagination);
        setSelected(new Set());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApprovals();
  }, [page]);

  const handleApprove = (id: string) => {
    setActionLoading(id);
    weeklyTimesheetApi
      .approve(id, "approved")
      .then(() => {
        toast.success("Timesheet approved");
        fetchApprovals();
      })
      .catch(() => toast.error("Failed to approve"))
      .finally(() => setActionLoading(null));
  };

  const handleReject = () => {
    if (!rejectId) return;
    if (!rejectComment.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setActionLoading(rejectId);
    weeklyTimesheetApi
      .approve(rejectId, "rejected", rejectComment.trim())
      .then(() => {
        toast.success("Timesheet rejected");
        setRejectId(null);
        setRejectComment("");
        fetchApprovals();
      })
      .catch(() => toast.error("Failed to reject"))
      .finally(() => setActionLoading(null));
  };

  const handleBulkApprove = () => {
    if (selected.size === 0) {
      toast.error("Select at least one timesheet");
      return;
    }
    setActionLoading("bulk");
    Promise.all(
      Array.from(selected).map((id) => weeklyTimesheetApi.approve(id, "approved"))
    )
      .then(() => {
        toast.success(`${selected.size} timesheet(s) approved`);
        fetchApprovals();
      })
      .catch(() => toast.error("Some approvals failed"))
      .finally(() => setActionLoading(null));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === timesheets.length) setSelected(new Set());
    else setSelected(new Set(timesheets.map((t) => t._id)));
  };

  const handlePreview = (id: string) => {
    setPreviewLoading(true);
    weeklyTimesheetApi
      .getDetail(id)
      .then((res) => setPreviewSheet(res.data.data ?? null))
      .catch(() => toast.error("Failed to load timesheet details"))
      .finally(() => setPreviewLoading(false));
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Timesheet Approvals
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review and approve submitted timesheets from your team
          </p>
        </div>

        {timesheets.length > 0 && (
          <button
            onClick={handleBulkApprove}
            disabled={selected.size === 0 || actionLoading === "bulk"}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve Selected ({selected.size})
          </button>
        )}
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
            No pending timesheets
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            All submitted timesheets have been reviewed
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === timesheets.length && timesheets.length > 0}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Employee</th>
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Week Range</th>
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Total Hours</th>
                  <th className={`${labelClasses} px-5 py-3 text-left`}>Submitted</th>
                  <th className={`${labelClasses} px-5 py-3 text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {timesheets.map((ts) => (
                  <tr
                    key={ts._id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(ts._id)}
                        onChange={() => toggleSelect(ts._id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Users className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        {getUserName(ts.userId)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
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
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {ts.submittedAt ? formatDate(ts.submittedAt) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePreview(ts._id)}
                          title="Preview timesheet"
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-600/20 dark:ring-indigo-500/20 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleApprove(ts._id)}
                          disabled={actionLoading === ts._id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600/20 dark:ring-emerald-500/20 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-40"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectId(ts._id);
                            setRejectComment("");
                          }}
                          disabled={actionLoading === ts._id}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 ring-1 ring-rose-600/20 dark:ring-rose-500/20 transition-all hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-40"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="space-y-3 md:hidden">
            {timesheets.map((ts) => (
              <div
                key={ts._id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(ts._id)}
                      onChange={() => toggleSelect(ts._id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {getUserName(ts.userId)}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {ts.totalHours}h
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                    {formatDate(ts.weekStart)} &mdash; {formatDate(ts.weekEnd)}
                  </span>
                  {ts.submittedAt && (
                    <span className="text-xs text-gray-400">
                      Submitted {formatDate(ts.submittedAt)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(ts._id)}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-600/20 dark:ring-indigo-500/20 transition-all hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleApprove(ts._id)}
                    disabled={actionLoading === ts._id}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600/20 dark:ring-emerald-500/20 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setRejectId(ts._id);
                      setRejectComment("");
                    }}
                    disabled={actionLoading === ts._id}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 ring-1 ring-rose-600/20 dark:ring-rose-500/20 transition-all hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-40"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
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

      {/* ── Preview Modal ── */}
      {(previewSheet || previewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Timesheet Preview
                </h2>
                {previewSheet && (
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {getUserName(previewSheet.userId)} &middot;{" "}
                    {formatDate(previewSheet.weekStart)} &mdash; {formatDate(previewSheet.weekEnd)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setPreviewSheet(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
                </div>
              ) : previewSheet && previewSheet.entries.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">
                  No entries in this timesheet.
                </p>
              ) : previewSheet ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className={`${labelClasses} py-2 pr-3 text-left`}>Project</th>
                        <th className={`${labelClasses} py-2 pr-3 text-left`}>Task</th>
                        <th className={`${labelClasses} py-2 pr-3 text-left`}>Activity</th>
                        {DAY_LABELS.map((d) => (
                          <th key={d} className={`${labelClasses} py-2 px-2 text-center w-12`}>
                            {d}
                          </th>
                        ))}
                        <th className={`${labelClasses} py-2 pl-2 text-right`}>Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {previewSheet.entries.map((entry, idx) => {
                        const rowTotal = (entry.hours || []).reduce((s, h) => s + h, 0);
                        return (
                          <tr key={idx}>
                            <td className="py-2.5 pr-3 font-medium text-gray-700 dark:text-gray-300">
                              {getProjectName(entry.projectId)}
                            </td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                              {entry.task || "—"}
                            </td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                              {entry.activityType || "—"}
                            </td>
                            {DAY_LABELS.map((_, di) => (
                              <td key={di} className="py-2.5 px-2 text-center text-gray-600 dark:text-gray-400">
                                {entry.hours?.[di] || 0}
                              </td>
                            ))}
                            <td className="py-2.5 pl-2 text-right font-semibold text-gray-700 dark:text-gray-300">
                              {rowTotal}h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 dark:border-gray-700">
                        <td colSpan={3} className="py-2.5 pr-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                          Total
                        </td>
                        {DAY_LABELS.map((_, di) => {
                          const dayTotal = previewSheet.entries.reduce(
                            (s, e) => s + (e.hours?.[di] || 0), 0
                          );
                          return (
                            <td key={di} className="py-2.5 px-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                              {dayTotal}
                            </td>
                          );
                        })}
                        <td className="py-2.5 pl-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                          {previewSheet.totalHours}h
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  {previewSheet.entries.some((e) => e.notes) && (
                    <div className="mt-4 space-y-2">
                      <p className={labelClasses}>Notes</p>
                      {previewSheet.entries
                        .filter((e) => e.notes)
                        .map((e, i) => (
                          <div key={i} className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {getProjectName(e.projectId)}:
                            </span>{" "}
                            {e.notes}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer actions */}
            {previewSheet && (
              <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-800 px-6 py-4">
                <button
                  onClick={() => setPreviewSheet(null)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleApprove(previewSheet._id);
                    setPreviewSheet(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setRejectId(previewSheet._id);
                    setRejectComment("");
                    setPreviewSheet(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-rose-700"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Reject Timesheet
              </h2>
              <button
                onClick={() => setRejectId(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please provide a reason for rejecting this timesheet. The employee will see this comment.
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectId(null)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectId}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-rose-700 disabled:opacity-40"
              >
                Reject Timesheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
