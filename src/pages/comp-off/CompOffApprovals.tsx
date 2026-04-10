import { useState, useEffect } from "react";
import {
  CheckCircle, XCircle, Gift, ChevronLeft, ChevronRight, X, AlertTriangle, Clock,
} from "lucide-react";
import { compOffApi } from "../../api/compOffApi";
import type { CompOffRequest, Pagination } from "../../types";
import toast from "react-hot-toast";

const statusConfig: Record<string, { dot: string; badge: string; label: string }> = {
  pending:  { dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",       label: "Pending" },
  approved: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20", label: "Approved" },
  rejected: { dot: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",                label: "Rejected" },
  used:     { dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",                label: "Used" },
  expired:  { dot: "bg-gray-400",    badge: "bg-gray-100 text-gray-600 ring-1 ring-gray-400/20 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-500/20",                  label: "Expired" },
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
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const fetchRequests = () => {
    compOffApi.getAll({ page, limit: 10, status: tab })
      .then((res) => { setRequests(res.data.data); setPagination(res.data.pagination); })
      .catch(() => {});
  };

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { fetchRequests(); }, [page, tab]);

  const handleApprove = async (id: string) => {
    try { await compOffApi.approve(id, "approved"); toast.success("Comp-off approved!"); fetchRequests(); }
    catch { /* interceptor */ }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try { await compOffApi.approve(rejectId, "rejected"); toast.success("Comp-off rejected."); setRejectId(null); setRejectComment(""); fetchRequests(); }
    catch { /* interceptor */ }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const daysUntil = (iso?: string) => {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
          <Gift className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Comp-Off Approvals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Review and manage employee compensatory off requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-20 px-4 text-center">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
              <Gift className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No {tab} comp-off requests</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Comp-off requests will appear here once submitted by employees</p>
          </div>
        ) : (
          requests.map((req) => {
            const sConfig = statusConfig[req.status] || statusConfig.pending;
            const user = req.userId as any;
            const userName: string = user?.name || "Unknown";
            const userEmail: string = user?.email || "";
            const days = daysUntil(req.expiryDate);
            const expiringSoon = req.status === "approved" && days != null && days <= 7 && days >= 0;

            return (
              <div key={req._id} className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 transition-all hover:shadow-md ${expiringSoon ? "border-l-4 border-l-orange-500" : ""}`}>
                {/* Top: avatar + info + actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                      {getInitials(userName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">{userName}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
                    </div>
                  </div>

                  {tab === "pending" && req.status === "pending" && (
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => handleApprove(req._id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:flex-none">
                        <CheckCircle className="h-4 w-4" /> Approve
                      </button>
                      <button onClick={() => { setRejectId(req._id); setRejectComment(""); }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 sm:flex-none">
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  )}

                  {tab !== "pending" && (
                    <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${sConfig.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />{sConfig.label}
                    </span>
                  )}
                </div>

                {/* Detail chips */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Worked Date</p>
                    <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{fmtDate(req.workedDate)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Hours Worked</p>
                    <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{req.hoursWorked ?? "—"}h</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Reason</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-gray-900 dark:text-white">{req.reason || "\u2014"}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Expiry</p>
                    {req.expiryDate ? (
                      <p className={`mt-0.5 text-sm font-bold ${expiringSoon ? "text-orange-600 dark:text-orange-400" : "text-gray-900 dark:text-white"}`}>
                        {fmtDate(req.expiryDate)}
                        {expiringSoon && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                            <Clock className="h-3 w-3" />{days}d left
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm font-bold text-gray-400">—</p>
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
            Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Previous</span>
            </button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <span className="hidden sm:inline">Next</span><ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl dark:shadow-black/40 border border-gray-200 dark:border-gray-800">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/20">
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reject Comp-Off</h2>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Provide a reason for rejection</p>
                </div>
              </div>
              <button onClick={() => setRejectId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea rows={3} placeholder="Reason for rejection (optional)" value={rejectComment} onChange={(e) => setRejectComment(e.target.value)}
              className="mb-5 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
            <div className="flex gap-3">
              <button onClick={() => setRejectId(null)} className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={handleReject} className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
