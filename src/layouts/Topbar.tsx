import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import {
  Menu, LogOut, Sun, Moon, User, ChevronDown, Search, X, Clock,
  FolderKanban, Users, UserCheck, CalendarDays, FileText, LayoutDashboard,
  CheckSquare, Zap, NotebookPen, Settings as SettingsIcon, HelpCircle,
  Circle, MinusCircle, History, Sparkles, CornerDownLeft, ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useCompany } from "../context/CompanyContext";
import NotificationBell from "../components/NotificationBell";

interface Props {
  onMenuClick: () => void;
}

interface SearchItem {
  label: string;
  description?: string;
  path: string;
  icon: typeof LayoutDashboard;
  keywords: string[];
  roles?: string[];
}

interface ActionItem extends SearchItem {
  tone: string;
}

const searchItems: SearchItem[] = [
  { label: "Dashboard",       description: "Overview & analytics",      path: "/dashboard", icon: LayoutDashboard, keywords: ["dashboard", "home", "overview", "analytics"] },
  { label: "Timesheet",       description: "Log and review hours",      path: "/timesheet", icon: Clock,           keywords: ["timesheet", "hours", "log", "time entry", "weekly"] },
  { label: "Projects",        description: "Clients and assignments",   path: "/projects",  icon: FolderKanban,    keywords: ["project", "client", "assign"] },
  { label: "Attendance",      description: "Clock in / clock out",      path: "/attendance",icon: UserCheck,       keywords: ["attendance", "clock in", "clock out", "punch", "check in"] },
  { label: "Leaves",          description: "Vacation and time off",     path: "/leaves",    icon: CalendarDays,    keywords: ["leave", "vacation", "sick", "casual", "time off", "apply leave"] },
  { label: "Documents",       description: "Files and policies",        path: "/documents", icon: FileText,        keywords: ["document", "file", "upload", "download", "pdf", "policy"] },
  { label: "Employees",       description: "Team directory",            path: "/employees", icon: Users,           keywords: ["employee", "staff", "people", "team"],  roles: ["admin", "manager"] },
  { label: "Approvals",       description: "Pending requests",          path: "/approvals", icon: CheckSquare,     keywords: ["approval", "approve", "reject", "pending", "review"], roles: ["admin", "manager"] },
  { label: "User Management", description: "Roles and permissions",     path: "/users",     icon: Users,           keywords: ["user", "role", "admin", "manage users"], roles: ["admin"] },
  { label: "My Profile",      description: "Your account",              path: "/profile",   icon: User,            keywords: ["profile", "account", "settings", "my info"] },
];

const actionItems: ActionItem[] = [
  { label: "Clock In / Out", description: "Mark today's attendance",   path: "/attendance",      icon: UserCheck,    keywords: ["clock", "punch", "in", "out", "today"], tone: "text-emerald-500" },
  { label: "Apply Leave",    description: "Request time off",          path: "/leaves",          icon: CalendarDays, keywords: ["leave", "vacation", "apply", "request"], tone: "text-sky-500" },
  { label: "Daily Update",   description: "Log today's work summary",  path: "/daily-updates",   icon: NotebookPen,  keywords: ["daily", "update", "log", "summary", "note"], tone: "text-violet-500" },
  { label: "Log Hours",      description: "New timesheet entry",       path: "/timesheet/daily", icon: Clock,        keywords: ["log", "hours", "timesheet", "entry", "new"], tone: "text-indigo-500" },
];

const SEARCH_PLACEHOLDERS = [
  "pages, features...",
  "\"timesheet\"...",
  "\"apply leave\"...",
  "\"attendance\"...",
  "anything...",
];

