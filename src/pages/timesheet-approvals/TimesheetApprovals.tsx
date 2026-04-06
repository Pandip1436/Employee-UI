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
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { projectApi } from "../../api/projectApi";
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

const getUserEmail = (userId: User | string): string => {
  if (typeof userId === "object" && userId !== null) return (userId as User).email;
  return "";
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getProjectName = (p: Project | string): string => {
  if (typeof p === "object" && p !== null) return (p as Project).name;
  return String(p);
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ─── Config ─── */

const tsStatusConfig: Record<string, { dot: string; badge: string; label: string }> = {
  submitted: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    label: "Pending",
  },
  approved: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    label: "Approved",
  },
  rejected: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
    label: "Rejected",
  },
};

const projectStatusConfig: Record<string, { dot: string; badge: string; label: string }> = {
  active: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    label: "Active",
  },
  completed: {
    dot: "bg-gray-400 dark:bg-gray-500",
    badge: "bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20",
    label: "Completed",
  },
  "on-hold": {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    label: "On Hold",
  },
};

type Tab = "submitted" | "approved" | "rejected";

const tabs: { key: Tab; label: string }[] = [
  { key: "submitted", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const labelClasses =
  "text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

/* ─── Component ─── */
export default function TimesheetApprovals() {
  const [tab, setTab] = useState<Tab>("submitted");
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

  // Project detail modal
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);

  // Bulk select (pending tab only)
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* ── Data fetching ── */

  const fetchApprovals = () => {
    setLoading(true);
    weeklyTimesheetApi
      .getPendingApprovals({ page, limit: 10, status: tab })
      .then((res) => {
        setTimesheets(res.data.data);
        setPagination(res.data.pagination);
        setSelected(new Set());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    fetchApprovals();
  }, [page, tab]);

  /* ── Actions ── */

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

  const handleProjectClick = (projectId: Project | string) => {
    const id = typeof projectId === "object" ? projectId._id : projectId;
    setProjectLoading(true);
    projectApi
      .getById(id)
      .then((res) => setProjectDetail(res.data.data ?? null))
      .catch(() => toast.error("Failed to load project details"))
      .finally(() => setProjectLoading(false));
  };

  const isPending = tab === "submitted";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Timesheet Approvals
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review and manage employee timesheet submissions
            </p>
          </div>
        </div>

        {isPending && timesheets.length > 0 && (
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

      {/* ── Tabs ── */}
      <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
        </div>
      ) : timesheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-20 px-4 text-center">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
            <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No {tabs.find((t) => t.key === tab)?.label.toLowerCase()} timesheets
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {isPending
              ? "All submitted timesheets have been reviewed"
              : `Timesheets will appear here once ${tab}`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {timesheets.map((ts) => {
            const userName = getUserName(ts.userId);
            const userEmail = getUserEmail(ts.userId);
            const sConfig = tsStatusConfig[ts.status] || tsStatusConfig.submitted;

            return (
              <div
                key={ts._id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 transition-all hover:shadow-md"
              >
                {/* Top: avatar + info + actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Avatar + user info */}
                  <div className="flex items-center gap-3">
                    {isPending && (
                      <input
                        type="checkbox"
                        checked={selected.has(ts._id)}
                        onChange={() => toggleSelect(ts._id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    )}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                      {getInitials(userName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {userName}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {userEmail}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons (pending tab only) */}
                  {isPending && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handlePreview(ts._id)}
                        title="Preview timesheet"
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleApprove(ts._id)}
                        disabled={actionLoading === ts._id}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-40"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectId(ts._id);
                          setRejectComment("");
                        }}
                        disabled={actionLoading === ts._id}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-40"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Status badge + preview (approved / rejected tabs) */}
                  {!isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreview(ts._id)}
                        title="Preview timesheet"
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                      <span
                        className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${sConfig.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                        {sConfig.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Detail chips */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <p className={labelClasses}>Week Range</p>
                    <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                      {formatDate(ts.weekStart)} &mdash; {formatDate(ts.weekEnd)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <p className={labelClasses}>Total Hours</p>
                    <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                      {ts.totalHours}h
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <p className={labelClasses}>Submitted</p>
                    <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                      {ts.submittedAt ? formatDate(ts.submittedAt) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <p className={labelClasses}>
                      {ts.status === "approved" ? "Approved" : ts.status === "rejected" ? "Rejected" : "Entries"}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                      {ts.status === "approved" || ts.status === "rejected"
                        ? ts.approvedAt
                          ? formatDate(ts.approvedAt)
                          : "—"
                        : `${ts.entries.length} row${ts.entries.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>

                {/* Manager comment (rejected) */}
                {ts.managerComment && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-3 py-2.5">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                    <p className="text-sm text-rose-700 dark:text-rose-300">
                      {ts.managerComment}
                    </p>
                  </div>
                )}

                {/* Approved by info */}
                {ts.approvedBy && !isPending && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {ts.status === "approved" ? "Approved" : "Reviewed"} by{" "}
                      <span className="font-medium text-gray-600 dark:text-gray-300">
                        {getUserName(ts.approvedBy)}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {pagination.page}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {pagination.pages}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
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
                            <td className="py-2.5 pr-3 font-medium">
                              <button
                                onClick={() => handleProjectClick(entry.projectId)}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline text-left"
                              >
                                {getProjectName(entry.projectId)}
                              </button>
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
                {previewSheet.status === "submitted" && (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Project Detail Modal ── */}
      {(projectDetail || projectLoading) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Project Details
              </h2>
              <button
                onClick={() => setProjectDetail(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {projectLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
                </div>
              ) : projectDetail ? (
                <div className="space-y-4">
                  {/* Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {projectDetail.name}
                    </h3>
                    {(() => {
                      const cfg = projectStatusConfig[projectDetail.status] || projectStatusConfig.active;
                      return (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${cfg.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Client */}
                  <div>
                    <p className={labelClasses}>Client</p>
                    <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {projectDetail.client}
                    </p>
                  </div>

                  {/* Description */}
                  {projectDetail.description && (
                    <div>
                      <p className={labelClasses}>Description</p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {projectDetail.description}
                      </p>
                    </div>
                  )}

                  {/* Assigned Members */}
                  {projectDetail.assignedUsers && projectDetail.assignedUsers.length > 0 && (
                    <div>
                      <p className={labelClasses}>
                        Members ({projectDetail.assignedUsers.length})
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {projectDetail.assignedUsers.map((u) => {
                          const user = typeof u === "object" ? u : null;
                          if (!user) return null;
                          return (
                            <span
                              key={user._id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                                {user.name?.charAt(0).toUpperCase()}
                              </span>
                              {user.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Created */}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <p className={labelClasses}>Created By</p>
                      <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                        {typeof projectDetail.createdBy === "object"
                          ? projectDetail.createdBy.name
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className={labelClasses}>Created</p>
                      <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(projectDetail.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-gray-200 dark:border-gray-800 px-6 py-4">
              <button
                onClick={() => setProjectDetail(null)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-gray-800">
            {/* Modal header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/20">
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Reject Timesheet
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    The employee will see this comment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              rows={3}
              placeholder="Enter rejection reason..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              className="mb-5 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 resize-none"
            />

            {/* Modal actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setRejectId(null)}
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectId}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-40"
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
