import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  Megaphone,
  CalendarDays,
  Clock,
  Laptop,
  Gift,
  Award,
  MessageCircle,
  FileText,
  Cog,
  Search,
  X,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { notificationApi, type Notification } from "../../api/notificationApi";

/* ── Type config ── */
type NotifType = Notification["type"];
const typeConfig: Record<
  NotifType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    chip: string;
    accent: string;
    stripe: string;
  }
> = {
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    gradient: "from-amber-500 to-orange-600",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    accent: "text-amber-600 dark:text-amber-400",
    stripe: "from-amber-500 to-orange-600",
  },
  leave: {
    label: "Leave",
    icon: CalendarDays,
    gradient: "from-sky-500 to-blue-600",
    chip: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    accent: "text-sky-600 dark:text-sky-400",
    stripe: "from-sky-500 to-blue-600",
  },
  timesheet: {
    label: "Timesheet",
    icon: Clock,
    gradient: "from-indigo-500 to-purple-600",
    chip: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20",
    accent: "text-indigo-600 dark:text-indigo-400",
    stripe: "from-indigo-500 to-purple-600",
  },
  wfh: {
    label: "WFH",
    icon: Laptop,
    gradient: "from-violet-500 to-fuchsia-600",
    chip: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-400/20",
    accent: "text-violet-600 dark:text-violet-400",
    stripe: "from-violet-500 to-fuchsia-600",
  },
  compoff: {
    label: "Comp-Off",
    icon: Gift,
    gradient: "from-rose-500 to-pink-600",
    chip: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    accent: "text-rose-600 dark:text-rose-400",
    stripe: "from-rose-500 to-pink-600",
  },
  recognition: {
    label: "Recognition",
    icon: Award,
    gradient: "from-orange-500 to-amber-600",
    chip: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20",
    accent: "text-orange-600 dark:text-orange-400",
    stripe: "from-orange-500 to-amber-600",
  },
  chat: {
    label: "Chat",
    icon: MessageCircle,
    gradient: "from-emerald-500 to-teal-600",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    accent: "text-emerald-600 dark:text-emerald-400",
    stripe: "from-emerald-500 to-teal-600",
  },
  document: {
    label: "Document",
    icon: FileText,
    gradient: "from-slate-500 to-gray-700",
    chip: "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/20",
    accent: "text-slate-600 dark:text-slate-300",
    stripe: "from-slate-500 to-gray-700",
  },
  system: {
    label: "System",
    icon: Cog,
    gradient: "from-gray-500 to-gray-700",
    chip: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    accent: "text-gray-600 dark:text-gray-300",
    stripe: "from-gray-500 to-gray-700",
  },
};

const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupKey(date: string): string {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);

  if (d >= today) return "Today";
  if (d >= yesterday) return "Yesterday";
  if (d >= weekStart) return "This week";
  return "Earlier";
}

