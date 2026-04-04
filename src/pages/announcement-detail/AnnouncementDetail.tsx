import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pin, Send, MessageCircle } from "lucide-react";
import { announcementApi, type AnnouncementData } from "../../api/announcementApi";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const categoryColors: Record<string, string> = {
  HR: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Team: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Important: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  General: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const categoryDots: Record<string, string> = {
  HR: "bg-blue-500",
  Team: "bg-emerald-500",
  Important: "bg-rose-500",
  General: "bg-gray-400 dark:bg-gray-500",
};

const reactionEmojis = [
  { type: "like", emoji: "\ud83d\udc4d", label: "Like" },
  { type: "love", emoji: "\u2764\ufe0f", label: "Love" },
  { type: "celebrate", emoji: "\ud83c\udf89", label: "Celebrate" },
] as const;

const card =
  "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

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
        setAnnouncement((prev) => (prev ? { ...prev, reactions: res.data.data!.reactions } : prev));
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
        setAnnouncement((prev) => (prev ? { ...prev, comments: res.data.data!.comments } : prev));
      }
      setCommentText("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const getReactionCount = (type: string) => {
    if (!announcement) return 0;
    const key = type as keyof typeof announcement.reactions;
    return announcement.reactions[key]?.length || 0;
  };

  const isReacted = (type: string) => {
    if (!announcement || !user) return false;
    const key = type as keyof typeof announcement.reactions;
    return announcement.reactions[key]?.includes(user._id) || false;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="space-y-4">
        <Link
          to="/announcements"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Announcements
        </Link>
        <div className="py-16 text-center text-gray-400 dark:text-gray-500">
          Announcement not found.
        </div>
      </div>
    );
  }

  const catKey = announcement.category || "General";
  const colorCls = categoryColors[catKey] || categoryColors.General;
  const dotCls = categoryDots[catKey] || categoryDots.General;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back Button */}
      <Link
        to="/announcements"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Announcements
      </Link>

      {/* Main Content Card */}
      <div className={card}>
        {/* Category + Pinned */}
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorCls}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotCls}`} />
            {catKey}
          </span>
          {announcement.isPinned && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium">
              <Pin className="h-3.5 w-3.5" /> Pinned
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          {announcement.title}
        </h1>

        {/* Author + Date */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-sm font-bold text-indigo-700 dark:text-indigo-300">
            {announcement.author?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {announcement.author?.name || "Unknown"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {formatDate(announcement.createdAt)} at {formatTime(announcement.createdAt)}
            </p>
          </div>
        </div>

        {/* Tags */}
        {announcement.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {announcement.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {announcement.content}
        </div>

        {/* Reactions Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
          {reactionEmojis.map((r) => {
            const count = getReactionCount(r.type);
            const active = isReacted(r.type);
            return (
              <button
                key={r.type}
                onClick={() => handleReact(r.type)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.label}</span>
                {count > 0 && (
                  <span className="ml-0.5 rounded-full bg-white dark:bg-gray-700 px-1.5 py-0.5 text-xs font-semibold">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comments Section */}
      <div className={card}>
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Comments ({announcement.comments?.length || 0})
          </h2>
        </div>

        {/* Comments List */}
        {announcement.comments?.length > 0 ? (
          <div className="space-y-4">
            {announcement.comments.map((c, idx) => (
              <div
                key={c._id || idx}
                className="flex gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  {c.userId?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {c.userId?.name || "Unknown"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(c.createdAt)} at {formatTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {c.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
            No comments yet. Be the first to comment!
          </p>
        )}

        {/* Add Comment */}
        <div className="mt-4 flex gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleComment();
                }
              }}
              className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={handleComment}
              disabled={submitting || !commentText.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
