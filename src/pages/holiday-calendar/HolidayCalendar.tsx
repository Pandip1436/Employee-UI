import { useState, useEffect, useMemo } from "react";
import {
  Plus, Trash2, X, Star, Building, Globe, ChevronLeft, ChevronRight,
  PartyPopper, CalendarDays, List, LayoutGrid, Sparkles,
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

  const countsByType = useMemo(() => {
    const acc: Record<string, number> = { public: 0, restricted: 0, company: 0 };
    for (const h of holidays) acc[h.type] = (acc[h.type] ?? 0) + 1;
    return acc;
  }, [holidays]);

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
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-xl border-0 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {yearOptions.map((y) => <option key={y} value={y} className="bg-gray-900 text-white">{y}</option>)}
            </select>
            <div className="inline-flex gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur-sm">
              {(["list", "calendar"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-label={v === "list" ? "List view" : "Calendar view"}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
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
            {isAdmin && (
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
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
          return (
            <div key={k} className={`${cardCls} group relative overflow-hidden p-4`}>
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${v.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
              />
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className={`${labelCls} capitalize`}>{k} holidays</p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {countsByType[k] ?? 0}
                  </p>
                </div>
                <div className={`rounded-xl bg-gradient-to-br ${v.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {view === "list" ? (
        <>
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
                  return (
                    <div
                      key={h._id}
                      className={`group rounded-xl border border-gray-200/70 bg-white/80 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800/80 dark:bg-gray-900/60`}
                    >
                      <div className={`mb-2 inline-flex items-center gap-1 rounded-md bg-gradient-to-br ${s.gradient} px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm ring-1 ring-white/10`}>
                        {d.toLocaleDateString(undefined, { month: "short" })} · {d.getDate()}
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
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">{h.name}</p>
                      {isToday && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                          <span className="h-1 w-1 rounded-full bg-indigo-500" />
                          Today
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

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-holiday-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10"
          >
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                    <PartyPopper className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 id="add-holiday-title" className="text-base font-bold text-gray-900 dark:text-white">Add Holiday</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Create a new calendar entry</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdd(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className={`mb-1.5 block ${labelCls}`}>Holiday Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Independence Day" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`mb-1.5 block ${labelCls}`}>Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={`mb-1.5 block ${labelCls}`}>Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                    <option value="public">Public</option>
                    <option value="restricted">Restricted</option>
                    <option value="company">Company</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`mb-1.5 block ${labelCls}`}>Description</label>
                <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} placeholder="Optional note for employees" />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
                >
                  {saving ? "Adding..." : "Add Holiday"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
