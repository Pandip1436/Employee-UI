import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Pin,
  Megaphone,
  Sparkles,
  TrendingUp,
  Bell,
  Hash,
} from "lucide-react";
import { announcementApi, type AnnouncementData } from "../../api/announcementApi";
import { useAuth } from "../../context/AuthContext";
import type { Pagination } from "../../types";
import toast from "react-hot-toast";

const CATEGORIES = ["All", "HR", "Team", "Important"] as const;

const CAT_CFG: Record<
  string,
  { dot: string; bg: string; text: string; ring: string; accent: string }
> = {
  HR: {
    dot: "bg-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/20",
    accent: "from-sky-500/20 to-sky-500/0",
  },
  Team: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
    accent: "from-emerald-500/20 to-emerald-500/0",
  },
  Important: {
    dot: "bg-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/20",
    accent: "from-rose-500/20 to-rose-500/0",
  },
  General: {
    dot: "bg-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800/50",
    text: "text-gray-700 dark:text-gray-300",
    ring: "ring-gray-500/20",
    accent: "from-gray-500/10 to-gray-500/0",
  },
};

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "celebrate", emoji: "🎉", label: "Celebrate" },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name?: string) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

  const stats = useMemo(() => {
    const total = pagination?.total ?? announcements.length;
    const pinned = announcements.filter((a) => a.isPinned).length;
    const thisWeek = announcements.filter(
      (a) => Date.now() - new Date(a.createdAt).getTime() < 7 * 86400e3
    ).length;
    const categoriesPresent = new Set(
      announcements.map((a) => a.category || "General")
    ).size;
    return { total, pinned, thisWeek, categoriesPresent };
  }, [announcements, pagination]);

  return (
    <div className="space-y-6">
      {/* ━━━ Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl" />
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
              <Sparkles className="h-3.5 w-3.5" /> Company · Broadcast
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-indigo-300" />
              Announcements
            </h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/80 sm:text-base">
              Stay in the loop with the latest updates, policies, and team news — all in one place.
            </p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-200/70" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 pl-10 text-sm text-white placeholder-indigo-200/60 backdrop-blur-sm outline-none transition-all focus:border-white/30 focus:bg-white/15 focus:ring-2 focus:ring-white/10"
            />
          </div>
        </div>
      </div>

      {/* ━━━ Stats ━━━ */}
      {announcements.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Bell} label="Total" value={stats.total} sublabel="All announcements" tint="indigo" />
          <StatCard icon={Pin} label="Pinned" value={stats.pinned} sublabel="Currently on top" tint="amber" />
          <StatCard icon={TrendingUp} label="This week" value={stats.thisWeek} sublabel="New in 7 days" tint="emerald" />
          <StatCard icon={Hash} label="Categories" value={stats.categoriesPresent} sublabel="In current view" tint="rose" />
        </div>
      )}

      {/* ━━━ Category pills ━━━ */}
      <div className="flex items-center gap-1 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 p-1 backdrop-blur-sm w-fit overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
              setPage(1);
            }}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              category === cat
                ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ━━━ Feed ━━━ */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Megaphone className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">No announcements yet</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            When new announcements are published, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {announcements.map((a) => {
            const catKey = a.category || "General";
            const cfg = CAT_CFG[catKey] || CAT_CFG.General;
            const totalReactions = REACTIONS.reduce(
              (s, r) => s + getReactionCount(a, r.type),
              0
            );
            return (
              <div
                key={a._id}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-200/60 dark:hover:shadow-black/40 hover:border-indigo-300/60 dark:hover:border-indigo-600/40"
              >
                {/* Category accent orb */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${cfg.accent} blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`}
                />

                {/* Pinned ribbon */}
                {a.isPinned && (
                  <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-amber-500/30">
                    <Pin className="h-3 w-3 fill-white" /> Pinned
                  </div>
                )}

                <div className="relative">
                  {/* Category pill */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {catKey}
                  </span>

                  {/* Title */}
                  <Link
                    to={`/announcements/${a._id}`}
                    className="mt-3 block text-lg font-bold leading-snug tracking-tight text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2"
                  >
                    {a.title}
                  </Link>

                  {/* Author + Date */}
                  <div className="mt-3 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow">
                      {initials(a.author?.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {a.author?.name || "Unknown"}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
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
                          className="rounded-md bg-gray-100 dark:bg-gray-800/70 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"
                        >
                          #{tag}
                        </span>
                      ))}
                      {a.tags.length > 3 && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          +{a.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div className="my-4 border-t border-gray-200/70 dark:border-gray-800/60" />

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {REACTIONS.map((r) => {
                        const count = getReactionCount(a, r.type);
                        const active = isReacted(a, r.type);
                        return (
                          <button
                            key={r.type}
                            onClick={() => handleReact(a._id, r.type)}
                            title={r.label}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                              active
                                ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/30 scale-105"
                                : "bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105"
                            }`}
                          >
                            <span className="leading-none">{r.emoji}</span>
                            {count > 0 && <span className="tabular-nums">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <Link
                      to={`/announcements/${a._id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{a.comments?.length || 0}</span>
                    </Link>
                  </div>

                  {totalReactions > 0 && (
                    <div className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                      {totalReactions} reaction{totalReactions !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━ Pagination ━━━ */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300">
            Page {page} <span className="text-gray-400">/ {pagination.pages}</span>
          </span>
          <button
            disabled={page >= pagination.pages}
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
