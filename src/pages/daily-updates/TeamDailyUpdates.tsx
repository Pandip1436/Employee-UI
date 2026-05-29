import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  Image,
  Users,
  X,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
  CalendarDays,
  Sparkles,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { dailyUpdateApi } from "../../api/dailyUpdateApi";
import type { DailyUpdateData } from "../../api/dailyUpdateApi";
import type { Pagination } from "../../types";

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

const reviewStatusConfig: Record<string, { badge: string; label: string }> = {
  reviewed: {
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    label: "Reviewed",
  },
  "needs-improvement": {
    badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20",
    label: "Needs Improvement",
  },
};

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

const getUserEmail = (u: DailyUpdateData["userId"]): string =>
  typeof u === "object" ? u.email : "";

const getReviewerName = (u: DailyUpdateData["reviewedBy"]): string => {
  if (!u) return "";
  return typeof u === "object" ? u.name : String(u);
};

const getInitials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const parseLinks = (text: string) => {
  if (!text.trim()) return [];
  return text.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
};

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
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

/* ── Component ── */
type ReviewFilter = "all" | "pending" | "reviewed" | "blocked";

export default function TeamDailyUpdates() {
  const [updates, setUpdates] = useState<DailyUpdateData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");

  // Detail modal
  const [detailUpdate, setDetailUpdate] = useState<DailyUpdateData | null>(null);

  // Review modal
  const [reviewTarget, setReviewTarget] = useState<DailyUpdateData | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"reviewed" | "needs-improvement">("reviewed");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchUpdates = () => {
    setLoading(true);
    dailyUpdateApi
      .getTeamUpdates({ page, limit: 20, date: filterDate })
      .then((res) => {
        setUpdates(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [filterDate]);

  useEffect(() => {
    fetchUpdates();
  }, [page, filterDate]);

  const prevDay = () => {
    const d = new Date(filterDate);
    d.setDate(d.getDate() - 1);
    setFilterDate(d.toISOString().slice(0, 10));
  };

  const nextDay = () => {
    const d = new Date(filterDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setFilterDate(d.toISOString().slice(0, 10));
  };

  const openReview = (u: DailyUpdateData) => {
    setReviewTarget(u);
    setReviewStatus(u.reviewStatus || "reviewed");
    setReviewComment(u.reviewComment || "");
  };

  const handleReview = async () => {
    if (!reviewTarget) return;
    setReviewLoading(true);
    try {
      await dailyUpdateApi.review(reviewTarget._id, {
        reviewStatus,
        reviewComment: reviewComment.trim() || undefined,
      });
      toast.success(reviewStatus === "reviewed" ? "Marked as reviewed" : "Flagged for improvement");
      setReviewTarget(null);
      setReviewComment("");
      fetchUpdates();
    } catch {
      // handled by interceptor
    } finally {
      setReviewLoading(false);
    }
  };

  const quickReview = async (id: string) => {
    try {
      await dailyUpdateApi.review(id, { reviewStatus: "reviewed" });
      toast.success("Marked as reviewed");
      fetchUpdates();
    } catch {
      // handled
    }
  };

  const reviewedCount = updates.filter((u) => u.reviewStatus).length;
  const pendingCount = updates.filter((u) => !u.reviewStatus).length;
  const blockedCount = updates.filter((u) => u.status === "blocked").length;

  // Client-side filter (search by name/email + review status)
  const filteredUpdates = updates.filter((u) => {
    if (reviewFilter === "pending"  && u.reviewStatus) return false;
    if (reviewFilter === "reviewed" && !u.reviewStatus) return false;
    if (reviewFilter === "blocked"  && u.status !== "blocked") return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const name = getUserName(u.userId).toLowerCase();
      const email = getUserEmail(u.userId).toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
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
          <div className="min-w-0 flex-1 lg:max-w-[640px]">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
                <Users className="h-10 w-10 text-indigo-200" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Manager review workspace
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Team <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Daily Updates</span>
                </h1>
                <p className="mt-1 text-sm text-indigo-200/70">Review your team's end-of-day work submissions</p>
              </div>
            </div>

            {/* Hero KPI chips */}
              {!loading && updates.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                    <Users className="h-3.5 w-3.5 text-indigo-200" />
                    <span className="text-indigo-200/80">Total</span>
                    <span className="font-mono font-semibold tabular-nums">{updates.length}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs ring-1 ring-emerald-400/30 backdrop-blur-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                    <span className="text-emerald-200/90">Reviewed</span>
                    <span className="font-mono font-semibold tabular-nums text-emerald-50">{reviewedCount}</span>
                  </span>
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs ring-1 ring-amber-400/30 backdrop-blur-sm">
                      <Clock className="h-3.5 w-3.5 text-amber-200" />
                      <span className="text-amber-200/90">Pending</span>
                      <span className="font-mono font-semibold tabular-nums text-amber-50">{pendingCount}</span>
                    </span>
                  )}
                  {blockedCount > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs ring-1 ring-rose-400/30 backdrop-blur-sm">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-200" />
                      <span className="text-rose-200/90">Blocked</span>
                      <span className="font-mono font-semibold tabular-nums text-rose-50">{blockedCount}</span>
                    </span>
                  )}
                </div>
              )}
          </div>

          {/* RIGHT: date navigator */}
          <div className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/10 p-1.5 ring-1 ring-white/15 backdrop-blur-sm">
            <button
              onClick={prevDay}
              aria-label="Previous day"
              className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              max={todayISO()}
              className="rounded-md border-0 bg-transparent px-2 py-1 text-sm font-semibold text-white outline-none [color-scheme:dark] focus:ring-0"
            />
            <button
              onClick={() => setFilterDate(todayISO())}
              className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15"
            >
              Today
            </button>
            <button
              onClick={nextDay}
              disabled={filterDate >= todayISO()}
              aria-label="Next day"
              className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary tiles ── */}
      {!loading && (() => {
        const totalUpdates = updates.length;
        const reviewPct = totalUpdates > 0 ? Math.round((reviewedCount / totalUpdates) * 100) : 0;
        const tiles = [
          {
            label: "Total",
            value: totalUpdates,
            sub: totalUpdates === 0 ? "No submissions" : `${totalUpdates} ${totalUpdates === 1 ? "submission" : "submissions"} today`,
            icon: Users,
            gradient: "from-indigo-500 to-purple-600",
            ringColor: "shadow-indigo-500/30",
          },
          {
            label: "Reviewed",
            value: reviewedCount,
            sub: totalUpdates > 0 ? `${reviewPct}% of team reviewed` : "Nothing to review",
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-600",
            ringColor: "shadow-emerald-500/30",
            progress: reviewPct,
            toneChip: reviewPct >= 80
              ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25"
              : reviewPct >= 50
              ? "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/25"
              : "bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/25",
            toneLabel: reviewPct >= 80 ? "On track" : reviewPct >= 50 ? "Catch up" : "Behind",
          },
          {
            label: "Pending Review",
            value: pendingCount,
            sub: pendingCount === 0 ? "Inbox zero" : "Awaiting your review",
            icon: Clock,
            gradient: "from-amber-500 to-orange-600",
            ringColor: "shadow-amber-500/30",
            toneChip: pendingCount > 0
              ? "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/25"
              : "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25",
            toneLabel: pendingCount > 0 ? "Action needed" : "All clear",
          },
          {
            label: "Blocked",
            value: blockedCount,
            sub: blockedCount === 0 ? "No blockers" : "Need attention",
            icon: AlertTriangle,
            gradient: "from-rose-500 to-pink-600",
            ringColor: "shadow-rose-500/30",
            toneChip: blockedCount > 0
              ? "bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/25"
              : "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/25",
            toneLabel: blockedCount > 0 ? "Unblock soon" : "Healthy",
          },
        ];
        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((s) => (
              <div
                key={s.label}
                className={`${cardCls} group relative overflow-hidden !p-0 transition-all duration-300 hover:-translate-y-0.5`}
              >
                {/* Top gradient stripe */}
                <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${s.gradient}`} />

                {/* Decorative halos */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 blur-2xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-110`}
                />
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${s.gradient} opacity-[0.04] blur-2xl`}
                />

                <div className="relative p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={labelCls}>{s.label}</p>
                      <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">{s.value}</p>
                    </div>
                    <div
                      className={`relative shrink-0 rounded-xl bg-gradient-to-br ${s.gradient} p-2.5 shadow-lg ${s.ringColor} ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105`}
                    >
                      <s.icon className="h-4 w-4 text-white" strokeWidth={2.5} />
                      <span aria-hidden className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{s.sub}</p>
                    {s.toneLabel && s.toneChip && (
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${s.toneChip}`}>
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {s.toneLabel}
                      </span>
                    )}
                  </div>

                  {/* Progress bar (Reviewed only) */}
                  {typeof s.progress === "number" && (
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${s.gradient} transition-[width] duration-700`}
                        style={{ width: `${Math.min(100, s.progress)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filter Bar */}
      <div className={`${cardCls} p-3`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
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

          {/* Review filter chips */}
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-gray-50/60 p-1 dark:border-gray-800/80 dark:bg-gray-800/40">
            {([
              { key: "all" as ReviewFilter,      label: "All",       count: updates.length, dot: "bg-gray-400" },
              { key: "pending" as ReviewFilter,  label: "Pending",   count: pendingCount,   dot: "bg-amber-500" },
              { key: "reviewed" as ReviewFilter, label: "Reviewed",  count: reviewedCount,  dot: "bg-emerald-500" },
              { key: "blocked" as ReviewFilter,  label: "Blocked",   count: blockedCount,   dot: "bg-rose-500" },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setReviewFilter(f.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  reviewFilter === f.key
                    ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
                {f.label}
                <span className={`inline-flex min-w-[20px] items-center justify-center rounded-md px-1.5 py-0 text-[10px] font-bold ${
                  reviewFilter === f.key
                    ? "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {(reviewFilter !== "all" || search) && (
            <button
              onClick={() => { setReviewFilter("all"); setSearch(""); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-gray-200/70 pt-2.5 text-xs text-gray-500 dark:border-gray-800/80 dark:text-gray-400">
          <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
          Showing updates for <span className="font-semibold text-gray-900 dark:text-white">{formatDate(filterDate)}</span>
          {(search || reviewFilter !== "all") && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span><span className="font-mono font-semibold tabular-nums text-gray-900 dark:text-white">{filteredUpdates.length}</span> of <span className="font-mono tabular-nums">{updates.length}</span> matches</span>
            </>
          )}
        </div>
      </div>

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
            {updates.length === 0 ? `No updates for ${formatDate(filterDate)}` : "No matches for your filters"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {updates.length === 0
              ? "Team members haven't submitted their daily updates yet"
              : "Try clearing search or status filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUpdates.map((u) => {
            const sConfig = statusConfig[u.status] || statusConfig.completed;
            const StatusIcon = sConfig.icon;
            const linksList = parseLinks(u.links);
            const isReviewed = !!u.reviewStatus;
            const rConfig = u.reviewStatus ? reviewStatusConfig[u.reviewStatus] : null;
            const userName = getUserName(u.userId);

            return (
              <div
                key={u._id}
                onClick={() => setDetailUpdate(u)}
                className={`${cardCls} relative cursor-pointer overflow-hidden p-5 hover:-translate-y-0.5 ${
                  !isReviewed ? "ring-1 ring-amber-500/20 dark:ring-amber-400/20" : ""
                }`}
              >
                {!isReviewed && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-orange-500"
                  />
                )}
                {/* Top */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(userName)} text-sm font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
                      {getInitials(userName)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {getUserName(u.userId)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getUserEmail(u.userId)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sConfig.badge}`}>
                      <StatusIcon className="h-3 w-3" />
                      {sConfig.label}
                    </span>
                    {rConfig && (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${rConfig.badge}`}>
                        {u.reviewStatus === "reviewed" ? <Eye className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        {rConfig.label}
                      </span>
                    )}
                    {!isReviewed && (
                      <button
                        onClick={(e) => { e.stopPropagation(); quickReview(u._id); }}
                        title="Mark as reviewed"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        Reviewed
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); openReview(u); }}
                      title={isReviewed ? "Update review" : "Review with comment"}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <MessageSquare className="h-3 w-3" />
                      {isReviewed ? "Edit Review" : "Comment"}
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
                      Proof
                    </span>
                  )}
                  {u.reviewComment && (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Feedback
                    </span>
                  )}
                  {u.reviewedBy && !u.reviewComment && (
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Reviewed by {getReviewerName(u.reviewedBy)}
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
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
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
                        Daily update
                      </p>
                      <h2 className="mt-0.5 truncate text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                        {getUserName(detailUpdate.userId)}
                      </h2>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {getUserEmail(detailUpdate.userId)}
                      </p>
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                        <CalendarDays className="h-3 w-3 text-gray-400" />
                        <span className="font-mono tabular-nums">{formatDate(detailUpdate.date)}</span>
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
                {detailUpdate.reviewStatus && (() => {
                  const rc = reviewStatusConfig[detailUpdate.reviewStatus];
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${rc.badge}`}>
                      {detailUpdate.reviewStatus === "reviewed" ? <Eye className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {rc.label}
                    </span>
                  );
                })()}
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

              {/* Review comment */}
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
                      Review by {getReviewerName(detailUpdate.reviewedBy)}
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

              {detailUpdate.reviewedBy && !detailUpdate.reviewComment && (
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <Eye className="h-3.5 w-3.5" />
                  <span>
                    Reviewed by{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {getReviewerName(detailUpdate.reviewedBy)}
                    </span>
                    {detailUpdate.reviewedAt && (
                      <span className="ml-1">
                        on {new Date(detailUpdate.reviewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </span>
                </div>
              )}
              </div>

              {/* Sticky footer */}
              <div className="shrink-0 border-t border-gray-200/70 bg-white/95 px-5 py-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 sm:px-6">
                <div className="flex items-center justify-end gap-2">
                  <div className="mr-auto inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${dsCfg.badge}`}>
                      <dsCfg.icon className="h-3 w-3" />
                      {dsCfg.label}
                    </span>
                  </div>
                  <button
                    onClick={() => setDetailUpdate(null)}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                  {!detailUpdate.reviewStatus && (
                    <button
                      onClick={() => { quickReview(detailUpdate._id); setDetailUpdate(null); }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-500/35 active:scale-[0.98]"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Mark Reviewed
                    </button>
                  )}
                  <button
                    onClick={() => { openReview(detailUpdate); setDetailUpdate(null); }}
                    className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-500/35 active:scale-[0.98]"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative inline-flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      {detailUpdate.reviewStatus ? "Edit Review" : "Review"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Review Modal ── */}
      {reviewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setReviewTarget(null); }}
        >
          <div className="absolute inset-0 animate-backdrop-fade bg-gray-950/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md animate-modal-enter overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Review Update</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getUserName(reviewTarget.userId)} &middot; {formatDate(reviewTarget.date)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReviewTarget(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-5">

            {/* Review status buttons */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => setReviewStatus("reviewed")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  reviewStatus === "reviewed"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                Reviewed
              </button>
              <button
                type="button"
                onClick={() => setReviewStatus("needs-improvement")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  reviewStatus === "needs-improvement"
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
                Needs Improvement
              </button>
            </div>

            {/* Comment */}
            <textarea
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={
                reviewStatus === "needs-improvement"
                  ? "Provide feedback on what needs to be improved..."
                  : "Add a comment (optional)..."
              }
              className="mb-5 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setReviewTarget(null)}
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={reviewLoading}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 ${
                  reviewStatus === "needs-improvement"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {reviewLoading ? "Saving..." : "Submit Review"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
