import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CalendarDays, Clock, User, Video, Monitor, BookOpen, Radio,
} from "lucide-react";
import toast from "react-hot-toast";
import { learningApi, type TrainingData } from "../../api/learningApi";

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  workshop:  { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/30",  icon: <BookOpen className="h-3.5 w-3.5" /> },
  webinar:   { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/30",   icon: <Radio className="h-3.5 w-3.5" /> },
  classroom: { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/30",  icon: <Monitor className="h-3.5 w-3.5" /> },
  online:    { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", icon: <Video className="h-3.5 w-3.5" /> },
};

function fmtDay(d: string) {
  return new Date(d).getDate();
}

function fmtWeekday(d: string) {
  return new Date(d).toLocaleDateString(undefined, { weekday: "short" });
}

function fmtMonthYear(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function groupByMonth(sessions: TrainingData[]): Map<string, TrainingData[]> {
  const map = new Map<string, TrainingData[]>();
  const sorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const s of sorted) {
    const key = fmtMonthYear(s.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

export default function LearningCalendar() {
  const [sessions, setSessions] = useState<TrainingData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(() => {
    setLoading(true);
    learningApi
      .getCalendar()
      .then((r) => setSessions(r.data.data ?? []))
      .catch(() => toast.error("Failed to load calendar"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const grouped = useMemo(() => groupByMonth(sessions), [sessions]);

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm text-rose-200">Plan your learning journey</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl flex items-center gap-2">
            <CalendarDays className="h-7 w-7" /> Learning Calendar
          </h1>
          <p className="mt-1 text-sm text-rose-200">{sessions.length} upcoming session{sessions.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : sessions.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <CalendarDays className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No upcoming training sessions.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([month, items]) => (
            <div key={month}>
              {/* Month header */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{month}</h2>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                  {items.length} session{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Session cards */}
              <div className="space-y-3">
                {items.map((session) => {
                  const typeStyle = TYPE_STYLES[session.type] ?? TYPE_STYLES.workshop;
                  return (
                    <div key={session._id} className={`${card} flex gap-4 sm:gap-5`}>
                      {/* Date block */}
                      <div className="shrink-0 flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/20">
                        <span className="text-lg sm:text-xl font-bold leading-none">{fmtDay(session.date)}</span>
                        <span className="text-[10px] sm:text-xs font-semibold uppercase opacity-80">{fmtWeekday(session.date)}</span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">{session.title}</h3>
                          <span className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                            {typeStyle.icon} {session.type}
                          </span>
                        </div>
                        {session.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">{session.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" /> {session.conductedBy?.name ?? "—"}
                          </span>
                          {session.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {session.duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
