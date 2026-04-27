import { useState, useEffect, type FormEvent } from "react";
import {
  Plus, X, CheckCircle, XCircle, CalendarDays, Clock, Briefcase, Heart,
  ChevronLeft, ChevronRight, Trash2, Laptop, Gift, LayoutDashboard, Sparkles,
  
} from "lucide-react";
import { leaveApi } from "../../api/leaveApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import type { LeaveRequest, LeaveBalance, Pagination } from "../../types";
import toast from "react-hot-toast";
import LeaveApply from "../leave-apply/LeaveApply";
import WFHRequests from "../wfh-requests/WFHRequests";
import CompOff from "../comp-off/CompOff";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

const statusConfig: Record<string, { dot: string; badge: string; label: string; gradient: string }> = {
  pending: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    label: "Pending",
    gradient: "from-amber-500 to-orange-600",
  },
  approved: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    label: "Approved",
    gradient: "from-emerald-500 to-teal-600",
  },
  rejected: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    label: "Rejected",
    gradient: "from-rose-500 to-pink-600",
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
    dot: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20",
    label: "Comp-Off",
    gradient: "from-indigo-500 to-purple-600",
  },
};

const balanceCardConfig: Record<
  string,
  { icon: typeof CalendarDays; gradient: string; label: string }
> = {
  casual: { icon: Briefcase, gradient: "from-sky-500 to-indigo-600", label: "Personal Leave" },
  sick: { icon: Heart, gradient: "from-orange-500 to-rose-600", label: "Sick Leave" },
  earned: { icon: Clock, gradient: "from-purple-500 to-fuchsia-600", label: "Earned Leave" },
  compoff: { icon: Gift, gradient: "from-indigo-500 to-purple-600", label: "Comp-Off" },
};

const inputClasses =
  "w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-gray-400 dark:placeholder:text-gray-500";

const modalLabel = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

export default function Leaves() {
  const { isAdmin, isManager } = useAuth();
  const confirm = useConfirm();
  const canApprove = isAdmin || isManager;
  const [section, setSection] = useState<"leaves" | "apply" | "wfh" | "compoff">("leaves");
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
              <CalendarDays className="h-10 w-10 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                {canApprove ? "Approvals & your leaves" : "Your leave workspace"}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Leave <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Management</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Track and manage your leave requests</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {balance && (
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Days remaining</p>
                <p className="text-xl font-bold tracking-tight">{totalRemaining}</p>
              </div>
            )}
            <button
              onClick={() => setSection("apply")}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
            >
              <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                <Plus className="h-3.5 w-3.5 text-white" />
              </span>
              Apply Leave
            </button>
          </div>
        </div>
      </div>

      {/* ── Section Tabs ── */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
        {([
          { id: "leaves", label: "Leave Dashboard", icon: LayoutDashboard },
          { id: "apply", label: "Apply Leave", icon: Plus },
          { id: "wfh", label: "WFH Requests", icon: Laptop },
          { id: "compoff", label: "Comp-Off", icon: Gift },
        ] as const).map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`group inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition-all sm:flex-none ${
                active
                  ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                  : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
              }`}
            >
              <s.icon
                className={`h-4 w-4 transition-colors ${
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                }`}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      {section === "apply" && <LeaveApply />}
      {section === "wfh" && <WFHRequests />}
      {section === "compoff" && <CompOff />}

      {/* ── Leave Balance Cards ── */}
      {section === "leaves" && balance && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["casual", "sick", "compoff"] as const).map((type) => {
            const config = balanceCardConfig[type];
            if (!config) return null;
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
                      <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{remaining}</span>
                      <span className="text-sm text-gray-400 dark:text-gray-500">/ {total}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{used} used this year</p>
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
      )}

      {/* ── My / All Tabs ── */}
      {section === "leaves" && canApprove && (
        <div className="inline-flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
          {(["my", "requests"] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
                }`}
              >
                {t === "my" ? "My Leaves" : "All Requests"}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Leave Requests ── */}
      {section === "leaves" && (
        <div className="space-y-3">
          {leaves.length === 0 ? (
            <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
              <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                <CalendarDays className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No leave requests found</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Leave requests will appear here once created</p>
            </div>
          ) : (
            leaves.map((leave) => {
              const sConfig = statusConfig[leave.status] || statusConfig.pending;
              const tConfig = typeConfig[leave.type] || typeConfig.casual;
              const start = new Date(leave.startDate);

              return (
                <div key={leave._id} className={`${cardCls} p-5`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${tConfig.gradient} text-white shadow-lg ring-1 ring-white/10`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                          {start.toLocaleDateString(undefined, { month: "short" })}
                        </p>
                        <p className="text-lg font-bold leading-none">{start.getDate()}</p>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        {/* Name + Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          {tab === "requests" && (
                            <span className="mr-1 text-sm font-semibold text-gray-900 dark:text-white">
                              {(leave.userId as any)?.name || "—"}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${tConfig.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${tConfig.dot}`} />
                            {tConfig.label}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sConfig.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                            {sConfig.label}
                          </span>
                        </div>

                        {/* Date range + days */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                            {new Date(leave.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {" — "}
                            {new Date(leave.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <span className="rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                            {leave.days} day{leave.days > 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Reason */}
                        {leave.reason && (
                          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{leave.reason}</p>
                        )}

                        {/* Rejection comment */}
                        {leave.rejectionComment && (
                          <div className="flex items-start gap-2 rounded-lg border border-rose-200/70 bg-rose-50/60 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                            <div>
                              <p className={`${labelCls} text-rose-600 dark:text-rose-400`}>Rejection Reason</p>
                              <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{leave.rejectionComment}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
                      {tab === "requests" && leave.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(leave._id)}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10 transition-all hover:shadow-xl active:scale-[0.98] sm:w-auto"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectId(leave._id);
                              setRejectComment("");
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-50 dark:border-rose-500/30 dark:bg-gray-900 dark:text-rose-400 dark:hover:bg-rose-500/10 sm:w-auto"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </>
                      )}
                      {tab === "my" && leave.status === "pending" && (
                        <button
                          onClick={() => handleDelete(leave._id)}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
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
      )}

      {/* ── Pagination ── */}
      {section === "leaves" && pagination && pagination.pages > 1 && (
        <div className={`${cardCls} flex items-center justify-between p-3`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
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

      {/* ── Apply Leave Modal ── */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            {/* Header */}
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Apply Leave</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Submit a new leave request</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApply(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleApply} className="space-y-4 p-5">
              <div>
                <label className={modalLabel}>Leave Type</label>
                <select
                  required
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className={inputClasses}
                >
                  <option value="casual">Personal</option>
                  <option value="sick">Sick</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="compoff">Comp-Off</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={modalLabel}>Start Date</label>
                  <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className={modalLabel}>End Date</label>
                  <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClasses} />
                </div>
              </div>
              <div>
                <label className={modalLabel}>Reason</label>
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
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
                >
                  {saving ? "Applying..." : "Apply"}
                </button>
              </div>
            </form>
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
                    <XCircle className="h-5 w-5 text-white" />
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
              <div>
                <label className={modalLabel}>Rejection Reason</label>
                <textarea
                  rows={3}
                  placeholder="Reason for rejection (optional)"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setRejectId(null)}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl"
                >
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
