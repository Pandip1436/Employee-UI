import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Trash2,
  History,
  Sparkles,
  ArrowRight,
  Search,
  ArrowUpDown,
  TrendingUp,
  CheckCircle2,
  Layers,
  Briefcase,
  PlusCircle,
  X,
  Plane,
  PartyPopper,
} from "lucide-react";
import toast from "react-hot-toast";
import { fmtHours } from "../../utils/format";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { leaveApi } from "../../api/leaveApi";
import { holidayApi } from "../../api/holidayApi";
import type { WeeklyTimesheetData, Pagination, TimesheetEntry, Project, LeaveRequest, Holiday } from "../../types";
import { useConfirm } from "../../context/ConfirmContext";
import TimesheetDetailDrawer from "./TimesheetDetailDrawer";

const LEAVE_DAY_HOURS: number = 9;
const HOLIDAY_DAY_HOURS: number = 9;

/* ── Status config ── */
type StatusKey = "draft" | "submitted" | "approved" | "rejected";
const statusConfig: Record<StatusKey, { dot: string; badge: string; label: string; gradient: string; ring: string }> = {
  draft: {
    dot: "bg-gray-400",
    badge:
      "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    label: "Draft",
    gradient: "from-gray-500 to-gray-600",
    ring: "ring-gray-400/40",
  },
  submitted: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    label: "Submitted",
    gradient: "from-amber-500 to-orange-600",
    ring: "ring-amber-400/40",
  },
  approved: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    label: "Approved",
    gradient: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-400/40",
  },
  rejected: {
    dot: "bg-rose-500",
    badge:
      "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    label: "Rejected",
    gradient: "from-rose-500 to-pink-600",
    ring: "ring-rose-400/40",
  },
};

const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatShortDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const weekEndFrom = (weekStart: string) => {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return end;
};

const getProjectName = (entry: TimesheetEntry): string => {
  if (typeof entry.projectId === "object" && entry.projectId !== null) {
    return (entry.projectId as Project).name;
  }
  return String(entry.projectId);
};

const dayTotals = (entries: TimesheetEntry[]): number[] => {
  const days = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) {
    for (let i = 0; i < 7; i++) days[i] += e.hours?.[i] ?? 0;
  }
  return days;
};

