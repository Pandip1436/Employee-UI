import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, LogOut, Sun, Moon, User, ChevronDown, Search, X, Clock, FolderKanban, Users, UserCheck, CalendarDays, FileText, LayoutDashboard, CheckSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "../components/NotificationBell";

interface Props {
  onMenuClick: () => void;
}

interface SearchItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  keywords: string[];
  roles?: string[];
}

const searchItems: SearchItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, keywords: ["dashboard", "home", "overview", "analytics"] },
  { label: "Timesheet", path: "/timesheet", icon: Clock, keywords: ["timesheet", "hours", "log", "time entry", "weekly"] },
  { label: "Projects", path: "/projects", icon: FolderKanban, keywords: ["project", "client", "assign"] },
  { label: "Attendance", path: "/attendance", icon: UserCheck, keywords: ["attendance", "clock in", "clock out", "punch", "check in"] },
  { label: "Leaves", path: "/leaves", icon: CalendarDays, keywords: ["leave", "vacation", "sick", "casual", "time off", "apply leave"] },
  { label: "Documents", path: "/documents", icon: FileText, keywords: ["document", "file", "upload", "download", "pdf", "policy"] },
  { label: "Employees", path: "/employees", icon: Users, keywords: ["employee", "staff", "people", "team"], roles: ["admin", "manager"] },
  { label: "Approvals", path: "/approvals", icon: CheckSquare, keywords: ["approval", "approve", "reject", "pending", "review"], roles: ["admin", "manager"] },
  { label: "User Management", path: "/users", icon: Users, keywords: ["user", "role", "admin", "manage users"], roles: ["admin"] },
  { label: "My Profile", path: "/profile", icon: User, keywords: ["profile", "account", "settings", "my info"] },
];

export default function Topbar({ onMenuClick }: Props) {
  const { logout, user } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter search items by role and query
  const filtered = searchItems
    .filter((item) => !item.roles || item.roles.includes(user?.role || ""))
    .filter((item) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
      );
    });

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: Ctrl+K to open search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSearchNav = useCallback(
    (path: string) => {
      setSearchOpen(false);
      setQuery("");
      navigate(path);
    },
    [navigate]
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      handleSearchNav(filtered[selectedIndex].path);
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-gray-200/70 bg-white/80 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:border-gray-800/80 dark:bg-gray-950/80 dark:supports-[backdrop-filter]:bg-gray-950/60 sm:px-4 lg:px-6 transition-colors">
        {/* Left: hamburger (mobile) */}
        <button
          onClick={onMenuClick}
          aria-label="Open sidebar"
          className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Center: Welcome + Search (desktop) */}
        <div className="hidden flex-1 items-center gap-4 lg:flex">
          <div className="shrink-0 text-[13px] text-gray-500 dark:text-gray-400">
            <span className="text-gray-400 dark:text-gray-500">Welcome back,</span>{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{user?.name}</span>
          </div>
          <button
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="group flex w-72 items-center gap-2.5 rounded-xl border border-gray-200/70 bg-gray-50/60 px-3 py-2 text-[13px] text-gray-400 shadow-sm ring-1 ring-transparent transition-all hover:border-gray-300 hover:bg-white hover:text-gray-500 hover:ring-gray-200/60 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-500 dark:hover:border-gray-700 dark:hover:bg-gray-900 dark:hover:ring-gray-800"
          >
            <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-gray-500 dark:group-hover:text-gray-400" />
            <span className="flex-1 text-left">Search pages, features...</span>
            <kbd className="inline-flex items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Center: spacer (mobile) — push right items to the end */}
        <div className="flex-1 lg:hidden" />

        {/* Right items */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {/* Mobile search icon */}
          <button
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            aria-label="Search"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:hidden"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Divider */}
          <div aria-hidden className="mx-1 hidden h-6 w-px bg-gray-200 dark:bg-gray-800 sm:block" />

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="relative shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-950">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-950"
                />
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight">{user?.name}</p>
                <p className="text-[11px] capitalize text-gray-500 dark:text-gray-400 leading-tight">{user?.role}</p>
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
                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10"
              >
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5 dark:border-gray-800">
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                    {user?.role}
                  </span>
                </div>

                {/* Menu items */}
                <div className="p-1.5">
                  <button
                    role="menuitem"
                    onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <User className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                    <span className="flex-1 text-left">My Profile</span>
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
            className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />
          <div
            ref={searchRef}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10"
          >
            {/* Search input */}
            <div className="flex items-center gap-2 sm:gap-3 border-b border-gray-200/80 dark:border-gray-800/80 px-3 sm:px-4 py-3.5">
              <Search className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search pages, features..."
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
            <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                  <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                    <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    No results for "{query}"
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Try a different keyword or feature name
                  </p>
                </div>
              ) : (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Pages
                  </p>
                  {filtered.map((item, i) => {
                    const active = i === selectedIndex;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleSearchNav(item.path)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                          active
                            ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                            : "text-gray-700 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/60"
                        }`}
                      >
                        <item.icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            active
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                          }`}
                        />
                        <span className="flex-1 text-left truncate font-medium">{item.label}</span>
                        {active && (
                          <kbd className="hidden shrink-0 rounded-md border border-indigo-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-indigo-500 shadow-sm dark:border-indigo-400/30 dark:bg-gray-900 sm:inline">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer hint — hidden on mobile */}
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
