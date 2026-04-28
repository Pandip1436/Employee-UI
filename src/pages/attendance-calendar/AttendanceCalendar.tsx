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
} from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import { holidayApi } from "../../api/holidayApi";
import { leaveApi } from "../../api/leaveApi";
import type { AttendanceRecord, Holiday, LeaveRequest } from "../../types";

/* ── Status style map ── */
const statusStyles: Record<
  string,
  { bg: string; dot: string; text: string; label: string; ring: string }
> = {
  present: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
    label: "Present",
  },
  late: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/30",
    label: "Late",
  },
  absent: {
    bg: "bg-red-50 dark:bg-red-500/10",
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    ring: "ring-red-500/30",
    label: "Absent",
  },
  "half-day": {
    bg: "bg-orange-50 dark:bg-orange-500/10",
    dot: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    ring: "ring-orange-500/30",
    label: "Half Day",
  },
  "on-leave": {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    ring: "ring-blue-500/30",
    label: "On Leave",
  },
  holiday: {
    bg: "bg-purple-50 dark:bg-purple-500/10",
    dot: "bg-purple-500",
    text: "text-purple-700 dark:text-purple-400",
    ring: "ring-purple-500/30",
    label: "Holiday",
  },
  weekend: {
    bg: "bg-gray-50 dark:bg-gray-800/50",
    dot: "bg-gray-400 dark:bg-gray-500",
    text: "text-gray-500 dark:text-gray-500",
    ring: "ring-gray-400/30",
    label: "Weekend",
  },
};

const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

const labelClasses =
  "text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

