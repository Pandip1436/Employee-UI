import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Send, ChevronLeft, ChevronRight, Copy, Download, CheckCircle2, XCircle, Lock } from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { projectApi } from "../../api/projectApi";
import { attendanceApi } from "../../api/attendanceApi";
import { holidayApi } from "../../api/holidayApi";
import type { WeeklyTimesheetData, Project, TimesheetEntry, Holiday } from "../../types";
import toast from "react-hot-toast";

const MIN_WEEK_HOURS = 40;
const MAX_DAY_HOURS = 24;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonday(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - ((day + 6) % 7);
  const m = new Date(d);
  m.setDate(diff); m.setHours(0, 0, 0, 0);
  return m;
}

export default function TimesheetWeekly() {
  const [sheet, setSheet] = useState<WeeklyTimesheetData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<{ projectId: string; task: string; activityType: string; hours: number[]; notes: string }[]>([]);
  const [weekDate, setWeekDate] = useState(() => getMonday(new Date()).toLocaleDateString("en-CA"));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activityTypes, setActivityTypes] = useState<string[]>(["Development", "Meeting", "Review", "Testing", "Design", "Other"]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [copying, setCopying] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  const fetchWeek = useCallback(() => {
    weeklyTimesheetApi.getCurrentWeek(weekDate).then((r) => {
      const s = r.data.data!;
      setSheet(s);
      setEntries(s.entries.map((e: TimesheetEntry) => ({
        projectId: typeof e.projectId === "object" ? (e.projectId as Project)._id : e.projectId,
        task: e.task, activityType: e.activityType, hours: [...e.hours], notes: e.notes || "",
      })));
    }).catch(() => { /* interceptor */ });
  }, [weekDate]);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);
  useEffect(() => {
    projectApi.getAll({ limit: 100 }).then((r) => setProjects(r.data.data)).catch(() => { /* interceptor */ });
    weeklyTimesheetApi.getActivityTypes().then((r) => {
      const names = (r.data.data || []).map((a) => a.name);
      if (names.length > 0) setActivityTypes(names);
    }).catch(() => { /* interceptor */ });
    holidayApi.getAll(new Date().getFullYear()).then((r) => setHolidays(r.data.data || [])).catch(() => {});
  }, []);

  // Compute the actual Mon–Sun dates for the active week (from sheet.weekStart or weekDate)
  const weekDates = (() => {
    const start = sheet?.weekStart ? new Date(sheet.weekStart) : new Date(weekDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); d.setHours(0, 0, 0, 0); return d;
    });
  })();

  const isHoliday = (d: Date) => {
    const ymd = d.toLocaleDateString("en-CA");
    return holidays.some((h) => new Date(h.date).toLocaleDateString("en-CA") === ymd);
  };
  const isWeekend = (d: Date) => { const dow = d.getDay(); return dow === 0 || dow === 6; };
  const isFuture = (d: Date) => { const today = new Date(); today.setHours(0,0,0,0); return d > today; };

  const addRow = () => setEntries((p) => [...p, { projectId: projects[0]?._id || "", task: "General", activityType: activityTypes[0], hours: [0,0,0,0,0,0,0], notes: "" }]);
  const removeRow = (i: number) => setEntries((p) => p.filter((_, idx) => idx !== i));
  const updateField = (i: number, field: string, value: string) => setEntries((p) => p.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  const updateHour = (i: number, day: number, value: number) => setEntries((p) => p.map((e, idx) => {
    if (idx !== i) return e;
    const h = [...e.hours]; h[day] = Math.max(0, Math.min(24, value));
    return { ...e, hours: h };
  }));

  const rowTotal = (hours: number[]) => hours.reduce((a, b) => a + b, 0);
  const dayTotal = (day: number) => entries.reduce((s, e) => s + (e.hours[day] || 0), 0);
  const weekTotal = entries.reduce((s, e) => s + rowTotal(e.hours), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await weeklyTimesheetApi.saveEntries(weekDate, entries);
      toast.success("Saved as draft!");
      fetchWeek();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  // ── Validations ──
  const validateForSubmit = (): string | null => {
    if (entries.length === 0) return "Add at least one entry.";

    // No incomplete rows
    for (const e of entries) {
      const total = rowTotal(e.hours);
      if (total > 0 && (!e.projectId || !e.task.trim() || !e.activityType)) {
        return "Each row with hours must have a project, task, and activity.";
      }
    }

    // Per-day cap and no future days
    for (let d = 0; d < 7; d++) {
      const day = dayTotal(d);
      if (day > MAX_DAY_HOURS) return `${DAYS[d]} exceeds ${MAX_DAY_HOURS}h cap.`;
      if (day > 0 && weekDates[d] && isFuture(weekDates[d])) {
        return `Cannot log hours on a future day (${DAYS[d]}).`;
      }
    }

    if (weekTotal < MIN_WEEK_HOURS) {
      return `Weekly total must be at least ${MIN_WEEK_HOURS}h (currently ${weekTotal}h).`;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!sheet) return;
    const err = validateForSubmit();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      await weeklyTimesheetApi.saveEntries(weekDate, entries);
      await weeklyTimesheetApi.submit(sheet._id);
      toast.success("Timesheet submitted!");
      fetchWeek();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  // ── Copy from last week ──
  const copyFromLastWeek = async () => {
    setCopying(true);
    try {
      const prev = new Date(weekDate); prev.setDate(prev.getDate() - 7);
      const r = await weeklyTimesheetApi.getCurrentWeek(prev.toLocaleDateString("en-CA"));
      const last = r.data.data;
      if (!last || last.entries.length === 0) {
        toast.error("No entries found in last week.");
        return;
      }
      setEntries(last.entries.map((e: TimesheetEntry) => ({
        projectId: typeof e.projectId === "object" ? (e.projectId as Project)._id : e.projectId,
        task: e.task, activityType: e.activityType, hours: [0,0,0,0,0,0,0], notes: e.notes || "",
      })));
      toast.success("Copied row structure from last week (hours cleared).");
    } catch { toast.error("Failed to copy last week."); }
    finally { setCopying(false); }
  };

  // ── Auto-fill from attendance clock-in hours ──
  const autoFillFromAttendance = async () => {
    setAutofilling(true);
    try {
      const month = `${weekDates[0].getFullYear()}-${String(weekDates[0].getMonth() + 1).padStart(2, "0")}`;
      const r = await attendanceApi.getMyHistory({ month, limit: 200 });
      const records = r.data.data || [];
      const hoursPerDay = weekDates.map((d) => {
        const ymd = d.toLocaleDateString("en-CA");
        const rec = records.find((x) => new Date(x.date).toLocaleDateString("en-CA") === ymd
          || new Date(x.date).toISOString().split("T")[0] === ymd);
        return rec?.totalHours || 0;
      });
      if (hoursPerDay.every((h) => h === 0)) {
        toast.error("No attendance hours found for this week.");
        return;
      }
      // Add a "General" row pre-filled, or top up the first row
      const firstProject = projects[0]?._id || "";
      setEntries((prev) => {
        if (prev.length === 0) {
          return [{ projectId: firstProject, task: "General", activityType: activityTypes[0], hours: hoursPerDay, notes: "Auto-filled from attendance" }];
        }
        const next = [...prev];
        next[0] = { ...next[0], hours: hoursPerDay };
        return next;
      });
      toast.success("Filled hours from attendance.");
    } catch { toast.error("Failed to read attendance."); }
    finally { setAutofilling(false); }
  };

  const prevWeek = () => { const d = new Date(weekDate); d.setDate(d.getDate() - 7); setWeekDate(d.toLocaleDateString("en-CA")); };
  const nextWeek = () => { const d = new Date(weekDate); d.setDate(d.getDate() + 7); setWeekDate(d.toLocaleDateString("en-CA")); };

  const editable = !sheet || sheet.status === "draft" || sheet.status === "rejected";

  const dayCellStyle = (i: number) => {
    const d = weekDates[i];
    if (!d) return "";
    if (isHoliday(d)) return "bg-blue-50 dark:bg-blue-500/5";
    if (isWeekend(d)) return "bg-gray-100 dark:bg-gray-800/60";
    if (isFuture(d)) return "bg-gray-50 dark:bg-gray-800/30 opacity-60";
    return "";
  };
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const inputCls = "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Timesheet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {sheet?.weekStart ? fmtDate(sheet.weekStart) : ""} — {sheet?.weekEnd ? fmtDate(sheet.weekEnd) : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="rounded-lg p-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px] text-center">
            {sheet?.weekStart ? fmtDate(sheet.weekStart) : "This Week"}
          </span>
          <button onClick={nextWeek} className="rounded-lg p-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"><ChevronRight className="h-4 w-4" /></button>
          {sheet?.status && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              sheet.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
              sheet.status === "rejected" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" :
              sheet.status === "submitted" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
              "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}>{sheet.status}</span>
          )}
        </div>
      </div>

      {/* Status banner */}
      {sheet?.status === "approved" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-emerald-700 dark:text-emerald-400">
            <p className="font-semibold">Approved{sheet.approvedBy?.name ? ` by ${sheet.approvedBy.name}` : ""}</p>
            {sheet.approvedAt && <p className="text-xs mt-0.5">{new Date(sheet.approvedAt).toLocaleString()}</p>}
            <p className="text-xs mt-1 flex items-center gap-1"><Lock className="h-3 w-3" /> This timesheet is locked.</p>
          </div>
        </div>
      )}
      {sheet?.status === "submitted" && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-4 text-sm">
          <Send className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-blue-700 dark:text-blue-400">
            <p className="font-semibold">Submitted — awaiting manager approval</p>
            {sheet.submittedAt && <p className="text-xs mt-0.5">{new Date(sheet.submittedAt).toLocaleString()}</p>}
          </div>
        </div>
      )}
      {sheet?.status === "rejected" && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 p-4 text-sm">
          <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-rose-700 dark:text-rose-400">
            <p className="font-semibold">Rejected — please revise and resubmit</p>
            {sheet.managerComment && <p className="mt-1"><strong>Manager feedback:</strong> {sheet.managerComment}</p>}
          </div>
        </div>
      )}

      {/* Grid — Desktop */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-44">Project</th>
              <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-28">Task</th>
              <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-28">Activity</th>
              {DAYS.map((d, i) => {
                const dt = weekDates[i];
                const holiday = dt && isHoliday(dt);
                const weekend = dt && isWeekend(dt);
                return (
                  <th key={d} className={`px-1 py-3 text-center text-xs font-semibold uppercase tracking-wider w-16 ${dayCellStyle(i)} ${
                    holiday ? "text-blue-600 dark:text-blue-400" : weekend ? "text-gray-400" : "text-gray-500 dark:text-gray-400"
                  }`}>
                    {d}<br/><span className="text-[10px] text-gray-400">{dt?.getDate()} · {dayTotal(i)}h</span>
                  </th>
                );
              })}
              <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 w-16">Total</th>
              {editable && <th className="px-2 py-3 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {entries.length === 0 ? (
              <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">No entries. Click "Add Row" to start.</td></tr>
            ) : entries.map((entry, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-2">
                  {editable ? (
                    <select value={entry.projectId} onChange={(e) => updateField(i, "projectId", e.target.value)} className={inputCls + " w-full"}>
                      <option value="">Select</option>
                      {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-gray-900 dark:text-white font-medium">{projects.find((p) => p._id === entry.projectId)?.name || "—"}</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {editable ? <input value={entry.task} onChange={(e) => updateField(i, "task", e.target.value)} className={inputCls + " w-full"} /> : <span className="text-gray-700 dark:text-gray-300">{entry.task}</span>}
                </td>
                <td className="px-2 py-2">
                  {editable ? (
                    <select value={entry.activityType} onChange={(e) => updateField(i, "activityType", e.target.value)} className={inputCls + " w-full"}>
                      {activityTypes.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  ) : <span className="text-gray-700 dark:text-gray-300">{entry.activityType}</span>}
                </td>
                {DAYS.map((_, d) => {
                  const dt = weekDates[d];
                  const future = dt && isFuture(dt);
                  return (
                    <td key={d} className={`px-1 py-2 text-center ${dayCellStyle(d)}`}>
                      {editable ? (
                        <input type="number" min="0" max="24" step="0.5" disabled={future} value={entry.hours[d] || ""} onChange={(e) => updateHour(i, d, parseFloat(e.target.value) || 0)}
                          className="w-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-center text-sm text-gray-900 dark:text-white py-1.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed" />
                      ) : <span className="text-gray-700 dark:text-gray-300">{entry.hours[d] || "—"}</span>}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{rowTotal(entry.hours)}h</td>
                {editable && (
                  <td className="px-2 py-2">
                    <button onClick={() => removeRow(i)} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <td colSpan={3} className="px-3 py-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Week Total</td>
              {DAYS.map((_, d) => <td key={d} className="px-1 py-3 text-center text-sm font-bold text-gray-700 dark:text-gray-300">{dayTotal(d)}</td>)}
              <td className="px-2 py-3 text-center text-base font-bold text-indigo-600 dark:text-indigo-400">{weekTotal}h</td>
              {editable && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Grid — Mobile cards */}
      <div className="lg:hidden space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-8 text-center text-gray-400">No entries. Tap "Add Row" to start.</div>
        ) : entries.map((entry, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{projects.find((p) => p._id === entry.projectId)?.name || "Select project"}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{rowTotal(entry.hours)}h</span>
                {editable && <button onClick={() => removeRow(i)} className="text-gray-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
            {editable && (
              <div className="grid grid-cols-2 gap-2">
                <select value={entry.projectId} onChange={(e) => updateField(i, "projectId", e.target.value)} className={inputCls}>
                  <option value="">Project</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <select value={entry.activityType} onChange={(e) => updateField(i, "activityType", e.target.value)} className={inputCls}>
                  {activityTypes.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d, di) => (
                <div key={d} className="text-center">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase mb-1">{d}</p>
                  {editable ? (
                    <input type="number" min="0" max="24" step="0.5" value={entry.hours[di] || ""} onChange={(e) => updateHour(i, di, parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-center text-sm py-2 outline-none focus:border-indigo-500" />
                  ) : (
                    <p className="text-sm font-semibold text-gray-900 dark:text-white py-2">{entry.hours[di] || "—"}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {/* Mobile total */}
        <div className="rounded-xl border-2 border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-4 text-center">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-semibold">Week Total</p>
          <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{weekTotal}h</p>
        </div>
      </div>

      {/* Actions */}
      {editable && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <button onClick={addRow} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Plus className="h-4 w-4" /> Add Row
          </button>
          <button onClick={copyFromLastWeek} disabled={copying} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">
            <Copy className="h-4 w-4" /> {copying ? "Copying..." : "Copy from Last Week"}
          </button>
          <button onClick={autoFillFromAttendance} disabled={autofilling} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">
            <Download className="h-4 w-4" /> {autofilling ? "Filling..." : "Auto-fill from Attendance"}
          </button>
          <div className="flex-1" />
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <Send className="h-4 w-4" /> {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}
