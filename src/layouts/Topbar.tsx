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
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3 dark:border-gray-800 dark:bg-gray-900 sm:px-4 lg:px-6 transition-colors">
        {/* Left: hamburger (mobile) */}
        <button
          onClick={onMenuClick}
          className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Center: Welcome + Search (desktop) */}
        <div className="hidden flex-1 items-center gap-4 lg:flex">
          <div className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
            Welcome back,{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{user?.name}</span>
          </div>
          <button
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-400 dark:text-gray-500 transition-colors hover:border-gray-300 dark:hover:border-gray-600 w-64"
          >
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-auto rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400 dark:text-gray-500">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Center: spacer (mobile) — push right items to the end */}
        <div className="flex-1 lg:hidden" />

        {/* Right items */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Mobile search icon */}
          <button
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize leading-tight">{user?.role}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-400 dark:text-gray-500 sm:block" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    My Profile
                  </button>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div
            ref={searchRef}
            className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            {/* Search input */}
            <div className="flex items-center gap-2 sm:gap-3 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search pages, features..."
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              {query && (
                <button onClick={() => setQuery("")} className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden shrink-0 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400 dark:text-gray-500 sm:inline">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                  No results for "{query}"
                </p>
              ) : (
                filtered.map((item, i) => (
                  <button
                    key={item.path}
                    onClick={() => handleSearchNav(item.path)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`flex w-full items-center gap-3 px-3 sm:px-4 py-3 sm:py-2.5 text-sm transition-colors ${
                      i === selectedIndex
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {i === selectedIndex && (
                      <span className="hidden text-xs text-gray-400 dark:text-gray-500 sm:inline">Enter to go</span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer hint — hidden on mobile */}
            <div className="hidden sm:flex items-center gap-4 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-300 dark:border-gray-600 px-1">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-300 dark:border-gray-600 px-1">↵</kbd> Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-300 dark:border-gray-600 px-1">Esc</kbd> Close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
