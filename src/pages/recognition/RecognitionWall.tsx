import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Heart,
  MessageCircle,
  Star,
  Users,
  Lightbulb,
  Target,
  Zap,
  HandHeart,
  ArrowRight,
  Send,
  Sparkles,
  TrendingUp,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { recognitionApi, type RecognitionData } from "../../api/recognitionApi";
import { useAuth } from "../../context/AuthContext";

const BADGES: Record<
  string,
  {
    label: string;
    gradient: string;
    chip: string;
    text: string;
    ring: string;
    icon: React.ReactNode;
  }
> = {
  "star-performer": {
    label: "Star Performer",
    gradient: "from-amber-500 to-orange-500",
    chip: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/20",
    icon: <Star className="h-3.5 w-3.5" />,
  },
  "team-player": {
    label: "Team Player",
    gradient: "from-sky-500 to-blue-600",
    chip: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/20",
    icon: <Users className="h-3.5 w-3.5" />,
  },
  innovator: {
    label: "Innovator",
    gradient: "from-violet-500 to-purple-600",
    chip: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/20",
    icon: <Lightbulb className="h-3.5 w-3.5" />,
  },
  mentor: {
    label: "Mentor",
    gradient: "from-emerald-500 to-teal-600",
    chip: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
    icon: <Target className="h-3.5 w-3.5" />,
  },
  "go-getter": {
    label: "Go-Getter",
    gradient: "from-orange-500 to-red-500",
    chip: "bg-orange-50 dark:bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-500/20",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  "helping-hand": {
    label: "Helping Hand",
    gradient: "from-pink-500 to-rose-600",
    chip: "bg-pink-50 dark:bg-pink-500/10",
    text: "text-pink-700 dark:text-pink-300",
    ring: "ring-pink-500/20",
    icon: <HandHeart className="h-3.5 w-3.5" />,
  },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </p>
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

export default function RecognitionWall() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<RecognitionData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState<string | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<string>("all");

  const fetchPosts = useCallback((p: number) => {
    setLoading(true);
    recognitionApi
      .getAll({ page: p, limit: 10 })
      .then((r) => {
        setPosts(r.data.data);
        setTotalPages(r.data.pagination?.pages ?? 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPosts(page);
  }, [page, fetchPosts]);

  const handleLike = async (id: string) => {
    try {
      await recognitionApi.react(id);
      fetchPosts(page);
    } catch {
      /* interceptor */
    }
  };

  const handleComment = async (id: string) => {
    const text = (drafts[id] || "").trim();
    if (!text) return;
    setPosting(id);
    try {
      await recognitionApi.comment(id, text);
      setDrafts((d) => ({ ...d, [id]: "" }));
      fetchPosts(page);
    } catch {
      /* interceptor */
    } finally {
      setPosting(null);
    }
  };

  // Derived
  const stats = useMemo(() => {
    const total = posts.length;
    const thisMonth = posts.filter(
      (p) => new Date(p.createdAt).getMonth() === new Date().getMonth()
    ).length;
    const toMe = user ? posts.filter((p) => p.toUser._id === user._id).length : 0;
    const topBadge = Object.entries(
      posts.reduce<Record<string, number>>((acc, p) => {
        acc[p.badge] = (acc[p.badge] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0];
    return { total, thisMonth, toMe, topBadgeLabel: topBadge ? BADGES[topBadge[0]]?.label || "—" : "—" };
  }, [posts, user]);

  const filtered = useMemo(() => {
    if (badgeFilter === "all") return posts;
    return posts.filter((p) => p.badge === badgeFilter);
  }, [posts, badgeFilter]);

  return (
    <div className="space-y-6">
      {/* ━━━ Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-orange-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-orange-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-pink-500/25 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
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
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-200 backdrop-blur-sm ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" /> Culture · Recognition
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <Award className="h-8 w-8 text-amber-300" />
              Recognition Wall
            </h1>
            <p className="mt-2 max-w-xl text-sm text-amber-100/80 sm:text-base">
              Celebrate the people making a difference. Shout-outs, kudos, and moments that matter —
              all in one place.
            </p>
          </div>
          <Link
            to="/recognition/send"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-5 py-3 text-sm font-bold text-gray-900 shadow-lg shadow-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/40 active:scale-[0.98]"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Send className="h-4 w-4" /> Give Recognition
          </Link>
        </div>
      </div>

      {/* ━━━ Stats ━━━ */}
      {posts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Award} label="Total recognitions" value={stats.total} sublabel="This page" tint="amber" />
          <StatCard icon={TrendingUp} label="This month" value={stats.thisMonth} sublabel="Kudos given" tint="rose" />
          <StatCard icon={Heart} label="For me" value={stats.toMe} sublabel="Received" tint="indigo" />
          <StatCard icon={Trophy} label="Top badge" value={stats.topBadgeLabel} sublabel="Most awarded" tint="emerald" />
        </div>
      )}

      {/* ━━━ Badge filter pills ━━━ */}
      <div className="flex items-center gap-1 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 p-1 backdrop-blur-sm overflow-x-auto">
        <button
          onClick={() => setBadgeFilter("all")}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
            badgeFilter === "all"
              ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          All
        </button>
        {Object.entries(BADGES).map(([key, b]) => (
          <button
            key={key}
            onClick={() => setBadgeFilter(key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              badgeFilter === key
                ? `bg-gradient-to-br ${b.gradient} text-white shadow-md`
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {b.icon}
            {b.label}
          </button>
        ))}
      </div>

      {/* ━━━ Feed ━━━ */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500/20 border-t-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-amber-500/20 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <Award className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {badgeFilter === "all" ? "No recognitions yet" : "No posts with this badge"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {badgeFilter === "all"
              ? "Be the first to celebrate a teammate!"
              : "Try a different badge filter."}
          </p>
          {badgeFilter === "all" && (
            <Link
              to="/recognition/send"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-amber-500/30"
            >
              <Send className="h-4 w-4" /> Give Recognition
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((post) => {
            const badge = BADGES[post.badge] ?? BADGES["star-performer"];
            const liked = user ? post.reactions.like.includes(user._id) : false;
            const commentsOpen = openComments[post._id];

            return (
              <div
                key={post._id}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-200/60 dark:hover:shadow-black/40"
              >
                {/* Gradient accent */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${badge.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}
                />

                <div className="relative">
                  {/* From → To row */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md">
                      {initials(post.fromUser.name)}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${badge.gradient} text-sm font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md`}
                    >
                      {initials(post.toUser.name)}
                    </div>
                    <div className="ml-1 min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        <span className="text-indigo-600 dark:text-indigo-400">{post.fromUser.name}</span>
                        <span className="text-gray-500 dark:text-gray-400 font-normal"> recognized </span>
                        <span className={badge.text}>{post.toUser.name}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{timeAgo(post.createdAt)}</p>
                    </div>
                  </div>

                  {/* Badge pill */}
                  <div
                    className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${badge.chip} ${badge.text} ${badge.ring}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </div>

                  {/* Message card with quote */}
                  <div className="relative mt-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/40 dark:to-gray-800/20 p-4 ring-1 ring-gray-200/60 dark:ring-gray-800/60">
                    <span className="absolute left-3 top-1 text-4xl font-serif text-gray-300 dark:text-gray-700 leading-none">
                      "
                    </span>
                    <p className="pl-5 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                      {post.message}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2 border-t border-gray-200/70 dark:border-gray-800/60 pt-3">
                    <button
                      onClick={() => handleLike(post._id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                        liked
                          ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 ring-1 ring-pink-500/20"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 transition-transform ${liked ? "fill-current scale-110" : ""}`}
                      />
                      <span className="tabular-nums">{post.reactions.like.length}</span>
                    </button>
                    <button
                      onClick={() =>
                        setOpenComments((o) => ({ ...o, [post._id]: !o[post._id] }))
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                        commentsOpen
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      }`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="tabular-nums">{post.comments.length}</span>
                    </button>
                  </div>

                  {/* Comments */}
                  {commentsOpen && (
                    <div className="mt-3 space-y-2 rounded-xl bg-gray-50/70 dark:bg-gray-800/30 p-3 ring-1 ring-gray-200/60 dark:ring-gray-800/60">
                      {post.comments.length === 0 ? (
                        <p className="text-xs italic text-gray-400 dark:text-gray-500">No comments yet.</p>
                      ) : (
                        post.comments.map((c, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                              {initials(c.userId.name)}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {c.userId.name}
                              </span>{" "}
                              {c.text}
                            </p>
                          </div>
                        ))
                      )}

                      {/* Comment input */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={drafts[post._id] || ""}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [post._id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleComment(post._id);
                          }}
                          placeholder="Write a comment…"
                          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                          onClick={() => handleComment(post._id)}
                          disabled={posting === post._id || !(drafts[post._id] || "").trim()}
                          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-2.5 py-1.5 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━ Pagination ━━━ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">
            Page {page} <span className="text-gray-400">/ {totalPages}</span>
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
