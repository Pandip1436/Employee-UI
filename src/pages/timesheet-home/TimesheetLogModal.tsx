import { useState, useEffect, type FormEvent } from "react";
import { X } from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { projectApi } from "../../api/projectApi";
import type { Project } from "../../types";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

export default function TimesheetLogModal() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>(["Development", "Meeting", "Review", "Testing", "Other"]);
  const [projectId, setProjectId] = useState("");
  const [task, setTask] = useState("General");
  const [activityType, setActivityType] = useState("Development");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    projectApi.getAll({ limit: 100 }).then((r) => setProjects(r.data.data)).catch(() => { /* interceptor */ });
    weeklyTimesheetApi.getActivityTypes().then((r) => {
      const names = (r.data.data || []).map((a) => a.name);
      if (names.length > 0) setActivityTypes(names);
    }).catch(() => { /* interceptor */ });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectId || !hours) { toast.error("Project and hours are required."); return; }
    setSaving(true);
    try {
      // Get current week for the date, add entry
      const weekRes = await weeklyTimesheetApi.getCurrentWeek(date);
      const sheet = weekRes.data.data!;
      const dayOfWeek = (new Date(date).getDay() + 6) % 7; // 0=Mon, 6=Sun
      const newEntry = {
        projectId, task, activityType,
        hours: [0,0,0,0,0,0,0].map((_, i) => i === dayOfWeek ? parseFloat(hours) : 0),
        notes,
      };
      const existingEntries = sheet.entries.map((e: any) => ({
        projectId: typeof e.projectId === "object" ? e.projectId._id : e.projectId,
        task: e.task, activityType: e.activityType, hours: [...e.hours], notes: e.notes || "",
      }));
      await weeklyTimesheetApi.saveEntries(date, [...existingEntries, newEntry]);
      toast.success("Time logged!");
      navigate("/timesheet");
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Log time for a specific date</p>
        </div>
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
        <div><label className={labelCls}>Project</label>
          <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
            <option value="">Select project</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name} — {p.client}</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Task</label><input value={task} onChange={(e) => setTask(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Activity</label>
            <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className={inputCls}>
              {activityTypes.map((a) => <option key={a} value={a}>{a}</option>)}
            </select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Date</label><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Hours</label><input type="number" required min="0.5" max="24" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} className={inputCls} placeholder="0" /></div>
        </div>
        <div><label className={labelCls}>Notes</label><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="What did you work on?" /></div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving..." : "Log Time"}</button>
        </div>
      </form>
    </div>
  );
}
