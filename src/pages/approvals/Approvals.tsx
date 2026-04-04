import { useState, useEffect } from "react";
import { CheckCircle, XCircle, MessageSquare, X, ClipboardCheck, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { timesheetApi } from "../../api/timesheetApi";
import type { Timesheet, Pagination } from "../../types";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function Approvals() {
  const [entries, setEntries] = useState<Timesheet[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"submitted" | "approved" | "rejected">("submitted");

  // Rejection modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const fetchEntries = () => {
    timesheetApi
      .getAll({ page, limit: 10, status: tab, sort: "-date" })
      .then((res) => {
        setEntries(res.data.data);
        setPagination(res.data.pagination);
      }).catch(() => {});
  };

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    fetchEntries();
  }, [page, tab]);

  const handleApprove = async (id: string) => {
    try {
      await timesheetApi.approve(id, { status: "approved" });
      toast.success("Timesheet approved!");
      fetchEntries();
    } catch {
      // handled
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await timesheetApi.approve(rejectId, {
        status: "rejected",
        rejectionComment: comment,
      });
      toast.success("Timesheet rejected.");
      setRejectId(null);
      setComment("");
      fetchEntries();
    } catch {
      // handled
    }
  };

  const tabs = [
    { key: "submitted" as const, label: "Pending", count: 0 },
    { key: "approved" as const, label: "Approved", count: 0 },
    { key: "rejected" as const, label: "Rejected", count: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
          <ClipboardCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Approval Workflow
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review and manage timesheet submissions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                tab === t.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-20">
            <ClipboardCheck className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm font-medium text-gray-400 dark:text-gray-500">
              No {tab} timesheets
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry._id}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 transition-all hover:shadow-md"
            >
              {/* Top row: avatar + info and action buttons */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Avatar + user info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                    {(entry.userId as any)?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">
                      {(entry.userId as any)?.name || "Unknown"}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {(entry.userId as any)?.email}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                {tab === "submitted" && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleApprove(entry._id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:flex-none"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejectId(entry._id);
                        setComment("");
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 sm:flex-none"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Detail chips */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Project
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-gray-900 dark:text-white">
                    {entry.projectId?.name || "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Date
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                    {new Date(entry.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Hours
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                    {entry.hours}h
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Description
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-gray-900 dark:text-white">
                    {entry.description || "—"}
                  </p>
                </div>
              </div>

              {/* Rejection comment */}
              {entry.rejectionComment && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-3 py-2.5">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                  <p className="text-sm text-rose-700 dark:text-rose-300">
                    {entry.rejectionComment}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-gray-800">
            {/* Modal header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/20">
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Reject Timesheet
                </h2>
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
              placeholder="Reason for rejection (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mb-5 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20"
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
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
