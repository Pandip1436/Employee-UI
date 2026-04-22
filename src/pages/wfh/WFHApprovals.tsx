import { useState, useEffect } from "react";
import {
  CheckCircle, XCircle, ChevronLeft, ChevronRight, X, AlertTriangle,
  MessageSquare, Sparkles, Inbox, CalendarDays, Home,
} from "lucide-react";
import { wfhApi } from "../../api/wfhApi";
import type { WfhRequest, Pagination } from "../../types";
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

type Tab = "pending" | "approved" | "rejected";
const tabs: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function WFHApprovals() {
  const [tab, setTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState<WfhRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const fetchRequests = () => {
    wfhApi.getAll({ page, limit: 10, status: tab })
      .then((res) => { setRequests(res.data.data); setPagination(res.data.pagination); })
      .catch(() => {});
  };

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { fetchRequests(); }, [page, tab]);

  const handleApprove = async (id: string) => {
    try { await wfhApi.approve(id, "approved"); toast.success("WFH request approved!"); fetchRequests(); }
    catch { /* interceptor */ }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try { await wfhApi.approve(rejectId, "rejected"); toast.success("WFH request rejected."); setRejectId(null); setRejectComment(""); fetchRequests(); }
    catch { /* interceptor */ }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-purple-500/15 blur-3xl" />
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
              <Home className="h-10 w-10 text-sky-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Remote work approvals
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                WFH <span className="bg-gradient-to-r from-sky-200 to-indigo-200 bg-clip-text text-transparent">Approvals</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Review work-from-home requests from your team</p>
            </div>
          </div>
          {pagination && (
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">{tabs.find((t) => t.key === tab)?.label}</p>
              <p className="text-xl font-bold tracking-tight">{pagination.total ?? requests.length}</p>
            </div>
          )}
        </div>
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
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No {tab} WFH requests</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Requests will appear here once submitted</p>
          </div>
        ) : (
          requests.map((req) => {
            const sConfig = statusConfig[req.status] || statusConfig.pending;
            const user = req.userId as any;
            const userName: string = user?.name || "Unknown";
            const userEmail: string = user?.email || "";
            const start = new Date(req.date);

            return (
              <div key={req._id} className={`${cardCls} p-5`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg ring-1 ring-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                        {start.toLocaleDateString(undefined, { month: "short" })}
                      </p>
                      <p className="text-lg font-bold leading-none">{start.getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <Avatar name={userName} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20">
                          <Home className="h-3 w-3" />
                          Work From Home
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sConfig.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                          {sConfig.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <CalendarDays className="h-3 w-3" />
                          {fmtDate(req.date)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Applied {fmtDate(req.createdAt)}
                        </span>
                      </div>
                      {req.reason && (
                        <p className="mt-2 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 text-sm leading-relaxed text-gray-700 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-300">
                          <span className={`${labelCls} mb-1 block`}>Reason</span>
                          {req.reason}
                        </p>
                      )}
                      {req.approvedBy && tab !== "pending" && (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-300">
                          <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                          {req.status === "approved" ? "Approved" : "Rejected"} by{" "}
                          <span className="font-semibold text-gray-900 dark:text-white">{(req.approvedBy as any)?.name || "Manager"}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {tab === "pending" && req.status === "pending" && (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
                      <button
                        onClick={() => handleApprove(req._id)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10 transition-all hover:shadow-xl active:scale-[0.98] sm:w-auto"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => { setRejectId(req._id); setRejectComment(""); }}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-50 dark:border-rose-500/30 dark:bg-gray-900 dark:text-rose-400 dark:hover:bg-rose-500/10 sm:w-auto"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
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
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Reject WFH Request</h2>
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
