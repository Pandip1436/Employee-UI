import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Award, Heart, MessageCircle, ChevronDown, Star, Users, Lightbulb,
  Target, Zap, HandHeart, ArrowRight, Send,
} from "lucide-react";
import { recognitionApi, type RecognitionData } from "../../api/recognitionApi";
import { useAuth } from "../../context/AuthContext";

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
  "star-performer": { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", icon: <Star className="h-4 w-4" />, label: "Star Performer" },
  "team-player":    { bg: "bg-blue-500/10",  text: "text-blue-400",  border: "border-blue-500/30",  icon: <Users className="h-4 w-4" />,     label: "Team Player" },
  "innovator":      { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", icon: <Lightbulb className="h-4 w-4" />, label: "Innovator" },
  "mentor":         { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", icon: <Target className="h-4 w-4" />, label: "Mentor" },
  "go-getter":      { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", icon: <Zap className="h-4 w-4" />,      label: "Go-Getter" },
  "helping-hand":   { bg: "bg-pink-500/10",   text: "text-pink-400",   border: "border-pink-500/30",   icon: <HandHeart className="h-4 w-4" />, label: "Helping Hand" },
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
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

export default function RecognitionWall() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<RecognitionData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState<string | null>(null);

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

  useEffect(() => { fetchPosts(page); }, [page, fetchPosts]);

  const handleLike = async (id: string) => {
    try {
      await recognitionApi.react(id);
      fetchPosts(page);
    } catch { /* interceptor */ }
  };

  const handleComment = async (id: string) => {
    const text = (drafts[id] || "").trim();
    if (!text) return;
    setPosting(id);
    try {
      await recognitionApi.comment(id, text);
      setDrafts((d) => ({ ...d, [id]: "" }));
      fetchPosts(page);
    } catch { /* interceptor */ } finally {
      setPosting(null);
    }
  };

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-pink-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-amber-200">Celebrate your teammates</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl flex items-center gap-2">
              <Award className="h-7 w-7" /> Recognition Wall
            </h1>
            <p className="mt-1 text-sm text-amber-200">See who is making a difference</p>
          </div>
          <Link
            to="/recognition/send"
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-orange-700 shadow-lg hover:scale-105 transition-all"
          >
            <Send className="h-4 w-4" /> Give Recognition
          </Link>
        </div>
      </div>

      {/* Feed */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <Award className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No recognitions yet. Be the first to celebrate a teammate!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const badge = BADGE_STYLES[post.badge] ?? BADGE_STYLES["star-performer"];
            const liked = user ? post.reactions.like.includes(user._id) : false;

            return (
              <div key={post._id} className={card}>
                {/* Avatars row */}
                <div className="flex items-center gap-3 mb-4">
                  {/* From user avatar */}
                  <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {getInitials(post.fromUser.name)}
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  {/* To user avatar */}
                  <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {getInitials(post.toUser.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      <span className="text-indigo-600 dark:text-indigo-400">{post.fromUser.name}</span>
                      {" recognized "}
                      <span className="text-emerald-600 dark:text-emerald-400">{post.toUser.name}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(post.createdAt)}</p>
                  </div>
                </div>

                {/* Badge */}
                <div className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold mb-3 ${badge.bg} ${badge.text} ${badge.border}`}>
                  {badge.icon}
                  {badge.label}
                </div>

                {/* Message */}
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
                  {post.message}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleLike(post._id)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      liked
                        ? "text-pink-500"
                        : "text-gray-500 dark:text-gray-400 hover:text-pink-500"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                    {post.reactions.like.length}
                  </button>
                  <button
                    onClick={() => setOpenComments((o) => ({ ...o, [post._id]: !o[post._id] }))}
                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-500 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {post.comments.length}
                  </button>
                </div>

                {/* Comments */}
                {(openComments[post._id] || post.comments.length > 0) && (
                  <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
                    {post.comments.map((c, i) => (
                      <p key={i} className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{c.userId.name}</span>{" "}
                        {c.text}
                      </p>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={drafts[post._id] || ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [post._id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleComment(post._id); }}
                    placeholder="Write a comment..."
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={() => handleComment(post._id)}
                    disabled={posting === post._id || !(drafts[post._id] || "").trim()}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-9 w-9 rounded-xl text-sm font-semibold transition-all ${
                p === page
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {loading && posts.length > 0 && (
        <div className="flex justify-center py-4">
          <ChevronDown className="h-5 w-5 animate-bounce text-gray-400" />
        </div>
      )}
    </div>
  );
}
