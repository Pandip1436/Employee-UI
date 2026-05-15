import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Clock, FolderKanban, CheckSquare, Users, X,
  UserCheck, CalendarDays, FileText, UsersRound,
  UsersRound as TeamIcon, PartyPopper, Laptop, Gift, BarChart3,
  Grid3X3, FileCheck, AlertTriangle, Download,
  Megaphone, Award, ClipboardCheck, Building, ScrollText,
  MessageCircle, BookOpen,
  NotebookPen, CalendarClock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import type { UserRole } from "../types";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface SidebarLink {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  excludeRoles?: UserRole[];
  section: string;
}

const links: SidebarLink[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["employee"],excludeRoles: ["admin"],  section: "Main" },
  { to: "/dashboard/manager", label: "Team Dashboard", icon: UsersRound, roles: ["manager"], section: "Main" },
  { to: "/dashboard/hr", label: "Dashboard", icon: BarChart3, roles: ["admin"], section: "Main" },
  { to: "/employees", label: "Employees", icon: UsersRound, roles: ["admin", "manager"], section: "Main" },
  { to: "/projects", label: "Projects", icon: FolderKanban, roles: [], section: "Main" },
  { to: "/documents", label: "Documents", icon: FileText, roles: [], section: "Main" },
  { to: "/attendance", label: "My Attendance", icon: UserCheck, roles: [],excludeRoles: ["admin"], section: "Attendance" },
  { to: "/attendance/team", label: "Team View", icon: TeamIcon, roles: ["admin", "manager"], section: "Attendance" },
  { to: "/attendance/holidays", label: "Holidays", icon: PartyPopper, roles: [], section: "Attendance" },
  { to: "/attendance/reports", label: "Reports", icon: BarChart3, roles: ["admin", "manager"], section: "Attendance" },
  { to: "/daily-updates", label: "My Updates", icon: NotebookPen, roles: [],excludeRoles: ["admin"], section: "Daily Updates" },
  { to: "/daily-updates/team", label: "Team Updates", icon: NotebookPen, roles: ["admin", "manager"], section: "Daily Updates" },
  { to: "/timesheet", label: "Timesheet Home", icon: Clock, roles: [], excludeRoles: ["admin"], section: "Timesheet" },
  { to: "/timesheet/daily", label: "Daily Works", icon: CalendarClock, roles: [],  section: "Timesheet" },
  { to: "/timesheet/weekly", label: "Weekly Grid", icon: Grid3X3, roles: [], excludeRoles: ["admin"], section: "Timesheet" },
  { to: "/timesheet/approvals", label: "Approvals", icon: FileCheck, roles: ["admin", "manager"], section: "Timesheet" },
  { to: "/admin/timesheet/missing", label: "Missing", icon: AlertTriangle, roles: ["admin"], section: "Timesheet" },
  { to: "/admin/timesheet/reports/overtime", label: "Overtime", icon: Clock, roles: ["admin"], section: "Timesheet" },
  { to: "/admin/timesheet/export", label: "Export", icon: Download, roles: ["admin"], section: "Timesheet" },
  // { to: "/admin/timesheet/config", label: "Config", icon: Settings, roles: ["admin"], section: "Timesheet" },
  { to: "/leaves", label: "Leave Dashboard", icon: CalendarDays, roles: ["employee"], section: "Leave" },
  { to: "/leave/approvals", label: "Leave Approvals", icon: CheckSquare, roles: ["admin", "manager"], section: "Leave" },
  { to: "/wfh/approvals", label: "WFH Approvals", icon: Laptop, roles: ["admin", "manager"], section: "Leave" },
  { to: "/compoff/approvals", label: "Comp-Off Approvals", icon: Gift, roles: ["admin", "manager"], section: "Leave" },
  { to: "/announcements", label: "Announcements", icon: Megaphone, roles: [], section: "Engage" },
  { to: "/recognition", label: "Recognition", icon: Award, roles: [], section: "Engage" },
  { to: "/surveys", label: "Surveys", icon: ClipboardCheck, roles: [], section: "Engage" },
  // { to: "/approvals", label: "Approvals", icon: CheckSquare, roles: ["admin", "manager"], section: "Management" },
  { to: "/performance/feedback", label: "Feedback", icon: MessageCircle, roles: [], section: "Performance" },
  { to: "/learning", label: "Learning Hub", icon: BookOpen, roles: [], section: "Learning" },
  // { to: "/learning/certifications", label: "Certifications", icon: GraduationCap, roles: ["employee"], excludeRoles: ["admin"], section: "Learning" },
  { to: "/admin/announcements", label: "Post Manager", icon: Megaphone, roles: ["admin", "manager"], section: "Settings" },
  { to: "/users", label: "User Mgmt", icon: Users, roles: ["admin"], section: "Settings" },
  { to: "/admin/settings/company", label: "Company", icon: Building, roles: ["admin"], section: "Settings" },
  { to: "/admin/settings/org-structure", label: "Org Structure", icon: Laptop, roles: ["admin"], section: "Settings" },
  // { to: "/admin/settings/roles", label: "Roles", icon: Award, roles: ["admin"], section: "Settings" },
  { to: "/admin/settings/leave", label: "Leave Policy", icon: CalendarDays, roles: ["admin"], section: "Settings" },
  // { to: "/admin/settings/emails", label: "Email Templates", icon: Mail, roles: ["admin"], section: "Settings" },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText, roles: ["admin"], section: "Settings" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const { user } = useAuth();
  const { companyName } = useCompany();

  const role = user?.role ?? "employee";
  const filtered = links.filter(
    (l) =>
      (l.roles.length === 0 || l.roles.includes(role)) &&
      !(l.excludeRoles?.includes(role))
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
          "fixed top-0 left-0 z-50 flex h-screen w-64 flex-col overflow-hidden border-r border-white/5 bg-[#0a0a0f] shadow-[0_0_60px_-12px_rgba(0,0,0,0.6),0_0_40px_-12px_rgba(99,102,241,0.25)] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* ── Premium obsidian background layers ── */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Deep obsidian gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d14] via-[#08080d] to-[#050508]" />
          {/* Radial vignette + highlight */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.10) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(168,85,247,0.06) 0%, transparent 60%)",
            }}
          />
          {/* Aurora — indigo top */}
          <div className="absolute -top-32 -left-16 h-80 w-80 rounded-full bg-indigo-600/15 blur-3xl" />
          {/* Aurora — fuchsia mid */}
          <div className="absolute top-1/2 -right-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
          {/* Aurora — deep blue bottom */}
          <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-blue-700/12 blur-3xl" />
          {/* Noise grain */}
          <div
            className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.7'/></svg>\")",
            }}
          />
          {/* Top sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          {/* Right gradient edge */}
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-indigo-500/40 to-transparent" />
        </div>

        {/* ── Brand ── */}
        <div className="relative flex h-16 items-center justify-between border-b border-white/[0.06] px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 shadow-[0_0_20px_-4px_rgba(99,102,241,0.6)] ring-1 ring-white/10">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-white">
                {companyName}
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden rounded-md p-1 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
          {sections.map((section) => (
            <div key={section} className="mb-5 last:mb-0">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
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
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                          isActive
                            ? "bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent text-white shadow-[0_0_20px_-8px_rgba(99,102,241,0.6)] ring-1 ring-indigo-400/20"
                            : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Active indicator bar */}
                          <span
                            aria-hidden
                            className={clsx(
                              "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500 shadow-[0_0_8px_rgba(129,140,248,0.6)] transition-opacity",
                              isActive ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <link.icon
                            className={clsx(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive
                                ? "text-indigo-300"
                                : "text-gray-500 group-hover:text-gray-200"
                            )}
                          />
                          <span className="truncate">{link.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User ── */}
        <div className="relative border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 shadow-[0_4px_20px_-8px_rgba(99,102,241,0.4)] backdrop-blur-md transition-colors hover:bg-white/[0.06] hover:border-white/10">
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white shadow-[0_0_15px_-2px_rgba(99,102,241,0.6)] ring-2 ring-black/40">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] ring-2 ring-[#0a0a0f]"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {user?.name}
              </p>
              <p className="truncate text-[11px] font-medium capitalize text-gray-400">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
