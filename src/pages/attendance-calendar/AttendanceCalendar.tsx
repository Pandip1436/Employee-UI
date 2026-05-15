import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  Info,
  CalendarDays,
  AlertCircle,
  X,
  CheckCircle2,
  CalendarRange,
  Palmtree,
  Coffee,
  TrendingUp,
} from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import { holidayApi } from "../../api/holidayApi";
import { leaveApi } from "../../api/leaveApi";
import { useCompany } from "../../context/CompanyContext";
import type { AttendanceRecord, Holiday, LeaveRequest } from "../../types";
import { fmtHours } from "../../utils/format";

/* ── Status style map ── */
const statusStyles: Record<
  string,
  {
    bg: string;
    dot: string;
    text: string;
    label: string;
    ring: string;
    gradient: string;
    cell: string;
  }
> = {
  present: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
    gradient: "from-emerald-500 to-teal-600",
    cell:
      "bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-transparent dark:from-emerald-500/15 dark:via-emerald-500/5 dark:to-transparent ring-1 ring-inset ring-emerald-400/30 dark:ring-emerald-400/20",
    label: "Present",
  },
  late: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/30",
    gradient: "from-amber-500 to-orange-600",
    cell:
      "bg-gradient-to-br from-amber-50 via-amber-50/60 to-transparent dark:from-amber-500/15 dark:via-amber-500/5 dark:to-transparent ring-1 ring-inset ring-amber-400/30 dark:ring-amber-400/20",
    label: "Late",
  },
  absent: {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    ring: "ring-rose-500/30",
    gradient: "from-rose-500 to-pink-600",
    cell:
      "bg-gradient-to-br from-rose-50 via-rose-50/60 to-transparent dark:from-rose-500/15 dark:via-rose-500/5 dark:to-transparent ring-1 ring-inset ring-rose-400/30 dark:ring-rose-400/20",
    label: "Absent",
  },
  "half-day": {
    bg: "bg-orange-50 dark:bg-orange-500/10",
    dot: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    ring: "ring-orange-500/30",
    gradient: "from-orange-500 to-amber-600",
    cell:
      "bg-gradient-to-br from-orange-50 via-orange-50/60 to-transparent dark:from-orange-500/15 dark:via-orange-500/5 dark:to-transparent ring-1 ring-inset ring-orange-400/30 dark:ring-orange-400/20",
    label: "Half Day",
  },
  "on-leave": {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    ring: "ring-blue-500/30",
    gradient: "from-blue-500 to-indigo-600",
    cell:
      "bg-gradient-to-br from-blue-50 via-blue-50/60 to-transparent dark:from-blue-500/15 dark:via-blue-500/5 dark:to-transparent ring-1 ring-inset ring-blue-400/30 dark:ring-blue-400/20",
    label: "On Leave",
  },
  holiday: {
    bg: "bg-purple-50 dark:bg-purple-500/10",
    dot: "bg-purple-500",
    text: "text-purple-700 dark:text-purple-400",
    ring: "ring-purple-500/30",
    gradient: "from-purple-500 to-fuchsia-600",
    cell:
      "bg-gradient-to-br from-purple-50 via-purple-50/60 to-transparent dark:from-purple-500/15 dark:via-purple-500/5 dark:to-transparent ring-1 ring-inset ring-purple-400/30 dark:ring-purple-400/20",
    label: "Holiday",
  },
  weekend: {
    bg: "bg-gray-50 dark:bg-gray-800/40",
    dot: "bg-gray-400 dark:bg-gray-500",
    text: "text-gray-500 dark:text-gray-500",
    ring: "ring-gray-400/30",
    gradient: "from-gray-500 to-gray-600",
    cell:
      "bg-gradient-to-br from-gray-50/80 to-transparent dark:from-gray-800/40 dark:to-transparent ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/40",
    label: "Weekend",
  },
};

const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

