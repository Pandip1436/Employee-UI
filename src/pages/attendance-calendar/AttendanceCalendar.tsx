import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Clock, LogIn, LogOut, Info } from "lucide-react";
import { attendanceApi } from "../../api/attendanceApi";
import { holidayApi } from "../../api/holidayApi";
import type { AttendanceRecord, Holiday } from "../../types";

/* ── Status style map ── */
const statusStyles: Record<
  string,
  { bg: string; dot: string; text: string; label: string }
> = {
  present: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Present",
  },
  late: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    label: "Late",
  },
  absent: {
    bg: "bg-red-50 dark:bg-red-500/10",
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    label: "Absent",
  },
  "half-day": {
    bg: "bg-orange-50 dark:bg-orange-500/10",
    dot: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    label: "Half Day",
  },
  "on-leave": {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    label: "On Leave",
  },
  holiday: {
    bg: "bg-purple-50 dark:bg-purple-500/10",
    dot: "bg-purple-500",
    text: "text-purple-700 dark:text-purple-400",
    label: "Holiday",
  },
  weekend: {
    bg: "bg-gray-100 dark:bg-gray-800",
    dot: "bg-gray-400",
    text: "text-gray-500 dark:text-gray-500",
    label: "Weekend",
  },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

/* ── Component ── */
export default function AttendanceCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

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

    Promise.all([attendancePromise, holidayPromise]).finally(() =>
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
    setSelectedDay(null);
  };

  /* ── Build calendar grid ── */
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  // Index records by date key
  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach((r) => {
    const key = r.date.slice(0, 10);
    recordMap.set(key, r);
  });

  // Index holidays by date key
  const holidayMap = new Map<string, Holiday>();
  holidays.forEach((h) => {
    const key = h.date.slice(0, 10);
    holidayMap.set(key, h);
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

    let status: string | null = null;
    if (isFuture) status = null;
    else if (holiday) status = "holiday";
    else if (record) status = record.status;
    else if (isWeekend) status = "weekend";

    return { key, isToday, isFuture, isWeekend, holiday, record, status };
  }

  /* ── Detail card data ── */
  const detailKey = selectedDay ?? hoveredDay;
  const detailRecord = detailKey ? recordMap.get(detailKey) : null;
  const detailHoliday = detailKey ? holidayMap.get(detailKey) : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Attendance Calendar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monthly attendance overview
          </p>
        </div>
        <button
          onClick={goToToday}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Today
        </button>
      </div>

      {/* ── Calendar Card ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {fmtMonth(year, month)}
          </h2>
          <button
            onClick={nextMonth}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        )}

        {!loading && (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: totalCells }, (_, i) => {
                const dayNum = i - firstDay + 1;
                const isOutside = dayNum < 1 || dayNum > daysInMonth;

                if (isOutside) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="aspect-square rounded-lg"
                    />
                  );
                }

                const {
                  key,
                  isToday,
                  isFuture,
                  status,
                  holiday,
                } = getCellInfo(dayNum);
                const style = status ? statusStyles[status] : null;
                const isActive = selectedDay === key;

                return (
                  <button
                    key={key}
                    onClick={() =>
                      setSelectedDay(selectedDay === key ? null : key)
                    }
                    onMouseEnter={() => setHoveredDay(key)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`
                      relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all text-sm
                      ${style ? style.bg : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}
                      ${isToday ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-gray-900" : ""}
                      ${isActive ? "ring-2 ring-indigo-400 shadow-lg scale-105" : ""}
                      ${isFuture ? "text-gray-400 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"}
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
                      className={`font-medium text-xs sm:text-sm ${
                        isToday
                          ? "text-indigo-600 dark:text-indigo-400 font-bold"
                          : ""
                      }`}
                    >
                      {dayNum}
                    </span>
                    {style && !isFuture && (
                      <span
                        className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${style.dot}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Detail Card (on hover/click) ── */}
      {detailKey && (detailRecord || detailHoliday) && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 transition-all animate-in fade-in duration-200">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {new Date(detailKey + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              {detailHoliday && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5 font-medium">
                  {detailHoliday.name}
                  {detailHoliday.type && (
                    <span className="ml-1 text-gray-400 dark:text-gray-500">
                      ({detailHoliday.type})
                    </span>
                  )}
                </p>
              )}
            </div>
            {detailRecord && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  statusStyles[detailRecord.status]?.bg ?? ""
                } ${statusStyles[detailRecord.status]?.text ?? ""}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    statusStyles[detailRecord.status]?.dot ?? ""
                  }`}
                />
                {statusStyles[detailRecord.status]?.label ??
                  detailRecord.status}
              </span>
            )}
          </div>

          {detailRecord && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="text-xs">Clock In</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatTime(detailRecord.clockIn)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="text-xs">Clock Out</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatTime(detailRecord.clockOut)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">Hours</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {detailRecord.totalHours != null
                    ? `${detailRecord.totalHours.toFixed(1)}h`
                    : "--"}
                </p>
              </div>
            </div>
          )}

          {detailRecord?.notes && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
              <Info className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {detailRecord.notes}
              </p>
            </div>
          )}

          {detailRecord?.isLate && detailRecord.lateByMinutes && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Late by {detailRecord.lateByMinutes} minute
              {detailRecord.lateByMinutes > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* ── Legend ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Legend
        </h3>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {Object.entries(statusStyles).map(([key, s]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {s.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-transparent border border-gray-300 dark:border-gray-600" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Future / No Data
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
