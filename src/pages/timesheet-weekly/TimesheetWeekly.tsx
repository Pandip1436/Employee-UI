import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Save, Send, ChevronLeft, ChevronRight, Copy, Download,
  CheckCircle2, XCircle, Lock, CalendarDays, Sparkles, AlertCircle,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import { projectApi } from "../../api/projectApi";
import { attendanceApi } from "../../api/attendanceApi";
import { holidayApi } from "../../api/holidayApi";
import type { WeeklyTimesheetData, Project, TimesheetEntry, Holiday } from "../../types";
import toast from "react-hot-toast";

const MIN_WEEK_HOURS = 20;
const MAX_DAY_HOURS = 24;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

const statusStyle: Record<string, { bg: string; dot: string; label: string }> = {
  draft: {
    bg: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    dot: "bg-gray-500",
    label: "Draft",
  },
  submitted: {
    bg: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    dot: "bg-sky-500",
    label: "Submitted",
  },
  approved: {
    bg: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
    label: "Approved",
  },
  rejected: {
    bg: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    dot: "bg-rose-500",
    label: "Rejected",
  },
};

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
  const isToday = (d: Date) => {
    const today = new Date(); today.setHours(0,0,0,0);
    return d.getTime() === today.getTime();
  };

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

  const validateForSubmit = (): string | null => {
    if (entries.length === 0) return "Add at least one entry.";
    for (const e of entries) {
      const total = rowTotal(e.hours);
      if (total > 0 && (!e.projectId || !e.task.trim() || !e.activityType)) {
        return "Each row with hours must have a project, task, and activity.";
      }
    }
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
  const goToday = () => setWeekDate(getMonday(new Date()).toLocaleDateString("en-CA"));

  const editable = !sheet || sheet.status === "draft" || sheet.status === "rejected";

  const dayCellBg = (i: number) => {
    const d = weekDates[i];
    if (!d) return "";
    if (isHoliday(d)) return "bg-sky-50/80 dark:bg-sky-500/5";
    if (isWeekend(d)) return "bg-gray-50/60 dark:bg-gray-800/40";
    if (isFuture(d)) return "bg-gray-50/40 dark:bg-gray-800/20 opacity-60";
    if (isToday(d)) return "bg-indigo-50/60 dark:bg-indigo-500/5";
    return "";
  };
  const fmtDateLong = (d: string | Date) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const weekRangeEnd = weekDates[6];

  const inputCls = "rounded-lg border border-gray-300 bg-white text-gray-900 px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

  const progressPct = Math.min(100, Math.round((weekTotal / 40) * 100));
  const weekStartObj = weekDates[0];
  const s = sheet?.status ? statusStyle[sheet.status] : null;

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
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
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                {weekStartObj.toLocaleDateString(undefined, { month: "short" })}
              </p>
              <p className="text-lg font-bold leading-none">{weekStartObj.getDate()}</p>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Weekly log
                {s && (
                  <span className={`ml-1 inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-white ring-1 ring-white/15 backdrop-blur-sm`}>
                    <span className={`h-1 w-1 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                )}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Weekly <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Timesheet</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">
                {fmtDateLong(weekStartObj)} — {fmtDateLong(weekRangeEnd)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur-sm">
              <button
                onClick={prevWeek}
                aria-label="Previous week"
                className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToday}
                className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20"
              >
                Today
              </button>
              <button
                onClick={nextWeek}
                aria-label="Next week"
                className="rounded-lg p-1.5 text-indigo-100 transition-colors hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">This Week</p>
              <p className="text-xl font-bold tracking-tight">{weekTotal}h</p>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="relative mt-6">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-indigo-200/70">
            <span>Weekly progress</span>
            <span>
              <span className="font-semibold text-white">{weekTotal}h</span> / 40h target
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Status banner ── */}
      {sheet?.status === "approved" && (
        <div className={`${cardCls} relative overflow-hidden p-4`}>
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/25 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2 shadow-lg shadow-emerald-500/30 ring-1 ring-white/10">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Approved{sheet.approvedBy?.name ? ` by ${sheet.approvedBy.name}` : ""}
              </p>
              {sheet.approvedAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(sheet.approvedAt).toLocaleString()}
                </p>
              )}
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Lock className="h-3 w-3" /> This timesheet is locked
              </p>
            </div>
          </div>
        </div>
      )}
      {sheet?.status === "submitted" && (
        <div className={`${cardCls} relative overflow-hidden p-4`}>
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sky-400/25 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-2 shadow-lg shadow-sky-500/30 ring-1 ring-white/10">
              <Send className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">Submitted — awaiting manager approval</p>
              {sheet.submittedAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(sheet.submittedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>
      )}
      {sheet?.status === "rejected" && (
        <div className={`${cardCls} relative overflow-hidden p-4`}>
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-rose-400/25 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2 shadow-lg shadow-rose-500/30 ring-1 ring-white/10">
              <XCircle className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Rejected — please revise and resubmit</p>
              {sheet.managerComment && (
                <div className="mt-2 rounded-lg border border-rose-200/60 bg-rose-50/60 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  <span className="font-semibold">Manager feedback:</span> {sheet.managerComment}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Grid — Desktop ── */}
      <div className={`${cardCls} hidden overflow-hidden p-0 lg:block`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
              <tr>
                <th className={`px-3 py-3 text-left ${labelCls} w-44`}>Project</th>
                <th className={`px-2 py-3 text-left ${labelCls} w-28`}>Task</th>
                <th className={`px-2 py-3 text-left ${labelCls} w-28`}>Activity</th>
                {DAYS.map((d, i) => {
                  const dt = weekDates[i];
                  const holiday = dt && isHoliday(dt);
                  const weekend = dt && isWeekend(dt);
                  const today = dt && isToday(dt);
                  return (
                    <th
                      key={d}
                      className={`w-16 px-1 py-3 text-center ${dayCellBg(i)} ${
                        today
                          ? "text-indigo-600 dark:text-indigo-400"
                          : holiday
                          ? "text-sky-600 dark:text-sky-400"
                          : weekend
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider">{d}</span>
                        <span className={`text-[11px] ${today ? "font-bold" : "text-gray-400"}`}>{dt?.getDate()}</span>
                        {today && <span className="h-0.5 w-4 rounded-full bg-indigo-500" />}
                      </div>
                    </th>
                  );
                })}
                <th className={`w-16 px-2 py-3 text-center ${labelCls} text-indigo-600 dark:text-indigo-400`}>Total</th>
                {editable && <th className="w-10 px-2 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                        <CalendarDays className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No entries yet</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Click "Add Row" below to start logging</p>
                    </div>
                  </td>
                </tr>
              ) : entries.map((entry, i) => (
                <tr key={i} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                  <td className="px-3 py-2">
                    {editable ? (
                      <select value={entry.projectId} onChange={(e) => updateField(i, "projectId", e.target.value)} className={`${inputCls} w-full`}>
                        <option value="">Select</option>
                        {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    ) : (
                      <span className="font-medium text-gray-900 dark:text-white">
                        {projects.find((p) => p._id === entry.projectId)?.name || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {editable ? (
                      <input value={entry.task} onChange={(e) => updateField(i, "task", e.target.value)} className={`${inputCls} w-full`} />
                    ) : (
                      <span className="text-gray-700 dark:text-gray-300">{entry.task}</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {editable ? (
                      <select value={entry.activityType} onChange={(e) => updateField(i, "activityType", e.target.value)} className={`${inputCls} w-full`}>
                        {activityTypes.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    ) : (
                      <span className="text-gray-700 dark:text-gray-300">{entry.activityType}</span>
                    )}
                  </td>
                  {DAYS.map((_, d) => {
                    const dt = weekDates[d];
                    const future = dt && isFuture(dt);
                    const val = entry.hours[d] || 0;
                    return (
                      <td key={d} className={`px-1 py-2 text-center ${dayCellBg(d)}`}>
                        {editable ? (
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            disabled={future}
                            value={entry.hours[d] || ""}
                            onChange={(e) => updateHour(i, d, parseFloat(e.target.value) || 0)}
                            className={`w-14 rounded-lg border py-1.5 text-center text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40 ${
                              val > 0
                                ? "border-indigo-300 bg-indigo-50/60 font-semibold text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                                : "border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            }`}
                          />
                        ) : (
                          <span className={`text-sm ${val > 0 ? "font-semibold text-gray-900 dark:text-white" : "text-gray-400"}`}>
                            {val || "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold tracking-tight text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                      {rowTotal(entry.hours)}h
                    </span>
                  </td>
                  {editable && (
                    <td className="px-2 py-2">
                      <button
                        onClick={() => removeRow(i)}
                        aria-label="Remove row"
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200/70 bg-gradient-to-r from-indigo-50/40 via-transparent to-transparent dark:border-gray-800/80 dark:from-indigo-500/5">
                <td colSpan={3} className={`px-3 py-3 ${labelCls} text-gray-600 dark:text-gray-300`}>Day Totals</td>
                {DAYS.map((_, d) => {
                  const t = dayTotal(d);
                  const over = t > MAX_DAY_HOURS;
                  return (
                    <td key={d} className={`px-1 py-3 text-center text-sm font-bold ${
                      over
                        ? "text-rose-600 dark:text-rose-400"
                        : t > 0
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-400"
                    }`}>
                      {t || "—"}
                    </td>
                  );
                })}
                <td className="px-2 py-3 text-center">
                  <span className="inline-flex items-center rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 px-2.5 py-1 text-sm font-bold tracking-tight text-white shadow-sm ring-1 ring-white/10">
                    {weekTotal}h
                  </span>
                </td>
                {editable && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Grid — Mobile cards ── */}
      <div className="space-y-3 lg:hidden">
        {entries.length === 0 ? (
          <div className={`${cardCls} flex flex-col items-center gap-2 py-10 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <CalendarDays className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No entries yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Tap "Add Row" to start logging</p>
          </div>
        ) : entries.map((entry, i) => (
          <div key={i} className={`${cardCls} space-y-3 p-4`}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {projects.find((p) => p._id === entry.projectId)?.name || "Select project"}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold tracking-tight text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20">
                  {rowTotal(entry.hours)}h
                </span>
                {editable && (
                  <button onClick={() => removeRow(i)} className="text-gray-400 hover:text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
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
              {DAYS.map((d, di) => {
                const dt = weekDates[di];
                const today = dt && isToday(dt);
                return (
                  <div key={d} className="text-center">
                    <p className={`mb-1 text-[10px] font-semibold uppercase ${today ? "text-indigo-500" : "text-gray-400 dark:text-gray-500"}`}>
                      {d}
                    </p>
                    {editable ? (
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={entry.hours[di] || ""}
                        onChange={(e) => updateHour(i, di, parseFloat(e.target.value) || 0)}
                        className={`w-full rounded-lg border py-2 text-center text-sm outline-none focus:border-indigo-500 ${
                          today
                            ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                            : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                        }`}
                      />
                    ) : (
                      <p className="py-2 text-sm font-semibold text-gray-900 dark:text-white">{entry.hours[di] || "—"}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {/* Mobile total */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-center text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
          <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
          <p className="relative text-[10px] font-semibold uppercase tracking-wider text-white/80">Week Total</p>
          <p className="relative text-4xl font-bold tracking-tight">{weekTotal}h</p>
          <p className="relative mt-1 text-xs text-white/70">of 40h target</p>
        </div>
      </div>

      {/* Validation hint */}
      {editable && weekTotal > 0 && weekTotal < MIN_WEEK_HOURS && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            You need at least <span className="font-semibold">{MIN_WEEK_HOURS}h</span> to submit (currently <span className="font-semibold">{weekTotal}h</span>).
          </span>
        </div>
      )}

      {/* ── Actions ── */}
      {editable && (
        <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
          <button
            onClick={addRow}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Plus className="h-4 w-4" /> Add Row
          </button>
          <button
            onClick={copyFromLastWeek}
            disabled={copying}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Copy className="h-4 w-4" /> {copying ? "Copying..." : "Copy Last Week"}
          </button>
          <button
            onClick={autoFillFromAttendance}
            disabled={autofilling}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" /> {autofilling ? "Filling..." : "Auto-fill Attendance"}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}
