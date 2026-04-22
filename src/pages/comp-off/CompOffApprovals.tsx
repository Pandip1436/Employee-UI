import { useState, useEffect } from "react";
import {
  CheckCircle, XCircle, Gift, ChevronLeft, ChevronRight, X, AlertTriangle,
  CalendarDays, ArrowRight, Clock3, Sparkles, Inbox, Clock, MessageSquare,
} from "lucide-react";
import { compOffApi } from "../../api/compOffApi";
import type { CompOffRequest, Pagination } from "../../types";
import toast from "react-hot-toast";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

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

function Avatar({ name }: { name: string }) {
  const init = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(name || "?")} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
      {init}
    </div>
  );
}

const statusConfig: Record<string, { dot: string; badge: string; label: string; gradient: string; icon: typeof Clock }> = {
  pending: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    label: "Pending",
    gradient: "from-amber-500 to-orange-600",
    icon: Clock,
  },
  approved: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    label: "Approved",
    gradient: "from-emerald-500 to-teal-600",
    icon: CheckCircle,
  },
  rejected: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    label: "Rejected",
    gradient: "from-rose-500 to-pink-600",
    icon: XCircle,
  },
  used: {
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    label: "Used",
    gradient: "from-sky-500 to-blue-600",
    icon: CheckCircle,
  },
  expired: {
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-500/20",
    label: "Expired",
    gradient: "from-gray-500 to-gray-600",
    icon: Clock3,
  },
  cancelled: {
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-500/20",
    label: "Cancelled",
    gradient: "from-gray-500 to-gray-600",
    icon: X,
  },
};

type Tab = "pending" | "approved" | "rejected";
const tabs: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function CompOffApprovals() {
  const [tab, setTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState<CompOffRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<{ pending: number; approved: number; rejected: number }>({ pending: 0, approved: 0, rejected: 0 });
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const fetchRequests = () => {
    compOffApi.getAll({ page, limit: 10, status: tab })
      .then((res) => { setRequests(res.data.data); setPagination(res.data.pagination); })
      .catch(() => {});
  };

  const fetchCounts = async () => {
    try {
      const [p, a, r] = await Promise.all([
        compOffApi.getAll({ page: 1, limit: 1, status: "pending" }),
        compOffApi.getAll({ page: 1, limit: 1, status: "approved" }),
        compOffApi.getAll({ page: 1, limit: 1, status: "rejected" }),
      ]);
      setCounts({
        pending: p.data.pagination?.total ?? 0,
        approved: a.data.pagination?.total ?? 0,
        rejected: r.data.pagination?.total ?? 0,
      });
    } catch { /* interceptor */ }
  };

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { fetchRequests(); }, [page, tab]);
  useEffect(() => { fetchCounts(); }, []);

  const handleApprove = async (id: string) => {
    setActing(id);
    try { await compOffApi.approve(id, "approved"); toast.success("Comp-off approved!"); fetchRequests(); fetchCounts(); }
    catch { /* interceptor */ } finally { setActing(null); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActing(rejectId);
    try {
      await compOffApi.approve(rejectId, "rejected", rejectComment.trim() || undefined);
      toast.success("Comp-off rejected.");
      setRejectId(null); setRejectComment("");
      fetchRequests(); fetchCounts();
    } catch { /* interceptor */ } finally { setActing(null); }
  };

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—";
  const fmtShort = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
  const daysUntil = (iso?: string) => {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  };

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
              <Gift className="h-10 w-10 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Worked-date → day-off requests
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Comp-Off <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Approvals</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Review compensatory time-off requests from your team</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary KPIs (clickable) ── */}
      <div className="grid grid-cols-3 gap-3">
        {(["pending", "approved", "rejected"] as const).map((key) => {
          const cfg = statusConfig[key];
          const Icon = cfg.icon;
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`${cardCls} group relative overflow-hidden p-4 text-left ${active ? "ring-2 ring-indigo-500/30 dark:ring-indigo-400/40" : ""}`}
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${cfg.gradient} ${active ? "opacity-25" : "opacity-0 group-hover:opacity-25"} blur-2xl transition-opacity duration-300`}
              />
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className={labelCls}>{cfg.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {counts[key as keyof typeof counts]}
                  </p>
                </div>
                <div className={`rounded-xl bg-gradient-to-br ${cfg.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
                active
                  ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                  : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[t.key].dot}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Cards ── */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <Inbox className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No {tab} comp-off requests</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Requests will appear here once submitted</p>
          </div>
        ) : (
          requests.map((req) => {
            const sConfig = statusConfig[req.status] || statusConfig.pending;
            const user = req.userId as any;
            const userName: string = user?.name || "Unknown";
            const userEmail: string = user?.email || "";
            const dept: string = user?.department || "";
            const days = daysUntil(req.dayOffDate);
            const upcoming = req.status === "approved" && days != null && days <= 7 && days >= 0;
            const busy = acting === req._id;

            return (
              <div key={req._id} className={`${cardCls} relative overflow-hidden p-5`}>
                {upcoming && (
                  <span aria-hidden className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />
                )}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <Avatar name={userName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                        {upcoming && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                            <Clock3 className="h-2.5 w-2.5" />
                            In {days}d
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {userEmail}{dept ? ` · ${dept}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sConfig.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                          {sConfig.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-[11px] font-semibold capitalize text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                          {req.dayType || "full"} day
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                          {req.hoursWorked ?? "—"}h worked
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Submitted {fmtShort(req.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {tab === "pending" && req.status === "pending" ? (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
                      <button
                        disabled={busy}
                        onClick={() => handleApprove(req._id)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-60 sm:w-auto"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => { setRejectId(req._id); setRejectComment(""); }}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:bg-gray-900 dark:text-rose-400 dark:hover:bg-rose-500/10 sm:w-auto"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Worked → Day-off timeline */}
                <div className="mt-4 rounded-xl border border-gray-200/70 bg-gradient-to-r from-indigo-50/60 via-transparent to-emerald-50/60 p-4 dark:border-gray-800/80 dark:from-indigo-500/5 dark:via-transparent dark:to-emerald-500/5">
                  <div className="flex items-center gap-3 sm:gap-5">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        <CalendarDays className="h-3 w-3" /> Worked
                      </p>
                      <p className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">{fmtDate(req.workedDate)}</p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                      <ArrowRight className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <Gift className="h-3 w-3" /> Day-Off
                      </p>
                      <p className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">{fmtDate(req.dayOffDate)}</p>
                    </div>
                  </div>
                </div>

                {req.reason && (
                  <div className="mt-3 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 dark:border-gray-800/80 dark:bg-gray-800/40">
                    <p className={labelCls}>Reason</p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{req.reason}</p>
                  </div>
                )}

                {req.status === "rejected" && req.rejectionComment && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200/70 bg-rose-50/60 px-3 py-2 dark:border-rose-500/20 dark:bg-rose-500/10">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                    <div>
                      <p className={`${labelCls} text-rose-600 dark:text-rose-400`}>Rejection Reason</p>
                      <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{req.rejectionComment}</p>
                    </div>
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

      {/* ── Reject Modal ── */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-rose-50 to-white p-5 dark:border-gray-800/80 dark:from-rose-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-400/25 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 shadow-lg shadow-rose-500/30 ring-1 ring-white/10">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Reject Comp-Off</h2>
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
              <textarea
                rows={3}
                placeholder="Reason for rejection (optional)"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="mb-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectId(null)}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  disabled={acting === rejectId}
                  onClick={handleReject}
                  className="flex-1 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
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