const RECENT_KEY = "topbar.recentSearches";
const RECENT_MAX = 4;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function highlight(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const i = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (i === -1) return text;
  const q = query.trim();
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-indigo-500/15 px-0.5 font-semibold text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

import type { UserStatus } from "../types";

const statusConfig: Record<UserStatus, { label: string; dot: string; ring: string; text: string }> = {
  online: { label: "Online",         dot: "bg-emerald-500", ring: "ring-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" },
  away:   { label: "Away",           dot: "bg-amber-500",   ring: "ring-amber-500/30",   text: "text-amber-600 dark:text-amber-400"   },
  dnd:    { label: "Do not disturb", dot: "bg-rose-500",    ring: "ring-rose-500/30",    text: "text-rose-600 dark:text-rose-400"     },
};

function getGreeting(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  if (h >= 18 && h < 23) return "Good evening";
  return "Working late";
}

export default function Topbar({ onMenuClick }: Props) {
  const { logout, user, updateStatus } = useAuth();
  const { dark, toggle } = useTheme();
  const { companyName, logo } = useCompany();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [now, setNow] = useState<Date>(() => new Date());
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const status: UserStatus = user?.userStatus ?? "online";
  const handleStatusChange = (next: UserStatus) => {
    if (next === status) return;
    updateStatus(next).catch(() => { /* toast handled by axios interceptor */ });
  };

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  const role = user?.role ?? "employee";
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  // Live clock — tick every 30s (we display HH:MM, no need for per-second)
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Cycle the search-trigger placeholder for a "premium" feel
  useEffect(() => {
    const id = setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % SEARCH_PLACEHOLDERS.length),
      3500
    );
    return () => clearInterval(id);
  }, []);

  // Role + query filter, shared by both action and page lists
  const matches = useCallback(
    (item: SearchItem) => {
      if (item.roles && !item.roles.includes(role)) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false) ||
        item.keywords.some((k) => k.includes(q))
      );
    },
    [role, query]
  );

  const filteredActions = useMemo(() => actionItems.filter(matches), [matches]);
  const filteredPages = useMemo(() => searchItems.filter(matches), [matches]);

  // Recent items — resolved against current visible pages (role-filtered)
  const recentItems = useMemo(() => {
    if (query.trim()) return [];
    return recent
      .map((p) => searchItems.find((s) => s.path === p))
      .filter((s): s is SearchItem => !!s && (!s.roles || s.roles.includes(role)))
      .slice(0, RECENT_MAX);
  }, [recent, role, query]);

  // Build groups in render order — flat selectable list comes from concatenating them
  type Group = { key: string; label: string; icon: typeof Search; items: SearchItem[] };
  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    if (recentItems.length) out.push({ key: "recent",  label: "Recent",        icon: History,   items: recentItems });
    if (filteredActions.length) out.push({ key: "actions", label: "Quick actions", icon: Sparkles, items: filteredActions });
    if (filteredPages.length)   out.push({ key: "pages",   label: "Pages",         icon: ArrowRight, items: filteredPages });
    return out;
  }, [recentItems, filteredActions, filteredPages]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        setQuickOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuickOpen(false);
        setDropdownOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const pushRecent = useCallback((path: string) => {
    setRecent((prev) => {
      const next = [path, ...prev.filter((p) => p !== path)].slice(0, RECENT_MAX);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleSearchNav = useCallback(
    (path: string) => {
      setSearchOpen(false);
      setQuery("");
      pushRecent(path);
      navigate(path);
    },
    [navigate, pushRecent]
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    const count = flatItems.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (count) setSelectedIndex((i) => (i + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (count) setSelectedIndex((i) => (i - 1 + count) % count);
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      if (count) setSelectedIndex(count - 1);
    } else if (e.key === "Enter" && flatItems[selectedIndex]) {
      handleSearchNav(flatItems[selectedIndex].path);
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login");
  };

  // ── Quick actions (role-aware) ──
  const quickActions = useMemo(() => {
    const items: { label: string; path: string; icon: typeof Clock; hint: string; tone: string }[] = [];
    if (!isAdmin) {
      items.push({ label: "Clock In / Out",   path: "/attendance",     icon: UserCheck,   hint: "Today",   tone: "text-emerald-500" });
      items.push({ label: "Apply Leave",       path: "/leaves",         icon: CalendarDays, hint: "Time off", tone: "text-sky-500"    });
      items.push({ label: "Daily Update",      path: "/daily-updates",  icon: NotebookPen, hint: "Log",     tone: "text-violet-500" });
      items.push({ label: "Log Hours",         path: "/timesheet/daily",icon: Clock,       hint: "Timesheet", tone: "text-indigo-500" });
    }
    if (isAdmin || isManager) {
      items.push({ label: "Team Attendance",  path: "/attendance/team", icon: Users,       hint: "Today",   tone: "text-cyan-500" });
      items.push({ label: "Leave Approvals",  path: "/leave/approvals", icon: CheckSquare, hint: "Pending", tone: "text-amber-500" });
    }
    return items;
  }, [isAdmin, isManager]);

  const greeting = getGreeting(now);
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const dayStr  = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const displayName = user?.name ?? "there";
  const statusInfo = statusConfig[status];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-gray-200/70 bg-white/80 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:border-gray-800/80 dark:bg-gray-950/80 dark:supports-[backdrop-filter]:bg-gray-950/60 sm:gap-3 sm:px-4 lg:px-6 transition-colors">
        {/* Animated gradient bottom hairline */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px animate-topbar-aurora bg-[linear-gradient(90deg,transparent_0%,rgba(99,102,241,0.45)_25%,rgba(168,85,247,0.45)_50%,rgba(56,189,248,0.45)_75%,transparent_100%)]"
        />

        {/* Left: hamburger (mobile) + brand mark (mobile) */}
        <button
          onClick={onMenuClick}
          aria-label="Open sidebar"
          className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile mini brand — desktop hides this (sidebar shows full brand) */}
        <div className="flex items-center gap-2 min-w-0 lg:hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-1 shadow-[0_2px_10px_-2px_rgba(99,102,241,0.55)] ring-1 ring-white/20">
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-contain" />
            ) : (
              <img src="/logo.png" alt="" className="h-full w-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            )}
          </div>
          <span className="truncate text-[13px] font-semibold tracking-tight text-gray-900 dark:text-white">
            {companyName}
          </span>
        </div>

        {/* Left column (desktop): Greeting + live clock */}
        <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
          <div className="min-w-0 leading-tight">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {greeting}
            </p>
            <p className="max-w-[200px] truncate text-[14px] font-semibold tracking-tight text-gray-900 dark:text-white xl:max-w-[260px]">
              {displayName}<span className="text-indigo-500 dark:text-indigo-400">.</span>
            </p>
          </div>
          {/* Vertical divider */}
          <span aria-hidden className="h-8 w-px shrink-0 bg-gradient-to-b from-transparent via-gray-200 to-transparent dark:via-gray-800" />
          {/* Live clock */}
          <div className="shrink-0 leading-tight">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {dayStr}
            </p>
            <p className="font-mono text-[14px] font-semibold tabular-nums text-gray-900 dark:text-white">
              {timeStr}
            </p>
          </div>
        </div>

        {/* Center column (desktop): Search trigger — premium gradient border, cycling placeholder, shimmer */}
        <div className="hidden flex-1 justify-center px-4 lg:flex">
          <button
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="group relative h-10 w-full min-w-0 max-w-md rounded-xl p-px transition-all hover:-translate-y-px active:translate-y-0"
            aria-label="Open search"
          >
            {/* Animated gradient border — sits beneath the inner surface */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(120deg,rgba(99,102,241,0.35),rgba(168,85,247,0.35),rgba(56,189,248,0.35),rgba(99,102,241,0.35))] bg-[length:200%_100%] opacity-50 transition-opacity duration-500 group-hover:opacity-100 animate-topbar-aurora"
            />
            {/* Inner surface */}
            <span className="relative flex h-full w-full items-center gap-2.5 overflow-hidden rounded-[11px] bg-white/85 pl-2 pr-2.5 text-[13px] text-gray-500 shadow-sm backdrop-blur-md transition-all group-hover:bg-white group-hover:text-gray-700 group-hover:shadow-md group-hover:shadow-indigo-500/[0.08] dark:bg-gray-900/70 dark:text-gray-400 dark:group-hover:bg-gray-900 dark:group-hover:text-gray-200 dark:group-hover:shadow-indigo-500/[0.12]">
              {/* Shimmer sweep on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-indigo-500/[0.10] to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100"
              />
              {/* Icon pill */}
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-purple-500/15 ring-1 ring-inset ring-indigo-500/20 transition-all group-hover:from-indigo-500/25 group-hover:to-purple-500/25 group-hover:ring-indigo-500/35 dark:from-indigo-400/15 dark:to-purple-400/15 dark:ring-indigo-400/20 dark:group-hover:from-indigo-400/25 dark:group-hover:to-purple-400/25 dark:group-hover:ring-indigo-400/35">
                <Search className="h-3.5 w-3.5 text-indigo-500 transition-transform group-hover:scale-110 dark:text-indigo-300" />
              </span>
              {/* Cycling placeholder */}
              <span className="relative flex min-w-0 flex-1 items-baseline text-left font-medium tracking-tight">
                <span className="mr-1 shrink-0">Search</span>
                <span className="relative h-[18px] flex-1 overflow-hidden">
                  <span
                    key={placeholderIdx}
                    className="absolute inset-0 truncate animate-placeholder-swap text-gray-400 dark:text-gray-500"
                  >
                    {SEARCH_PLACEHOLDERS[placeholderIdx]}
                  </span>
                </span>
              </span>
              {/* ⌘K hint */}
              <kbd className="relative inline-flex shrink-0 items-center gap-0.5 rounded-md border border-gray-200/80 bg-gradient-to-b from-white to-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 shadow-sm transition-all group-hover:border-indigo-300/60 group-hover:from-indigo-50 group-hover:to-white group-hover:text-indigo-600 group-hover:shadow-indigo-500/10 dark:border-gray-700/80 dark:from-gray-800 dark:to-gray-900 dark:text-gray-400 dark:group-hover:border-indigo-500/40 dark:group-hover:from-indigo-500/15 dark:group-hover:to-gray-900 dark:group-hover:text-indigo-300">
                <span className="text-[11px] font-bold leading-none">⌘</span>K
              </kbd>
            </span>
          </button>
        </div>

        {/* Spacer (mobile) */}
        <div className="flex-1 lg:hidden" />

        {/* Right items */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 lg:flex-1 lg:justify-end">
          {/* Mobile search icon */}
          <button
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            aria-label="Search"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:hidden"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="relative" ref={quickRef}>
              <button
                onClick={() => setQuickOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={quickOpen}
                aria-label="Quick actions"
                title="Quick actions"
                className="group relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-gradient-to-br hover:from-indigo-500/10 hover:to-purple-500/10 hover:text-indigo-600 dark:text-gray-400 dark:hover:from-indigo-400/15 dark:hover:to-purple-400/15 dark:hover:text-indigo-300"
              >
                <Zap className="h-[18px] w-[18px] transition-transform group-hover:scale-110 group-hover:-rotate-6" />
                {/* Subtle glow on hover */}
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-lg opacity-0 ring-1 ring-inset ring-indigo-500/25 transition-opacity group-hover:opacity-100 dark:ring-indigo-400/30" />
              </button>

              {quickOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10"
                >
                  {/* Gradient header */}
                  <div className="relative h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" />
                  <div className="flex items-center gap-2 px-4 py-3">
                    <Zap className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Quick actions
                    </p>
                  </div>
                  <div className="border-t border-gray-100 p-1.5 dark:border-gray-800">
                    {quickActions.map((a) => (
                      <button
                        key={a.path}
                        role="menuitem"
                        onClick={() => { setQuickOpen(false); navigate(a.path); }}
                        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 ${a.tone} transition-colors group-hover:bg-white dark:bg-gray-800 dark:group-hover:bg-gray-900`}>
                          <a.icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1 text-left font-medium">{a.label}</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          {a.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          <NotificationBell />

          {/* Animated theme toggle */}
          <button
            onClick={toggle}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-amber-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-indigo-300"
          >
            <Sun
              className={`absolute h-5 w-5 transition-all duration-500 ${
                dark
                  ? "rotate-0 scale-100 opacity-100"
                  : "rotate-90 scale-50 opacity-0"
              }`}
            />
            <Moon
              className={`absolute h-5 w-5 transition-all duration-500 ${
                dark
                  ? "-rotate-90 scale-50 opacity-0"
                  : "rotate-0 scale-100 opacity-100"
              }`}
            />
          </button>

          {/* Divider */}
          <div aria-hidden className="mx-1 hidden h-6 w-px bg-gray-200 dark:bg-gray-800 sm:block" />

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              className="flex h-10 items-center gap-2 rounded-xl px-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 sm:pr-2"
            >
              <div className="relative shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-950">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span
                  aria-hidden
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${statusInfo.dot} ring-2 ring-white dark:ring-gray-950 ${status === "online" ? "animate-status-pulse" : ""}`}
                />
              </div>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="max-w-[140px] truncate text-[13px] font-semibold leading-tight text-gray-900 dark:text-white xl:max-w-[200px]">{user?.name}</p>
                <p className={`truncate text-[11px] capitalize leading-tight ${statusInfo.text}`}>
                  {statusInfo.label}
                </p>
              </div>
              <ChevronDown
                className={`hidden h-4 w-4 text-gray-400 transition-transform dark:text-gray-500 sm:block ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10"
              >
                {/* Gradient header strip */}
                <div className="relative h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.25) 0%, transparent 50%)",
                    }}
                  />
                </div>

                {/* User block — pulled up over the gradient */}
                <div className="-mt-7 px-4 pb-3.5">
                  <div className="flex items-end gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-semibold text-white shadow-md ring-4 ring-white dark:ring-gray-900">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <span
                        aria-hidden
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${statusInfo.dot} ring-2 ring-white dark:ring-gray-900`}
                      />
                    </div>
                    <span className="mb-1 shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                      {user?.role}
                    </span>
                  </div>
                  <div className="mt-2 min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                </div>

                {/* Status switcher */}
                <div className="border-t border-gray-100 px-2 py-2 dark:border-gray-800">
                  <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Set status
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {(Object.keys(statusConfig) as UserStatus[]).map((key) => {
                      const cfg = statusConfig[key];
                      const active = status === key;
                      const Icon = key === "dnd" ? MinusCircle : Circle;
                      return (
                        <button
                          key={key}
                          onClick={() => handleStatusChange(key)}
                          className={`group flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-all ${
                            active
                              ? `bg-gray-100 ring-1 ${cfg.ring} ${cfg.text} dark:bg-gray-800`
                              : "text-gray-600 hover:bg-gray-100/70 dark:text-gray-400 dark:hover:bg-gray-800/60"
                          }`}
                          aria-pressed={active}
                        >
                          <span className="relative flex h-5 w-5 items-center justify-center">
                            <Icon className={`h-4 w-4 ${active ? cfg.text : ""}`} fill={key === "online" && active ? "currentColor" : "none"} strokeWidth={2} />
                          </span>
                          <span>{cfg.label.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Menu items */}
                <div className="border-t border-gray-100 p-1.5 dark:border-gray-800">
                  <button
                    role="menuitem"
                    onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <User className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                    <span className="flex-1 text-left">My Profile</span>
                  </button>
                  {isAdmin && (
                    <button
                      role="menuitem"
                      onClick={() => { setDropdownOpen(false); navigate("/admin/settings/company"); }}
                      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <SettingsIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                      <span className="flex-1 text-left">Settings</span>
                    </button>
                  )}
                  <button
                    role="menuitem"
                    onClick={() => {
                      setDropdownOpen(false);
                      setSearchOpen(true);
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <HelpCircle className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                    <span className="flex-1 text-left">Search & shortcuts</span>
                    <kbd className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      ⌘K
                    </kbd>
                  </button>
                </div>

                {/* Sign out */}
                <div className="border-t border-gray-100 p-1.5 dark:border-gray-800">
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal (Command Palette) */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[8vh] sm:pt-[15vh] px-3 sm:px-4">
          <div
            className="absolute inset-0 animate-backdrop-fade bg-gray-950/55 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />
          <div
            ref={searchRef}
            className="relative w-full max-w-xl animate-modal-enter overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10"
          >
            {/* Top gradient accent */}
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />

            {/* Search input */}
            <div className="relative flex items-center gap-2 sm:gap-3 border-b border-gray-200/80 dark:border-gray-800/80 px-3 sm:px-4 py-3.5">
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-purple-500/15 ring-1 ring-inset ring-indigo-500/20 dark:from-indigo-400/15 dark:to-purple-400/15 dark:ring-indigo-400/20">
                <Search className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search pages, features, actions..."
                className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden shrink-0 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 sm:inline">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto p-2">
              {flatItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-xl" />
                    <div className="relative rounded-full bg-gray-100 p-3.5 dark:bg-gray-800">
                      <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    No results for "{query}"
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Try a different keyword or feature name
                  </p>
                </div>
              ) : (
                (() => {
                  let cursor = 0;
                  return groups.map((g) => {
                    const GroupIcon = g.icon;
                    const groupStart = cursor;
                    cursor += g.items.length;
                    return (
                      <div key={g.key} className="mb-1 last:mb-0">
                        <div className="flex items-center gap-1.5 px-3 pb-1 pt-2">
                          <GroupIcon className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            {g.label}
                          </p>
                          <span className="ml-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            {g.items.length}
                          </span>
                          {g.key === "recent" && (
                            <button
                              onClick={() => {
                                setRecent([]);
                                try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
                              }}
                              className="ml-auto text-[10px] font-medium text-gray-400 transition-colors hover:text-rose-500 dark:hover:text-rose-400"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        {g.items.map((item, j) => {
                          const flatIdx = groupStart + j;
                          const active = flatIdx === selectedIndex;
                          const tone = (item as ActionItem).tone;
                          return (
                            <button
                              key={`${g.key}-${item.path}`}
                              onClick={() => handleSearchNav(item.path)}
                              onMouseEnter={() => setSelectedIndex(flatIdx)}
                              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                                active
                                  ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                                  : "text-gray-700 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/60"
                              }`}
                            >
                              {/* Icon tile */}
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  active
                                    ? "bg-white shadow-sm ring-1 ring-indigo-500/20 dark:bg-gray-900 dark:ring-indigo-400/25"
                                    : "bg-gray-100/80 group-hover:bg-white dark:bg-gray-800/70 dark:group-hover:bg-gray-900"
                                }`}
                              >
                                <item.icon
                                  className={`h-4 w-4 transition-colors ${
                                    active
                                      ? "text-indigo-600 dark:text-indigo-300"
                                      : tone ?? "text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200"
                                  }`}
                                />
                              </span>
                              {/* Label + description */}
                              <span className="flex min-w-0 flex-1 flex-col text-left">
                                <span className="truncate font-medium leading-tight">
                                  {highlight(item.label, query)}
                                </span>
                                {item.description && (
                                  <span
                                    className={`mt-0.5 truncate text-[11px] leading-tight ${
                                      active
                                        ? "text-indigo-500/80 dark:text-indigo-300/80"
                                        : "text-gray-400 dark:text-gray-500"
                                    }`}
                                  >
                                    {highlight(item.description, query)}
                                  </span>
                                )}
                              </span>
                              {/* Trailing hint */}
                              {active ? (
                                <kbd className="hidden shrink-0 items-center gap-1 rounded-md border border-indigo-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-indigo-500 shadow-sm dark:border-indigo-400/30 dark:bg-gray-900 sm:inline-flex">
                                  <CornerDownLeft className="h-3 w-3" />
                                </kbd>
                              ) : (
                                <span className="hidden truncate text-[10px] font-mono text-gray-300 dark:text-gray-600 sm:inline">
                                  {item.path}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Footer hint */}
            <div className="hidden items-center justify-between gap-4 border-t border-gray-200/80 bg-gray-50/60 px-4 py-2.5 text-xs text-gray-500 dark:border-gray-800/80 dark:bg-gray-900/60 dark:text-gray-400 sm:flex">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    ↵
                  </kbd>
                  Open
                </span>
              </div>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  Esc
                </kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
