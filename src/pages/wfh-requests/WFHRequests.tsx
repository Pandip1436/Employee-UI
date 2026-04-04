import { useState, useEffect, type FormEvent } from "react";
import {  Plus, X, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { wfhApi } from "../../api/wfhApi";
import { useAuth } from "../../context/AuthContext";
import type { WfhRequest, Pagination } from "../../types";
import toast from "react-hot-toast";

const statusStyle: Record<string, { bg: string; dot: string }> = {
  pending: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-500" },
  approved: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500" },
  rejected: { bg: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400", dot: "bg-rose-500" },
};

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export default function WFHRequests() {
  const { isAdmin, isManager } = useAuth();
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
    api({ page, limit: 10 }).then((r) => { setRequests(r.data.data); setPagination(r.data.pagination); }).catch(() => { /* interceptor */ });
  };

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { fetch(); }, [page, tab]);

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await wfhApi.apply({ date, reason }); toast.success("WFH request submitted!"); setShowApply(false); setDate(""); setReason(""); fetch(); }
    catch { /* interceptor */ } finally { setSaving(false); }
  };

  const handleApprove = async (id: string, status: "approved" | "rejected") => {
    try { await wfhApi.approve(id, status); toast.success(`Request ${status}.`); fetch(); } catch { /* interceptor */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Cancel this request?")) return;
    try { await wfhApi.delete(id); toast.success("Cancelled."); fetch(); } catch { /* interceptor */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">WFH Requests</h1><p className="text-sm text-gray-500 dark:text-gray-400">Work from home request management</p></div>
        <button onClick={() => setShowApply(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Apply WFH</button>
      </div>

      {canApprove && (
        <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 w-fit">
          {(["my", "all"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === t ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
              {t === "my" ? "My Requests" : "All Requests"}
            </button>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {tab === "all" && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee</th>}
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Reason</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {requests.length === 0 ? (
              <tr><td colSpan={tab === "all" ? 5 : 4} className="px-4 py-12 text-center text-gray-400">No requests found.</td></tr>
            ) : requests.map((r) => {
              const s = statusStyle[r.status] || statusStyle.pending;
              return (
                <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {tab === "all" && <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.userId.name || "—"}</td>}
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">{r.reason}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${s.bg}`}><span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{r.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {tab === "all" && r.status === "pending" && (
                        <>
                          <button onClick={() => handleApprove(r._id, "approved")} className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"><CheckCircle className="h-4 w-4" /></button>
                          <button onClick={() => handleApprove(r._id, "rejected")} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"><XCircle className="h-4 w-4" /></button>
                        </>
                      )}
                      {tab === "my" && r.status === "pending" && (
                        <button onClick={() => handleDelete(r._id)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {requests.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400">No requests found.</div>
        ) : requests.map((r) => {
          const s = statusStyle[r.status] || statusStyle.pending;
          return (
            <div key={r._id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0">
                  {tab === "all" && <p className="truncate font-semibold text-gray-900 dark:text-white">{r.userId.name || "—"}</p>}
                  <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(r.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${s.bg}`}><span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{r.status}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{r.reason}</p>
              {((tab === "all" && r.status === "pending") || (tab === "my" && r.status === "pending")) && (
                <div className="mt-3 flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                  {tab === "all" ? (
                    <>
                      <button onClick={() => handleApprove(r._id, "approved")} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700"><CheckCircle className="h-3.5 w-3.5" /> Approve</button>
                      <button onClick={() => handleApprove(r._id, "rejected")} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                    </>
                  ) : (
                    <button onClick={() => handleDelete(r._id)} className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Page {pagination.page} of {pagination.pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">Previous</button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowApply(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900 dark:text-white">Apply WFH</h2><button onClick={() => setShowApply(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleApply} className="space-y-4">
              <div><label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Date</label><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
              <div><label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Reason</label><textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="Why do you need to WFH?" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowApply(false)} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "Submitting..." : "Submit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
