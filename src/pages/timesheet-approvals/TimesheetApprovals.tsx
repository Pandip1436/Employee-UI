/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, FileText, X,
  Users, Eye, MessageSquare, AlertTriangle, Sparkles, Inbox, Briefcase,
  FolderKanban, CalendarDays, Search, Plane, PartyPopper, Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { projectApi } from "../../api/projectApi";
import { leaveApi } from "../../api/leaveApi";
import { holidayApi } from "../../api/holidayApi";
import type { WeeklyTimesheetData, Pagination, User, Project, LeaveRequest, Holiday } from "../../types";
import { fmtHours } from "../../utils/format";

const LEAVE_DAY_HOURS: number = 9;
const HOLIDAY_DAY_HOURS: number = 9;

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

const PALETTES = [
  "from-indigo-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];
const paletteFor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
};

function Avatar({ name }: { name: string }) {
  const init = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(name || "?")} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
      {init}
    </div>
  );
}

/* ── Helpers ── */
const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const weekEndFrom = (weekStart: string) => {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return end;
};

const getUserName = (userId: User | string): string => {
  if (typeof userId === "object" && userId !== null) return (userId as User).name;
  return String(userId);
};
const getUserEmail = (userId: User | string): string => {
  if (typeof userId === "object" && userId !== null) return (userId as User).email;
  return "";
};
const getProjectName = (p: Project | string): string => {
  if (typeof p === "object" && p !== null) return (p as Project).name;
  return String(p);
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ── Status config ── */
const tsStatusConfig: Record<string, { dot: string; badge: string; label: string; gradient: string }> = {
  submitted: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    label: "Pending", gradient: "from-amber-500 to-orange-600",
  },
  approved: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    label: "Approved", gradient: "from-emerald-500 to-teal-600",
  },
  rejected: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    label: "Rejected", gradient: "from-rose-500 to-pink-600",
  },
};

