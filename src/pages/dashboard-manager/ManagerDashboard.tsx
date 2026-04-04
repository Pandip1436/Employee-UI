import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  CalendarClock,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
  CalendarDays,
  Briefcase,
} from "lucide-react";
import {
  dashboardApi,
  type ManagerStats,
  type PendingApprovalItem,
  type TeamLeaveEntry,
} from "../../api/dashboardApi";
import { leaveApi } from "../../api/leaveApi";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { useAuth } from "../../context/AuthContext";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const fmtShort = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const leaveTypeColor: Record<string, string> = {
  casual: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  sick: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  earned: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "comp-off":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  wfh: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
};

const badgeFor = (type: string) =>
  leaveTypeColor[type.toLowerCase()] ??
  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ManagerDashboard() {
  const { user } = useAuth();

  /* ---- state ---- */
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [approvals, setApprovals] = useState<PendingApprovalItem[]>([]);
  const [calendar, setCalendar] = useState<TeamLeaveEntry[]>([]);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ---- data fetching ---- */
  const fetchCore = useCallback(() => {
    setLoading(true);
    Promise.all([
      dashboardApi.getManagerStats(),
      dashboardApi.getPendingApprovals(),
    ])
      .then(([sRes, aRes]) => {
        setStats(sRes.data.data ?? null);
        const d = aRes.data.data;
        if (d) {
          const combined = [
            ...(d.leaves ?? []).map((l) => ({ ...l, type: "leave" as const })),
            ...(d.timesheets ?? []).map((t) => ({
              ...t,
              type: "timesheet" as const,
            })),
          ].sort(
            (a, b) =>
              new Date(b.submittedAt ?? b.createdAt ?? 0).getTime() -
              new Date(a.submittedAt ?? a.createdAt ?? 0).getTime()
          );
          setApprovals(combined);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCore();
  }, [fetchCore]);

  useEffect(() => {
    dashboardApi
      .getTeamLeaveCalendar(calMonth)
      .then((r) => setCalendar(r.data.data ?? []))
      .catch(() => {});
  }, [calMonth]);

  /* ---- approve / reject ---- */
  const handleAction = async (
    item: PendingApprovalItem,
    status: "approved" | "rejected"
  ) => {
    setActionLoading(`${item._id}-${status}`);
    try {
      if (item.type === "leave") {
        await leaveApi.approve(item._id, { status });
      } else {
        await weeklyTimesheetApi.approve(item._id, status);
      }
      setApprovals((prev) => prev.filter((a) => a._id !== item._id));
      // refresh stats
      dashboardApi
        .getManagerStats()
        .then((r) => setStats(r.data.data ?? null))
        .catch(() => {});
    } catch {
      /* interceptor handles toast */
    } finally {
      setActionLoading(null);
    }
  };

  /* ---- month navigation ---- */
  const shiftMonth = (dir: -1 | 1) => {
    const [y, m] = calMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCalMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const monthLabel = (() => {
    const [y, m] = calMonth.split("-").map(Number);
    return new Date(y, m - 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  })();

  /* ---- shared classes ---- */
  const card =
    "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Employees",
      value: stats?.totalEmployees ?? 0,
      icon: Users,
      color: "text-indigo-600 dark:text-indigo-400",
      border: "border-indigo-200 dark:border-indigo-500/20",
    },
    {
      label: "Present Today",
      value: stats?.todayPresent ?? 0,
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-500/20",
    },
    {
      label: "Absent Today",
      value: stats?.todayAbsent ?? 0,
      icon: UserX,
      color: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-500/20",
    },
    {
      label: "Pending Leaves",
      value: stats?.pendingLeaves ?? 0,
      icon: CalendarClock,
      color: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-500/20",
      dot: (stats?.pendingLeaves ?? 0) > 0,
    },
    {
      label: "Pending Timesheets",
      value: stats?.pendingTimesheets ?? 0,
      icon: ClipboardList,
      color: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-500/20",
      dot: (stats?.pendingTimesheets ?? 0) > 0,
    },
  ];

  const quickLinks = [
    {
      label: "Timesheet Approvals",
      to: "/timesheet/approvals",
      icon: ClipboardList,
      color: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
      label: "Leave Approvals",
      to: "/leave/approvals",
      icon: CalendarDays,
      color: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      label: "Team Attendance",
      to: "/attendance/team",
      icon: UserCheck,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      label: "Employees",
      to: "/employees",
      icon: Briefcase,
      color: "bg-purple-600 hover:bg-purple-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-indigo-200">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Hello, {user?.name?.split(" ")[0]}!
            </h1>
            <p className="mt-1 text-sm text-indigo-200">
              Your team overview at a glance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-5 py-3 text-center">
              <p className="text-xs text-indigo-200">Present Today</p>
              <p className="text-lg font-bold">
                {stats?.todayPresent ?? 0}{" "}
                <span className="text-sm font-normal text-indigo-200">
                  / {stats?.totalEmployees ?? 0}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-5 py-3 text-center">
              <p className="text-xs text-indigo-200">Pending Actions</p>
              <p className="text-lg font-bold">
                {(stats?.pendingLeaves ?? 0) + (stats?.pendingTimesheets ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`relative rounded-xl border ${s.border} bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md`}
          >
            {"dot" in s && s.dot && (
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
            )}
            <div className="flex items-center justify-between">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Pending Approvals ── */}
      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Pending Approvals
          </h2>
          <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            {approvals.length}
          </span>
        </div>

        {approvals.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No pending approvals — you're all caught up!
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    <th className="pb-2 pr-4">Employee</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Details</th>
                    <th className="pb-2 pr-4">Submitted</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {approvals.map((item) => (
                    <tr key={item._id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.employee.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {item.employee.email}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            item.type === "leave"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                          }`}
                        >
                          {item.type === "leave" ? "Leave" : "Timesheet"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {item.type === "leave" ? (
                          <>
                            <span className="capitalize">
                              {item.leaveType}
                            </span>{" "}
                            &middot; {item.days} day{item.days !== 1 ? "s" : ""}{" "}
                            &middot; {fmtShort(item.startDate)}
                          </>
                        ) : (
                          <>
                            Week of {fmtShort(item.weekStart)} &middot;{" "}
                            {item.totalHours}h
                          </>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-400 dark:text-gray-500">
                        {fmtDate(item.submittedAt ?? item.createdAt)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={actionLoading === `${item._id}-approved`}
                            onClick={() => handleAction(item, "approved")}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === `${item._id}-approved` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Approve
                          </button>
                          <button
                            disabled={actionLoading === `${item._id}-rejected`}
                            onClick={() => handleAction(item, "rejected")}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === `${item._id}-rejected` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {approvals.map((item) => (
                <div
                  key={item._id}
                  className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.employee.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {item.employee.email}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.type === "leave"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      }`}
                    >
                      {item.type === "leave" ? "Leave" : "Timesheet"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {item.type === "leave" ? (
                      <>
                        <span className="capitalize">{item.leaveType}</span>{" "}
                        &middot; {item.days} day{item.days !== 1 ? "s" : ""}{" "}
                        &middot; {fmtShort(item.startDate)}
                      </>
                    ) : (
                      <>
                        Week of {fmtShort(item.weekStart)} &middot;{" "}
                        {item.totalHours}h
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Submitted {fmtDate(item.submittedAt ?? item.createdAt)}
                  </p>

                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={actionLoading === `${item._id}-approved`}
                      onClick={() => handleAction(item, "approved")}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === `${item._id}-approved` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      disabled={actionLoading === `${item._id}-rejected`}
                      onClick={() => handleAction(item, "rejected")}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === `${item._id}-rejected` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Team Leave Calendar ── */}
      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Team Leave Calendar
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftMonth(-1)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[130px] text-center text-sm font-medium text-gray-700 dark:text-gray-300">
              {monthLabel}
            </span>
            <button
              onClick={() => shiftMonth(1)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {calendar.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No team leaves this month
          </p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    <th className="pb-2 pr-4">Employee</th>
                    <th className="pb-2 pr-4">Department</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Date Range</th>
                    <th className="pb-2 text-right">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {calendar.map((entry, idx) => (
                    <tr key={idx}>
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                        {entry.employee}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                        {entry.department}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badgeFor(
                            entry.type
                          )}`}
                        >
                          {entry.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {fmtShort(entry.startDate)} &ndash;{" "}
                        {fmtShort(entry.endDate)}
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                        {entry.days}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {calendar.map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {entry.employee}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {entry.department}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badgeFor(
                        entry.type
                      )}`}
                    >
                      {entry.type}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {fmtShort(entry.startDate)} &ndash;{" "}
                      {fmtShort(entry.endDate)}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {entry.days} day{entry.days !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickLinks.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={`flex items-center gap-3 rounded-xl ${a.color} px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-100`}
          >
            <a.icon className="h-5 w-5" />
            <span className="truncate">{a.label}</span>
            <ArrowRight className="ml-auto h-4 w-4 opacity-60" />
          </Link>
        ))}
      </div>
    </div>
  );
}