const uniqueProjects = (entries: TimesheetEntry[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of entries) {
    const n = getProjectName(e);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
};

type SortKey = "recent" | "oldest" | "hours-desc" | "hours-asc";

/* ── Weekday mini chart ── */
function WeekdayBars({
  entries,
  leaveDayHours = [0, 0, 0, 0, 0, 0, 0],
  holidayDayHours = [0, 0, 0, 0, 0, 0, 0],
}: {
  entries: TimesheetEntry[];
  leaveDayHours?: number[];
  holidayDayHours?: number[];
}) {
  const work = dayTotals(entries);
  const combined = work.map((h, i) => h + leaveDayHours[i] + holidayDayHours[i]);
  const max = Math.max(...combined, 1);
  return (
    <div className="flex items-end gap-[3px]" aria-hidden>
      {combined.map((total, i) => {
        const w = work[i], lv = leaveDayHours[i], hol = holidayDayHours[i];
        const isWeekend = i >= 5;
        const segPct = (v: number) => (total > 0 ? Math.max(v > 0 ? 8 : 0, (v / max) * 100) : 0);
        const tip = [
          w > 0 ? `Work ${fmtHours(w)}` : null,
          lv > 0 ? `Leave ${fmtHours(lv)}` : null,
          hol > 0 ? `Holiday ${fmtHours(hol)}` : null,
        ].filter(Boolean).join(" · ") || "—";
        return (
          <div key={i} className="flex w-3 flex-col items-center gap-0.5">
            <div className="flex h-7 w-full flex-col-reverse overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800" title={`${DAY_LABELS[i]}: ${tip}`}>
              {w > 0 && (
                <div
                  className={`w-full transition-all ${
                    isWeekend
                      ? "bg-gradient-to-t from-fuchsia-500 to-indigo-500"
                      : "bg-gradient-to-t from-indigo-500 to-sky-500"
                  }`}
                  style={{ height: `${segPct(w)}%` }}
                />
              )}
              {lv > 0 && (
                <div className="w-full bg-gradient-to-t from-sky-400 to-blue-500 transition-all" style={{ height: `${segPct(lv)}%` }} />
              )}
              {hol > 0 && (
                <div className="w-full bg-gradient-to-t from-amber-400 to-orange-500 transition-all" style={{ height: `${segPct(hol)}%` }} />
              )}
            </div>
            <span className="text-[8px] font-semibold leading-none text-gray-400 dark:text-gray-500">
              {DAY_LABELS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Skeleton row ── */
function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className={`${cardCls} divide-y divide-gray-100 overflow-hidden p-0 dark:divide-gray-800`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-4">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-200 dark:bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-48 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-2.5 w-32 rounded bg-gray-100 dark:bg-gray-800/70" />
          </div>
          <div className="hidden h-7 w-28 rounded bg-gray-200 dark:bg-gray-800 sm:block" />
          <div className="hidden h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-800 md:block" />
          <div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

export default function TimesheetHistory() {
  const [timesheets, setTimesheets] = useState<WeeklyTimesheetData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const confirm = useConfirm();

  // Compute the 7-day leave + holiday hours arrays for any given weekStart.
  const overlayFor = (weekStart: string | Date) => {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    const leaveDayHours = days.map((d) => {
      const dMs = d.getTime();
      const onLeave = leaves.some((l) => {
        if (l.status !== "approved") return false;
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        const sMs = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
        const eMs = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
        return dMs >= sMs && dMs <= eMs;
      });
      return onLeave ? LEAVE_DAY_HOURS : 0;
    });
    const holidayDayHours = days.map((d) => {
      const ymd = d.toLocaleDateString("en-CA");
      return holidays.some((h) => new Date(h.date).toLocaleDateString("en-CA") === ymd)
        ? HOLIDAY_DAY_HOURS
        : 0;
    });
    return {
      leaveDayHours,
      holidayDayHours,
      leaveTotal: leaveDayHours.reduce((s, h) => s + h, 0),
      holidayTotal: holidayDayHours.reduce((s, h) => s + h, 0),
    };
  };

  const requestDelete = async (id: string, range: string) => {
    const ok = await confirm({
      title: "Delete timesheet?",
      description: (
        <>
          You're about to delete the timesheet for{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{range}</span>. This action
          cannot be undone.
        </>
      ),
      confirmLabel: "Delete",
      cancelLabel: "Keep",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await weeklyTimesheetApi.delete(id);
      toast.success("Timesheet deleted.");
      setTimesheets((prev) => prev.filter((t) => t._id !== id));
    } catch {
      // interceptor
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (status: string) => status === "draft" || status === "rejected";

  const fetchHistory = () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: pageSize };
    if (statusFilter) params.status = statusFilter;

    weeklyTimesheetApi
      .getHistory(params)
      .then((res) => {
        setTimesheets(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter, pageSize]);

  useEffect(() => {
    fetchHistory();
  }, [page, statusFilter, pageSize]);

  useEffect(() => {
    leaveApi.getMyLeaves({ status: "approved", limit: 500 }).then((r) => setLeaves(r.data.data || [])).catch(() => {});
    const year = new Date().getFullYear();
    Promise.all([holidayApi.getAll(year - 1), holidayApi.getAll(year), holidayApi.getAll(year + 1)])
      .then(([a, b, c]) => setHolidays([...(a.data.data || []), ...(b.data.data || []), ...(c.data.data || [])]))
      .catch(() => {});
  }, []);

  /* ── Derived: search + sort applied to the current page ── */
  const visible = useMemo(() => {
    let list = [...timesheets];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((ts) => {
        const range = `${formatDate(ts.weekStart)} ${formatDate(weekEndFrom(ts.weekStart))}`.toLowerCase();
        if (range.includes(q)) return true;
        return ts.entries.some(
          (e) =>
            getProjectName(e).toLowerCase().includes(q) ||
            (e.task ?? "").toLowerCase().includes(q) ||
            (e.activityType ?? "").toLowerCase().includes(q),
        );
      });
    }
    switch (sort) {
      case "oldest":
        list.sort((a, b) => +new Date(a.weekStart) - +new Date(b.weekStart));
        break;
      case "hours-desc":
        list.sort((a, b) => b.totalHours - a.totalHours);
        break;
      case "hours-asc":
        list.sort((a, b) => a.totalHours - b.totalHours);
        break;
      default:
        list.sort((a, b) => +new Date(b.weekStart) - +new Date(a.weekStart));
    }
    return list;
  }, [timesheets, search, sort]);

  /* ── Derived KPIs from current page ── */
  const kpis = useMemo(() => {
    const total = timesheets.length;
    const totalHours = timesheets.reduce((s, t) => s + (t.totalHours || 0), 0);
    const avg = total ? totalHours / total : 0;
    const decided = timesheets.filter((t) => t.status === "approved" || t.status === "rejected").length;
    const approved = timesheets.filter((t) => t.status === "approved").length;
    const approvalRate = decided ? Math.round((approved / decided) * 100) : null;
    const counts: Record<string, number> = {
      "": total,
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    };
    timesheets.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return { total, totalHours, avg, approvalRate, counts };
  }, [timesheets]);

  const statusTabs: Array<{ key: ""; label: string } | { key: StatusKey; label: string }> = [
    { key: "", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "submitted", label: "Submitted" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <History className="h-10 w-10 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Your submission log
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Timesheet{" "}
                <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">
                  History
                </span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">
                Every weekly timesheet you've submitted, all in one place
              </p>
            </div>
          </div>
          <Link
            to="/timesheet"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/15"
          >
            <PlusCircle className="h-4 w-4" />
            New timesheet
          </Link>
        </div>

        {/* KPI strip */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              icon: <Layers className="h-4 w-4" />,
              label: "Submissions",
              value: pagination?.total ?? kpis.total,
              hint: pagination ? `across ${pagination.pages} ${pagination.pages === 1 ? "page" : "pages"}` : "on this page",
            },
            {
              icon: <Clock className="h-4 w-4" />,
              label: "Hours (page)",
              value: fmtHours(kpis.totalHours),
              hint: `${kpis.total} ${kpis.total === 1 ? "week" : "weeks"} loaded`,
            },
            {
              icon: <TrendingUp className="h-4 w-4" />,
              label: "Avg / week",
              value: fmtHours(kpis.avg),
              hint: "from this page",
            },
            {
              icon: <CheckCircle2 className="h-4 w-4" />,
              label: "Approval rate",
              value: kpis.approvalRate == null ? "—" : `${kpis.approvalRate}%`,
              hint: `${kpis.counts.approved ?? 0} approved`,
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/[0.1]"
            >
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-200/70">
                <span className="text-indigo-200">{k.icon}</span>
                {k.label}
              </div>
              <p className="mt-1 text-lg font-bold tracking-tight sm:text-xl">{k.value}</p>
              <p className="mt-0.5 text-[10px] text-indigo-200/60">{k.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar: status pills + search + sort ── */}
      <div className={`${cardCls} flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {statusTabs.map((t) => {
            const active = statusFilter === t.key;
            const conf = t.key ? statusConfig[t.key] : null;
            return (
              <button
                key={t.key || "all"}
                onClick={() => setStatusFilter(t.key)}
                className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-gray-900 text-white shadow-sm ring-1 ring-gray-900/10 dark:bg-white dark:text-gray-900"
                    : "text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:ring-gray-800 dark:hover:bg-gray-800/60"
                }`}
              >
                {conf && <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />}
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    active
                      ? "bg-white/15 text-white dark:bg-gray-900/10 dark:text-gray-900"
                      : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {kpis.counts[t.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-64 lg:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search week or project..."
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-gray-700 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="relative inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border-0 bg-transparent py-0 text-xs font-semibold text-gray-700 outline-none focus:ring-0 dark:text-gray-200"
            >
              <option value="recent">Most recent</option>
              <option value="oldest">Oldest first</option>
              <option value="hours-desc">Most hours</option>
              <option value="hours-asc">Fewest hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <SkeletonRows count={pageSize <= 5 ? 3 : 5} />
      ) : visible.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-4 ring-1 ring-indigo-200/60 dark:from-indigo-500/10 dark:to-fuchsia-500/10 dark:ring-indigo-400/20">
            <FileText className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {search
              ? "No timesheets match your search"
              : statusFilter
              ? `No ${statusConfig[statusFilter as StatusKey]?.label.toLowerCase()} timesheets`
              : "No timesheets yet"}
          </p>
          <p className="max-w-sm text-xs text-gray-500 dark:text-gray-400">
            {search
              ? "Try a different keyword or clear the search."
              : statusFilter
              ? "Switch to a different status above to see other submissions."
              : "Start logging hours and your weekly submissions will appear here."}
          </p>
          {!search && !statusFilter && (
            <Link
              to="/timesheet"
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Log this week
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <tr>
                    {["Week", "Hours", "Distribution", "Projects", "Status", ""].map((h, i) => (
                      <th
                        key={i}
                        className={`px-5 py-3 ${labelCls} ${i === 5 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {visible.map((ts) => {
                    const sConfig = statusConfig[ts.status as StatusKey] || statusConfig.draft;
                    const start = new Date(ts.weekStart);
                    const projects = uniqueProjects(ts.entries);
                    const overlay = overlayFor(ts.weekStart);
                    const combinedTotal = ts.totalHours + overlay.leaveTotal + overlay.holidayTotal;
                    const metaDate =
                      ts.status === "approved" && ts.approvedAt
                        ? `Approved ${formatShortDate(ts.approvedAt)}`
                        : ts.submittedAt
                        ? `Submitted ${formatShortDate(ts.submittedAt)}`
                        : `Updated ${formatShortDate(ts.updatedAt)}`;
                    return (
                      <tr
                        key={ts._id}
                        className="group transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${sConfig.gradient} text-white shadow-lg ring-1 ring-white/10`}
                            >
                              <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                                {start.toLocaleDateString(undefined, { month: "short" })}
                              </p>
                              <p className="text-sm font-bold leading-none">{start.getDate()}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {formatDate(ts.weekStart)} — {formatDate(weekEndFrom(ts.weekStart))}
                              </p>
                              <p className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                                <CalendarDays className="h-3 w-3" />
                                {metaDate}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                              <Clock className="h-3.5 w-3.5" />
                              {fmtHours(combinedTotal)}
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                              <span>{fmtHours(ts.totalHours)} work</span>
                              {overlay.leaveTotal > 0 && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-sky-50 px-1 py-0.5 font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                                  <Plane className="h-2.5 w-2.5" />
                                  {fmtHours(overlay.leaveTotal)}
                                </span>
                              )}
                              {overlay.holidayTotal > 0 && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                  <PartyPopper className="h-2.5 w-2.5" />
                                  {fmtHours(overlay.holidayTotal)}
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <WeekdayBars entries={ts.entries} leaveDayHours={overlay.leaveDayHours} holidayDayHours={overlay.holidayDayHours} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {projects.slice(0, 2).map((p) => (
                              <span
                                key={p}
                                title={p}
                                className="inline-flex max-w-[140px] items-center gap-1 truncate rounded-md border border-gray-200/70 bg-gray-50/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300"
                              >
                                <Briefcase className="h-2.5 w-2.5 shrink-0 text-gray-400" />
                                <span className="truncate">{p}</span>
                              </span>
                            ))}
                            {projects.length > 2 && (
                              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                +{projects.length - 2}
                              </span>
                            )}
                            {projects.length === 0 && (
                              <span className="text-[11px] italic text-gray-400 dark:text-gray-500">
                                No projects
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${sConfig.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                            {sConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {canDelete(ts.status) && (
                              <button
                                onClick={() =>
                                  requestDelete(
                                    ts._id,
                                    `${formatDate(ts.weekStart)} — ${formatDate(weekEndFrom(ts.weekStart))}`,
                                  )
                                }
                                disabled={deletingId === ts._id}
                                title="Delete"
                                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setDrawerId(ts._id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-500/40 dark:hover:text-indigo-300"
                            >
                              View
                              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="space-y-3 md:hidden">
            {visible.map((ts) => {
              const sConfig = statusConfig[ts.status as StatusKey] || statusConfig.draft;
              const start = new Date(ts.weekStart);
              const projects = uniqueProjects(ts.entries);
              const overlay = overlayFor(ts.weekStart);
              const combinedTotal = ts.totalHours + overlay.leaveTotal + overlay.holidayTotal;
              const metaDate =
                ts.status === "approved" && ts.approvedAt
                  ? `Approved ${formatShortDate(ts.approvedAt)}`
                  : ts.submittedAt
                  ? `Submitted ${formatShortDate(ts.submittedAt)}`
                  : `Updated ${formatShortDate(ts.updatedAt)}`;
              return (
                <div key={ts._id} className={`${cardCls} p-4`}>
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${sConfig.gradient} text-white shadow-lg ring-1 ring-white/10`}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                        {start.toLocaleDateString(undefined, { month: "short" })}
                      </p>
                      <p className="text-sm font-bold leading-none">{start.getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDate(ts.weekStart)} — {formatDate(weekEndFrom(ts.weekStart))}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold ${sConfig.badge}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`} />
                          {sConfig.label}
                        </span>
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {ts.entries.length} {ts.entries.length === 1 ? "entry" : "entries"}
                        </span>
                        {overlay.leaveTotal > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                            <Plane className="h-2.5 w-2.5" />
                            {fmtHours(overlay.leaveTotal)}
                          </span>
                        )}
                        {overlay.holidayTotal > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                            <PartyPopper className="h-2.5 w-2.5" />
                            {fmtHours(overlay.holidayTotal)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-base font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                      {fmtHours(combinedTotal)}
                    </span>
                  </div>

                  <div className="mb-3 flex items-end justify-between gap-3">
                    <WeekdayBars entries={ts.entries} leaveDayHours={overlay.leaveDayHours} holidayDayHours={overlay.holidayDayHours} />
                    <div className="flex flex-1 flex-wrap items-center justify-end gap-1">
                      {projects.slice(0, 2).map((p) => (
                        <span
                          key={p}
                          title={p}
                          className="inline-flex max-w-[120px] items-center gap-1 truncate rounded-md border border-gray-200/70 bg-gray-50/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300"
                        >
                          <Briefcase className="h-2.5 w-2.5 shrink-0 text-gray-400" />
                          <span className="truncate">{p}</span>
                        </span>
                      ))}
                      {projects.length > 2 && (
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          +{projects.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200/70 pt-3 dark:border-gray-800/80">
                    <p className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <CalendarDays className="h-3 w-3" />
                      {metaDate}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {canDelete(ts.status) && (
                        <button
                          onClick={() =>
                            requestDelete(
                              ts._id,
                              `${formatDate(ts.weekStart)} — ${formatDate(weekEndFrom(ts.weekStart))}`,
                            )
                          }
                          disabled={deletingId === ts._id}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      )}
                      <button
                        onClick={() => setDrawerId(ts._id)}
                        className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
                      >
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Pagination ── */}
      {pagination && (pagination.pages > 1 || pagination.total > 5) && !loading && (
        <div className={`${cardCls} flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span>
            </p>
            <div className="hidden items-center gap-1.5 sm:flex">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Per page
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-gray-700 outline-none focus:border-indigo-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <TimesheetDetailDrawer
        open={drawerId !== null}
        weekId={drawerId}
        onClose={() => setDrawerId(null)}
      />
    </div>
  );
}