const projectStatusConfig: Record<string, { dot: string; badge: string; label: string }> = {
  active: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20", label: "Active" },
  completed: { dot: "bg-gray-400", badge: "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20", label: "Completed" },
  "on-hold": { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20", label: "On Hold" },
};

type Tab = "submitted" | "approved" | "rejected";

const tabs: { key: Tab; label: string }[] = [
  { key: "submitted", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function TimesheetApprovals() {
  const [tab, setTab] = useState<Tab>("submitted");
  const [timesheets, setTimesheets] = useState<WeeklyTimesheetData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [previewSheet, setPreviewSheet] = useState<WeeklyTimesheetData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Compute leave + holiday overlay for a specific employee's week.
  const overlayFor = (userId: User | string, weekStart: string | Date) => {
    const uid = typeof userId === "object" && userId !== null ? (userId as User)._id : String(userId);
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const userLeaves = allLeaves.filter((l) => {
      const lUid = typeof l.userId === "object" && l.userId !== null ? (l.userId as User)._id : String(l.userId);
      return lUid === uid;
    });
    const leaveDayInfo = days.map((d) => {
      const dMs = d.getTime();
      const match = userLeaves.find((l) => {
        if (l.status !== "approved") return false;
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        const sMs = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
        const eMs = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
        return dMs >= sMs && dMs <= eMs;
      });
      return match ? { type: match.type as string } : null;
    });
    const holidayDayInfo = days.map((d) => {
      const ymd = d.toLocaleDateString("en-CA");
      const match = holidays.find((h) => new Date(h.date).toLocaleDateString("en-CA") === ymd);
      return match ? { name: match.name } : null;
    });
    const leaveDayHours = leaveDayInfo.map((i) => (i ? LEAVE_DAY_HOURS : 0));
    const holidayDayHours = holidayDayInfo.map((i) => (i ? HOLIDAY_DAY_HOURS : 0));
    return {
      leaveDayHours,
      holidayDayHours,
      leaveDayInfo,
      holidayDayInfo,
      leaveTotal: leaveDayHours.reduce((s, h) => s + h, 0),
      holidayTotal: holidayDayHours.reduce((s, h) => s + h, 0),
    };
  };

  const fetchApprovals = () => {
    setLoading(true);
    weeklyTimesheetApi
      .getPendingApprovals({ page, limit: 10, status: tab })
      .then((res) => {
        setTimesheets(res.data.data);
        setPagination(res.data.pagination);
        setSelected(new Set());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { fetchApprovals(); }, [page, tab]);

  useEffect(() => {
    leaveApi.getAll({ status: "approved", limit: 1000 }).then((r) => setAllLeaves(r.data.data || [])).catch(() => {});
    const year = new Date().getFullYear();
    Promise.all([holidayApi.getAll(year - 1), holidayApi.getAll(year), holidayApi.getAll(year + 1)])
      .then(([a, b, c]) => setHolidays([...(a.data.data || []), ...(b.data.data || []), ...(c.data.data || [])]))
      .catch(() => {});
  }, []);

  const handleApprove = (id: string) => {
    setActionLoading(id);
    weeklyTimesheetApi.approve(id, "approved")
      .then(() => { toast.success("Timesheet approved"); fetchApprovals(); })
      .catch(() => toast.error("Failed to approve"))
      .finally(() => setActionLoading(null));
  };

  const handleReject = () => {
    if (!rejectId) return;
    if (!rejectComment.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setActionLoading(rejectId);
    weeklyTimesheetApi.approve(rejectId, "rejected", rejectComment.trim())
      .then(() => {
        toast.success("Timesheet rejected");
        setRejectId(null); setRejectComment("");
        fetchApprovals();
      })
      .catch(() => toast.error("Failed to reject"))
      .finally(() => setActionLoading(null));
  };

  const handleBulkApprove = () => {
    if (selected.size === 0) {
      toast.error("Select at least one timesheet");
      return;
    }
    setActionLoading("bulk");
    Promise.all(Array.from(selected).map((id) => weeklyTimesheetApi.approve(id, "approved")))
      .then(() => { toast.success(`${selected.size} timesheet(s) approved`); fetchApprovals(); })
      .catch(() => toast.error("Some approvals failed"))
      .finally(() => setActionLoading(null));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePreview = (id: string) => {
    setPreviewLoading(true);
    weeklyTimesheetApi.getDetail(id)
      .then((res) => setPreviewSheet(res.data.data ?? null))
      .catch(() => toast.error("Failed to load timesheet details"))
      .finally(() => setPreviewLoading(false));
  };

  const handleProjectClick = (projectId: Project | string) => {
    const id = typeof projectId === "object" ? projectId._id : projectId;
    setProjectLoading(true);
    projectApi.getById(id)
      .then((res) => setProjectDetail(res.data.data ?? null))
      .catch(() => toast.error("Failed to load project details"))
      .finally(() => setProjectLoading(false));
  };

  const isPending = tab === "submitted";
  const pendingTotal = pagination?.total ?? (isPending ? timesheets.length : 0);

  // Filter timesheets client-side by employee name/email
  const filteredTimesheets = search.trim()
    ? timesheets.filter((ts) => {
        const q = search.trim().toLowerCase();
        return getUserName(ts.userId).toLowerCase().includes(q) || getUserEmail(ts.userId).toLowerCase().includes(q);
      })
    : timesheets;

  // Aggregate metrics for the visible (filtered) page
  const visibleHours = filteredTimesheets.reduce((s, ts) => s + (ts.totalHours || 0), 0);
  const visibleEntries = filteredTimesheets.reduce((s, ts) => s + ts.entries.length, 0);
  const visibleLeaveHours = filteredTimesheets.reduce((s, ts) => s + overlayFor(ts.userId, ts.weekStart).leaveTotal, 0);
  const visibleHolidayHours = filteredTimesheets.reduce((s, ts) => s + overlayFor(ts.userId, ts.weekStart).holidayTotal, 0);
  const visibleCombined = visibleHours + visibleLeaveHours + visibleHolidayHours;

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* LEFT: identity + KPI chips */}
          <div className="min-w-0 flex-1 lg:max-w-[640px]">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
                <Clock className="h-10 w-10 text-indigo-200" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Manager workspace
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Timesheet <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Approvals</span>
                </h1>
                <p className="mt-1 text-sm text-indigo-200/70">Review and manage employee timesheet submissions</p>
              </div>
            </div>

            {/* KPI chips */}
            {timesheets.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs backdrop-blur-sm ring-1 ${
                  tab === "submitted" ? "bg-amber-500/15 ring-amber-400/30 text-amber-50"
                  : tab === "approved" ? "bg-emerald-500/15 ring-emerald-400/30 text-emerald-50"
                  : "bg-rose-500/15 ring-rose-400/30 text-rose-50"
                }`}>
                  <FileText className="h-3.5 w-3.5 opacity-90" />
                  <span className="opacity-80">{tabs.find((t) => t.key === tab)?.label}</span>
                  <span className="font-mono font-semibold tabular-nums">{pendingTotal}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm" title={`${fmtHours(visibleHours)} work + ${fmtHours(visibleLeaveHours)} leave + ${fmtHours(visibleHolidayHours)} holiday`}>
                  <Clock className="h-3.5 w-3.5 text-indigo-200" />
                  <span className="text-indigo-200/80">Total hours</span>
                  <span className="font-mono font-semibold tabular-nums">{fmtHours(visibleCombined)}</span>
                </span>
                {visibleLeaveHours > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs ring-1 ring-sky-400/30 backdrop-blur-sm">
                    <Plane className="h-3.5 w-3.5 text-sky-200" />
                    <span className="text-sky-100/90">Leave</span>
                    <span className="font-mono font-semibold tabular-nums text-sky-50">{fmtHours(visibleLeaveHours)}</span>
                  </span>
                )}
                {visibleHolidayHours > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs ring-1 ring-amber-400/30 backdrop-blur-sm">
                    <PartyPopper className="h-3.5 w-3.5 text-amber-200" />
                    <span className="text-amber-100/90">Holiday</span>
                    <span className="font-mono font-semibold tabular-nums text-amber-50">{fmtHours(visibleHolidayHours)}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-200" />
                  <span className="text-indigo-200/80">Entries</span>
                  <span className="font-mono font-semibold tabular-nums">{visibleEntries}</span>
                </span>
                {isPending && selected.size > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs ring-1 ring-indigo-400/40 backdrop-blur-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-100" />
                    <span className="text-indigo-100/90">Selected</span>
                    <span className="font-mono font-semibold tabular-nums text-indigo-50">{selected.size}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: action stack */}
          {isPending && selected.size > 0 && (
            <div className="flex w-full shrink-0 flex-col gap-2.5 sm:flex-row lg:w-auto lg:flex-col">
              <button
                onClick={handleBulkApprove}
                disabled={actionLoading === "bulk"}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 active:scale-[0.98] disabled:opacity-60"
              >
                <span className="rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 p-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </span>
                Approve <span className="font-mono tabular-nums">{selected.size}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Bar (tabs + search) ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-white/60 p-1 ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/60 dark:ring-white/[0.03]">
          {tabs.map((t) => {
            const active = tab === t.key;
            const cfg = tsStatusConfig[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition-all sm:flex-none ${
                  active
                    ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by employee name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-xl border border-gray-200/70 bg-white/80 py-2 pl-9 ${search ? "pr-8" : "pr-3"} text-sm text-gray-900 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800/80 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-500 dark:ring-white/[0.03]`}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading approvals...</p>
        </div>
      ) : filteredTimesheets.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <Inbox className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {timesheets.length === 0
              ? `No ${tabs.find((t) => t.key === tab)?.label.toLowerCase()} timesheets`
              : `No matches for "${search}"`}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {timesheets.length === 0
              ? (isPending ? "All submitted timesheets have been reviewed" : `Timesheets will appear here once ${tab}`)
              : "Try a different search or clear the filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTimesheets.map((ts) => {
            const userName = getUserName(ts.userId);
            const userEmail = getUserEmail(ts.userId);
            const sConfig = tsStatusConfig[ts.status] || tsStatusConfig.submitted;
            const start = new Date(ts.weekStart);
            const overlay = overlayFor(ts.userId, ts.weekStart);
            const combinedTotal = ts.totalHours + overlay.leaveTotal + overlay.holidayTotal;

            return (
              <div key={ts._id} className={`${cardCls} p-5`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    {isPending && (
                      <input
                        type="checkbox"
                        checked={selected.has(ts._id)}
                        onChange={() => toggleSelect(ts._id)}
                        className="mt-2 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
                      />
                    )}
                    <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${sConfig.gradient} text-white shadow-lg ring-1 ring-white/10`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                        {start.toLocaleDateString(undefined, { month: "short" })}
                      </p>
                      <p className="font-mono text-lg font-bold tabular-nums leading-none">{start.getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <Avatar name={userName} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sConfig.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                          {sConfig.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(ts.weekStart)} — {formatDate(weekEndFrom(ts.weekStart))}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold tracking-tight text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20" title="Work + Leave + Holiday">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono tabular-nums">{fmtHours(combinedTotal)}</span>
                        </span>
                        {overlay.leaveTotal > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/25">
                            <Plane className="h-3 w-3" />
                            <span className="font-mono tabular-nums">{fmtHours(overlay.leaveTotal)}</span>
                          </span>
                        )}
                        {overlay.holidayTotal > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25">
                            <PartyPopper className="h-3 w-3" />
                            <span className="font-mono tabular-nums">{fmtHours(overlay.holidayTotal)}</span>
                          </span>
                        )}
                        {(overlay.leaveTotal > 0 || overlay.holidayTotal > 0) && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            ({fmtHours(ts.totalHours)} work)
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          <span className="font-mono tabular-nums">{ts.entries.length}</span> {ts.entries.length === 1 ? "row" : "rows"}
                        </span>
                        {ts.submittedAt && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Submitted {formatDate(ts.submittedAt)}
                          </span>
                        )}
                      </div>

                      {/* Projects */}
                      {ts.entries.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={`${labelCls} mr-0.5`}>Projects:</span>
                          {[...new Map(
                            ts.entries.map((e) => {
                              const id = typeof e.projectId === "object" ? (e.projectId as Project)._id : e.projectId;
                              return [id, e.projectId];
                            })
                          ).values()].map((proj, i) => {
                            const id = typeof proj === "object" ? (proj as Project)._id : proj;
                            return (
                              <button
                                key={id || i}
                                onClick={() => handleProjectClick(proj)}
                                className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/20 transition-colors hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20 dark:hover:bg-sky-500/20"
                              >
                                <Briefcase className="h-3 w-3" />
                                {getProjectName(proj)}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {ts.managerComment && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-200/70 bg-rose-50/60 px-3 py-2 dark:border-rose-500/20 dark:bg-rose-500/10">
                          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                          <div>
                            <p className={`${labelCls} text-rose-600 dark:text-rose-400`}>Rejection Reason</p>
                            <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{ts.managerComment}</p>
                          </div>
                        </div>
                      )}

                      {ts.approvedBy && !isPending && (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-300">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          {ts.status === "approved" ? "Approved" : "Reviewed"} by{" "}
                          <span className="font-semibold text-gray-900 dark:text-white">{getUserName(ts.approvedBy)}</span>
                          {ts.approvedAt && (
                            <span className="text-gray-400 dark:text-gray-500">· {formatDate(ts.approvedAt)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start">
                    <button
                      onClick={() => handlePreview(ts._id)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleApprove(ts._id)}
                          disabled={actionLoading === ts._id}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-60 sm:w-auto"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => { setRejectId(ts._id); setRejectComment(""); }}
                          disabled={actionLoading === ts._id}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:bg-gray-900 dark:text-rose-400 dark:hover:bg-rose-500/10 sm:w-auto"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className={`${cardCls} flex items-center justify-between p-3`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Preview Drawer (premium) ── */}
      {(previewSheet || previewLoading) && (() => {
        const psCfg = previewSheet ? (tsStatusConfig[previewSheet.status] || tsStatusConfig.submitted) : tsStatusConfig.submitted;
        const stripeGradient =
          previewSheet?.status === "rejected" ? "from-rose-500 to-pink-600"
          : previewSheet?.status === "approved" ? "from-emerald-500 to-teal-600"
          : "from-amber-500 to-orange-600";
        const projectCount = previewSheet
          ? new Set(previewSheet.entries.map((e) => typeof e.projectId === "object" ? (e.projectId as Project)._id : e.projectId)).size
          : 0;
        const previewOverlay = previewSheet
          ? overlayFor(previewSheet.userId, previewSheet.weekStart)
          : { leaveDayHours: [0,0,0,0,0,0,0], holidayDayHours: [0,0,0,0,0,0,0], leaveDayInfo: [], holidayDayInfo: [], leaveTotal: 0, holidayTotal: 0 };
        const previewCombined = previewSheet ? previewSheet.totalHours + previewOverlay.leaveTotal + previewOverlay.holidayTotal : 0;
        const previewLeaveTypes = Array.from(new Set(previewOverlay.leaveDayInfo.flatMap((i) => (i ? [i.type] : []))));
        const previewHolidayNames = Array.from(new Set(previewOverlay.holidayDayInfo.flatMap((i) => (i ? [i.name] : []))));
        const daysWorked = previewSheet
          ? (() => {
              let count = 0;
              for (let i = 0; i < 7; i++) {
                const hasWork = previewSheet.entries.some((e) => (e.hours?.[i] || 0) > 0);
                const hasLeave = previewOverlay.leaveDayHours[i] > 0;
                const hasHoliday = previewOverlay.holidayDayHours[i] > 0;
                if (hasWork || hasLeave || hasHoliday) count++;
              }
              return count;
            })()
          : 0;
        const userName = previewSheet ? getUserName(previewSheet.userId) : "";
        return (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewSheet(null); }}
        >
          <div
            className="absolute inset-0 animate-backdrop-fade bg-gray-950/60 backdrop-blur-sm"
            onClick={() => setPreviewSheet(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative flex h-full w-full max-w-md animate-drawer-slide-right flex-col overflow-hidden border-l border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10 sm:max-w-3xl sm:rounded-l-3xl"
          >
            {/* Status-keyed left stripe */}
            <span aria-hidden className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${stripeGradient}`} />

            {/* Header */}
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 px-5 pt-6 pb-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:via-gray-900 dark:to-purple-500/10">
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/25 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-purple-400/15 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3.5">
                  {previewSheet ? (
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${paletteFor(userName)} text-base font-semibold text-white shadow-lg shadow-black/[0.08] ring-1 ring-white/15`}>
                      {userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 ring-1 ring-white/15">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">
                      <Sparkles className="h-3 w-3" />
                      Timesheet preview
                    </p>
                    <h2 className="mt-0.5 truncate text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                      {previewSheet ? userName : "Loading…"}
                    </h2>
                    {previewSheet && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <CalendarDays className="h-3 w-3 text-gray-400" />
                        <span className="font-mono tabular-nums">{formatDate(previewSheet.weekStart)} — {formatDate(previewSheet.weekEnd)}</span>
                      </p>
                    )}

                    {/* Header KPI chips */}
                    {previewSheet && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${psCfg.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${psCfg.dot}`} />
                          {psCfg.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/25">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono tabular-nums">{fmtHours(previewCombined)}</span>
                        </span>
                        {previewOverlay.leaveTotal > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/25">
                            <Plane className="h-3 w-3" />
                            <span className="font-mono tabular-nums">{fmtHours(previewOverlay.leaveTotal)}</span> leave
                          </span>
                        )}
                        {previewOverlay.holidayTotal > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25">
                            <PartyPopper className="h-3 w-3" />
                            <span className="font-mono tabular-nums">{fmtHours(previewOverlay.holidayTotal)}</span> holiday
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/25">
                          <Briefcase className="h-3 w-3" />
                          <span className="font-mono tabular-nums">{projectCount}</span>
                          {projectCount === 1 ? " project" : " projects"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25">
                          <CalendarDays className="h-3 w-3" />
                          <span className="font-mono tabular-nums">{daysWorked}</span>
                          {daysWorked === 1 ? " day" : " days"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPreviewSheet(null)}
                  aria-label="Close"
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="premium-scroll flex-1 overflow-y-auto p-5 sm:p-6">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading details...</p>
                </div>
              ) : previewSheet && previewSheet.entries.length === 0 && previewOverlay.leaveTotal === 0 && previewOverlay.holidayTotal === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">No entries in this timesheet.</p>
              ) : previewSheet ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200/70 dark:border-gray-800/80">
                        <th className={`py-2 pr-3 text-left ${labelCls}`}>Project</th>
                        <th className={`py-2 pr-3 text-left ${labelCls}`}>Task</th>
                        <th className={`py-2 pr-3 text-left ${labelCls}`}>Activity</th>
                        {DAY_LABELS.map((d) => (
                          <th key={d} className={`w-12 px-2 py-2 text-center ${labelCls}`}>{d}</th>
                        ))}
                        <th className={`py-2 pl-2 text-right ${labelCls}`}>Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {previewOverlay.leaveTotal > 0 && (
                        <tr className="bg-sky-50/40 dark:bg-sky-500/[0.05]">
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 shadow-sm ring-1 ring-white/15">
                                <Plane className="h-3 w-3 text-white" />
                              </div>
                              <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">Leave</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-sm capitalize text-sky-700 dark:text-sky-300">
                            {previewLeaveTypes.join(", ") || "Time off"}
                          </td>
                          <td className="py-2.5 pr-3 text-sm text-sky-700 dark:text-sky-300">Time off</td>
                          {DAY_LABELS.map((_, di) => {
                            const hrs = previewOverlay.leaveDayHours[di];
                            return (
                              <td key={di} className="px-2 py-2.5 text-center font-mono tabular-nums">
                                {hrs > 0 ? (
                                  <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-100/80 px-1.5 py-0.5 text-xs font-bold text-sky-700 ring-1 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/25">
                                    <Lock className="h-2 w-2" />
                                    {hrs}
                                  </span>
                                ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                              </td>
                            );
                          })}
                          <td className="py-2.5 pl-2 text-right font-mono font-bold tabular-nums tracking-tight text-sky-700 dark:text-sky-300">
                            {previewOverlay.leaveTotal}h
                          </td>
                        </tr>
                      )}
                      {previewOverlay.holidayTotal > 0 && (
                        <tr className="bg-amber-50/40 dark:bg-amber-500/[0.05]">
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-1.5 shadow-sm ring-1 ring-white/15">
                                <PartyPopper className="h-3 w-3 text-white" />
                              </div>
                              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Holiday</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-sm text-amber-700 dark:text-amber-300 truncate" title={previewHolidayNames.join(", ")}>
                            {previewHolidayNames.join(", ") || "Holiday"}
                          </td>
                          <td className="py-2.5 pr-3 text-sm text-amber-700 dark:text-amber-300">Day off</td>
                          {DAY_LABELS.map((_, di) => {
                            const hrs = previewOverlay.holidayDayHours[di];
                            return (
                              <td key={di} className="px-2 py-2.5 text-center font-mono tabular-nums">
                                {hrs > 0 ? (
                                  <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100/80 px-1.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25">
                                    <Lock className="h-2 w-2" />
                                    {hrs}
                                  </span>
                                ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                              </td>
                            );
                          })}
                          <td className="py-2.5 pl-2 text-right font-mono font-bold tabular-nums tracking-tight text-amber-700 dark:text-amber-300">
                            {previewOverlay.holidayTotal}h
                          </td>
                        </tr>
                      )}
                      {previewSheet.entries.map((entry, idx) => {
                        const rowTotal = (entry.hours || []).reduce((s, h) => s + h, 0);
                        return (
                          <tr key={idx}>
                            <td className="py-2.5 pr-3">
                              <button
                                onClick={() => handleProjectClick(entry.projectId)}
                                className="text-left text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                {getProjectName(entry.projectId)}
                              </button>
                            </td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">{entry.task || "—"}</td>
                            <td className="py-2.5 pr-3">
                              <span className="rounded-md border border-gray-200/70 bg-gray-50/80 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300">
                                {entry.activityType || "—"}
                              </span>
                            </td>
                            {DAY_LABELS.map((_, di) => (
                              <td key={di} className="px-2 py-2.5 text-center font-mono tabular-nums text-gray-600 dark:text-gray-400">
                                {entry.hours?.[di] || 0}
                              </td>
                            ))}
                            <td className="py-2.5 pl-2 text-right font-mono font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                              {rowTotal}h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200/70 bg-gradient-to-r from-indigo-50/40 via-transparent to-transparent dark:border-gray-800/80 dark:from-indigo-500/5">
                        <td colSpan={3} className={`py-2.5 pr-3 text-right ${labelCls} text-gray-600 dark:text-gray-300`}>Totals</td>
                        {DAY_LABELS.map((_, di) => {
                          const dayTotal = previewSheet.entries.reduce((s, e) => s + (e.hours?.[di] || 0), 0)
                            + previewOverlay.leaveDayHours[di]
                            + previewOverlay.holidayDayHours[di];
                          return (
                            <td key={di} className="px-2 py-2.5 text-center font-mono text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                              {dayTotal || "—"}
                            </td>
                          );
                        })}
                        <td className="py-2.5 pl-2 text-right">
                          <span className="inline-flex items-center rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 px-2.5 py-0.5 font-mono text-sm font-bold tabular-nums text-white shadow-sm ring-1 ring-white/10">
                            {fmtHours(previewCombined)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  {previewSheet.entries.some((e) => e.notes) && (
                    <div className="mt-4 space-y-2">
                      <p className={labelCls}>Notes</p>
                      {previewSheet.entries
                        .filter((e) => e.notes)
                        .map((e, i) => (
                          <div key={i} className="rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 text-sm text-gray-700 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-300">
                            <span className="font-semibold text-gray-900 dark:text-white">{getProjectName(e.projectId)}:</span>{" "}
                            {e.notes}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {previewSheet && (
              <div className="shrink-0 border-t border-gray-200/70 bg-white/95 px-5 py-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 sm:px-6">
                <div className="flex items-center justify-end gap-2">
                  <span className={`mr-auto inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${psCfg.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${psCfg.dot}`} />
                    {psCfg.label}
                  </span>
                  <button
                    onClick={() => setPreviewSheet(null)}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                  {previewSheet.status === "submitted" && (
                    <>
                      <button
                        onClick={() => { setRejectId(previewSheet._id); setRejectComment(""); setPreviewSheet(null); }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-colors hover:bg-rose-50 dark:border-rose-500/30 dark:bg-gray-900 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => { handleApprove(previewSheet._id); setPreviewSheet(null); }}
                        className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/10 transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl hover:shadow-emerald-500/35 active:scale-[0.98]"
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                        />
                        <span className="relative inline-flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* ── Project Modal ── */}
      {(projectDetail || projectLoading) && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setProjectDetail(null); }}
        >
          <div className="absolute inset-0 animate-backdrop-fade bg-gray-950/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md animate-modal-enter overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-sky-50 to-white p-5 dark:border-gray-800/80 dark:from-sky-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 p-2.5 shadow-lg shadow-sky-500/30 ring-1 ring-white/10">
                    <FolderKanban className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Project Details</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Linked project overview</p>
                  </div>
                </div>
                <button
                  onClick={() => setProjectDetail(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {projectLoading ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
              ) : projectDetail ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">{projectDetail.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{projectDetail.client}</p>
                    </div>
                    {(() => {
                      const cfg = projectStatusConfig[projectDetail.status] || projectStatusConfig.active;
                      return (
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${cfg.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>

                  {projectDetail.description && (
                    <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 p-3 dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Description</p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{projectDetail.description}</p>
                    </div>
                  )}

                  {projectDetail.assignedUsers && projectDetail.assignedUsers.length > 0 && (
                    <div>
                      <p className={`${labelCls} mb-2`}>Members ({projectDetail.assignedUsers.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {projectDetail.assignedUsers.map((u) => {
                          const user = typeof u === "object" ? u : null;
                          if (!user) return null;
                          return (
                            <span
                              key={user._id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/70 bg-gray-50/60 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-300"
                            >
                              <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(user.name || "?")} text-[9px] font-semibold text-white`}>
                                {(user.name || "?").charAt(0).toUpperCase()}
                              </div>
                              {user.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 border-t border-gray-200/70 pt-3 dark:border-gray-800/80">
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-2.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Created By</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                        {typeof projectDetail.createdBy === "object" ? projectDetail.createdBy.name : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-2.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Created</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDate(projectDetail.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end border-t border-gray-200/70 p-4 dark:border-gray-800/80">
              <button
                onClick={() => setProjectDetail(null)}
                className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectId(null); }}
        >
          <div className="absolute inset-0 animate-backdrop-fade bg-gray-950/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md animate-modal-enter overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-rose-50 to-white p-5 dark:border-gray-800/80 dark:from-rose-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-400/25 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 shadow-lg shadow-rose-500/30 ring-1 ring-white/10">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Reject Timesheet</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">The employee will see this comment</p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectId(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <textarea
                rows={3}
                placeholder="Enter rejection reason..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="mb-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectId(null)}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading === rejectId}
                  className="flex-1 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
                >
                  Reject Timesheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
