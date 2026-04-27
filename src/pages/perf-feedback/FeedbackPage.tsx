import { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Send,
  Star,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  Users,
  Shield,
  Search,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { performanceApi, type FeedbackData } from "../../api/performanceApi";
import { userApi } from "../../api/userApi";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../types";
import toast from "react-hot-toast";

// ── Type config ──
const TYPE_CFG: Record<
  string,
  { label: string; dot: string; bg: string; text: string; ring: string }
> = {
  manager: {
    label: "Manager",
    dot: "bg-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/20",
  },
};

// ── Primitives ──
function RatingStars({
  value,
  onChange,
  readonly,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const box = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-9 w-9";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`${box} rounded-lg flex items-center justify-center transition-all ${
            n <= value
              ? "text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
              : "text-gray-300 dark:text-gray-600"
          } ${readonly ? "cursor-default" : "hover:scale-125 active:scale-95"}`}
        >
          <Star className={`${dim} ${n <= value ? "fill-current" : ""}`} strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tint,
}: {
  icon: any;
  label: string;
  value: string | number;
  sublabel?: string;
  tint: "indigo" | "emerald" | "amber" | "rose";
}) {
  const tints: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/0 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    rose: "from-rose-500/20 to-rose-500/0 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-black/30">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${tints[tint]} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
          {sublabel && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tints[tint]} ring-1`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
      </div>
    </div>
  );
}

