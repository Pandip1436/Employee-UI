import { useState, useEffect } from "react";
import { Plus, Trash2, X, Star, Building, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { holidayApi } from "../../api/holidayApi";
import { useAuth } from "../../context/AuthContext";
import type { Holiday } from "../../types";
import toast from "react-hot-toast";

const typeStyle: Record<string, { bg: string; dot: string; icon: typeof Globe }> = {
  public: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500", icon: Globe },
  restricted: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-500", icon: Star },
  company: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", dot: "bg-blue-500", icon: Building },
};

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function HolidayCalendar() {
  const { isAdmin } = useAuth();
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

  const fetchHolidays = () => { holidayApi.getAll(year).then((r) => setHolidays(r.data.data || [])).catch(() => { /* interceptor */ }); };
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
    if (!confirm("Delete this holiday?")) return;
    try { await holidayApi.delete(id); toast.success("Deleted."); fetchHolidays(); } catch { /* interceptor */ }
  };

  // Calendar data
  const holidayByDate = new Map(holidays.map((h) => [h.date.split("T")[0], h]));


  const upcoming = holidays.filter((h) => new Date(h.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Holiday Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Company holidays for {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm">
            {[2024,2025,2026,2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            {(["list","calendar"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${view === v ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
                {v === "list" ? "List" : "Calendar"}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Add
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(typeStyle).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className={`h-2.5 w-2.5 rounded-full ${v.dot}`} /><span className="capitalize">{k}</span>
          </div>
        ))}
      </div>

      {view === "list" ? (
        <>
          {/* Upcoming highlight */}
          {upcoming.length > 0 && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">Upcoming Holidays</p>
              <div className="flex flex-wrap gap-2">
                {upcoming.slice(0, 5).map((h) => (
                  <div key={h._id} className="rounded-lg bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-500/10 px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{h.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(h.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List */}
          <div className="space-y-2">
            {holidays.length === 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400">No holidays found for {year}.</div>
            ) : holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((h) => {
              const s = typeStyle[h.type] || typeStyle.public;
              return (
                <div key={h._id} className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{new Date(h.date).toLocaleDateString(undefined, { month: "short" })}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{new Date(h.date).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{h.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(h.date).toLocaleDateString(undefined, { weekday: "long" })}{h.description ? ` — ${h.description}` : ""}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${s.bg}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{h.type}
                  </span>
                  {isAdmin && (
                    <button onClick={() => handleDelete(h._id)} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Single-month calendar */
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={goPrevMonth} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="h-5 w-5" /></button>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{monthNames[currentMonth]} {year}</p>
            <button onClick={goNextMonth} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="pb-2 text-xs font-semibold text-gray-400 dark:text-gray-500">{d}</div>
            ))}
            {(() => {
              const firstDay = new Date(year, currentMonth, 1).getDay();
              const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
              const cells: React.ReactNode[] = [];
              for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
              for (let d = 1; d <= daysInMonth; d++) {
                const key = `${year}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const h = holidayByDate.get(key);
                cells.push(
                  <div key={d} className={`relative flex h-16 flex-col items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                    h
                      ? "border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                      : "border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`} title={h?.name || ""}>
                    <span className="font-semibold">{d}</span>
                    {h && <span className="mt-0.5 truncate max-w-[90%] text-[10px] font-medium">{h.name}</span>}
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Holiday</h2>
              <button onClick={() => setShowAdd(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Holiday Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
                <div><label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}><option value="public">Public</option><option value="restricted">Restricted</option><option value="company">Company</option></select>
                </div>
              </div>
              <div><label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Description</label><input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                <button onClick={handleAdd} disabled={saving} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "Adding..." : "Add Holiday"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
