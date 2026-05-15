import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  X, Clock, Sparkles, Calendar, FolderKanban, ListChecks, FileText,
  Loader2, Send, Code2, Users, CheckSquare, FlaskConical,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { projectApi } from "../../api/projectApi";
import type { Project } from "../../types";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { fmtHours } from "../../utils/format";

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const labelCls = "mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";
const cardCls = "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03]";

const RECENT_KEY = "timesheet.recentProjects";
const RECENT_MAX = 4;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  if (!id) return;
  const list = loadRecent().filter((p) => p !== id);
  list.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function lastWorkdayIso() {
  const d = new Date();
  // Walk back to the most recent Mon–Fri (excluding today)
  do { d.setDate(d.getDate() - 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString().slice(0, 10);
}

const activityIcons: Record<string, typeof Code2> = {
  Development: Code2,
  Meeting:     Users,
  Review:      CheckSquare,
  Testing:     FlaskConical,
  Other:       Sparkles,
};

const HOUR_PRESETS = [0.5, 1, 2, 4, 8];

export default function TimesheetLogModal() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>(["Development", "Meeting", "Review", "Testing", "Other"]);
  const [recent] = useState<string[]>(() => loadRecent());
  const [projectId, setProjectId] = useState("");
  const [task, setTask] = useState("General");
  const [activityType, setActivityType] = useState("Development");
  const [date, setDate] = useState(todayIso());
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
      pushRecent(projectId);
      toast.success("Time logged!");
      navigate("/timesheet");
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const selectedProject = useMemo(
    () => projects.find((p) => p._id === projectId),
    [projects, projectId]
  );

  const recentProjects = useMemo(() => {
    return recent
      .map((id) => projects.find((p) => p._id === id))
      .filter((p): p is Project => !!p)
      .slice(0, 3);
  }, [recent, projects]);

  const hoursNum = parseFloat(hours) || 0;
  const isToday = date === todayIso();
  const isYesterday = date === shiftDate(todayIso(), -1);

  const dateObj = new Date(`${date}T00:00:00`);
  const dayLabel = dateObj.toLocaleDateString(undefined, { weekday: "long" });
  const dateLabel = dateObj.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const ActivityIcon = activityIcons[activityType] ?? Sparkles;

  // Date quick-chips
  const dateChips = [
    { label: "Today",     value: todayIso() },
    { label: "Yesterday", value: shiftDate(todayIso(), -1) },
    { label: "Last workday", value: lastWorkdayIso() },
  ];

  // Notes prompt suggestions — only shown if notes are empty
  const notePrompts = [
    "Finished feature X and reviewed PRs",
    "Pair-programmed on the auth refactor",
    "Investigated and fixed bug Y",
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-7 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="shrink-0 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
              <Clock className="h-7 w-7 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Quick action
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
                Log <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Time</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Quickly record hours for any day — they'll roll into your weekly timesheet.</p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            aria-label="Close"
            className="shrink-0 rounded-lg p-2 text-indigo-200/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form (3 cols) */}
        <form onSubmit={handleSubmit} className={`${cardCls} p-6 lg:col-span-3`}>
          {/* Project */}
          <div className="mb-5">
            <label className={labelCls}>
              <FolderKanban className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              Project
            </label>
            <select
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name} — {p.client}</option>)}
            </select>
            {recentProjects.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="self-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Recent
                </span>
                {recentProjects.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setProjectId(p._id)}
                    className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                      projectId === p._id
                        ? "border-indigo-500/40 bg-indigo-50 text-indigo-700 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-300"
                        : "border-gray-200/80 bg-gray-50 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 group-hover:bg-indigo-500" />
                    <span className="max-w-[140px] truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Task + Activity */}
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                <ListChecks className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                Task
              </label>
              <input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className={inputCls}
                placeholder="General"
              />
            </div>
            <div>
              <label className={labelCls}>
                <ActivityIcon className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
                Activity
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className={inputCls}
              >
                {activityTypes.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="mb-5">
            <label className={labelCls}>
              <Calendar className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
              Date
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} sm:w-[200px]`}
                max={todayIso()}
              />
              <div className="flex flex-wrap gap-1.5">
                {dateChips.map((c) => {
                  const active = date === c.value;
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setDate(c.value)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        active
                          ? "border-sky-500/40 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-300"
                          : "border-gray-200/80 bg-gray-50 text-gray-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-sky-400/40 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hours */}
          <div className="mb-5">
            <label className={labelCls}>
              <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
              Hours
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="number"
                required
                min="0.5"
                max="24"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className={`${inputCls} sm:w-[140px]`}
                placeholder="0"
              />
              <div className="flex flex-wrap gap-1.5">
                {HOUR_PRESETS.map((h) => {
                  const active = hoursNum === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(String(h))}
                      className={`inline-flex h-9 w-12 items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                        active
                          ? "border-amber-500/50 bg-amber-50 text-amber-700 ring-1 ring-amber-500/20 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-300"
                          : "border-gray-200/80 bg-gray-50 text-gray-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-amber-400/40 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                      }`}
                    >
                      {h}h
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-5">
            <label className={labelCls}>
              <FileText className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} resize-y`}
              placeholder="What did you work on?"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {notes.trim() ? `${notes.length} characters` : "Tip: be specific — future-you will thank you"}
              </p>
            </div>
            {!notes.trim() && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {notePrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNotes(p)}
                    className="inline-flex items-center rounded-full border border-gray-200/80 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  >
                    “{p}”
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !projectId || !hours}
              className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <span className="relative inline-flex items-center justify-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {saving ? "Saving…" : "Log Time"}
              </span>
            </button>
          </div>
        </form>

        {/* Preview / summary (2 cols) */}
        <aside className="lg:col-span-2">
          <div className={`${cardCls} sticky top-20 overflow-hidden p-0`}>
            {/* Top gradient strip */}
            <div className="relative h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500" />

            <div className="p-5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                <Sparkles className="h-3 w-3" /> Live preview
              </p>

              {/* Big date block */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg ring-1 ring-white/10">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                    {dateObj.toLocaleDateString(undefined, { month: "short" })}
                  </span>
                  <span className="text-lg font-bold leading-none">{dateObj.getDate()}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{dayLabel}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{dateLabel}</p>
                  {(isToday || isYesterday) && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/25">
                      <span className="h-1 w-1 rounded-full bg-sky-500" />
                      {isToday ? "Today" : "Yesterday"}
                    </span>
                  )}
                </div>
              </div>

              {/* Hours big number */}
              <div className="mt-5 rounded-xl border border-gray-200/70 bg-gradient-to-br from-amber-50 to-orange-50/40 p-4 ring-1 ring-amber-500/10 dark:border-gray-800/80 dark:from-amber-500/10 dark:to-orange-500/5 dark:ring-amber-400/15">
                <p className={labelCls}>
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  You'll log
                </p>
                <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                  {hoursNum > 0 ? fmtHours(hoursNum) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                </p>
              </div>

              {/* Project + activity rows */}
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-3 rounded-lg border border-gray-200/70 bg-gray-50/70 p-2.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                    <FolderKanban className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Project</p>
                    {selectedProject ? (
                      <>
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{selectedProject.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{selectedProject.client}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500">Not selected</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-gray-200/70 bg-gray-50/70 p-2.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                    <ActivityIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Activity</p>
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{activityType}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{task || "General"}</p>
                  </div>
                </div>

                {notes.trim() && (
                  <div className="flex items-start gap-3 rounded-lg border border-gray-200/70 bg-gray-50/70 p-2.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Notes</p>
                      <p className="line-clamp-3 text-xs text-gray-700 dark:text-gray-300">{notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Helper foot */}
              <p className="mt-5 border-t border-gray-200/70 pt-3 text-[11px] leading-relaxed text-gray-500 dark:border-gray-800/80 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Tip:</span> entries flow into the weekly timesheet for the chosen week — you can still adjust them in Weekly Grid before submitting.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
