import { useState, useEffect, type FormEvent } from "react";
import {
  Plus, X, CheckCircle, XCircle, Trash2, Home, Sparkles, CalendarDays,
  ChevronLeft, ChevronRight, Inbox, ArrowLeft,
} from "lucide-react";
import { wfhApi } from "../../api/wfhApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import type { WfhRequest, Pagination } from "../../types";
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
    dot: "bg-amber-500",
    label: "Pending",
  },
  approved: {
    bg: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
    label: "Approved",
  },
  rejected: {
    bg: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    dot: "bg-rose-500",
    label: "Rejected",
  },
};

export default function WFHRequests() {
  const { isAdmin, isManager } = useAuth();
  const confirm = useConfirm();
  const canApprove = isAdmin || isManager;
  const [tab, setTab] = useState<"my" | "all">("my");
  const [requests, setRequests] = useState<WfhRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [showApply, setShowApply] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    const api = tab === "my" ? wfhApi.getMyRequests : wfhApi.getAll;
    api({ page, limit: 10 })
      .then((r) => { setRequests(r.data.data); setPagination(r.data.pagination); })
      .catch(() => { /* interceptor */ });
  };

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { fetch(); }, [page, tab]);

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await wfhApi.apply({ date, reason });
      toast.success("WFH request submitted!");
      setShowApply(false); setDate(""); setReason("");
      fetch();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const handleApprove = async (id: string, status: "approved" | "rejected") => {
    try { await wfhApi.approve(id, status); toast.success(`Request ${status}.`); fetch(); }
    catch { /* interceptor */ }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Cancel WFH request?", description: "This request will be withdrawn.", confirmLabel: "Cancel request", cancelLabel: "Keep" }))) return;
    try { await wfhApi.delete(id); toast.success("Cancelled."); fetch(); } catch { /* interceptor */ }
  };

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-purple-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <Home className="h-10 w-10 text-sky-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Remote workday requests
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                WFH <span className="bg-gradient-to-r from-sky-200 to-indigo-200 bg-clip-text text-transparent">Requests</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Work from home request management</p>
            </div>
          </div>
          <button
            onClick={() => setShowApply(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
          >
            <span className="rounded-md bg-gradient-to-br from-sky-500 to-indigo-600 p-1">
              <Plus className="h-3.5 w-3.5 text-white" />
            </span>
            Apply WFH
          </button>
        </div>
      </div>

      {/* ── My / All tabs ── */}
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

      {/* ── Desktop table ── */}
      <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
              <tr>
                {tab === "all" && <th className={`px-4 py-3 ${labelCls}`}>Employee</th>}
                {["Date", "Reason", "Status", "Actions"].map((h) => (
                  <th key={h} className={`px-4 py-3 ${labelCls}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={tab === "all" ? 5 : 4} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                        <Inbox className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No WFH requests yet</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Click "Apply WFH" to submit one</p>
                    </div>
                  </td>
                </tr>
              ) : requests.map((r) => {
                const s = statusStyle[r.status] || statusStyle.pending;
                const start = new Date(r.date);
                const userName = (r.userId as any)?.name || "—";
                return (
                  <tr key={r._id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    {tab === "all" && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(userName)} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
                            {userName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">{userName}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg ring-1 ring-white/10">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                            {start.toLocaleDateString(undefined, { month: "short" })}
                          </p>
                          <p className="text-sm font-bold leading-none">{start.getDate()}</p>
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {tab === "all" && r.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(r._id, "approved")}
                              title="Approve"
                              className="rounded-md p-2 text-emerald-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleApprove(r._id, "rejected")}
                              title="Reject"
                              className="rounded-md p-2 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {tab === "my" && r.status === "pending" && (
                          <button
                            onClick={() => handleDelete(r._id)}
                            title="Cancel"
                            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
      </div>

      {/* ── Mobile cards ── */}
      <div className="space-y-3 md:hidden">
        {requests.length === 0 ? (
          <div className={`${cardCls} flex flex-col items-center gap-2 py-12 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <Inbox className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No WFH requests</p>
          </div>
        ) : requests.map((r) => {
          const s = statusStyle[r.status] || statusStyle.pending;
          const start = new Date(r.date);
          const userName = (r.userId as any)?.name || "—";
          return (
            <div key={r._id} className={`${cardCls} p-4`}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg ring-1 ring-white/10">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                    {start.toLocaleDateString(undefined, { month: "short" })}
                  </p>
                  <p className="text-sm font-bold leading-none">{start.getDate()}</p>
                </div>
                <div className="min-w-0 flex-1">
                  {tab === "all" && (
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                  )}
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </div>
              <p className="line-clamp-2 border-t border-gray-200/70 pt-3 text-sm text-gray-600 dark:border-gray-800/80 dark:text-gray-400">{r.reason}</p>
              {r.status === "pending" && (
                <div className="mt-3 flex gap-2 border-t border-gray-200/70 pt-3 dark:border-gray-800/80">
                  {tab === "all" ? (
                    <>
                      <button
                        onClick={() => handleApprove(r._id, "approved")}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleApprove(r._id, "rejected")}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow-sm dark:border-rose-500/30 dark:bg-gray-900 dark:text-rose-400"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDelete(r._id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-sky-50 to-white p-5 dark:border-gray-800/80 dark:from-sky-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-400/25 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 p-2.5 shadow-lg shadow-sky-500/30 ring-1 ring-white/10">
                    <Home className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Apply WFH</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Request a remote workday</p>
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
                <label className={`${labelCls} mb-1.5 block flex items-center gap-1`}>
                  <CalendarDays className="h-3 w-3 text-sky-500" /> Date
                </label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={`${labelCls} mb-1.5 block`}>Reason</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why do you need to WFH?"
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApply(false)}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="mr-1 inline h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
                >
                  {saving ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
