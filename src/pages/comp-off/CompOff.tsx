import { useState, useEffect, type FormEvent } from "react";
import {
  Plus, X, CheckCircle, XCircle, Trash2, ArrowRight, CalendarDays, Gift,
  Sparkles, Clock, AlertCircle, Inbox, ChevronLeft, ChevronRight,
} from "lucide-react";
import { compOffApi } from "../../api/compOffApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import type { CompOffRequest, CompOffBalance, Pagination } from "../../types";
import toast from "react-hot-toast";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";
const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

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

const statusStyle: Record<string, { bg: string; dot: string; label: string }> = {
  pending: {
    bg: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    dot: "bg-amber-500", label: "Pending",
  },
  approved: {
    bg: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    dot: "bg-emerald-500", label: "Approved",
  },
  rejected: {
    bg: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    dot: "bg-rose-500", label: "Rejected",
  },
  used: {
    bg: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    dot: "bg-sky-500", label: "Used",
  },
  expired: {
    bg: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-500/20",
    dot: "bg-gray-500", label: "Expired",
  },
  cancelled: {
    bg: "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-500/20",
    dot: "bg-gray-400", label: "Cancelled",
  },
};

const daysUntil = (iso?: string) => {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
};

export default function CompOff() {
  const { isAdmin, isManager } = useAuth();
  const confirm = useConfirm();
  const canApprove = isAdmin || isManager;
  const [tab, setTab] = useState<"my" | "all">("my");
  const [requests, setRequests] = useState<CompOffRequest[]>([]);
  const [balance, setBalance] = useState<CompOffBalance | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [showApply, setShowApply] = useState(false);
  const [workedDate, setWorkedDate] = useState("");
  const [dayOffDate, setDayOffDate] = useState("");
  const [hoursWorked, setHoursWorked] = useState<number | "">("");
  const [dayType, setDayType] = useState<"full" | "half">("full");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRequests = () => {
    const api = tab === "my" ? compOffApi.getMyRequests : compOffApi.getAll;
    api({ page, limit: 10 })
      .then((r) => { setRequests(r.data.data); setPagination(r.data.pagination); })
      .catch(() => { /* interceptor */ });
  };
  const fetchBalance = () => { compOffApi.getBalance().then((r) => setBalance(r.data.data!)).catch(() => { /* interceptor */ }); };

  useEffect(() => { fetchBalance(); }, []);
  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { fetchRequests(); }, [page, tab]);

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!workedDate) return toast.error("Pick the date you worked.");
    if (!dayOffDate) return toast.error("Pick the day-off date you want to redeem.");
    if (new Date(dayOffDate) <= new Date(workedDate)) return toast.error("Day-off date must be after worked date.");
    if (!hoursWorked || hoursWorked < 4) return toast.error("Minimum 4 hours of work required.");
    setSaving(true);
    try {
      await compOffApi.apply({ workedDate, dayOffDate, hoursWorked: Number(hoursWorked), reason, dayType });
      toast.success("Comp-off request submitted!");
      setShowApply(false);
      setWorkedDate(""); setDayOffDate(""); setHoursWorked(""); setReason(""); setDayType("full");
      fetchRequests(); fetchBalance();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const handleApprove = async (id: string, status: "approved" | "rejected") => {
    try { await compOffApi.approve(id, status); toast.success(`Request ${status}.`); fetchRequests(); fetchBalance(); } catch { /* interceptor */ }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Cancel comp-off request?", description: "This request will be withdrawn.", confirmLabel: "Cancel request", cancelLabel: "Keep" }))) return;
    try { await compOffApi.delete(id); toast.success("Cancelled."); fetchRequests(); fetchBalance(); } catch { /* interceptor */ }
  };

  const balanceTiles = balance
    ? [
        { label: "Earned", value: balance.earned ?? 0, icon: Gift, gradient: "from-emerald-500 to-teal-600" },
        { label: "Available", value: balance.available ?? 0, icon: CheckCircle, gradient: "from-indigo-500 to-purple-600" },
        { label: "Used", value: balance.used ?? 0, icon: Clock, gradient: "from-sky-500 to-blue-600" },
        { label: "Pending", value: balance.pending ?? 0, icon: AlertCircle, gradient: "from-amber-500 to-orange-600" },
        { label: "Expiring Soon", value: balance.expiringSoon ?? 0, icon: Clock, gradient: "from-orange-500 to-rose-600" },
        { label: "Expired", value: balance.expired ?? 0, icon: XCircle, gradient: "from-gray-500 to-gray-700" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <Gift className="h-10 w-10 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Worked-date → day-off
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Compensatory <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Off</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Manage comp-off earned from extra work days</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {balance && (
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Available</p>
                <p className="text-xl font-bold tracking-tight">{balance.available ?? 0}</p>
              </div>
            )}
            <button
              onClick={() => setShowApply(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
            >
              <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                <Plus className="h-3.5 w-3.5 text-white" />
              </span>
              Apply Comp-Off
            </button>
          </div>
        </div>
      </div>

      {/* ── Balance Tiles ── */}
      {balance && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {balanceTiles.map((c) => (
            <div key={c.label} className={`${cardCls} p-4`}>
              <div className="flex items-center gap-3">
                <div className={`rounded-lg bg-gradient-to-br ${c.gradient} p-2 shadow-sm ring-1 ring-white/10`}>
                  <c.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className={labelCls}>{c.label}</p>
                  <p className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">{c.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── My / All Tabs ── */}
      {canApprove && (
        <div className="inline-flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
          {(["my", "all"] as const).map((t) => {
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
                {t === "my" ? "My Requests" : "All Requests"}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Request cards ── */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <Inbox className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No comp-off requests yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Click "Apply Comp-Off" to submit one</p>
          </div>
        ) : (
          requests.map((r) => {
            const s = statusStyle[r.status] || statusStyle.pending;
            const days = daysUntil(r.dayOffDate);
            const upcoming = r.status === "approved" && days != null && days <= 7 && days >= 0;
            const userName = (r.userId as any)?.name || "—";
            const userEmail = (r.userId as any)?.email || "";
            const worked = new Date(r.workedDate);

            return (
              <div key={r._id} className={`${cardCls} relative overflow-hidden p-5`}>
                {upcoming && (
                  <span aria-hidden className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />
                )}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg ring-1 ring-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                        {worked.toLocaleDateString(undefined, { month: "short" })}
                      </p>
                      <p className="text-lg font-bold leading-none">{worked.getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {tab === "all" ? (
                          <>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(userName)} text-[10px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
                              {userName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Comp-off request</p>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-[11px] font-semibold capitalize text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                          {r.dayType || "full"} day
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                          {r.hoursWorked ?? "—"}h worked
                        </span>
                        {upcoming && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                            <Clock className="h-2.5 w-2.5" />
                            In {days}d
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {r.status === "pending" && (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
                      {tab === "all" ? (
                        <>
                          <button
                            onClick={() => handleApprove(r._id, "approved")}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10 transition-all hover:shadow-xl active:scale-[0.98] sm:w-auto"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleApprove(r._id, "rejected")}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-50 dark:border-rose-500/30 dark:bg-gray-900 dark:text-rose-400 dark:hover:bg-rose-500/10 sm:w-auto"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Worked → Day-off timeline */}
                <div className="mt-4 rounded-xl border border-gray-200/70 bg-gradient-to-r from-indigo-50/60 via-transparent to-emerald-50/60 p-4 dark:border-gray-800/80 dark:from-indigo-500/5 dark:via-transparent dark:to-emerald-500/5">
                  <div className="flex items-center gap-3 sm:gap-5">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        <CalendarDays className="h-3 w-3" /> Worked
                      </p>
                      <p className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">
                        {new Date(r.workedDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                      <ArrowRight className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <Gift className="h-3 w-3" /> Day-Off
                      </p>
                      <p className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">
                        {r.dayOffDate ? new Date(r.dayOffDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {r.reason && (
                  <div className="mt-3 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 dark:border-gray-800/80 dark:bg-gray-800/40">
                    <p className={labelCls}>Reason</p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{r.reason}</p>
                  </div>
                )}
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

      {/* ── Apply Modal ── */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Apply Comp-Off</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pick the day you worked and the day you want off</p>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={`${labelCls} mb-1.5 block flex items-center gap-1`}>
                    <CalendarDays className="h-3 w-3 text-indigo-500" /> Worked Date
                  </label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    value={workedDate}
                    onChange={(e) => setWorkedDate(e.target.value)}
                    className={inputCls}
                  />
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Weekend or holiday you worked</p>
                </div>
                <div>
                  <label className={`${labelCls} mb-1.5 block flex items-center gap-1`}>
                    <Gift className="h-3 w-3 text-emerald-500" /> Day-Off Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                    value={dayOffDate}
                    onChange={(e) => setDayOffDate(e.target.value)}
                    className={inputCls}
                  />
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Within 60 days, working day</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Day Type</label>
                  <select
                    value={dayType}
                    onChange={(e) => setDayType(e.target.value as "full" | "half")}
                    className={inputCls}
                  >
                    <option value="full">Full Day</option>
                    <option value="half">Half Day</option>
                  </select>
                </div>
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Hours Worked</label>
                  <input
                    type="number"
                    min={4}
                    max={24}
                    step={0.5}
                    required
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value === "" ? "" : Number(e.target.value))}
                    className={inputCls}
                    placeholder="e.g. 8"
                  />
                </div>
              </div>
              <div>
                <label className={`${labelCls} mb-1.5 block`}>Reason</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={`${inputCls} resize-none`}
                  placeholder="Describe the work done..."
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
                  {saving ? "Applying..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
