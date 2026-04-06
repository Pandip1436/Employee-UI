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

/* ── Component ── */
export default function TeamDailyUpdates() {
  const [updates, setUpdates] = useState<DailyUpdateData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(todayISO());

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

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Team Daily Updates
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review your team's end-of-day work submissions
            </p>
          </div>
        </div>
      </div>

      {/* ── Date Navigator ── */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <button
          onClick={prevDay}
          className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            max={todayISO()}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 px-3 py-1.5 outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => setFilterDate(todayISO())}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Today
          </button>
        </div>
        <button
          onClick={nextDay}
          disabled={filterDate >= todayISO()}
          className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Summary ── */}
      {!loading && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: updates.length, cls: "text-indigo-600 dark:text-indigo-400" },
            { label: "Reviewed", value: reviewedCount, cls: "text-emerald-600 dark:text-emerald-400" },
            { label: "Pending Review", value: pendingCount, cls: "text-amber-600 dark:text-amber-400" },
            { label: "Blocked", value: updates.filter((u) => u.status === "blocked").length, cls: "text-red-600 dark:text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4 text-center">
              <p className={`text-xl sm:text-2xl font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

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
            No updates for {formatDate(filterDate)}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Team members haven't submitted their daily updates yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((u) => {
            const sConfig = statusConfig[u.status] || statusConfig.completed;
            const StatusIcon = sConfig.icon;
            const linksList = parseLinks(u.links);
            const isReviewed = !!u.reviewStatus;
            const rConfig = u.reviewStatus ? reviewStatusConfig[u.reviewStatus] : null;

            return (
              <div
                key={u._id}
                className={`rounded-xl border bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md ${
                  isReviewed
                    ? "border-gray-200 dark:border-gray-800"
                    : "border-amber-200 dark:border-amber-500/30 border-l-4"
                }`}
              >
                {/* Top */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                      {getInitials(getUserName(u.userId))}
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
                    {/* Work status badge */}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sConfig.badge}`}>
                      <StatusIcon className="h-3 w-3" />
                      {sConfig.label}
                    </span>
                    {/* Review status badge */}
                    {rConfig && (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${rConfig.badge}`}>
                        {u.reviewStatus === "reviewed" ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {rConfig.label}
                      </span>
                    )}
                    {/* Review actions */}
                    {!isReviewed && (
                      <button
                        onClick={() => quickReview(u._id)}
                        title="Mark as reviewed"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        Reviewed
                      </button>
                    )}
                    <button
                      onClick={() => openReview(u)}
                      title={isReviewed ? "Update review" : "Review with comment"}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <MessageSquare className="h-3 w-3" />
                      {isReviewed ? "Edit Review" : "Comment"}
                    </button>
                  </div>
                </div>

                {/* Tasks */}
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                    Tasks Worked On
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {u.tasks}
                  </p>
                </div>

                {/* Links */}
                {linksList.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                      Links / References
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {linksList.map((link, i) => {
                        const isUrl = link.startsWith("http");
                        return isUrl ? (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-600/20 dark:ring-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors truncate max-w-[280px]"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {link.replace(/^https?:\/\//, "").slice(0, 40)}
                          </a>
                        ) : (
                          <span key={i} className="inline-flex items-center rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400">
                            {link}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Proof */}
                {u.proof && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                      Proof / Screenshot
                    </p>
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Image className="h-3.5 w-3.5" />
                      {u.proof.startsWith("http") ? (
                        <a href={u.proof} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[200px]">
                          {u.proof.replace(/^https?:\/\//, "").slice(0, 40)}
                        </a>
                      ) : (
                        <span>{u.proof}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Plan */}
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 px-4 py-3">
                  <ArrowRight className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
                      Plan for Tomorrow
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {u.planForTomorrow}
                    </p>
                  </div>
                </div>

                {/* Review comment (if exists) */}
                {u.reviewComment && (
                  <div className={`mt-3 flex items-start gap-2 rounded-xl px-4 py-3 ${
                    u.reviewStatus === "needs-improvement"
                      ? "bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20"
                      : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                  }`}>
                    <MessageSquare className={`h-4 w-4 mt-0.5 shrink-0 ${
                      u.reviewStatus === "needs-improvement"
                        ? "text-orange-500"
                        : "text-emerald-500"
                    }`} />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
                        Review by {getReviewerName(u.reviewedBy)}
                      </p>
                      <p className={`text-sm leading-relaxed ${
                        u.reviewStatus === "needs-improvement"
                          ? "text-orange-700 dark:text-orange-300"
                          : "text-emerald-700 dark:text-emerald-300"
                      }`}>
                        {u.reviewComment}
                      </p>
                    </div>
                  </div>
                )}

                {/* Reviewed by (no comment) */}
                {u.reviewedBy && !u.reviewComment && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <Eye className="h-3.5 w-3.5" />
                    <span>
                      Reviewed by{" "}
                      <span className="font-medium text-gray-600 dark:text-gray-300">
                        {getReviewerName(u.reviewedBy)}
                      </span>
                      {u.reviewedAt && (
                        <span className="ml-1">
                          on {new Date(u.reviewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
                  <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Review Update
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {getUserName(reviewTarget.userId)} &middot; {formatDate(reviewTarget.date)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewTarget(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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
      )}
    </div>
  );
}
