import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notificationApi, type Notification } from "../api/notificationApi";

type NotifType = Notification["type"];

const typeConfig: Record<
  NotifType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    accent: string;
  }
> = {
  announcement: { label: "Announcement", icon: Megaphone,      gradient: "from-amber-500 to-orange-600",    accent: "text-amber-600 dark:text-amber-400" },
  leave:        { label: "Leave",        icon: CalendarDays,   gradient: "from-sky-500 to-blue-600",        accent: "text-sky-600 dark:text-sky-400" },
  timesheet:    { label: "Timesheet",    icon: Clock,          gradient: "from-indigo-500 to-purple-600",   accent: "text-indigo-600 dark:text-indigo-400" },
  wfh:          { label: "WFH",          icon: Laptop,         gradient: "from-violet-500 to-fuchsia-600",  accent: "text-violet-600 dark:text-violet-400" },
  compoff:      { label: "Comp-Off",     icon: Gift,           gradient: "from-rose-500 to-pink-600",       accent: "text-rose-600 dark:text-rose-400" },
  recognition:  { label: "Recognition",  icon: Award,          gradient: "from-orange-500 to-amber-600",    accent: "text-orange-600 dark:text-orange-400" },
  chat:         { label: "Chat",         icon: MessageCircle,  gradient: "from-emerald-500 to-teal-600",    accent: "text-emerald-600 dark:text-emerald-400" },
  document:     { label: "Document",     icon: FileText,       gradient: "from-slate-500 to-gray-700",      accent: "text-slate-600 dark:text-slate-300" },
  system:       { label: "System",       icon: Cog,            gradient: "from-gray-500 to-gray-700",       accent: "text-gray-600 dark:text-gray-300" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-start gap-3 px-4 py-3.5">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-2 w-3/4 rounded bg-gray-100 dark:bg-gray-800/70" />
        <div className="h-2 w-16 rounded bg-gray-100 dark:bg-gray-800/70" />
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const refreshCount = useCallback(async () => {
    try {
      const count = await notificationApi.unreadCount();
      setUnread(count);
    } catch {
      // silent
    }
  }, []);

  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await notificationApi.list({ page: 1, limit: 15 });
      setItems(res.data);
      setUnread(res.unread);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, 60000);
    return () => clearInterval(id);
  }, [refreshCount]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const handleItemClick = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await notificationApi.markRead(n._id);
        setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        // silent
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkOne = async (e: React.MouseEvent | React.KeyboardEvent, n: Notification) => {
    e.stopPropagation();
    if (n.isRead) return;
    try {
      await notificationApi.markRead(n._id);
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAll = async () => {
    await notificationApi.markAllRead();
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
  };

  const handleRemove = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    await notificationApi.remove(id);
    setItems((prev) => prev.filter((x) => x._id !== id));
  };

  const visible = useMemo(() => (unreadOnly ? items.filter((n) => !n.isRead) : items), [items, unreadOnly]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
          open
            ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400"
            : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        }`}
        title="Notifications"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
      >
        <Bell className={`h-5 w-5 ${unread > 0 ? "animate-[wiggle_2.5s_ease-in-out_infinite]" : ""}`} />
        {unread > 0 && (
          <>
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
              {unread > 99 ? "99+" : unread}
            </span>
            <span aria-hidden className="absolute right-1 top-1 h-4 w-4 animate-ping rounded-full bg-rose-500/40" />
          </>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-2 top-15 z-50 origin-top-right animate-in fade-in-0 zoom-in-95 overflow-hidden rounded-2xl border border-gray-200/70 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl duration-150 dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-104"
        >
          {/* Premium header */}
          <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-fuchsia-50/40 px-4 py-3.5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:via-gray-900 dark:to-fuchsia-500/10">
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-400/25 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-fuchsia-400/15 blur-3xl" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/30 ring-1 ring-white/15">
                  <Bell className="h-4 w-4 text-white" />
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-gray-900" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">
                    <Sparkles className="h-3 w-3" />
                    Inbox
                  </p>
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    Notifications
                    {unread > 0 && (
                      <span className="ml-1.5 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                        {unread > 99 ? "99+" : unread} new
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-500/20 backdrop-blur-sm transition-all hover:bg-white hover:shadow-sm dark:bg-gray-800/60 dark:text-indigo-300 dark:ring-indigo-400/25 dark:hover:bg-gray-800"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="relative mt-3 flex items-center gap-1 rounded-lg bg-white/60 p-0.5 ring-1 ring-gray-200/60 backdrop-blur-sm dark:bg-gray-800/60 dark:ring-gray-700/60">
              <button
                onClick={() => setUnreadOnly(false)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                  !unreadOnly
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                All <span className="opacity-70">·</span> {items.length}
              </button>
              <button
                onClick={() => setUnreadOnly(true)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                  unreadOnly
                    ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Unread <span className="opacity-70">·</span> {unread}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <div className="rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 p-3 ring-1 ring-emerald-200/60 dark:from-emerald-500/10 dark:to-teal-500/10 dark:ring-emerald-400/20">
                  <Sparkles className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {unreadOnly ? "No unread notifications" : "You're all caught up"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unreadOnly ? "Switch to All to see everything." : "We'll let you know when something happens."}
                </p>
              </div>
            ) : (
              visible.map((n) => {
                const cfg = typeConfig[n.type] ?? typeConfig.system;
                const Icon = cfg.icon;
                return (
                  <button
                    key={n._id}
                    onClick={() => handleItemClick(n)}
                    className={`group relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors ${
                      n.isRead
                        ? "hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                        : "bg-indigo-50/30 hover:bg-indigo-50/60 dark:bg-indigo-500/[0.04] dark:hover:bg-indigo-500/[0.07]"
                    }`}
                  >
                    {/* Unread stripe */}
                    {!n.isRead && (
                      <span
                        aria-hidden
                        className={`absolute inset-y-1.5 left-0 w-1 rounded-full bg-gradient-to-b ${cfg.gradient}`}
                      />
                    )}

                    {/* Icon */}
                    <div
                      className={`relative ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cfg.gradient} text-white shadow-md shadow-black/[0.08] ring-1 ring-white/15`}
                    >
                      <Icon className="h-4 w-4" />
                      {!n.isRead && (
                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-gray-900" />
                      )}
                    </div>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${
                          n.isRead
                            ? "font-medium text-gray-700 dark:text-gray-200"
                            : "font-bold text-gray-900 dark:text-white"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                        {n.message}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {timeAgo(n.createdAt)}
                        </span>
                        <span className={`inline-flex items-center gap-1 font-semibold ${cfg.accent}`}>
                          <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Hover actions */}
                    <div className="flex shrink-0 items-center gap-0.5 self-center opacity-0 transition-opacity group-hover:opacity-100">
                      {!n.isRead && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => handleMarkOne(e, n)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleMarkOne(e, n);
                            }
                          }}
                          title="Mark as read"
                          className="cursor-pointer rounded-md p-1.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleRemove(e, n._id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleRemove(e, n._id);
                          }
                        }}
                        title="Delete"
                        className="cursor-pointer rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-gray-200/70 bg-gray-50/60 px-3 py-2 dark:border-gray-800/80 dark:bg-gray-800/40">
            <button
              onClick={() => loadList(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-white hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.97]"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
