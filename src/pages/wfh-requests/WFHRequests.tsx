import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  Plus, X, CheckCircle, XCircle, Trash2, Home, Sparkles, CalendarDays,
  ChevronLeft, ChevronRight, Inbox, ArrowLeft, Loader2, Filter, Search, Send, Zap,
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
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  /* Filter (client-side, on the current page) */
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [query, setQuery] = useState("");

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const name = ((r.userId as any)?.name || "").toLowerCase();
      const reason = (r.reason || "").toLowerCase();
      return name.includes(q) || reason.includes(q);
    });
  }, [requests, statusFilter, query]);

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  /* Quick-pick date helpers for Apply drawer */
  /* Format in local time, not UTC — otherwise midnight-local rolls back a day
     for timezones east of UTC. */
  const fmtIso = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const todayIso = useMemo(() => fmtIso(new Date()), []);
  const quickPicks = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const nextMon = new Date(today); nextMon.setDate(today.getDate() + ((1 - today.getDay() + 7) % 7 || 7));
    const nextFri = new Date(today); nextFri.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7));
    return [
      { label: "Today", value: fmtIso(today) },
      { label: "Tomorrow", value: fmtIso(tomorrow) },
      { label: "Next Monday", value: fmtIso(nextMon) },
      { label: "This Friday", value: fmtIso(nextFri) },
    ];
  }, []);

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
    if (status === "approved") setApprovingId(id); else setRejectingId(id);
    try { await wfhApi.approve(id, status); toast.success(`Request ${status}.`); fetch(); }
    catch { /* interceptor */ } finally { setApprovingId(null); setRejectingId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Cancel WFH request?", description: "This request will be withdrawn.", confirmLabel: "Cancel request", cancelLabel: "Keep" }))) return;
    setCancellingId(id);
    try { await wfhApi.delete(id); toast.success("Cancelled."); fetch(); }
    catch { /* interceptor */ } finally { setCancellingId(null); }
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
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4 lg:max-w-[640px]">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <Home className="h-10 w-10 text-sky-200" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Remote workday requests
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                WFH <span className="bg-gradient-to-r from-sky-200 to-indigo-200 bg-clip-text text-transparent">Requests</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Work from home request management</p>

              {/* KPI chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-sky-400/20 ring-1 ring-sky-300/30">
                    <Inbox className="h-3 w-3 text-sky-200" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">{tab === "my" ? "My" : "All"}</span>
                  <span className="font-mono text-sm font-bold tabular-nums tracking-tight">{counts.total}</span>
                </div>
                {counts.pending > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-amber-400/15 px-3 py-1.5 ring-1 ring-amber-300/30 backdrop-blur-sm">
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inset-0 animate-ping rounded-full bg-amber-300/60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-100/90">Pending</span>
                    <span className="font-mono text-sm font-bold tabular-nums tracking-tight text-amber-100">{counts.pending}</span>
                  </div>
                )}
                {counts.approved > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/15 px-3 py-1.5 ring-1 ring-emerald-300/30 backdrop-blur-sm">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-400/20 ring-1 ring-emerald-300/30">
                      <CheckCircle className="h-3 w-3 text-emerald-200" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100/90">Approved</span>
                    <span className="font-mono text-sm font-bold tabular-nums tracking-tight text-emerald-100">{counts.approved}</span>
                  </div>
                )}
                {counts.rejected > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-rose-400/15 px-3 py-1.5 ring-1 ring-rose-300/30 backdrop-blur-sm">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-rose-400/20 ring-1 ring-rose-300/30">
                      <XCircle className="h-3 w-3 text-rose-200" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-100/90">Rejected</span>
                    <span className="font-mono text-sm font-bold tabular-nums tracking-tight text-rose-100">{counts.rejected}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => setShowApply(true)}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
            >
              <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-sky-200/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
              <span className="relative inline-flex items-center gap-2">
                <span className="rounded-md bg-gradient-to-br from-sky-500 to-indigo-600 p-1">
                  <Plus className="h-3.5 w-3.5 text-white" />
                </span>
                Apply WFH
              </span>
            </button>
          </div>
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

      {/* ── Filter Bar ── */}
      {requests.length > 0 && (
        <div className={`${cardCls} flex flex-col gap-3 p-3 sm:flex-row sm:items-center`}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "all" ? "Search by name or reason…" : "Search by reason…"}
              className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <Filter className="h-3 w-3" /> Status
            </span>
            {(["all", "pending", "approved", "rejected"] as const).map((s) => {
              const active = statusFilter === s;
              const tone =
                s === "pending" ? "from-amber-500 to-orange-500"
                : s === "approved" ? "from-emerald-500 to-teal-500"
                : s === "rejected" ? "from-rose-500 to-pink-500"
                : "from-sky-500 to-indigo-500";
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition-all ${
                    active
                      ? `bg-gradient-to-r ${tone} text-white shadow-sm ring-1 ring-white/10`
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
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
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={tab === "all" ? 5 : 4} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                        <Inbox className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {requests.length === 0 ? "No WFH requests yet" : "No matches for current filter"}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {requests.length === 0 ? "Click \"Apply WFH\" to submit one" : "Try adjusting your search or status filter"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.map((r) => {
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
                          <p className="font-mono text-sm font-bold tabular-nums leading-none">{start.getDate()}</p>
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
                              disabled={approvingId === r._id}
                              title="Approve"
                              className="rounded-md p-2 text-emerald-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:hover:bg-emerald-500/10"
                            >
                              {approvingId === r._id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <CheckCircle className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleApprove(r._id, "rejected")}
                              disabled={rejectingId === r._id}
                              title="Reject"
                              className="rounded-md p-2 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10"
                            >
                              {rejectingId === r._id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <XCircle className="h-4 w-4" />}
                            </button>
                          </>
                        )}
                        {tab === "my" && r.status === "pending" && (
                          <button
                            onClick={() => handleDelete(r._id)}
                            disabled={cancellingId === r._id}
                            title="Cancel"
                            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                          >
                            {cancellingId === r._id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
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
        {filteredRequests.length === 0 ? (
          <div className={`${cardCls} flex flex-col items-center gap-2 py-12 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <Inbox className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {requests.length === 0 ? "No WFH requests" : "No matches for current filter"}
            </p>
          </div>
        ) : filteredRequests.map((r) => {
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
                  <p className="font-mono text-sm font-bold tabular-nums leading-none">{start.getDate()}</p>
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
                        disabled={approvingId === r._id}
                        className="group relative inline-flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10 disabled:opacity-60"
                      >
                        <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
                        <span className="relative inline-flex items-center gap-1.5">
                          {approvingId === r._id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <CheckCircle className="h-3.5 w-3.5" />}
                          {approvingId === r._id ? "Approving…" : "Approve"}
                        </span>
                      </button>
                      <button
                        onClick={() => handleApprove(r._id, "rejected")}
                        disabled={rejectingId === r._id}
                        className="group relative inline-flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow-sm disabled:opacity-60 dark:border-rose-500/30 dark:bg-gray-900 dark:text-rose-400"
                      >
                        <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-rose-200/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%] dark:via-rose-400/20" />
                        <span className="relative inline-flex items-center gap-1.5">
                          {rejectingId === r._id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <XCircle className="h-3.5 w-3.5" />}
                          {rejectingId === r._id ? "Rejecting…" : "Reject"}
                        </span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDelete(r._id)}
                      disabled={cancellingId === r._id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {cancellingId === r._id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                      {cancellingId === r._id ? "Cancelling…" : "Cancel"}
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
            Page <span className="font-mono font-semibold tabular-nums text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="font-mono font-semibold tabular-nums text-gray-900 dark:text-white">{pagination.pages}</span>
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

      {/* ── Apply Drawer ── */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm animate-backdrop-fade"
            onClick={() => !saving && setShowApply(false)}
          />
          <form
            onSubmit={handleApply}
            className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl animate-drawer-slide-right dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10"
          >
            {/* Status stripe */}
            <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 to-indigo-600" />

            {/* Header */}
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-sky-50 to-white p-5 dark:border-gray-800/80 dark:from-sky-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sky-400/25 blur-2xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-8 left-1/3 h-24 w-24 rounded-full bg-indigo-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 p-2.5 shadow-lg shadow-sky-500/30 ring-1 ring-white/10">
                    <Home className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-600/80 dark:text-sky-400/80">Remote work</p>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Apply WFH</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Request a remote workday</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApply(false)}
                  disabled={saving}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="premium-scroll flex-1 space-y-5 overflow-y-auto p-5">
              <div>
                <label className={`${labelCls} mb-1.5 flex items-center gap-1`}>
                  <CalendarDays className="h-3 w-3 text-sky-500" /> Date
                </label>
                <input
                  type="date"
                  required
                  min={todayIso}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    <Zap className="h-3 w-3" /> Quick pick
                  </span>
                  {quickPicks.map((q) => {
                    const active = date === q.value;
                    return (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => setDate(q.value)}
                        className={`group relative inline-flex items-center gap-1 overflow-hidden rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          active
                            ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm ring-1 ring-white/10"
                            : "border border-gray-200 bg-white text-gray-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"
                        }`}
                      >
                        {!active && (
                          <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-sky-200/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%] dark:via-sky-400/20" />
                        )}
                        <span className="relative">{q.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live preview */}
              {date && (
                <div className="flex items-center gap-3 rounded-xl border border-sky-200/70 bg-gradient-to-r from-sky-50 via-white to-white p-3.5 ring-1 ring-sky-500/10 dark:border-sky-500/30 dark:from-sky-500/10 dark:via-gray-900 dark:to-gray-900 dark:ring-sky-400/20">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg ring-1 ring-white/10">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                      {new Date(date).toLocaleDateString(undefined, { month: "short" })}
                    </p>
                    <p className="font-mono text-base font-bold tabular-nums leading-none">{new Date(date).getDate()}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={labelCls}>Selected workday</p>
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                      {new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className={`${labelCls} mb-1.5 block`}>Reason</label>
                <textarea
                  required
                  rows={5}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why do you need to WFH?"
                  className={`${inputCls} resize-none`}
                />
                <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                  Your manager will see this when reviewing the request.
                </p>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 flex gap-3 border-t border-gray-200/70 bg-white/95 p-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95">
              <button
                type="button"
                onClick={() => setShowApply(false)}
                disabled={saving}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="mr-1 inline h-4 w-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl hover:shadow-sky-500/40 disabled:opacity-60"
              >
                <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
                <span className="relative inline-flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {saving ? "Submitting…" : "Submit Request"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
