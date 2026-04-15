import { useState, useEffect, type FormEvent } from "react";
import { Plus, X, CheckCircle, XCircle, CalendarDays, Clock, Briefcase, Heart, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { leaveApi } from "../../api/leaveApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import type { LeaveRequest, LeaveBalance, Pagination } from "../../types";
import toast from "react-hot-toast";

const statusConfig: Record<string, { dot: string; badge: string; label: string }> = {
  pending: {
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

const typeConfig: Record<string, { dot: string; badge: string; label: string }> = {
  casual: {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
    label: "Personal",
  },
  sick: {
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20",
    label: "Sick",
  },
  earned: {
    dot: "bg-purple-500",
    badge: "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20",
    label: "Earned",
  },
  unpaid: {
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-600 ring-1 ring-gray-500/20 dark:bg-gray-500/10 dark:text-gray-300 dark:ring-gray-500/20",
    label: "Unpaid",
  },
  compoff: {
    dot: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20",
    label: "Comp-Off",
  },
};

const balanceCardConfig: Record<string, { border: string; bg: string; icon: typeof CalendarDays; iconBg: string; iconColor: string; progressBar: string; valueColor: string }> = {
  casual: {
    border: "border-l-4 border-indigo-500",
    bg: "bg-blue-50/40 dark:bg-blue-500/5",
    icon: Briefcase,
    iconBg: "bg-blue-100 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    progressBar: "bg-blue-500",
    valueColor: "text-blue-700 dark:text-blue-400",
  },
  sick: {
    border: "border-l-4 border-orange-500",
    bg: "bg-orange-50/40 dark:bg-orange-500/5",
    icon: Heart,
    iconBg: "bg-orange-100 dark:bg-orange-500/10",
    iconColor: "text-orange-600 dark:text-orange-400",
    progressBar: "bg-orange-500",
    valueColor: "text-orange-700 dark:text-orange-400",
  },
  earned: {
    border: "border-l-4 border-purple-500",
    bg: "bg-purple-50/40 dark:bg-purple-500/5",
    icon: Clock,
    iconBg: "bg-purple-100 dark:bg-purple-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
    progressBar: "bg-purple-500",
    valueColor: "text-purple-700 dark:text-purple-400",
  },
  compoff: {
    border: "border-l-4 border-indigo-500",
    bg: "bg-indigo-50/40 dark:bg-indigo-500/5",
    icon: CalendarDays,
    iconBg: "bg-indigo-100 dark:bg-indigo-500/10",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    progressBar: "bg-indigo-500",
    valueColor: "text-indigo-700 dark:text-indigo-400",
  },
};

const inputClasses =
  "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500";

const labelClasses = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

export default function Leaves() {
  const { isAdmin, isManager } = useAuth();
  const confirm = useConfirm();
  const canApprove = isAdmin || isManager;
  const [tab, setTab] = useState<"my" | "requests">(canApprove ? "requests" : "my");
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [showApply, setShowApply] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  // Apply form
  const [leaveType, setLeaveType] = useState("casual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLeaves = () => {
    if (tab === "my") {
      leaveApi.getMyLeaves({ page, limit: 10 }).then((res) => {
        setLeaves(res.data.data);
        setPagination(res.data.pagination);
      }).catch(() => {});
    } else {
      leaveApi.getAll({ page, limit: 10, sort: "-createdAt" }).then((res) => {
        setLeaves(res.data.data);
        setPagination(res.data.pagination);
      }).catch(() => {});
    }
  };

  const fetchBalance = () => {
    leaveApi.getBalance().then((res) => setBalance(res.data.data!)).catch(() => {});
  };

  useEffect(() => { fetchBalance(); }, []);
  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { fetchLeaves(); }, [page, tab]);

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await leaveApi.apply({ type: leaveType, startDate, endDate, reason });
      toast.success("Leave applied!");
      setShowApply(false);
      setLeaveType("casual"); setStartDate(""); setEndDate(""); setReason("");
      fetchLeaves(); fetchBalance();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const handleApprove = async (id: string) => {
    try {
      await leaveApi.approve(id, { status: "approved" });
      toast.success("Leave approved!");
      fetchLeaves();
    } catch { /* interceptor */ }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await leaveApi.approve(rejectId, { status: "rejected", rejectionComment: rejectComment });
      toast.success("Leave rejected.");
      setRejectId(null); setRejectComment("");
      fetchLeaves();
    } catch { /* interceptor */ }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Cancel leave request?", description: "This leave request will be withdrawn. You can always re-apply later.", confirmLabel: "Cancel request", cancelLabel: "Keep" }))) return;
    try {
      await leaveApi.delete(id);
      toast.success("Leave cancelled.");
      fetchLeaves(); fetchBalance();
    } catch { /* interceptor */ }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Leave Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track and manage leave requests
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

      {/* Leave Balance Cards */}
      {balance && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["casual", "sick", "earned", "compoff"] as const).map((type) => {
            const config = balanceCardConfig[type];
            const Icon = config.icon;
            const used = balance[type].used;
            const total = balance[type].total;
            const remaining = balance[type].remaining;
            const pct = total > 0 ? (used / total) * 100 : 0;

            return (
              <div
                key={type}
                className={`${config.border} ${config.bg} rounded-xl border border-gray-200 dark:border-gray-800 p-5 transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {typeConfig[type]?.label || type} {type === "compoff" ? "" : "Leave"}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-3xl font-bold ${config.valueColor}`}>
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
      )}

      {/* Tabs */}
      {canApprove && (
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
          <div className="inline-flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
            {(["my", "requests"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {t === "my" ? "My Leaves" : "All Requests"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leave Requests */}
      <div className="space-y-3">
        {leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20 px-4 text-center">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
              <CalendarDays className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No leave requests found
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Leave requests will appear here once created
            </p>
          </div>
        ) : (
          leaves.map((leave) => {
            const sConfig = statusConfig[leave.status] || statusConfig.pending;
            const tConfig = typeConfig[leave.type] || typeConfig.casual;

            return (
              <div
                key={leave._id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md"
              >
                {/* Mobile-first layout */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-3">
                    {/* Name + Badges row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {tab === "requests" && (
                        <span className="mr-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {(leave.userId as any)?.name || "\u2014"}
                        </span>
                      )}
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
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        {new Date(leave.startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        &mdash;{" "}
                        {new Date(leave.endDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {leave.days} day{leave.days > 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Reason */}
                    <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                      {leave.reason}
                    </p>

                    {/* Rejection comment */}
                    {leave.rejectionComment && (
                      <div className="flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 p-3">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                        <p className="text-sm text-rose-600 dark:text-rose-400">
                          {leave.rejectionComment}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                    {tab === "requests" && leave.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(leave._id)}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] sm:w-auto"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectId(leave._id);
                            setRejectComment("");
                          }}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-rose-700 hover:shadow-md active:scale-[0.98] sm:w-auto"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                    {tab === "my" && leave.status === "pending" && (
                      <button
                        onClick={() => handleDelete(leave._id)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 sm:w-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-medium text-gray-700 dark:text-gray-200">{pagination.page}</span> of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">{pagination.pages}</span>
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

      {/* Apply Leave Modal */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Apply Leave</h2>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Submit a new leave request
                </p>
              </div>
              <button
                onClick={() => setShowApply(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleApply} className="space-y-5">
              <div>
                <label className={labelClasses}>Leave Type</label>
                <select
                  required
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className={inputClasses}
                >
                  <option value="casual">Personal</option>
                  <option value="sick">Sick</option>
                  <option value="earned">Earned</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="compoff">Comp-Off</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses}>End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Reason</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for leave..."
                  className={inputClasses}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApply(false)}
                  className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {saving ? "Applying..." : "Apply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reject Leave</h2>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Provide a reason for rejection
                </p>
              </div>
              <button
                onClick={() => setRejectId(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className={labelClasses}>Rejection Reason</label>
              <textarea
                rows={3}
                placeholder="Reason for rejection (optional)"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setRejectId(null)}
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-rose-700 hover:shadow-md active:scale-[0.98]"
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
