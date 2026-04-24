import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Pin,
  Send,
  MessageCircle,
  Clock,
  Hash,
  Sparkles,
  Paperclip,
} from "lucide-react";
import { announcementApi, type AnnouncementData } from "../../api/announcementApi";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const CAT_CFG: Record<
  string,
  { dot: string; bg: string; text: string; ring: string; glow: string }
> = {
  HR: {
    dot: "bg-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/20",
    glow: "from-sky-500/30",
  },
  Team: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
    glow: "from-emerald-500/30",
  },
  Important: {
    dot: "bg-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/20",
    glow: "from-rose-500/30",
  },
  General: {
    dot: "bg-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800/50",
    text: "text-gray-700 dark:text-gray-300",
    ring: "ring-gray-500/20",
    glow: "from-indigo-500/30",
  },
};

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "celebrate", emoji: "🎉", label: "Celebrate" },
] as const;

function initials(name?: string) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export default function AnnouncementDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncement = () => {
    if (!id) return;
    setLoading(true);
    announcementApi
      .getById(id)
      .then((res) => setAnnouncement(res.data.data ?? null))
      .catch(() => toast.error("Failed to load announcement"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnnouncement();
  }, [id]);

  const handleReact = async (type: string) => {
    if (!id) return;
    try {
      const res = await announcementApi.react(id, type);
      if (res.data.data) {
        setAnnouncement((prev) =>
          prev ? { ...prev, reactions: res.data.data!.reactions } : prev
        );
      }
    } catch {
      toast.error("Failed to react");
    }
  };

  const handleComment = async () => {
    if (!id || !commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await announcementApi.comment(id, commentText.trim());
      if (res.data.data) {
        setAnnouncement((prev) =>
          prev ? { ...prev, comments: res.data.data!.comments } : prev
        );
      }
      setCommentText("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const totalReactions = useMemo(() => {
    if (!announcement) return 0;
    return REACTIONS.reduce(
      (s, r) => s + (announcement.reactions[r.type as keyof typeof announcement.reactions]?.length || 0),
      0
    );
  }, [announcement]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          to="/announcements"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Announcements
        </Link>
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 shadow-lg mb-4">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">Announcement not found</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">It may have been removed.</p>
        </div>
      </div>
    );
  }

  const catKey = announcement.category || "General";
  const cfg = CAT_CFG[catKey] || CAT_CFG.General;
  const getReactionCount = (type: string) => {
    const key = type as keyof typeof announcement.reactions;
    return announcement.reactions[key]?.length || 0;
  };
  const isReacted = (type: string) => {
    if (!user) return false;
    const key = type as keyof typeof announcement.reactions;
    return announcement.reactions[key]?.includes(user._id) || false;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ━━━ Back ━━━ */}
      <Link
        to="/announcements"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Announcements
      </Link>

      {/* ━━━ Article Card ━━━ */}
      <article className="relative overflow-hidden rounded-3xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 shadow-xl shadow-gray-200/50 dark:shadow-black/30 backdrop-blur-sm">
        {/* Gradient top banner */}
        <div className="relative h-32 bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className={`absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gradient-to-br ${cfg.glow} to-transparent blur-3xl`} />
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
                backgroundSize: "22px 22px",
              }}
            />
          </div>
          <div className="relative flex items-center justify-between h-full px-6 sm:px-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-200 backdrop-blur-sm ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" /> Company Broadcast
            </div>
            {announcement.isPinned && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-amber-500/30">
                <Pin className="h-3 w-3 fill-white" /> Pinned
              </div>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* Category */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {catKey}
          </span>

          {/* Title */}
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {announcement.title}
          </h1>

          {/* Author Row */}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md">
                {initials(announcement.author?.name)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {announcement.author?.name || "Unknown"}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {announcement.author?.email || ""}
                </p>
              </div>
            </div>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <div className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(announcement.createdAt)} at {formatTime(announcement.createdAt)}
            </div>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-400">
              {timeAgo(announcement.createdAt)}
            </span>
          </div>

          {/* Tags */}
          {announcement.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {announcement.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-gradient-to-br from-gray-100 to-gray-200/60 dark:from-gray-800/80 dark:to-gray-800/40 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-400 ring-1 ring-gray-200/50 dark:ring-gray-800/60"
                >
                  <Hash className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="my-6 border-t border-gray-200/70 dark:border-gray-800/60" />

          {/* Content */}
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-[15px] leading-[1.8] text-gray-700 dark:text-gray-300">
              {announcement.content}
            </div>
          </div>

          {/* Attachments */}
          {announcement.attachments?.length > 0 && (
            <div className="mt-6 rounded-xl bg-gray-50/80 dark:bg-gray-800/30 p-4 ring-1 ring-gray-200/60 dark:ring-gray-800/60">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Attachments ({announcement.attachments.length})
              </p>
              <div className="space-y-1.5">
                {announcement.attachments.map((a, i) => (
                  <a
                    key={i}
                    href={a}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 ring-1 ring-gray-200 dark:ring-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attachment {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Reactions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-gray-50/80 to-gray-100/40 dark:from-gray-800/40 dark:to-gray-800/20 p-4 ring-1 ring-gray-200/60 dark:ring-gray-800/60">
            <div className="flex items-center gap-2">
              {REACTIONS.map((r) => {
                const count = getReactionCount(r.type);
                const active = isReacted(r.type);
                return (
                  <button
                    key={r.type}
                    onClick={() => handleReact(r.type)}
                    className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
                      active
                        ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/30 scale-105 shadow-sm"
                        : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:scale-105"
                    }`}
                  >
                    <span className="text-base leading-none transition-transform group-hover:scale-125">
                      {r.emoji}
                    </span>
                    <span>{r.label}</span>
                    {count > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                          active
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {totalReactions > 0 && (
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {totalReactions} reaction{totalReactions !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </article>

      {/* ━━━ Comments ━━━ */}
      <section className="rounded-3xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-6 sm:p-8 shadow-lg shadow-gray-200/40 dark:shadow-black/20 backdrop-blur-sm">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/0 ring-1 ring-indigo-500/20">
            <MessageCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Comments
            <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-bold text-gray-600 dark:text-gray-400 tabular-nums">
              {announcement.comments?.length || 0}
            </span>
          </h2>
        </div>

        {announcement.comments?.length > 0 ? (
          <div className="space-y-3">
            {announcement.comments.map((c, idx) => (
              <div
                key={c._id || idx}
                className="flex gap-3 rounded-2xl bg-gradient-to-br from-gray-50/80 to-gray-50/40 dark:from-gray-800/40 dark:to-gray-800/20 p-4 ring-1 ring-gray-200/60 dark:ring-gray-800/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900">
                  {initials(c.userId?.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {c.userId?.name || "Unknown"}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {c.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 py-10 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-700" />
            <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
              No comments yet
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              Be the first to share your thoughts
            </p>
          </div>
        )}

        {/* Composer */}
        <div className="mt-5 flex gap-3 border-t border-gray-200/70 dark:border-gray-800/60 pt-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900">
            {initials(user?.name)}
          </div>
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              placeholder="Write a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleComment();
                }
              }}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <button
              onClick={handleComment}
              disabled={submitting || !commentText.trim()}
              className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Post</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
