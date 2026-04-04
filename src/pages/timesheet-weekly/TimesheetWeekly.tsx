import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { projectApi } from "../../api/projectApi";
import type { WeeklyTimesheetData, Project, TimesheetEntry } from "../../types";
import toast from "react-hot-toast";

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
  const [weekDate, setWeekDate] = useState(() => getMonday(new Date()).toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activityTypes, setActivityTypes] = useState<string[]>(["Development", "Meeting", "Review", "Testing", "Design", "Other"]);

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
  }, []);

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

  const handleSubmit = async () => {
    if (!sheet) return;
    if (entries.length === 0) { toast.error("Add at least one entry."); return; }
    setSubmitting(true);
    try {
      await weeklyTimesheetApi.saveEntries(weekDate, entries);
      await weeklyTimesheetApi.submit(sheet._id);
      toast.success("Timesheet submitted!");
      fetchWeek();
    } catch { /* interceptor */ } finally { setSubmitting(false); }
  };

  const prevWeek = () => { const d = new Date(weekDate); d.setDate(d.getDate() - 7); setWeekDate(d.toISOString().split("T")[0]); };
  const nextWeek = () => { const d = new Date(weekDate); d.setDate(d.getDate() + 7); setWeekDate(d.toISOString().split("T")[0]); };

  const editable = !sheet || sheet.status === "draft" || sheet.status === "rejected";
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

      {/* Rejected comment */}
      {sheet?.status === "rejected" && sheet.managerComment && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-400">
          <strong>Manager feedback:</strong> {sheet.managerComment}
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
              {DAYS.map((d, i) => (
                <th key={d} className="px-1 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-16">
                  {d}<br/><span className="text-[10px] text-gray-400">{dayTotal(i)}h</span>
                </th>
              ))}
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
                {DAYS.map((_, d) => (
                  <td key={d} className="px-1 py-2 text-center">
                    {editable ? (
                      <input type="number" min="0" max="24" step="0.5" value={entry.hours[d] || ""} onChange={(e) => updateHour(i, d, parseFloat(e.target.value) || 0)}
                        className="w-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-center text-sm text-gray-900 dark:text-white py-1.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                    ) : <span className="text-gray-700 dark:text-gray-300">{entry.hours[d] || "—"}</span>}
                  </td>
                ))}
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
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={addRow} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Plus className="h-4 w-4" /> Add Row
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
