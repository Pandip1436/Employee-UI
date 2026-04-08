import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Users,
  FileDown,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { TimesheetDashboardStats, User } from "../../types";

/* ─── Helpers ─── */
const labelClasses =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

/* ─── Stat card config ─── */
const statCards: {
  key: keyof Pick<TimesheetDashboardStats, "submitted" | "pending" | "approved" | "rejected">;
  label: string;
  icon: typeof FileText;
  iconBg: string;
  iconColor: string;
  border: string;
}[] = [
  {
    key: "submitted",
    label: "Submitted",
    icon: FileText,
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    border: "border-l-4 border-blue-500",
  },
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    border: "border-l-4 border-amber-500",
  },
  {
    key: "approved",
    label: "Approved",
    icon: CheckCircle2,
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    border: "border-l-4 border-emerald-500",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: XCircle,
    iconBg: "bg-rose-50 dark:bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    border: "border-l-4 border-rose-500",
  },
];

/* ─── Quick links config ─── */
const quickLinks = [
  {
    label: "Timesheet Approvals",
    description: "Review pending submissions",
    href: "/timesheet/approvals",
    icon: CheckCircle2,
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Export Reports",
    description: "Download timesheet data",
    href: "/admin/timesheet/export",
    icon: FileDown,
    iconBg: "bg-purple-50 dark:bg-purple-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    label: "Overtime Report",
    description: "View overtime entries",
    href: "/admin/timesheet/reports/overtime",
    icon: AlertTriangle,
    iconBg: "bg-orange-50 dark:bg-orange-500/10",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
];

/* ─── Component ─── */
export default function AdminTimesheetDashboard() {
  const [stats, setStats] = useState<TimesheetDashboardStats | null>(null);
  const [missing, setMissing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      Promise.all([
        weeklyTimesheetApi.getDashboardStats(),
        weeklyTimesheetApi.getMissing(),
      ])
        .then(([statsRes, missingRes]) => {
          setStats(statsRes.data.data ?? null);
          setMissing(missingRes.data.data ?? []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));

    load();
    const id = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Timesheet Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Admin overview of timesheet submissions and compliance
          {stats?.weekStart && (
            <span className="ml-1">
              &mdash; Week of{" "}
              {new Date(stats.weekStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </p>
      </div>

      {/* ── Stats Cards ── */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className={`${card.border} rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className={labelClasses}>{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stats[card.key]}
                    </p>
                  </div>
                  <div className={`rounded-xl ${card.iconBg} p-3`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quick Links ── */}
      <div>
        <p className={`${labelClasses} mb-3`}>Quick Links</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                to={link.href}
                className="group flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
              >
                <div className={`rounded-xl ${link.iconBg} p-3`}>
                  <Icon className={`h-5 w-5 ${link.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {link.label}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {link.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Missing Submissions ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className={labelClasses}>Missing Submissions</p>
          {missing.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400 ring-1 ring-rose-600/20 dark:ring-rose-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              {missing.length} employee{missing.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {missing.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-16 px-4 text-center">
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 p-4 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              All employees have submitted their timesheets
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table ── */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Employee</th>
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Email</th>
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Department</th>
                    <th className={`${labelClasses} px-5 py-3 text-left`}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {missing.map((user) => (
                    <tr
                      key={user._id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <Users className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                          {user.name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {user.department || "\u2014"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400 ring-1 ring-rose-600/20 dark:ring-rose-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Missing
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Cards ── */}
            <div className="space-y-3 md:hidden">
              {missing.map((user) => (
                <div
                  key={user._id}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                      <Users className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      {user.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400 ring-1 ring-rose-600/20 dark:ring-rose-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Missing
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  {user.department && (
                    <span className="mt-2 inline-block rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {user.department}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
