import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, MessageCircle, ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { announcementApi, type AnnouncementData } from "../../api/announcementApi";
import { useAuth } from "../../context/AuthContext";
import type { Pagination } from "../../types";
import toast from "react-hot-toast";

const CATEGORIES = ["All", "HR", "Team", "Important"] as const;

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
  { type: "like", emoji: "\ud83d\udc4d" },
  { type: "love", emoji: "\u2764\ufe0f" },
  { type: "celebrate", emoji: "\ud83c\udf89" },
] as const;

const card =
  "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

const tabCls = (active: boolean) =>
  `px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
    active
      ? "bg-indigo-600 text-white shadow-sm"
      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
  }`;

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AnnouncementsFeed() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 9 };
    if (category !== "All") params.category = category;
    if (search.trim()) params.search = search.trim();
    announcementApi
      .getAll(params)
      .then((res) => {
        setAnnouncements(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [page, category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchAnnouncements();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleReact = async (id: string, type: string) => {
    try {
      const res = await announcementApi.react(id, type);
      if (res.data.data) {
        setAnnouncements((prev) =>
          prev.map((a) => (a._id === id ? { ...a, reactions: res.data.data!.reactions } : a))
        );
      }
    } catch {
      toast.error("Failed to react");
    }
  };

  const getReactionCount = (a: AnnouncementData, type: string) => {
    const key = type as keyof typeof a.reactions;
    return a.reactions[key]?.length || 0;
  };

  const isReacted = (a: AnnouncementData, type: string) => {
    if (!user) return false;
    const key = type as keyof typeof a.reactions;
    return a.reactions[key]?.includes(user._id) || false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Stay updated with the latest company news
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-9 w-full sm:w-64`}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
              setPage(1);
            }}
            className={tabCls(category === cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="py-16 text-center text-gray-400 dark:text-gray-500">
          No announcements found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((a) => {
            const catKey = a.category || "General";
            const colorCls = categoryColors[catKey] || categoryColors.General;
            const dotCls = categoryDots[catKey] || categoryDots.General;
            return (
              <div key={a._id} className={card}>
                {/* Pinned + Category */}
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorCls}`}
                  >
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotCls}`} />
                    {catKey}
                  </span>
                  {a.isPinned && (
                    <Pin className="h-4 w-4 text-amber-500" />
                  )}
                </div>

                {/* Title */}
                <Link
                  to={`/announcements/${a._id}`}
                  className="block text-lg font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2"
                >
                  {a.title}
                </Link>

                {/* Author + Date */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {a.author?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                      {a.author?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(a.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {a.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"
                      >
                        #{tag}
                      </span>
                    ))}
                    {a.tags.length > 3 && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        +{a.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div className="my-3 border-t border-gray-100 dark:border-gray-800" />

                {/* Reactions + Comments */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {reactionEmojis.map((r) => {
                      const count = getReactionCount(a, r.type);
                      const active = isReacted(a, r.type);
                      return (
                        <button
                          key={r.type}
                          onClick={() => handleReact(a._id, r.type)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${
                            active
                              ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                              : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          <span>{r.emoji}</span>
                          {count > 0 && <span>{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                  <Link
                    to={`/announcements/${a._id}`}
                    className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {a.comments?.length || 0}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