function initials(name?: string) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Page ──
export default function FeedbackPage() {
  const { user, isAdmin, isManager } = useAuth();
  const canGiveFeedback = isAdmin || isManager;

  // Give Feedback state
  const [users, setUsers] = useState<User[]>([]);
  const [toUser, setToUser] = useState("");
  const [type, setType] = useState("manager");
  const [rating, setRating] = useState(0);
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [comments, setComments] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // My Feedback state
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!canGiveFeedback) return;
    userApi
      .getAll({ limit: 500 })
      .then((r) => {
        const all = r.data.data ?? [];
        setUsers(all.filter((u) => u._id !== user?._id && u.role !== "admin"));
      })
      .catch(() => {});
  }, [user, canGiveFeedback]);

  useEffect(() => {
    if (canGiveFeedback) return;
    setLoadingFeedback(true);
    performanceApi
      .getMyFeedback()
      .then((r) => setFeedback(r.data.data ?? []))
      .catch(() => toast.error("Failed to load feedback"))
      .finally(() => setLoadingFeedback(false));
  }, [canGiveFeedback]);

  // Derived stats
  const stats = useMemo(() => {
    const count = feedback.length;
    const withRating = feedback.filter((f) => typeof f.rating === "number" && f.rating! > 0);
    const avg = withRating.length
      ? withRating.reduce((s, f) => s + (f.rating || 0), 0) / withRating.length
      : 0;
    const rated = withRating.length;
    const fiveStarPct = rated
      ? Math.round((withRating.filter((f) => f.rating === 5).length / rated) * 100)
      : 0;
    return { count, avg, rated, fiveStarPct };
  }, [feedback]);

  const filteredFeedback = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return feedback;
    return feedback.filter(
      (f) =>
        f.strengths?.toLowerCase().includes(q) ||
        f.improvements?.toLowerCase().includes(q) ||
        f.comments?.toLowerCase().includes(q) ||
        f.fromUser?.name?.toLowerCase().includes(q)
    );
  }, [feedback, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUser) return toast.error("Select an employee");
    if (rating === 0) return toast.error("Please provide a rating");

    setSubmitting(true);
    try {
      await performanceApi.giveFeedback({
        toUser,
        type,
        rating,
        strengths: strengths.trim(),
        improvements: improvements.trim(),
        comments: comments.trim(),
        anonymous,
      });
      toast.success("Feedback submitted");
      setToUser("");
      setType("manager");
      setRating(0);
      setStrengths("");
      setImprovements("");
      setComments("");
      setAnonymous(false);
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUser = users.find((u) => u._id === toUser);

  // Styles
  const input =
    "w-full rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";
  const card =
    "rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 backdrop-blur-sm";

  return (
    <div className="space-y-6">
      {/* ━━━ Premium Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-sky-500/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-200 backdrop-blur-sm ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" /> Performance · Feedback
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Grow together, one insight at a time
            </h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/80 sm:text-base">
              Share meaningful feedback with teammates and review what others have shared with you —
              all in a single, private workspace.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-indigo-100/90">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
              <Shield className="h-3.5 w-3.5" />
              End-to-end confidential
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ Stats Row (employees only) ━━━ */}
      {!canGiveFeedback && feedback.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={MessageSquare}
            label="Total received"
            value={stats.count}
            sublabel="All time"
            tint="indigo"
          />
          <StatCard
            icon={Star}
            label="Average rating"
            value={stats.avg.toFixed(1)}
            sublabel="Out of 5"
            tint="amber"
          />
          <StatCard
            icon={Users}
            label="Rated"
            value={stats.rated}
            sublabel={`${feedback.length - stats.rated} without rating`}
            tint="emerald"
          />
          <StatCard
            icon={TrendingUp}
            label="5-star feedback"
            value={`${stats.fiveStarPct}%`}
            sublabel="Of rated entries"
            tint="rose"
          />
        </div>
      )}

      {/* ━━━ Section Label ━━━ */}
      <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/30">
        {canGiveFeedback ? (
          <>
            <Send className="h-3.5 w-3.5" /> Give Feedback
          </>
        ) : (
          <>
            <MessageSquare className="h-3.5 w-3.5" /> My Feedback
            {feedback.length > 0 && (
              <span className="ml-1 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
                {feedback.length}
              </span>
            )}
          </>
        )}
      </div>

      {/* ━━━ Give Feedback (admins & managers only) ━━━ */}
      {canGiveFeedback && (
        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-5">
          {/* Form column */}
          <div className={`${card} lg:col-span-3 p-5 sm:p-6 space-y-5`}>
            {/* Section: Recipient */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  1
                </span>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Who is this feedback for?</h2>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Employee
                </label>
                <select className={input} value={toUser} onChange={(e) => setToUser(e.target.value)}>
                  <option value="">Select employee…</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} — {u.department || u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section: Rating */}
            <div className="border-t border-gray-200/70 dark:border-gray-800/60 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  2
                </span>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Overall rating</h2>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/5 dark:to-orange-500/5 p-4 ring-1 ring-amber-500/10">
                <RatingStars value={rating} onChange={setRating} size="lg" />
                <span className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {rating > 0 ? rating.toFixed(1) : "—"}
                  <span className="text-sm font-medium text-amber-600/60 dark:text-amber-400/60">/5</span>
                </span>
              </div>
            </div>

            {/* Section: Qualitative */}
            <div className="border-t border-gray-200/70 dark:border-gray-800/60 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  3
                </span>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Share your thoughts</h2>
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1.5">
                  ★ Strengths
                </label>
                <textarea
                  className={`${input} min-h-[90px] resize-y`}
                  rows={3}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="What are their standout qualities and contributions?"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-600 dark:text-amber-400 mb-1.5">
                  ↗ Areas for improvement
                </label>
                <textarea
                  className={`${input} min-h-[90px] resize-y`}
                  rows={3}
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  placeholder="Where could they grow? Be specific and constructive."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Additional comments
                </label>
                <textarea
                  className={`${input} min-h-[80px] resize-y`}
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Anything else you'd like to share…"
                />
              </div>
            </div>

            {/* Anonymous */}
            <div
              className={`flex items-center justify-between rounded-xl p-4 ring-1 transition-colors ${
                anonymous
                  ? "bg-gray-900 text-white ring-gray-900"
                  : "bg-gray-50 dark:bg-gray-800/40 ring-gray-200 dark:ring-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    anonymous ? "bg-white/10" : "bg-white dark:bg-gray-900"
                  }`}
                >
                  {anonymous ? (
                    <EyeOff className="h-4 w-4 text-white" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${anonymous ? "text-white" : "text-gray-900 dark:text-white"}`}>
                    Submit anonymously
                  </p>
                  <p className={`text-xs ${anonymous ? "text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>
                    {anonymous
                      ? "Your identity will be hidden from the recipient"
                      : "Your name will be visible to the recipient"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAnonymous(!anonymous)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  anonymous ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                    anonymous ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Live preview column */}
          <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div className={`${card} p-5`}>
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Live preview
              </div>
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-5">
                {/* Preview header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    {anonymous ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900">
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md">
                        {initials(user?.name)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {anonymous ? "Anonymous" : user?.name || "You"}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        To {selectedUser?.name || "…"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${TYPE_CFG[type].bg} ${TYPE_CFG[type].text} ${TYPE_CFG[type].ring}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${TYPE_CFG[type].dot}`} />
                    {TYPE_CFG[type].label}
                  </span>
                </div>

                <RatingStars value={rating} readonly size="sm" />

                <div className="mt-4 space-y-3 text-sm">
                  {strengths ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Strengths</p>
                      <p className="mt-0.5 text-gray-700 dark:text-gray-300">{strengths}</p>
                    </div>
                  ) : null}
                  {improvements ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Improvements</p>
                      <p className="mt-0.5 text-gray-700 dark:text-gray-300">{improvements}</p>
                    </div>
                  ) : null}
                  {comments ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Comments</p>
                      <p className="mt-0.5 text-gray-700 dark:text-gray-300">{comments}</p>
                    </div>
                  ) : null}
                  {!strengths && !improvements && !comments && (
                    <p className="italic text-gray-400 dark:text-gray-500">
                      Start typing to preview your feedback…
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.98] disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Sending…
                </>
              ) : (
                <>
                  Submit Feedback <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 p-3 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                Your feedback helps build a stronger, more transparent team.
                {anonymous ? " Identity hidden on submit." : " You can choose to remain anonymous above."}
              </p>
            </div>
          </div>
        </form>
      )}

      {/* ━━━ My Feedback (employees only) ━━━ */}
      {!canGiveFeedback && (
        <div className="space-y-4">
          {loadingFeedback && (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
            </div>
          )}

          {!loadingFeedback && feedback.length === 0 && (
            <div className={`${card} flex flex-col items-center justify-center py-20 text-center`}>
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">No feedback yet</p>
              <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                When teammates share feedback with you, it will appear here.
              </p>
            </div>
          )}

          {!loadingFeedback && feedback.length > 0 && (
            <>
              {/* Search & filter */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search feedback…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`${input} pl-10`}
                  />
                </div>
              </div>

              {/* Feedback grid */}
              {filteredFeedback.length === 0 ? (
                <div className={`${card} py-12 text-center text-sm text-gray-500 dark:text-gray-400`}>
                  No feedback matches your filters.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredFeedback.map((fb) => {
                    const cfg = TYPE_CFG[fb.type] || TYPE_CFG.manager;
                    return (
                      <div
                        key={fb._id}
                        className={`${card} group p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-black/40 hover:border-indigo-300/60 dark:hover:border-indigo-600/40`}
                      >
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {fb.anonymous ? (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900">
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md">
                                {initials(fb.fromUser?.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {fb.anonymous ? "Anonymous" : fb.fromUser?.name || "Unknown"}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {new Date(fb.createdAt).toLocaleDateString(undefined, {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>

                        {typeof fb.rating === "number" && fb.rating > 0 && (
                          <div className="mb-3 flex items-center gap-2 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/5 dark:to-orange-500/5 px-3 py-2 ring-1 ring-amber-500/10">
                            <RatingStars value={fb.rating} readonly size="sm" />
                            <span className="ml-auto text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                              {fb.rating.toFixed(1)}
                            </span>
                          </div>
                        )}

                        <div className="space-y-2.5">
                          {fb.strengths && (
                            <div className="rounded-lg border border-emerald-200/60 dark:border-emerald-500/15 bg-emerald-50/60 dark:bg-emerald-500/5 px-3 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Strengths
                              </p>
                              <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                                {fb.strengths}
                              </p>
                            </div>
                          )}
                          {fb.improvements && (
                            <div className="rounded-lg border border-amber-200/60 dark:border-amber-500/15 bg-amber-50/60 dark:bg-amber-500/5 px-3 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                Improvements
                              </p>
                              <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                                {fb.improvements}
                              </p>
                            </div>
                          )}
                          {fb.comments && (
                            <div className="rounded-lg bg-gray-50/80 dark:bg-gray-800/40 px-3 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Comments
                              </p>
                              <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                                {fb.comments}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
