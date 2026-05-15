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
  Sparkles,
  NotebookPen,
  Search,
  Calendar,
  Link as LinkIcon,
  Loader2,
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

const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";

const labelClasses =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

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

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in-progress" | "blocked">("all");


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

  /* ── Derived: counts + filtered list ── */
  const completedCount = updates.filter((u) => u.status === "completed").length;
  const inProgressCount = updates.filter((u) => u.status === "in-progress").length;
  const blockedCount = updates.filter((u) => u.status === "blocked").length;
  const reviewedCount = updates.filter((u) => u.reviewStatus === "reviewed").length;

  const filteredUpdates = updates.filter((u) => {
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!u.tasks.toLowerCase().includes(q) && !u.planForTomorrow.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
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
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* LEFT: identity + KPI chips */}
          <div className="flex min-w-0 flex-1 items-start gap-4 lg:max-w-[640px]">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <NotebookPen className="h-10 w-10 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                End-of-day workflow
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Daily <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Updates</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Post your end-of-day work updates & plan for tomorrow</p>

              {/* Hero KPI chips */}
              {!loading && updates.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                    <NotebookPen className="h-3.5 w-3.5 text-indigo-200" />
                    <span className="text-indigo-200/80">Total</span>
                    <span className="font-mono font-semibold tabular-nums">{pagination?.total ?? updates.length}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs ring-1 ring-emerald-400/30 backdrop-blur-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                    <span className="text-emerald-200/90">Completed</span>
                    <span className="font-mono font-semibold tabular-nums text-emerald-50">{completedCount}</span>
                  </span>
                  {inProgressCount > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs ring-1 ring-amber-400/30 backdrop-blur-sm">
                      <Clock className="h-3.5 w-3.5 text-amber-200" />
                      <span className="text-amber-200/90">In progress</span>
                      <span className="font-mono font-semibold tabular-nums text-amber-50">{inProgressCount}</span>
                    </span>
                  )}
                  {blockedCount > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs ring-1 ring-rose-400/30 backdrop-blur-sm">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-200" />
                      <span className="text-rose-200/90">Blocked</span>
                      <span className="font-mono font-semibold tabular-nums text-rose-50">{blockedCount}</span>
                    </span>
                  )}
                  {reviewedCount > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs ring-1 ring-sky-400/30 backdrop-blur-sm">
                      <Eye className="h-3.5 w-3.5 text-sky-200" />
                      <span className="text-sky-200/90">Reviewed</span>
                      <span className="font-mono font-semibold tabular-nums text-sky-50">{reviewedCount}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: action button */}
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 active:scale-[0.98]"
          >
            <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
              <Plus className="h-3.5 w-3.5 text-white" />
            </span>
            New Update
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {!loading && updates.length > 0 && (
        <div className={`${cardCls} p-3`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by task or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full rounded-lg border border-gray-200/70 bg-white/80 py-2 pl-9 ${search ? "pr-8" : "pr-3"} text-sm text-gray-900 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800/80 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-500 dark:ring-white/[0.03]`}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status chips */}
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-gray-50/60 p-1 dark:border-gray-800/80 dark:bg-gray-800/40">
              {([
                { key: "all" as const,         label: "All",         count: updates.length, dot: "bg-gray-400" },
                { key: "completed" as const,   label: "Completed",   count: completedCount, dot: "bg-emerald-500" },
                { key: "in-progress" as const, label: "In Progress", count: inProgressCount, dot: "bg-amber-500" },
                { key: "blocked" as const,     label: "Blocked",     count: blockedCount, dot: "bg-rose-500" },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    statusFilter === f.key
                      ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
                  {f.label}
                  <span className={`inline-flex min-w-[20px] items-center justify-center rounded-md px-1.5 py-0 text-[10px] font-bold ${
                    statusFilter === f.key
                      ? "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-300"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {(statusFilter !== "all" || search) && (
              <button
                onClick={() => { setStatusFilter("all"); setSearch(""); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading updates...</p>
        </div>
      ) : filteredUpdates.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {updates.length === 0 ? "No updates yet" : "No matches for your filters"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {updates.length === 0 ? "Submit your first daily work update" : "Try clearing search or status filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUpdates.map((u) => {
            const sConfig = statusConfig[u.status] || statusConfig.completed;
            const StatusIcon = sConfig.icon;
            const linksList = parseLinks(u.links);
            const userName = getUserName(u.userId);

            return (
              <div
                key={u._id}
                onClick={() => setDetailUpdate(u)}
                className={`${cardCls} cursor-pointer p-5 hover:-translate-y-0.5`}
              >
                {/* Top row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(userName)} text-sm font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
                      {getInitials(userName)}
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
        <div className={`${cardCls} flex items-center justify-between p-3`}>
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

      {/* ── Detail Drawer (premium) ── */}
      {detailUpdate && (() => {
        const dsCfg = statusConfig[detailUpdate.status] || statusConfig.completed;
        const stripeGradient =
          detailUpdate.status === "blocked"     ? "from-rose-500 to-pink-600"
          : detailUpdate.status === "in-progress" ? "from-amber-500 to-orange-600"
          : "from-emerald-500 to-teal-600";
        return (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            onClick={(e) => { if (e.target === e.currentTarget) setDetailUpdate(null); }}
          >
            <div
              className="absolute inset-0 animate-backdrop-fade bg-gray-950/60 backdrop-blur-sm"
              onClick={() => setDetailUpdate(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              className="relative flex h-full w-full max-w-md animate-drawer-slide-right flex-col overflow-hidden border-l border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10 sm:max-w-2xl sm:rounded-l-3xl"
            >
              {/* Left stripe colored by status */}
              <span aria-hidden className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${stripeGradient}`} />

              {/* Header */}
              <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 px-5 pt-6 pb-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:via-gray-900 dark:to-purple-500/10">
                <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/25 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-purple-400/15 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${paletteFor(getUserName(detailUpdate.userId))} text-base font-semibold text-white shadow-lg shadow-black/[0.08] ring-1 ring-white/15`}>
                      {getInitials(getUserName(detailUpdate.userId))}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">
                        <Sparkles className="h-3 w-3" />
                        Your daily update
                      </p>
                      <h2 className="mt-0.5 truncate text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                        {formatDate(detailUpdate.date)}
                      </h2>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {getUserName(detailUpdate.userId)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailUpdate(null)}
                    aria-label="Close"
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body (scrollable) */}
              <div className="premium-scroll flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                {/* Padding-aligned spacer wrapped around existing body content */}
                <div className="space-y-5">
                  {/* Original body content preserved below in inner wrapper */}
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
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 border-t border-gray-200/70 bg-white/95 px-5 py-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 sm:px-6">
                <div className="flex items-center justify-end gap-2">
                  <span className={`mr-auto inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${dsCfg.badge}`}>
                    <dsCfg.icon className="h-3 w-3" />
                    {dsCfg.label}
                  </span>
                  <button
                    onClick={() => { handleDelete(detailUpdate._id); setDetailUpdate(null); }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                  <button
                    onClick={() => { openEdit(detailUpdate); setDetailUpdate(null); }}
                    className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-500/35 active:scale-[0.98]"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative inline-flex items-center gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Update
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Create/Edit Drawer (premium) ── */}
      {showModal && (() => {
        const previewCfg = statusConfig[status] || statusConfig.completed;
        const PreviewIcon = previewCfg.icon;
        const previewStripe =
          status === "blocked"     ? "from-rose-500 to-pink-600"
          : status === "in-progress" ? "from-amber-500 to-orange-600"
          : "from-emerald-500 to-teal-600";
        const linksPreview = parseLinks(links);
        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 animate-backdrop-fade bg-gray-950/60 backdrop-blur-sm"
              onClick={resetForm}
            />
            <div
              role="dialog"
              aria-modal="true"
              className="relative flex h-full w-full max-w-md animate-drawer-slide-right flex-col overflow-hidden border-l border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10 sm:max-w-xl sm:rounded-l-3xl"
            >
              {/* Left stripe — recolors with status */}
              <span aria-hidden className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${previewStripe}`} />

              {/* Header */}
              <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 px-5 pt-6 pb-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:via-gray-900 dark:to-purple-500/10">
                <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/25 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-purple-400/15 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className={`rounded-2xl bg-gradient-to-br ${previewStripe} p-3 shadow-lg shadow-black/[0.08] ring-1 ring-white/15`}>
                      {editing ? <Pencil className="h-5 w-5 text-white" /> : <NotebookPen className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">
                        <Sparkles className="h-3 w-3" />
                        {editing ? "Update record" : "New entry"}
                      </p>
                      <h2 className="mt-0.5 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                        {editing ? "Edit Update" : "Daily Work Update"}
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {editing ? "Modify your submitted update" : "Submit your end-of-day update"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    aria-label="Close"
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <form
                onSubmit={handleSubmit}
                id="dailyupdate-form"
                className="premium-scroll flex-1 space-y-5 overflow-y-auto p-5 sm:p-6"
              >
                {/* Live preview */}
                <div className="relative overflow-hidden rounded-2xl border border-gray-200/70 bg-gradient-to-br from-gray-50 to-white p-4 ring-1 ring-black/[0.02] dark:border-gray-800/80 dark:from-gray-800/40 dark:to-gray-900/40 dark:ring-white/[0.02]">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
                  <span aria-hidden className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${previewStripe} opacity-15 blur-2xl`} />
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">
                    <Sparkles className="h-3 w-3" />
                    Live preview
                  </p>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(user?.name || "?")} text-sm font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
                      {getInitials(user?.name || "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {date ? formatDate(date) : <span className="text-gray-400 dark:text-gray-500">Date…</span>}
                        </p>
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${previewCfg.badge}`}>
                          <PreviewIcon className="h-2.5 w-2.5" />
                          {previewCfg.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{user?.name || "—"}</p>
                      {tasks.trim() && (
                        <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-gray-600 dark:text-gray-400">
                          {tasks}
                        </p>
                      )}
                      {(linksPreview.length > 0 || proof.trim() || planForTomorrow.trim()) && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-200/70 pt-2 text-[10px] text-gray-500 dark:border-gray-800/80 dark:text-gray-400">
                          {linksPreview.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <ExternalLink className="h-2.5 w-2.5" />
                              <span className="font-mono tabular-nums">{linksPreview.length}</span>
                              {linksPreview.length === 1 ? " link" : " links"}
                            </span>
                          )}
                          {proof.trim() && (
                            <span className="inline-flex items-center gap-1">
                              <Image className="h-2.5 w-2.5" />
                              Proof
                            </span>
                          )}
                          {planForTomorrow.trim() && (
                            <span className="inline-flex items-center gap-1">
                              <ArrowRight className="h-2.5 w-2.5" />
                              Plan set
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Identity */}
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600/70 dark:text-indigo-400/70">
                    <Calendar className="h-3 w-3" />
                    When
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={`${labelClasses} flex items-center gap-1.5`}>
                        <NotebookPen className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                        Name
                      </label>
                      <input
                        value={user?.name || ""}
                        readOnly
                        className={`${inputClass} cursor-not-allowed bg-gray-50 dark:bg-gray-800/50`}
                      />
                    </div>
                    <div>
                      <label className={`${labelClasses} flex items-center gap-1.5`}>
                        <Calendar className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                        Date
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        max={todayISO()}
                        disabled={!!editing}
                        className={`${inputClass} ${editing ? "cursor-not-allowed bg-gray-50 dark:bg-gray-800/50" : ""}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Work */}
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600/70 dark:text-emerald-400/70">
                    <FileText className="h-3 w-3" />
                    What you did
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className={`${labelClasses} flex items-center gap-1.5`}>
                        <FileText className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                        Tasks Worked On Today <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        value={tasks}
                        onChange={(e) => setTasks(e.target.value)}
                        placeholder="Write detailed description of the work done today only..."
                        className={`${inputClass} resize-y`}
                        required
                      />
                    </div>
                    <div>
                      <label className={`${labelClasses} flex items-center gap-1.5`}>
                        <LinkIcon className="h-3 w-3 text-purple-500 dark:text-purple-400" />
                        Links / References
                      </label>
                      <textarea
                        rows={2}
                        value={links}
                        onChange={(e) => setLinks(e.target.value)}
                        placeholder="GitHub / server / design / document URLs (one per line or comma-separated)"
                        className={`${inputClass} resize-y`}
                      />
                    </div>
                    <div>
                      <label className={`${labelClasses} flex items-center gap-1.5`}>
                        <Image className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                        Proof / Screenshot
                      </label>
                      <input
                        value={proof}
                        onChange={(e) => setProof(e.target.value)}
                        placeholder="Paste screenshot URL or describe the output"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600/70 dark:text-amber-400/70">
                    <Sparkles className="h-3 w-3" />
                    Status <span className="text-rose-500">*</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["completed", "in-progress", "blocked"] as const).map((s) => {
                      const cfg = statusConfig[s];
                      const Icon = cfg.icon;
                      const isActive = status === s;
                      const tint =
                        s === "completed"   ? "from-emerald-500 to-teal-600"
                        : s === "in-progress" ? "from-amber-500 to-orange-600"
                        : "from-rose-500 to-pink-600";
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(s)}
                          className={`group relative overflow-hidden rounded-xl border p-3 text-center transition-all ${
                            isActive
                              ? "border-transparent shadow-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                              : "border-gray-200/80 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700/80 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800/60"
                          }`}
                          style={
                            isActive
                              ? {
                                  background:
                                    s === "completed"
                                      ? "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(20,184,166,0.05))"
                                      : s === "in-progress"
                                        ? "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(249,115,22,0.05))"
                                        : "linear-gradient(135deg, rgba(244,63,94,0.10), rgba(236,72,153,0.05))",
                                  boxShadow:
                                    "0 0 0 2px " +
                                    (s === "completed"
                                      ? "rgba(16,185,129,0.55)"
                                      : s === "in-progress"
                                        ? "rgba(245,158,11,0.55)"
                                        : "rgba(244,63,94,0.55)"),
                                }
                              : undefined
                          }
                        >
                          <div className={`mx-auto mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${tint} text-white shadow-sm ring-1 ring-white/10`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-[12px] font-semibold text-gray-900 dark:text-white">{cfg.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Plan for tomorrow */}
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600/70 dark:text-sky-400/70">
                    <ArrowRight className="h-3 w-3" />
                    Tomorrow
                  </p>
                  <label className={`${labelClasses} flex items-center gap-1.5`}>
                    <ArrowRight className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                    Plan for Tomorrow <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={planForTomorrow}
                    onChange={(e) => setPlanForTomorrow(e.target.value)}
                    placeholder="Briefly mention what you will work on next..."
                    className={`${inputClass} resize-y`}
                    required
                  />
                </div>
              </form>

              {/* Sticky footer */}
              <div className="shrink-0 border-t border-gray-200/70 bg-white/95 px-5 py-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 sm:px-6">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="dailyupdate-form"
                    disabled={saving || !tasks.trim() || !planForTomorrow.trim()}
                    className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative inline-flex items-center justify-center gap-2">
                      {saving
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                        : editing
                          ? <><Pencil className="h-4 w-4" />Save Changes</>
                          : <><Plus className="h-4 w-4" />Submit Update</>}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
