import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Clock, FolderKanban, CheckSquare, Users, X,
  UserCheck, CalendarDays, FileText, UsersRound, CalendarRange,
  ClipboardList, UsersRound as TeamIcon, PartyPopper, Laptop, Gift, BarChart3,
  Grid3X3, CalendarClock, History, FileCheck, Settings, AlertTriangle, Download,
  Megaphone, Award, ClipboardCheck, Building, Shield, Mail, ScrollText,
  Target, Star, MessageCircle, TrendingUp, BookOpen, GraduationCap, Presentation,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

const links = [
  // ── Main ──
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: [], section: "Main" },
  { to: "/dashboard/manager", label: "Team Dashboard", icon: UsersRound, roles: ["admin", "manager"], section: "Main" },
  { to: "/dashboard/hr", label: "HR Dashboard", icon: BarChart3, roles: ["admin"], section: "Main" },
  { to: "/employees", label: "Employees", icon: UsersRound, roles: ["admin", "manager"], section: "Main" },

  // ── Timesheet (visible to ALL) ──
  { to: "/timesheet", label: "Timesheet", icon: Clock, roles: [], section: "Timesheet" },
  { to: "/timesheet/weekly", label: "Weekly Grid", icon: Grid3X3, roles: [], section: "Timesheet" },
  { to: "/timesheet/daily", label: "Daily Log", icon: CalendarClock, roles: [], section: "Timesheet" },
  { to: "/timesheet/history", label: "History", icon: History, roles: [], section: "Timesheet" },
  { to: "/timesheet/approvals", label: "TS Approvals", icon: FileCheck, roles: ["admin", "manager"], section: "Timesheet" },
  { to: "/timesheet/team/projects", label: "Project Hours", icon: BarChart3, roles: ["admin", "manager"], section: "Timesheet" },
  { to: "/projects", label: "Projects", icon: FolderKanban, roles: [], section: "Timesheet" },

  // ── Attendance ──
  { to: "/attendance", label: "My Attendance", icon: UserCheck, roles: [], section: "Attendance" },
  { to: "/attendance/calendar", label: "Calendar", icon: CalendarRange, roles: [], section: "Attendance" },
  { to: "/attendance/team", label: "Team View", icon: TeamIcon, roles: ["admin", "manager"], section: "Attendance" },
  { to: "/attendance/holidays", label: "Holidays", icon: PartyPopper, roles: [], section: "Attendance" },
  { to: "/attendance/reports", label: "Reports", icon: BarChart3, roles: ["admin", "manager"], section: "Attendance" },

  // ── Leave ──
  { to: "/leaves", label: "Leaves", icon: CalendarDays, roles: [], section: "Leave" },
  { to: "/leave/apply", label: "Apply Leave", icon: ClipboardList, roles: [], section: "Leave" },
  { to: "/leave/approvals", label: "Leave Approvals", icon: CheckSquare, roles: ["admin", "manager"], section: "Leave" },
  { to: "/attendance/wfh", label: "WFH", icon: Laptop, roles: [], section: "Leave" },
  { to: "/attendance/compoff", label: "Comp-Off", icon: Gift, roles: [], section: "Leave" },

  // ── Engage ──
  { to: "/announcements", label: "Announcements", icon: Megaphone, roles: [], section: "Engage" },
  { to: "/recognition", label: "Recognition", icon: Award, roles: [], section: "Engage" },
  { to: "/surveys", label: "Surveys", icon: ClipboardCheck, roles: [], section: "Engage" },
  { to: "/documents", label: "Documents", icon: FileText, roles: [], section: "Engage" },

  // ── Performance ──
  { to: "/performance/goals", label: "My Goals", icon: Target, roles: [], section: "Performance" },
  { to: "/performance/feedback", label: "Feedback", icon: MessageCircle, roles: [], section: "Performance" },

  // ── Learning ──
  { to: "/learning", label: "Learning Hub", icon: BookOpen, roles: [], section: "Learning" },
  { to: "/learning/certifications", label: "Certifications", icon: GraduationCap, roles: [], section: "Learning" },

  // ── Admin ──
  { to: "/admin/timesheet", label: "TS Admin", icon: Clock, roles: ["admin"], section: "Admin" },
  { to: "/admin/announcements", label: "Post Manager", icon: Megaphone, roles: ["admin", "manager"], section: "Admin" },
  { to: "/users", label: "User Mgmt", icon: Users, roles: ["admin"], section: "Admin" },
  { to: "/admin/settings/company", label: "Settings", icon: Settings, roles: ["admin"], section: "Admin" },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText, roles: ["admin"], section: "Admin" },
  { to: "/admin/performance/cycles", label: "Review Cycles", icon: TrendingUp, roles: ["admin"], section: "Admin" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const { user } = useAuth();

  const filtered = links.filter(
    (l) => l.roles.length === 0 || l.roles.includes(user?.role || "")
  );

  // Group by section
  const sections = [...new Set(filtered.map((l) => l.section))];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={clsx(
          "fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded-lg object-contain dark:invert" />
            <span className="text-base font-bold text-gray-900 dark:text-white">United Nexa Tech</span>
          </div>
          <button onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section} className="mb-4">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section}
              </p>
              <div className="space-y-0.5">
                {filtered
                  .filter((l) => l.section === section)
                  .map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        )
                      }
                    >
                      <link.icon className="h-4.5 w-4.5" />
                      {link.label}
                    </NavLink>
                  ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