/* ── Skeleton ── */
function SkeletonRows() {
  return (
    <div className={`${cardCls} divide-y divide-gray-100 overflow-hidden p-0 dark:divide-gray-800`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 px-5 py-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-200 dark:bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-2.5 w-3/4 rounded bg-gray-100 dark:bg-gray-800/70" />
            <div className="h-2.5 w-24 rounded bg-gray-100 dark:bg-gray-800/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | NotifType>("all");
  const navigate = useNavigate();

  const load = useCallback(
    async (p = 1, only = unreadOnly) => {
      setLoading(true);
      try {
        const res = await notificationApi.list({ page: p, limit: 20, unread: only });
        setItems(res.data);
        setPages(res.pagination.pages || 1);
        setTotal(res.pagination.total || 0);
        setUnread(res.unread);
        setPage(res.pagination.page);
      } finally {
        setLoading(false);
      }
    },
    [unreadOnly],
  );

  useEffect(() => {
    load(1, unreadOnly);
  }, [unreadOnly, load]);

  const handleOpen = async (n: Notification) => {
    if (!n.isRead) {
      await notificationApi.markRead(n._id);
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkOne = async (e: React.MouseEvent, n: Notification) => {
    e.stopPropagation();
    if (n.isRead) return;
    await notificationApi.markRead(n._id);
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const handleMarkAll = async () => {
    await notificationApi.markAllRead();
    toast.success("All notifications marked as read");
    load(page, unreadOnly);
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await notificationApi.remove(id);
    setItems((prev) => prev.filter((x) => x._id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  /* ── Derived ── */
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    const topType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return {
      counts,
      topTypeKey: topType ? (topType[0] as NotifType) : null,
    };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter !== "all") list = list.filter((n) => n.type === typeFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.sender?.name ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, typeFilter, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    for (const n of filtered) {
      const k = groupKey(n.createdAt);
      (groups[k] ||= []).push(n);
    }
    const order = ["Today", "Yesterday", "This week", "Earlier"];
    return order.filter((k) => groups[k]?.length).map((k) => ({ key: k, items: groups[k] }));
  }, [filtered]);

  const typeTabs: Array<{ key: "all" | NotifType; label: string }> = [
    { key: "all", label: "All" },
    ...(Object.keys(stats.counts) as NotifType[]).map((k) => ({ key: k, label: typeConfig[k]?.label ?? k })),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {unread > 0 ? (
                <>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{unread}</span>{" "}
                  unread of <span className="font-semibold">{total}</span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  You're all caught up
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
              unreadOnly
                ? "border-indigo-500/30 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:text-indigo-300"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${unreadOnly ? "bg-indigo-500" : "bg-gray-400"}`} />
            {unreadOnly ? "Unread only" : "Showing all"}
          </button>
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98]"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total",
            value: String(total),
            icon: Inbox,
            gradient: "from-indigo-500 to-purple-600",
            sub: total === 1 ? "notification" : "notifications",
          },
          {
            label: "Unread",
            value: String(unread),
            icon: Bell,
            gradient: unread > 0 ? "from-rose-500 to-pink-600" : "from-emerald-500 to-teal-600",
            sub: unread === 0 ? "all read" : "pending",
          },
          {
            label: "Read",
            value: String(Math.max(0, total - unread)),
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-600",
            sub: total > 0 ? `${Math.round(((total - unread) / total) * 100)}% complete` : "—",
          },
          {
            label: "Top type",
            value: stats.topTypeKey ? typeConfig[stats.topTypeKey].label : "—",
            icon: TrendingUp,
            gradient: stats.topTypeKey
              ? typeConfig[stats.topTypeKey].gradient
              : "from-gray-500 to-gray-600",
            sub: stats.topTypeKey ? `${stats.counts[stats.topTypeKey]} on this page` : "no data",
          },
        ].map((k) => (
          <div key={k.label} className={`${cardCls} group relative overflow-hidden p-3.5`}>
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${k.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
            />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={labelCls}>{k.label}</p>
                <p className="mt-1 truncate font-mono text-xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                  {k.value}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-gray-500">{k.sub}</p>
              </div>
              <div
                className={`shrink-0 rounded-lg bg-gradient-to-br ${k.gradient} p-1.5 shadow-md shadow-black/[0.08] ring-1 ring-white/10`}
              >
                <k.icon className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className={`${cardCls} flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {typeTabs.map((t) => {
            const active = typeFilter === t.key;
            const conf = t.key !== "all" ? typeConfig[t.key] : null;
            const Icon = conf?.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-gray-900 text-white shadow-sm ring-1 ring-gray-900/10 dark:bg-white dark:text-gray-900"
                    : "text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:ring-gray-800 dark:hover:bg-gray-800/60"
                }`}
              >
                {Icon ? <Icon className="h-3 w-3" /> : null}
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    active
                      ? "bg-white/15 text-white dark:bg-gray-900/10 dark:text-gray-900"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {t.key === "all" ? items.length : stats.counts[t.key as NotifType] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full lg:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, message, sender..."
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-gray-700 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <SkeletonRows />
      ) : filtered.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-4 ring-1 ring-indigo-200/60 dark:from-indigo-500/10 dark:to-fuchsia-500/10 dark:ring-indigo-400/20">
            <Inbox className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {search
              ? "Nothing matches your search"
              : typeFilter !== "all"
              ? `No ${typeConfig[typeFilter as NotifType]?.label.toLowerCase()} notifications`
              : unreadOnly
              ? "No unread notifications"
              : "No notifications yet"}
          </p>
          <p className="max-w-sm text-xs text-gray-500 dark:text-gray-400">
            {search
              ? "Try a different keyword or clear the search."
              : "When something needs your attention, it'll show up here."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ key, items: groupItems }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <p className={labelCls}>{key}</p>
                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {groupItems.length}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-800" />
              </div>
              <div className={`${cardCls} divide-y divide-gray-100 overflow-hidden p-0 dark:divide-gray-800`}>
                {groupItems.map((n) => {
                  const cfg = typeConfig[n.type] ?? typeConfig.system;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={n._id}
                      onClick={() => handleOpen(n)}
                      className={`group relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all hover:bg-gray-50/80 dark:hover:bg-gray-800/40 ${
                        !n.isRead ? "bg-indigo-50/30 dark:bg-indigo-500/[0.04]" : ""
                      }`}
                    >
                      {/* Unread stripe */}
                      {!n.isRead && (
                        <span
                          aria-hidden
                          className={`absolute inset-y-1.5 left-0 w-1 rounded-full bg-gradient-to-b ${cfg.stripe}`}
                        />
                      )}

                      {/* Icon */}
                      <div
                        className={`relative ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cfg.gradient} text-white shadow-md shadow-black/[0.06] ring-1 ring-white/10`}
                      >
                        <Icon className="h-4 w-4" />
                        {!n.isRead && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-gray-900" />
                        )}
                      </div>

                      {/* Body */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p
                            className={`truncate text-sm ${
                              n.isRead
                                ? "font-medium text-gray-700 dark:text-gray-200"
                                : "font-bold text-gray-900 dark:text-white"
                            }`}
                          >
                            {n.title}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${cfg.chip}`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                          {n.message}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(n.createdAt)}
                          </span>
                          {n.sender?.name && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                              From{" "}
                              <span className="font-semibold text-gray-600 dark:text-gray-300">
                                {n.sender.name}
                              </span>
                            </span>
                          )}
                          {n.link && (
                            <span className={`inline-flex items-center gap-1 ${cfg.accent}`}>
                              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                              Open
                              <ArrowRight className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hover actions */}
                      <div className="flex shrink-0 items-center gap-1 self-center opacity-0 transition-opacity group-hover:opacity-100">
                        {!n.isRead && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => handleMarkOne(e, n)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleMarkOne(e as unknown as React.MouseEvent, n);
                              }
                            }}
                            title="Mark as read"
                            className="cursor-pointer rounded-md p-1.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        )}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => handleRemove(e, n._id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRemove(e as unknown as React.MouseEvent, n._id);
                            }
                          }}
                          title="Delete"
                          className="cursor-pointer rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {pages > 1 && !loading && (
        <div className={`${cardCls} flex items-center justify-between p-3`}>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{page}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1, unreadOnly)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              disabled={page >= pages}
              onClick={() => load(page + 1, unreadOnly)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