/* ── Component ── */
export default function AttendanceCalendar() {
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
      setLoading(false)
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

  /* ── Build calendar grid ── */
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach((r) => recordMap.set(r.date.slice(0, 10), r));

  const holidayMap = new Map<string, Holiday>();
  holidays.forEach((h) => holidayMap.set(h.date.slice(0, 10), h));

  // Expand each approved leave (start..end inclusive) into a per-day map so
  // future/un-backfilled leaves still render on the calendar.
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
    const dow = d.getDay();
    const isFuture = d > today;
    const isToday = isSameDate(key, toDateKey(today));
    const isWeekend = dow === 0 || dow === 6;
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

  /* ── Monthly summary stats ── */
  const stats = {
    present: 0,
    halfDays: 0,
    absent: 0,
    leaves: 0,
    holidays: 0,
  };
  for (let d = 1; d <= daysInMonth; d++) {
    const { status } = getCellInfo(d);
    if (status === "present" || status === "late") stats.present++;
    else if (status === "half-day") stats.halfDays++;
    else if (status === "absent") stats.absent++;
    else if (status === "on-leave") stats.leaves++;
    else if (status === "holiday") stats.holidays++;
  }

  /* ── Detail panel data ── */
  const detailRecord = selectedDay ? recordMap.get(selectedDay) : null;
  const detailHoliday = selectedDay ? holidayMap.get(selectedDay) : null;
  const detailLeave = selectedDay ? leaveMap.get(selectedDay) : null;

  /* ── Detail panel renderer (shared between desktop sidebar & mobile sheet) ── */
  const renderDetail = (showClose: boolean) => {
    if (!selectedDay) return null;
    const dateObj = new Date(selectedDay + "T00:00:00");
    const dayInfo = getCellInfo(dateObj.getDate());

    return (
      <div className="flex flex-col h-full">
        {/* Detail header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className={labelClasses}>Selected Date</p>
            <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {dateObj.toLocaleDateString("en-US", {
                weekday: "short",
                month: "long",
                day: "numeric",
              })}
            </h3>
            {detailHoliday && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-400 ring-1 ring-purple-600/20 dark:ring-purple-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                {detailHoliday.name}
              </div>
            )}
            {!detailHoliday && detailLeave && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-blue-600/20 dark:ring-blue-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {leaveTypeLabel(detailLeave.type)} Leave
              </div>
            )}
          </div>
          {showClose && (
            <button
              onClick={() => setSelectedDay(null)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status badge */}
        {dayInfo.status && (
          <div className="mb-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                statusStyles[dayInfo.status]?.bg ?? ""
              } ${statusStyles[dayInfo.status]?.text ?? ""} ${
                statusStyles[dayInfo.status]?.ring ?? ""
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  statusStyles[dayInfo.status]?.dot ?? ""
                }`}
              />
              {statusStyles[dayInfo.status]?.label ?? dayInfo.status}
            </span>
          </div>
        )}

        {/* Time details */}
        {detailRecord ? (
          <div className="space-y-3 flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                  <span className={labelClasses}>Clock In</span>
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-white">
                  {formatTime(detailRecord.clockIn)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <LogOut className="h-3.5 w-3.5 text-rose-500" />
                  <span className={labelClasses}>Clock Out</span>
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-white">
                  {formatTime(detailRecord.clockOut)}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                <span className={labelClasses}>Total Hours</span>
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-white">
                {detailRecord.totalHours != null
                  ? `${detailRecord.totalHours.toFixed(1)} hours`
                  : "Not available"}
              </p>
            </div>

            {detailRecord.isLate && detailRecord.lateByMinutes && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3.5 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Late by {detailRecord.lateByMinutes} minute
                  {detailRecord.lateByMinutes > 1 ? "s" : ""}
                </p>
              </div>
            )}

            {detailRecord.notes && (
              <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 px-3.5 py-3">
                <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {detailRecord.notes}
                </p>
              </div>
            )}
          </div>
        ) : detailLeave ? (
          <div className="space-y-3 flex-1">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                <span className={labelClasses}>Leave Period</span>
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
                <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  ({detailLeave.days} day{detailLeave.days > 1 ? "s" : ""})
                </span>
              </p>
            </div>
            {detailLeave.reason && (
              <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 px-3.5 py-3">
                <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {detailLeave.reason}
                </p>
              </div>
            )}
          </div>
        ) : !detailHoliday ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-3">
              <CalendarDays className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No attendance data
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {dayInfo.isFuture ? "This date is in the future" : "No record for this date"}
            </p>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Attendance Calendar
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Monthly attendance overview
            </p>
          </div>
        </div>
        <button
          onClick={goToToday}
          className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98]"
        >
          <CalendarDays className="h-4 w-4" />
          Today
        </button>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {[
          { label: "Present", value: stats.present, cls: "text-emerald-600 dark:text-emerald-400" },
          { label: "Half Days", value: stats.halfDays, cls: "text-orange-600 dark:text-orange-400" },
          { label: "Absent", value: stats.absent, cls: "text-red-600 dark:text-red-400" },
          { label: "Leaves", value: stats.leaves, cls: "text-blue-600 dark:text-blue-400" },
          { label: "Holidays", value: stats.holidays, cls: "text-purple-600 dark:text-purple-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 sm:p-4 text-center"
          >
            <p className={`text-lg sm:text-2xl font-bold ${s.cls}`}>
              {s.value}
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Main Layout: Calendar + Detail Panel ── */}
      <div className="flex gap-5">
        {/* Calendar Card */}
        <div className="flex-1 min-w-0 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={prevMonth}
              className="rounded-xl p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {fmtMonth(year, month)}
              </h2>
              <button
                onClick={goToToday}
                className="sm:hidden text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5"
              >
                Go to Today
              </button>
            </div>
            <button
              onClick={nextMonth}
              className="rounded-xl p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
            </div>
          )}

          {!loading && (
            <>
              {/* Weekday headers — full on desktop, single letter on mobile */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS_FULL.map((d, i) => (
                  <div
                    key={d}
                    className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-2"
                  >
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: totalCells }, (_, i) => {
                  const dayNum = i - firstDay + 1;
                  const isOutside = dayNum < 1 || dayNum > daysInMonth;

                  if (isOutside) {
                    return <div key={`empty-${i}`} className="aspect-square" />;
                  }

                  const { key, isToday, isFuture, status, holiday } =
                    getCellInfo(dayNum);
                  const style = status ? statusStyles[status] : null;
                  const isActive = selectedDay === key;

                  return (
                    <button
                      key={key}
                      onClick={() =>
                        setSelectedDay(selectedDay === key ? null : key)
                      }
                      className={`
                        relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-sm border
                        ${
                          isActive
                            ? "border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm shadow-indigo-500/10"
                            : style
                              ? `${style.bg} border-transparent`
                              : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }
                        ${
                          isToday && !isActive
                            ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-gray-900"
                            : ""
                        }
                        ${isFuture ? "text-gray-300 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"}
                      `}
                      title={
                        holiday
                          ? holiday.name
                          : status
                            ? statusStyles[status]?.label
                            : ""
                      }
                    >
                      <span
                        className={`font-semibold text-xs sm:text-sm ${
                          isToday
                            ? "text-indigo-600 dark:text-indigo-400"
                            : isActive
                              ? "text-indigo-700 dark:text-indigo-300"
                              : ""
                        }`}
                      >
                        {dayNum}
                      </span>
                      {style && (
                        <span
                          className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full ${style.dot}`}
                        />
                      )}
                      {/* Holiday name on desktop */}
                      {holiday && (
                        <span className="hidden lg:block absolute bottom-1 left-1 right-1 truncate text-[9px] font-medium text-purple-600 dark:text-purple-400 leading-none">
                          {holiday.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Legend — inline below calendar */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(statusStyles).map(([key, s]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Desktop Detail Sidebar ── */}
        <div className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            {selectedDay ? (
              renderDetail(true)
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
                  <CalendarDays className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Select a date
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Click on a day to view attendance details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Detail Bottom Sheet ── */}
      {selectedDay && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedDay(null)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-xl p-5 pb-8 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Drag handle */}
            <div className="flex justify-center mb-4">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            {renderDetail(true)}
          </div>
        </div>
      )}
    </div>
  );
}
