import { useState, useEffect, useMemo } from "react";
import {
  Plus, Trash2, X, Star, Building, Globe, ChevronLeft, ChevronRight,
  PartyPopper, CalendarDays, List, LayoutGrid, Sparkles, Sun, Coffee, Loader2,
} from "lucide-react";
import { holidayApi } from "../../api/holidayApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import type { Holiday } from "../../types";
import toast from "react-hot-toast";

const typeStyle: Record<string, { bg: string; dot: string; icon: typeof Globe; gradient: string }> = {
  public: {
    bg: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
    icon: Globe,
    gradient: "from-emerald-500 to-teal-600",
  },
  restricted: {
    bg: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    dot: "bg-amber-500",
    icon: Star,
    gradient: "from-amber-500 to-orange-600",
  },
  company: {
    bg: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    dot: "bg-sky-500",
    icon: Building,
    gradient: "from-sky-500 to-blue-600",
  },
};

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const cardCls = "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";
const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export default function HolidayCalendar() {
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("public");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const goPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setYear((y) => y - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const goNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setYear((y) => y + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const fetchHolidays = () => {
    holidayApi.getAll(year).then((r) => setHolidays(r.data.data || [])).catch(() => { /* interceptor */ });
  };
  useEffect(() => { fetchHolidays(); }, [year]);

  const handleAdd = async () => {
    if (!name || !date) { toast.error("Name and date required."); return; }
    setSaving(true);
    try {
      await holidayApi.create({ name, date, type, description: desc });
      toast.success("Holiday added!");
      setShowAdd(false); setName(""); setDate(""); setDesc("");
      fetchHolidays();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete holiday?", description: "This holiday will be removed from the calendar for everyone.", confirmLabel: "Delete" }))) return;
    try { await holidayApi.delete(id); toast.success("Deleted."); fetchHolidays(); } catch { /* interceptor */ }
  };

  const holidayByDate = useMemo(() => new Map(holidays.map((h) => [h.date.split("T")[0], h])), [holidays]);

  const todayKey = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, []);

  const sorted = useMemo(
    () => [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [holidays]
  );

  const upcoming = useMemo(() => sorted.filter((h) => new Date(h.date) >= new Date()), [sorted]);
  const nextHoliday = upcoming[0];

  const countsByType = useMemo(() => {
    const acc: Record<string, number> = { public: 0, restricted: 0, company: 0 };
    for (const h of holidays) acc[h.type] = (acc[h.type] ?? 0) + 1;
    return acc;
  }, [holidays]);

  // Days remaining until a holiday (0 = today, negative = past).
  const daysUntil = (dateIso: string): number => {
    const target = new Date(dateIso);
    target.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - t.getTime()) / 86_400_000);
  };

  /** Detect 3+ day weekends formed by a holiday landing on Mon/Fri (and Tue/Thu
   *  when bridged by an adjacent holiday). Returns null when not a long weekend. */
  const longWeekend = (dateIso: string): { length: number; label: string } | null => {
    const d = new Date(dateIso);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    const dateKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const hasHolidayOn = (offsetDays: number) => {
      const x = new Date(d);
      x.setDate(d.getDate() + offsetDays);
      return holidayByDate.has(dateKey(x));
    };

    // Fri (5): Fri + Sat + Sun = 3 days
    if (dow === 5) return { length: 3, label: "3-day weekend" };
    // Mon (1): Sat + Sun + Mon = 3 days
    if (dow === 1) return { length: 3, label: "3-day weekend" };
    // Thu (4) bridged with Fri holiday → Thu/Fri/Sat/Sun = 4 days
    if (dow === 4 && hasHolidayOn(1)) return { length: 4, label: "4-day weekend" };
    // Tue (2) bridged with Mon holiday → Sat/Sun/Mon/Tue = 4 days
    if (dow === 2 && hasHolidayOn(-1)) return { length: 4, label: "4-day weekend" };
    return null;
  };

  const yearOptions = [year - 1, year, year + 1, year + 2];

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
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
              <PartyPopper className="h-10 w-10 text-amber-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                {holidays.length} {holidays.length === 1 ? "holiday" : "holidays"} in {year}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Holiday <span className="bg-gradient-to-r from-amber-200 to-fuchsia-200 bg-clip-text text-transparent">Calendar</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Company holidays, regional observances & restricted days</p>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="flex-1 rounded-xl border-0 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 sm:flex-none"
              >
                {yearOptions.map((y) => <option key={y} value={y} className="bg-gray-900 text-white">{y}</option>)}
              </select>
              <div className="inline-flex flex-1 gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur-sm sm:flex-none">
                {(["list", "calendar"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-label={v === "list" ? "List view" : "Calendar view"}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:flex-none ${
                      view === v
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-indigo-100/80 hover:text-white"
                    }`}
                  >
                    {v === "list" ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                    {v === "list" ? "List" : "Calendar"}
                  </button>
                ))}
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 sm:w-auto"
              >
                <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                  <Plus className="h-3.5 w-3.5 text-white" />
                </span>
                Add Holiday
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Legend / type counts ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(["public", "restricted", "company"] as const).map((k) => {
          const v = typeStyle[k];
          const Icon = v.icon;
          const count = countsByType[k] ?? 0;
          const ringColor =
            k === "public" ? "shadow-emerald-500/30" :
            k === "restricted" ? "shadow-amber-500/30" :
            "shadow-sky-500/30";
          const sub =
            count === 0 ? "None scheduled" :
            count === 1 ? "1 holiday" :
            `${count} holidays`;
          return (
            <div
              key={k}
              className={`${cardCls} group relative overflow-hidden !p-0 transition-all duration-300 hover:-translate-y-0.5`}
            >
              <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${v.gradient}`} />
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${v.gradient} opacity-10 blur-2xl transition-all duration-500 group-hover:opacity-30 group-hover:scale-110`}
              />
              <div
                aria-hidden
                className={`pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${v.gradient} opacity-[0.04] blur-2xl`}
              />
              <div className="relative p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`${labelCls} capitalize`}>{k} holidays</p>
                    <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                      {count}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{sub}</p>
                  </div>
                  <div
                    className={`relative shrink-0 rounded-xl bg-gradient-to-br ${v.gradient} p-2.5 shadow-lg ${ringColor} ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
                    <span aria-hidden className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {view === "list" ? (
        <>
          {/* Next Holiday Spotlight — countdown + long-weekend hint */}
          {nextHoliday && (() => {
            const d = new Date(nextHoliday.date);
            const days = daysUntil(nextHoliday.date);
            const lw = longWeekend(nextHoliday.date);
            const s = typeStyle[nextHoliday.type] || typeStyle.public;
            return (
              <div className={`${cardCls} relative overflow-hidden p-0`}>
                {/* Vivid gradient strip on the left */}
                <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${s.gradient}`} />
                {/* Aurora blobs */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className={`absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gradient-to-br ${s.gradient} opacity-15 blur-3xl`} />
                  <div className="absolute -bottom-16 right-1/3 h-40 w-40 rounded-full bg-indigo-400/15 blur-3xl" />
                </div>
                <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
                  {/* Big date tile */}
                  <div className={`relative flex h-24 w-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${s.gradient} text-white shadow-xl ring-1 ring-white/15 sm:h-28 sm:w-28`}>
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/90">
                      {d.toLocaleDateString(undefined, { month: "short" })}
                    </span>
                    <span className="text-4xl font-bold leading-none sm:text-5xl">{d.getDate()}</span>
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/85">
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                  </div>

                  {/* Countdown + meta */}
                  <div className="min-w-0 flex-1">
                    <p className={labelCls}>
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                        Next holiday
                      </span>
                    </p>
                    <h3 className="mt-1 truncate text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                      {nextHoliday.name}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                      {d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      {nextHoliday.description ? ` · ${nextHoliday.description}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${s.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {nextHoliday.type}
                      </span>
                      {lw && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-50 to-orange-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-500/30 dark:from-amber-500/10 dark:to-orange-500/10 dark:text-amber-300 dark:ring-amber-400/30">
                          <Sun className="h-3 w-3" />
                          {lw.label}
                        </span>
                      )}
                      {days === 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30">
                          <PartyPopper className="h-3 w-3" />
                          Today!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Countdown number */}
                  <div className="shrink-0 rounded-2xl border border-gray-200/70 bg-gradient-to-br from-indigo-50 to-white p-4 text-center ring-1 ring-indigo-500/10 dark:border-gray-800/80 dark:from-indigo-500/10 dark:to-gray-900 dark:ring-indigo-400/20 sm:min-w-[160px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-500/80 dark:text-indigo-400/80">
                      {days === 0 ? "Happening" : days === 1 ? "Tomorrow" : "In"}
                    </p>
                    <p className="mt-1 flex items-baseline justify-center gap-1.5">
                      <span className="font-mono text-4xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                        {days === 0 ? "🎉" : days}
                      </span>
                      {days > 0 && (
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                          day{days === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>
                    {lw && days > 0 && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-300">
                        <Coffee className="h-3 w-3" />
                        Plan ahead
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Upcoming highlight */}
          {upcoming.length > 0 && (
            <div className={`${cardCls} relative overflow-hidden p-5`}>
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-3xl" />
              <div className="relative mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:ring-indigo-400/20">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Holidays</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Next {Math.min(5, upcoming.length)} coming up</p>
                </div>
              </div>
              <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {upcoming.slice(0, 5).map((h) => {
                  const s = typeStyle[h.type] || typeStyle.public;
                  const d = new Date(h.date);
                  const lw = longWeekend(h.date);
                  return (
                    <div
                      key={h._id}
                      className={`group rounded-xl border border-gray-200/70 bg-white/80 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800/80 dark:bg-gray-900/60`}
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-md bg-gradient-to-br ${s.gradient} px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm ring-1 ring-white/10`}>
                          {d.toLocaleDateString(undefined, { month: "short" })} · {d.getDate()}
                        </span>
                        {lw && (
                          <span title={lw.label} className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-amber-100 text-amber-600 ring-1 ring-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30">
                            <Sun className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{h.name}</p>
                      <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{d.toLocaleDateString(undefined, { weekday: "long" })}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="space-y-2">
            {holidays.length === 0 ? (
              <div className={`${cardCls} flex flex-col items-center gap-2 py-12 text-center`}>
                <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                  <CalendarDays className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No holidays for {year}</p>
                {isAdmin && <p className="text-xs text-gray-500 dark:text-gray-400">Add one using the button above</p>}
              </div>
            ) : sorted.map((h) => {
              const s = typeStyle[h.type] || typeStyle.public;
              const d = new Date(h.date);
              const key = h.date.split("T")[0];
              const isToday = key === todayKey;
              const isPast = d < new Date() && !isToday;
              const lw = !isPast ? longWeekend(h.date) : null;
              return (
                <div
                  key={h._id}
                  className={`group flex items-center gap-4 rounded-2xl border border-gray-200/70 bg-white/80 p-3.5 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] ${isPast ? "opacity-70" : ""}`}
                >
                  <div className={`relative flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-lg ring-1 ring-white/10`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                      {d.toLocaleDateString(undefined, { month: "short" })}
                    </p>
                    <p className="text-xl font-bold leading-none">{d.getDate()}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">{h.name}</p>
                      {isToday && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                          <span className="h-1 w-1 rounded-full bg-indigo-500" />
                          Today
                        </span>
                      )}
                      {lw && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-50 to-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:from-amber-500/10 dark:to-orange-500/10 dark:text-amber-300 dark:ring-amber-400/30">
                          <Sun className="h-2.5 w-2.5" />
                          {lw.label}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {d.toLocaleDateString(undefined, { weekday: "long" })}
                      {h.description ? ` · ${h.description}` : ""}
                    </p>
                  </div>
                  <span className={`hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize sm:inline-flex ${s.bg}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {h.type}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(h._id)}
                      aria-label="Delete holiday"
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ── Calendar view ── */
        <div className={`${cardCls} p-5 sm:p-6`}>
          <div className="mb-5 flex items-center justify-between">
            <button
              onClick={goPrevMonth}
              aria-label="Previous month"
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <p className={labelCls}>Viewing</p>
              <p className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">{monthNames[currentMonth]} {year}</p>
            </div>
            <button
              onClick={goNextMonth}
              aria-label="Next month"
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => (
              <div key={d} className={`pb-2 text-[10px] font-semibold uppercase tracking-wider ${i === 0 || i === 6 ? "text-rose-400" : "text-gray-400 dark:text-gray-500"}`}>
                {d}
              </div>
            ))}
            {(() => {
              const firstDay = new Date(year, currentMonth, 1).getDay();
              const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
              const cells: React.ReactNode[] = [];
              for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
              for (let d = 1; d <= daysInMonth; d++) {
                const key = `${year}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const h = holidayByDate.get(key);
                const isToday = key === todayKey;
                const dow = new Date(year, currentMonth, d).getDay();
                const isWeekend = dow === 0 || dow === 6;
                const s = h ? typeStyle[h.type] || typeStyle.public : null;
                cells.push(
                  <div
                    key={d}
                    title={h?.name || ""}
                    className={`group relative flex h-20 flex-col items-start justify-between overflow-hidden rounded-xl p-1.5 text-sm transition-all sm:p-2 ${
                      h
                        ? `border border-transparent bg-gradient-to-br ${s!.gradient} text-white shadow-md ring-1 ring-white/10 hover:scale-[1.02]`
                        : isToday
                        ? "border border-indigo-500/40 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : `border border-gray-200/70 bg-white/60 dark:border-gray-800/80 dark:bg-gray-900/40 ${isWeekend ? "text-rose-400 dark:text-rose-400/80" : "text-gray-700 dark:text-gray-300"} hover:bg-gray-50 dark:hover:bg-gray-800/50`
                    }`}
                  >
                    <span className={`text-[13px] font-bold ${h ? "text-white/95" : ""}`}>{d}</span>
                    {h && (
                      <span className="max-w-full truncate rounded-md bg-white/20 px-1 py-0.5 text-[9px] font-semibold backdrop-blur-sm">
                        {h.name}
                      </span>
                    )}
                    {!h && isToday && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">Today</span>
                    )}
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </div>
      )}

      {/* ── Add Drawer (premium right-side panel) ── */}
      {showAdd && (() => {
        const sType = typeStyle[type] || typeStyle.public;
        const previewDate = date ? new Date(`${date}T00:00:00`) : null;
        const previewLw = date ? longWeekend(date) : null;
        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 animate-backdrop-fade bg-gray-950/60 backdrop-blur-sm"
              onClick={() => setShowAdd(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-holiday-title"
              className="relative flex h-full w-full max-w-md animate-drawer-slide-right flex-col overflow-hidden border-l border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10 sm:max-w-lg sm:rounded-l-3xl"
            >
              {/* Left gradient strip — color follows the selected type */}
              <span aria-hidden className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${sType.gradient}`} />

              {/* ── Header ── */}
              <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 px-5 pt-6 pb-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:via-gray-900 dark:to-purple-500/10">
                <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/25 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-purple-400/15 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className={`rounded-2xl bg-gradient-to-br ${sType.gradient} p-3 shadow-lg shadow-black/[0.08] ring-1 ring-white/15`}>
                      <PartyPopper className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">
                        <Sparkles className="h-3 w-3" />
                        New calendar entry
                      </p>
                      <h2 id="add-holiday-title" className="mt-0.5 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                        Add Holiday
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Visible to everyone in the workspace
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAdd(false)}
                    aria-label="Close"
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* ── Form (scrollable body) ── */}
              <div className="premium-scroll flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                {/* Holiday name */}
                <div>
                  <label className={labelCls}>
                    <span className="inline-flex items-center gap-1.5">
                      <PartyPopper className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                      Holiday name
                    </span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${inputCls} mt-1.5`}
                    placeholder="e.g. Independence Day"
                    autoFocus
                  />
                </div>

                {/* Date */}
                <div>
                  <label className={labelCls}>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3 w-3 text-sky-500 dark:text-sky-400" />
                      Date
                    </span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inputCls} mt-1.5`}
                  />
                </div>

                {/* Type — visual 3-card selector replacing the dropdown */}
                <div>
                  <label className={labelCls}>
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                      Type
                    </span>
                  </label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {(["public", "restricted", "company"] as const).map((k) => {
                      const cfg = typeStyle[k];
                      const Icon = cfg.icon;
                      const active = type === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setType(k)}
                          className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                            active
                              ? "border-transparent shadow-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                              : "border-gray-200/80 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700/80 dark:hover:border-gray-600 dark:hover:bg-gray-800/60"
                          }`}
                          style={
                            active
                              ? {
                                  // Subtle tinted bg + matching ring color via inline because we
                                  // can't synthesize ring colors from the gradient class.
                                  background:
                                    k === "public"
                                      ? "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(20,184,166,0.05))"
                                      : k === "restricted"
                                        ? "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(249,115,22,0.05))"
                                        : "linear-gradient(135deg, rgba(14,165,233,0.10), rgba(37,99,235,0.05))",
                                  boxShadow:
                                    "0 0 0 2px " +
                                    (k === "public"
                                      ? "rgba(16,185,129,0.55)"
                                      : k === "restricted"
                                        ? "rgba(245,158,11,0.55)"
                                        : "rgba(14,165,233,0.55)"),
                                }
                              : undefined
                          }
                        >
                          <div className={`mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${cfg.gradient} text-white shadow-sm ring-1 ring-white/10`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-[12px] font-semibold capitalize text-gray-900 dark:text-white">{k}</p>
                          <p className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">
                            {k === "public"
                              ? "Govt. observed"
                              : k === "restricted"
                                ? "Optional"
                                : "Internal-only"}
                          </p>
                          {active && (
                            <span aria-hidden className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm ring-1 ring-black/5">
                              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className={labelCls}>
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                      Description
                    </span>
                  </label>
                  <input
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className={`${inputCls} mt-1.5`}
                    placeholder="Optional note for employees"
                  />
                </div>

                {/* Live preview — appears only when name + date are filled */}
                {(name || date) && (
                  <div className="rounded-2xl border border-gray-200/70 bg-gradient-to-br from-gray-50 to-white p-3.5 ring-1 ring-black/[0.02] dark:border-gray-800/80 dark:from-gray-800/40 dark:to-gray-900/40 dark:ring-white/[0.02]">
                    <p className={`${labelCls} mb-2.5`}>
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                        Live preview
                      </span>
                    </p>
                    <div className="flex items-center gap-3">
                      {/* Date tile */}
                      <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${sType.gradient} text-white shadow-md ring-1 ring-white/10`}>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-white/90">
                          {previewDate ? previewDate.toLocaleDateString(undefined, { month: "short" }) : "—"}
                        </span>
                        <span className="text-base font-bold leading-none">
                          {previewDate ? previewDate.getDate() : "?"}
                        </span>
                      </div>
                      {/* Name + meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {name || <span className="text-gray-400 dark:text-gray-500">Holiday name…</span>}
                          </p>
                          {previewLw && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-50 to-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:from-amber-500/10 dark:to-orange-500/10 dark:text-amber-300 dark:ring-amber-400/30">
                              <Sun className="h-2.5 w-2.5" />
                              {previewLw.label}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {previewDate
                            ? previewDate.toLocaleDateString(undefined, { weekday: "long", year: "numeric" })
                            : "Pick a date to see how it appears"}
                        </p>
                      </div>
                      {/* Type pill */}
                      <span className={`hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline-flex ${sType.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sType.dot}`} />
                        {type}
                      </span>
                    </div>
                  </div>
                )}

              </div>

              {/* ── Sticky footer ── */}
              <div className="shrink-0 border-t border-gray-200/70 bg-white/95 px-5 py-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 sm:px-6">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={saving || !name || !date}
                    className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative inline-flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {saving ? "Adding…" : "Add Holiday"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
