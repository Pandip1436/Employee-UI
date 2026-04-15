import { useState, useEffect, type FormEvent } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  Image,
  Eye,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { dailyUpdateApi } from "../../api/dailyUpdateApi";
import type { DailyUpdateData } from "../../api/dailyUpdateApi";
import type { Pagination } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";

/* ── Status config ── */
const statusConfig: Record<string, { dot: string; badge: string; icon: typeof CheckCircle2; label: string }> = {
  completed: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    icon: CheckCircle2,
    label: "Completed",
  },
  "in-progress": {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    icon: Clock,
    label: "In Progress",
  },
  blocked: {
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    icon: AlertTriangle,
    label: "Blocked",
  },
};

/* ── Helpers ── */
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getUserName = (u: DailyUpdateData["userId"]): string =>
  typeof u === "object" ? u.name : String(u);


const getInitials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const labelClasses =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

const inputClass =
  "w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500";

/* ── Component ── */
export default function DailyUpdates() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [updates, setUpdates] = useState<DailyUpdateData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DailyUpdateData | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [date, setDate] = useState(todayISO());
  const [tasks, setTasks] = useState("");
  const [links, setLinks] = useState("");
  const [status, setStatus] = useState<string>("completed");
  const [proof, setProof] = useState("");
  const [planForTomorrow, setPlanForTomorrow] = useState("");

  // Detail modal
  const [detailUpdate, setDetailUpdate] = useState<DailyUpdateData | null>(null);


  /* ── Fetch ── */
  const fetchUpdates = () => {
    setLoading(true);
    dailyUpdateApi
      .getMyUpdates({ page, limit: 10 })
      .then((res) => {
        setUpdates(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUpdates();
  }, [page]);

  /* ── Form helpers ── */
  const resetForm = () => {
    setDate(todayISO());
    setTasks("");
    setLinks("");
    setStatus("completed");
    setProof("");
    setPlanForTomorrow("");
    setEditing(null);
    setShowModal(false);
  };

  const openEdit = (u: DailyUpdateData) => {
    setEditing(u);
    setDate(u.date.slice(0, 10));
    setTasks(u.tasks);
    setLinks(u.links || "");
    setStatus(u.status);
    setProof(u.proof || "");
    setPlanForTomorrow(u.planForTomorrow);
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tasks.trim() || !planForTomorrow.trim()) {
      toast.error("Tasks and Plan for Tomorrow are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await dailyUpdateApi.update(editing._id, { tasks, links, status, proof, planForTomorrow });
        toast.success("Update edited!");
      } else {
        await dailyUpdateApi.create({ date, tasks, links, status, proof, planForTomorrow });
        toast.success("Daily update submitted!");
      }
      resetForm();
      fetchUpdates();
    } catch {
      // handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete update?", description: "This daily update will be removed permanently.", confirmLabel: "Delete" }))) return;
    try {
      await dailyUpdateApi.delete(id);
      toast.success("Update deleted.");
      fetchUpdates();
    } catch {
      // handled
    }
  };

  /* ── Parse links into clickable items ── */
  const parseLinks = (text: string) => {
    if (!text.trim()) return [];
    return text.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Daily Updates
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Post your end-of-day work updates
            </p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          New Update
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
        </div>
      ) : updates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-20 px-4 text-center">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
            <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No updates yet
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Submit your first daily work update
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((u) => {
            const sConfig = statusConfig[u.status] || statusConfig.completed;
            const StatusIcon = sConfig.icon;
            const linksList = parseLinks(u.links);

            return (
              <div
                key={u._id}
                onClick={() => setDetailUpdate(u)}
                className="cursor-pointer rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30"
              >
                {/* Top row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                      {getInitials(getUserName(u.userId))}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatDate(u.date)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getUserName(u.userId)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sConfig.badge}`}>
                      <StatusIcon className="h-3 w-3" />
                      {sConfig.label}
                    </span>
                    {u.reviewStatus === "reviewed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20 px-2.5 py-1 text-xs font-semibold">
                        <Eye className="h-3 w-3" />
                        Reviewed
                      </span>
                    )}
                    {u.reviewStatus === "needs-improvement" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20 px-2.5 py-1 text-xs font-semibold">
                        <AlertTriangle className="h-3 w-3" />
                        Needs Improvement
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(u); }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(u._id); }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tasks preview (truncated) */}
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {u.tasks}
                </p>

                {/* Bottom meta row */}
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                  {linksList.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {linksList.length} link{linksList.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {u.proof && (
                    <span className="inline-flex items-center gap-1">
                      <Image className="h-3 w-3" />
                      Proof attached
                    </span>
                  )}
                  {u.reviewComment && (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Feedback
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailUpdate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDetailUpdate(null); }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                  {getInitials(getUserName(detailUpdate.userId))}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatDate(detailUpdate.date)}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getUserName(detailUpdate.userId)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { openEdit(detailUpdate); setDetailUpdate(null); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setDetailUpdate(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const cfg = statusConfig[detailUpdate.status] || statusConfig.completed;
                  const Icon = cfg.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.badge}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                  );
                })()}
                {detailUpdate.reviewStatus === "reviewed" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20 px-3 py-1 text-xs font-semibold">
                    <Eye className="h-3.5 w-3.5" />
                    Reviewed
                  </span>
                )}
                {detailUpdate.reviewStatus === "needs-improvement" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20 px-3 py-1 text-xs font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Needs Improvement
                  </span>
                )}
              </div>

              {/* Tasks */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                  Tasks Worked On Today
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {detailUpdate.tasks}
                </p>
              </div>

              {/* Links */}
              {(() => {
                const ll = parseLinks(detailUpdate.links);
                return ll.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                      Links / References
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ll.map((link, i) => {
                        const isUrl = link.startsWith("http");
                        return isUrl ? (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-600/20 dark:ring-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {link.replace(/^https?:\/\//, "").slice(0, 50)}
                          </a>
                        ) : (
                          <span key={i} className="inline-flex items-center rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400">
                            {link}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Proof */}
              {detailUpdate.proof && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                    Proof / Screenshot
                  </p>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                    <Image className="h-3.5 w-3.5" />
                    {detailUpdate.proof.startsWith("http") ? (
                      <a href={detailUpdate.proof} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        {detailUpdate.proof.replace(/^https?:\/\//, "").slice(0, 50)}
                      </a>
                    ) : (
                      <span>{detailUpdate.proof}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Plan for Tomorrow */}
              <div className="flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 px-4 py-3">
                <ArrowRight className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
                    Plan for Tomorrow
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {detailUpdate.planForTomorrow}
                  </p>
                </div>
              </div>

              {/* Manager Review Feedback */}
              {detailUpdate.reviewComment && (
                <div className={`flex items-start gap-2 rounded-xl px-4 py-3 ${
                  detailUpdate.reviewStatus === "needs-improvement"
                    ? "bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20"
                    : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                }`}>
                  <MessageSquare className={`h-4 w-4 mt-0.5 shrink-0 ${
                    detailUpdate.reviewStatus === "needs-improvement" ? "text-orange-500" : "text-emerald-500"
                  }`} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
                      Manager Feedback
                    </p>
                    <p className={`text-sm leading-relaxed ${
                      detailUpdate.reviewStatus === "needs-improvement"
                        ? "text-orange-700 dark:text-orange-300"
                        : "text-emerald-700 dark:text-emerald-300"
                    }`}>
                      {detailUpdate.reviewComment}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-6 py-4">
              <button
                onClick={() => { handleDelete(detailUpdate._id); setDetailUpdate(null); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-500/30 px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button
                onClick={() => { openEdit(detailUpdate); setDetailUpdate(null); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
                  <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editing ? "Edit Update" : "Daily Work Update"}
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {editing ? "Modify your submitted update" : "Submit your end-of-day update"}
                  </p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {/* Name & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Name</label>
                  <input
                    value={user?.name || ""}
                    readOnly
                    className={`${inputClass} bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed`}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={todayISO()}
                    disabled={!!editing}
                    className={`${inputClass} ${editing ? "bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>

              {/* Tasks */}
              <div>
                <label className={labelClasses}>
                  Tasks Worked On Today <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={tasks}
                  onChange={(e) => setTasks(e.target.value)}
                  placeholder="Write detailed description of the work done today only..."
                  className={`${inputClass} resize-none`}
                  required
                />
              </div>

              {/* Links */}
              <div>
                <label className={labelClasses}>Links / References</label>
                <textarea
                  rows={2}
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                  placeholder="Add GitHub / server / design / document / task links (one per line or comma-separated)"
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Status */}
              <div>
                <label className={labelClasses}>
                  Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["completed", "in-progress", "blocked"] as const).map((s) => {
                    const cfg = statusConfig[s];
                    const Icon = cfg.icon;
                    const isActive = status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                          isActive
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Proof */}
              <div>
                <label className={labelClasses}>Proof / Screenshot Link</label>
                <input
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  placeholder="Paste screenshot URL or describe the output"
                  className={inputClass}
                />
              </div>

              {/* Plan for Tomorrow */}
              <div>
                <label className={labelClasses}>
                  Plan for Tomorrow <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={planForTomorrow}
                  onChange={(e) => setPlanForTomorrow(e.target.value)}
                  placeholder="Briefly mention what you will work on next..."
                  className={`${inputClass} resize-none`}
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-gray-100 dark:border-gray-800 pt-5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? "Saving..." : editing ? "Save Changes" : "Submit Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