/* ── Helpers ── */
function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtMonth(year: number, month: number) {
  return new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(iso: string | null) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function isSameDate(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: "Personal",
  sick: "Sick",
  earned: "Earned",
  unpaid: "Unpaid",
  compoff: "Comp-Off",
};

function leaveTypeLabel(type: string) {
  return LEAVE_TYPE_LABELS[type] ?? type;
}

/* ── Component ── */
export default function AttendanceCalendar() {
  const { isWorkingDay } = useCompany();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  /* ── Data fetching ── */
  const fetchData = useCallback(() => {
    setLoading(true);
    const monthStr = `${year}-${pad(month + 1)}`;

    const attendancePromise = attendanceApi
      .getMyHistory({ month: monthStr, limit: 50 })
      .then((res) => setRecords(res.data.data ?? []))
      .catch(() => {});

    const holidayPromise = holidayApi
      .getAll(year)
      .then((res) => setHolidays(res.data.data ?? []))
      .catch(() => {});

    const leavePromise = leaveApi
      .getMyLeaves({ status: "approved", limit: 100 })
      .then((res) => setLeaves(res.data.data ?? []))
      .catch(() => {});

    Promise.all([attendancePromise, holidayPromise, leavePromise]).finally(() =>
      setLoading(false),
    );
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Navigation ── */
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(toDateKey(today));
  };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  /* ── Build calendar grid ── */
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach((r) => recordMap.set(r.date.slice(0, 10), r));

  const holidayMap = new Map<string, Holiday>();
  holidays.forEach((h) => holidayMap.set(h.date.slice(0, 10), h));

  const leaveMap = new Map<string, LeaveRequest>();
  leaves.forEach((lv) => {
    const start = new Date(lv.startDate.slice(0, 10) + "T00:00:00");
    const end = new Date(lv.endDate.slice(0, 10) + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      leaveMap.set(toDateKey(d), lv);
    }
  });

  /* ── Resolve cell status ── */
  function getCellInfo(dayNum: number) {
    const d = new Date(year, month, dayNum);
    const key = toDateKey(d);
    const isFuture = d > today;
    const isToday = isSameDate(key, toDateKey(today));
    const isWeekend = !isWorkingDay(d);
    const holiday = holidayMap.get(key);
    const record = recordMap.get(key);
    const leave = leaveMap.get(key);

    let status: string | null = null;
    if (holiday) status = "holiday";
    else if (record) status = record.status;
    else if (leave) status = "on-leave";
    else if (isFuture) status = null;
    else if (isWeekend) status = "weekend";

    return { key, isToday, isFuture, isWeekend, holiday, record, leave, status };
  }

  /* ── Monthly stats ── */
  const stats = { present: 0, late: 0, halfDays: 0, absent: 0, leaves: 0, holidays: 0, workingDays: 0, totalHours: 0, hoursCount: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const info = getCellInfo(d);
    if (info.status === "present" || info.status === "late") stats.present++;
    if (info.status === "late") stats.late++;
    else if (info.status === "half-day") stats.halfDays++;
    else if (info.status === "absent") stats.absent++;
    else if (info.status === "on-leave") stats.leaves++;
    else if (info.status === "holiday") stats.holidays++;
    if (!info.isWeekend && !info.holiday) stats.workingDays++;
    if (info.record?.totalHours) {
      stats.totalHours += info.record.totalHours;
      stats.hoursCount++;
    }
  }
  const attendanceRate =
    stats.workingDays > 0
      ? Math.round(((stats.present + stats.halfDays * 0.5) / stats.workingDays) * 100)
      : 0;
  const avgDailyHours = stats.hoursCount > 0 ? stats.totalHours / stats.hoursCount : 0;

  /* ── Detail panel data ── */
  const detailRecord = selectedDay ? recordMap.get(selectedDay) : null;
  const detailHoliday = selectedDay ? holidayMap.get(selectedDay) : null;
  const detailLeave = selectedDay ? leaveMap.get(selectedDay) : null;

  /* ── Detail panel renderer ── */
  const renderDetail = (showClose: boolean) => {
    if (!selectedDay) return null;
    const dateObj = new Date(selectedDay + "T00:00:00");
    const dayInfo = getCellInfo(dateObj.getDate());
    const style = dayInfo.status ? statusStyles[dayInfo.status] : null;

    return (
      <div className="flex h-full flex-col">
        {/* Panel header with gradient strip */}
        <div className="relative -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl border-b border-gray-200/70 px-5 pb-4 pt-5 dark:border-gray-800/80">
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.08] ${
              style?.gradient ?? "from-indigo-500 to-purple-600"
            }`}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={labelCls}>Selected date</p>
              <h3 className="mt-1 truncate text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                {dateObj.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {dayInfo.status && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      statusStyles[dayInfo.status]?.bg ?? ""
                    } ${statusStyles[dayInfo.status]?.text ?? ""} ring-1 ring-inset ${
                      statusStyles[dayInfo.status]?.ring ?? ""
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${statusStyles[dayInfo.status]?.dot ?? ""}`}
                    />
                    {statusStyles[dayInfo.status]?.label ?? dayInfo.status}
                  </span>
                )}
                {detailHoliday && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/20">
                    <Palmtree className="h-3 w-3" />
                    {detailHoliday.name}
                  </span>
                )}
                {!detailHoliday && detailLeave && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20">
                    <Coffee className="h-3 w-3" />
                    {leaveTypeLabel(detailLeave.type)} leave
                  </span>
                )}
              </div>
            </div>
            {showClose && (
              <button
                onClick={() => setSelectedDay(null)}
                className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {detailRecord ? (
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 p-3.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                  <span className={labelCls}>Clock in</span>
                </div>
                <p className="font-mono text-base font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatTime(detailRecord.clockIn)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 p-3.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <LogOut className="h-3.5 w-3.5 text-rose-500" />
                  <span className={labelCls}>Clock out</span>
                </div>
                <p className="font-mono text-base font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatTime(detailRecord.clockOut)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-purple-50/50 p-3.5 dark:border-indigo-400/20 dark:from-indigo-500/10 dark:to-purple-500/5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                <span className={labelCls}>Total hours</span>
              </div>
              <p className="font-mono text-base font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                {detailRecord.totalHours != null
                  ? fmtHours(detailRecord.totalHours)
                  : "Not available"}
              </p>
            </div>

            {detailRecord.isLate && detailRecord.lateByMinutes && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Late by {detailRecord.lateByMinutes} minute
                  {detailRecord.lateByMinutes > 1 ? "s" : ""}
                </p>
              </div>
            )}

            {detailRecord.notes && (
              <div className="flex items-start gap-2.5 rounded-xl border border-gray-200/70 bg-gray-50/60 px-3.5 py-3 dark:border-gray-800/80 dark:bg-gray-800/40">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {detailRecord.notes}
                </p>
              </div>
            )}
          </div>
        ) : detailLeave ? (
          <div className="flex-1 space-y-3">
            <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-3.5 dark:border-blue-400/20 dark:from-blue-500/10 dark:to-indigo-500/5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5 text-blue-500" />
                <span className={labelCls}>Leave period</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {new Date(detailLeave.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                {" – "}
                {new Date(detailLeave.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                <span className="ml-2 rounded-md bg-white/60 px-1.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  {detailLeave.days} day{detailLeave.days > 1 ? "s" : ""}
                </span>
              </p>
            </div>
            {detailLeave.reason && (
              <div className="flex items-start gap-2.5 rounded-xl border border-gray-200/70 bg-gray-50/60 px-3.5 py-3 dark:border-gray-800/80 dark:bg-gray-800/40">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {detailLeave.reason}
                </p>
              </div>
            )}
          </div>
        ) : detailHoliday ? (
          <div className="flex-1 space-y-3">
            <div className="rounded-xl border border-purple-200/60 bg-gradient-to-br from-purple-50 to-fuchsia-50/50 p-4 text-center dark:border-purple-400/20 dark:from-purple-500/10 dark:to-fuchsia-500/5">
              <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-500/30 ring-1 ring-white/15">
                <Palmtree className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {detailHoliday.name}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Company holiday</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
              <CalendarDays className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              No attendance data
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {dayInfo.isFuture ? "This date is in the future" : "No record for this date"}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Attendance Calendar
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your daily attendance, leaves, and holidays at a glance
            </p>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[160px] rounded-xl border border-gray-200 bg-white px-4 py-2 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {isCurrentMonth ? "This month" : "Viewing"}
            </p>
            <p className="font-mono text-sm font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
              {fmtMonth(year, month)}
            </p>
          </div>
          <button
            onClick={nextMonth}
            className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            disabled={isCurrentMonth}
            className="ml-1 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Today
          </button>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Present",
            value: String(stats.present),
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-600",
            sub: stats.late > 0 ? `${stats.late} late` : undefined,
          },
          {
            label: "Half Days",
            value: String(stats.halfDays),
            icon: Clock,
            gradient: "from-orange-500 to-amber-600",
          },
          {
            label: "Absent",
            value: String(stats.absent),
            icon: AlertCircle,
            gradient: "from-rose-500 to-pink-600",
          },
          {
            label: "Leaves",
            value: String(stats.leaves),
            icon: Coffee,
            gradient: "from-blue-500 to-indigo-600",
          },
          {
            label: "Holidays",
            value: String(stats.holidays),
            icon: Palmtree,
            gradient: "from-purple-500 to-fuchsia-600",
          },
          {
            label: "Attendance",
            value: `${attendanceRate}%`,
            icon: TrendingUp,
            gradient:
              attendanceRate >= 90
                ? "from-emerald-500 to-teal-600"
                : attendanceRate >= 70
                ? "from-amber-500 to-orange-600"
                : "from-rose-500 to-pink-600",
            sub: avgDailyHours > 0 ? `${fmtHours(avgDailyHours)} avg/day` : undefined,
          },
        ].map((s) => (
          <div key={s.label} className={`${cardCls} group relative overflow-hidden p-3.5`}>
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
            />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={labelCls}>{s.label}</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                  {s.value}
                </p>
                {s.sub && (
                  <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-gray-500">
                    {s.sub}
                  </p>
                )}
              </div>
              <div
                className={`shrink-0 rounded-lg bg-gradient-to-br ${s.gradient} p-1.5 shadow-md shadow-black/[0.08] ring-1 ring-white/10`}
              >
                <s.icon className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main layout: Calendar + Detail ── */}
      <div className="flex gap-5">
        {/* Calendar card */}
        <div className={`${cardCls} flex-1 min-w-0 overflow-hidden p-4 sm:p-6`}>
          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
            </div>
          )}

          {!loading && (
            <>
              {/* Weekday headers */}
              <div className="mb-2 grid grid-cols-7">
                {WEEKDAYS_FULL.map((d, i) => {
                  const isWeekendCol = i === 0 || i === 6;
                  return (
                    <div
                      key={d}
                      className={`py-2 text-center text-[11px] font-bold uppercase tracking-wider ${
                        isWeekendCol
                          ? "text-rose-400/80 dark:text-rose-400/60"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      <span className="hidden sm:inline">{d}</span>
                      <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {Array.from({ length: totalCells }, (_, i) => {
                  const dayNum = i - firstDay + 1;
                  const isOutside = dayNum < 1 || dayNum > daysInMonth;

                  if (isOutside) {
                    return <div key={`empty-${i}`} className="aspect-square" />;
                  }

                  const { key, isToday, isFuture, status, holiday, record } = getCellInfo(dayNum);
                  const style = status ? statusStyles[status] : null;
                  const isActive = selectedDay === key;
                  const hours = record?.totalHours;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(selectedDay === key ? null : key)}
                      title={
                        holiday
                          ? holiday.name
                          : status
                          ? statusStyles[status]?.label
                          : ""
                      }
                      className={`group relative flex aspect-square flex-col items-center justify-start gap-0.5 overflow-hidden rounded-xl p-1.5 text-sm transition-all ${
                        isActive
                          ? "scale-[1.02] bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/60 dark:ring-indigo-300/40"
                          : isToday
                          ? "bg-white ring-2 ring-indigo-500 ring-offset-1 hover:scale-[1.02] hover:shadow-md dark:bg-gray-900 dark:ring-indigo-400 dark:ring-offset-gray-900"
                          : style
                          ? `${style.cell} hover:scale-[1.02] hover:shadow-sm`
                          : "border border-transparent text-gray-700 hover:bg-gray-50 hover:shadow-sm dark:text-gray-300 dark:hover:bg-gray-800/50"
                      } ${isFuture && !isActive ? "opacity-50" : ""}`}
                    >
                      {/* Day number row */}
                      <div className="flex w-full items-center justify-between">
                        <span
                          className={`font-mono text-xs font-bold tabular-nums sm:text-sm ${
                            isActive
                              ? "text-white"
                              : isToday
                              ? "text-indigo-600 dark:text-indigo-400"
                              : ""
                          }`}
                        >
                          {dayNum}
                        </span>
                        {style && !isActive && (
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot} shadow-sm`} />
                        )}
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white/80" />}
                      </div>

                      {/* Hours pill (present days, desktop only) */}
                      {hours && hours > 0 && !isActive && (
                        <span
                          className={`mt-auto hidden truncate rounded-md px-1 py-0.5 font-mono text-[9px] font-bold tabular-nums sm:block ${
                            isToday
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                              : "bg-white/60 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300"
                          }`}
                        >
                          {fmtHours(hours)}
                        </span>
                      )}
                      {isActive && hours && hours > 0 && (
                        <span className="mt-auto hidden truncate rounded-md bg-white/20 px-1 py-0.5 font-mono text-[9px] font-bold tabular-nums backdrop-blur-sm sm:block">
                          {fmtHours(hours)}
                        </span>
                      )}

                      {/* Holiday name (desktop large) */}
                      {holiday && !isActive && (
                        <span className="mt-auto hidden truncate text-[9px] font-semibold leading-none text-purple-700 dark:text-purple-300 lg:block">
                          {holiday.name}
                        </span>
                      )}
                      {holiday && isActive && (
                        <span className="mt-auto hidden truncate text-[9px] font-semibold leading-none text-white/90 lg:block">
                          {holiday.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Legend */}
          <div className="mt-6 border-t border-gray-200/70 pt-4 dark:border-gray-800/70">
            <p className={`${labelCls} mb-2`}>Legend</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(statusStyles).map(([key, s]) => (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text} ring-1 ring-inset ${s.ring}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop detail sidebar */}
        <div className="hidden w-80 shrink-0 lg:block">
          <div className={`${cardCls} sticky top-6 p-5`}>
            {selectedDay ? (
              renderDetail(true)
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-gradient-to-br from-indigo-50 to-fuchsia-50 p-4 ring-1 ring-indigo-200/60 dark:from-indigo-500/10 dark:to-fuchsia-500/10 dark:ring-indigo-400/20">
                  <CalendarDays className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Select a date
                </p>
                <p className="mt-1 max-w-[200px] text-xs text-gray-500 dark:text-gray-400">
                  Click any day on the calendar to view its attendance details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm"
            onClick={() => setSelectedDay(null)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] animate-in slide-in-from-bottom overflow-y-auto rounded-t-3xl border-t border-gray-200 bg-white p-5 pb-8 shadow-2xl ring-1 ring-black/5 duration-200 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/10">
            <div className="mb-4 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            {renderDetail(true)}
          </div>
        </div>
      )}
    </div>
  );
}
