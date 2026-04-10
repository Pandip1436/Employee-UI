import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Target, Plus, Calendar, TrendingUp, CheckCircle2,
  BarChart3, ChevronDown, ChevronUp, MessageSquarePlus,
  Flag, Eye, Layers, Milestone,
} from "lucide-react";
import { performanceApi, type GoalData, type GoalStats } from "../../api/performanceApi";
import toast from "react-hot-toast";

/* ── Config ── */
const STATUS_CFG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  "on-track":    { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", label: "On Track" },
  "at-risk":     { dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-500/10",     text: "text-amber-700 dark:text-amber-400",     label: "At Risk" },
  behind:        { dot: "bg-rose-500",     bg: "bg-rose-50 dark:bg-rose-500/10",       text: "text-rose-700 dark:text-rose-400",       label: "Behind" },
  completed:     { dot: "bg-blue-500",     bg: "bg-blue-50 dark:bg-blue-500/10",       text: "text-blue-700 dark:text-blue-400",       label: "Completed" },
  "not-started": { dot: "bg-gray-400",     bg: "bg-gray-100 dark:bg-gray-500/10",      text: "text-gray-600 dark:text-gray-400",       label: "Not Started" },
};

const PRIORITY_CFG: Record<string, { cls: string; label: string }> = {
  high:   { cls: "text-rose-600 dark:text-rose-400",   label: "High" },
  medium: { cls: "text-amber-600 dark:text-amber-400", label: "Medium" },
  low:    { cls: "text-gray-500 dark:text-gray-400",   label: "Low" },
};

const CATEGORY_CFG: Record<string, { bg: string; text: string; label: string }> = {
  individual: { bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-400", label: "Individual" },
  team:       { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-400", label: "Team" },
  company:    { bg: "bg-teal-50 dark:bg-teal-500/10",     text: "text-teal-700 dark:text-teal-400",     label: "Company" },
};

function progressColor(status: string) {
  if (status === "completed") return "bg-blue-500";
  if (status === "at-risk") return "bg-amber-500";
  if (status === "behind") return "bg-rose-500";
  if (status === "on-track") return "bg-emerald-500";
  return "bg-gray-400";
}

const PERIODS = ["All", "Q1", "Q2", "Q3", "Q4", "H1", "H2", "Annual"] as const;
const STATUSES = ["All", "On Track", "At Risk", "Behind", "Completed", "Not Started"] as const;
const statusMap: Record<string, string | null> = { All: null, "On Track": "on-track", "At Risk": "at-risk", Behind: "behind", Completed: "completed", "Not Started": "not-started" };

const currentQuarter = () => `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

export default function MyGoals() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(currentQuarter());
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checkInGoalId, setCheckInGoalId] = useState<string | null>(null);
  const [checkInProgress, setCheckInProgress] = useState(0);
  const [checkInNote, setCheckInNote] = useState("");
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const year = new Date().getFullYear();

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { year: String(year) };
    if (period !== "All") params.period = period;
    Promise.all([
      performanceApi.getGoals(params),
      performanceApi.getGoalStats({ year, ...(period !== "All" ? { period } : {}) }),
    ]).then(([goalsRes, statsRes]) => {
      setGoals(goalsRes.data.data ?? []);
      setStats(statsRes.data.data ?? null);
    }).catch(() => toast.error("Failed to load goals"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [period]);

  const filtered = useMemo(() => goals.filter((g) => {
    const s = statusMap[statusFilter];
    if (s && g.status !== s) return false;
    if (categoryFilter !== "All" && g.category !== categoryFilter.toLowerCase()) return false;
    return true;
  }), [goals, statusFilter, categoryFilter]);

  const handleCheckIn = async () => {
    if (!checkInGoalId) return;
    setSubmittingCheckIn(true);
    try {
      await performanceApi.addCheckIn(checkInGoalId, { progress: checkInProgress, note: checkInNote.trim() || undefined });
      toast.success("Check-in recorded");
      setCheckInGoalId(null);
      setCheckInNote("");
      setCheckInProgress(0);
      load();
    } catch { toast.error("Failed to save check-in"); }
    finally { setSubmittingCheckIn(false); }
  };

  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    try {
      await performanceApi.toggleMilestone(goalId, milestoneId);
      load();
    } catch { toast.error("Failed to update milestone"); }
  };

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-500" /> My Goals
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {year} · {period === "All" ? "All Periods" : period} — Track OKRs and key results
          </p>
        </div>
        <Link
          to="/performance/goals/new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> New Goal
        </Link>
      </div>

      {/* ── KPI Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Total", value: stats.total, cls: "text-gray-900 dark:text-white", border: "border-l-4 border-indigo-500" },
            { label: "Avg Progress", value: `${stats.avgProgress}%`, cls: "text-indigo-600 dark:text-indigo-400", border: "border-l-4 border-indigo-500" },
            { label: "Completed", value: stats.completed, cls: "text-blue-600 dark:text-blue-400", border: "border-l-4 border-yellow-500" },
            { label: "On Track", value: stats.onTrack, cls: "text-emerald-600 dark:text-emerald-400", border: "border-l-4 border-green-500" },
            { label: "At Risk", value: stats.atRisk, cls: "text-amber-600 dark:text-amber-400", border: "border-l-4 border-orange-500" },
            { label: "Behind", value: stats.behind, cls: "text-rose-600 dark:text-rose-400", border: "border-l-4 border-rose-500" },
            { label: "Not Started", value: stats.notStarted, cls: "text-gray-500", border: "border-l-4 border-gray-400" },
          ].map((s) => (
            <div key={s.label} className={`${card} ${s.border} p-4`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Period */}
        <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800/60 p-1">
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${period === p ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
              {p}
            </button>
          ))}
        </div>

        {/* Status */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:border-indigo-500">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Category */}
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 px-3 py-2 outline-none focus:border-indigo-500">
          <option value="All">All Categories</option>
          <option value="Individual">Individual</option>
          <option value="Team">Team</option>
          <option value="Company">Company</option>
        </select>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} goal{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && filtered.length === 0 && (
        <div className={`${card} flex flex-col items-center justify-center py-16 text-center p-5`}>
          <Target className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No goals found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first goal to get started</p>
        </div>
      )}

      {/* ── Goal List ── */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((goal) => {
            const cfg = STATUS_CFG[goal.status] || STATUS_CFG["not-started"];
            const priCfg = PRIORITY_CFG[goal.priority] || PRIORITY_CFG.medium;
            const catCfg = CATEGORY_CFG[goal.category] || CATEGORY_CFG.individual;
            const expanded = expandedId === goal._id;
            const milestoneDone = goal.milestones?.filter((m) => m.completed).length ?? 0;
            const milestoneTotal = goal.milestones?.length ?? 0;
            const daysLeft = goal.dueDate ? Math.ceil((new Date(goal.dueDate).getTime() - Date.now()) / 86400000) : null;

            return (
              <div key={goal._id} className={`${card} overflow-hidden`}>
                {/* Main row */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Progress ring */}
                    <div className="relative shrink-0 h-14 w-14">
                      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" strokeWidth="4" className="stroke-gray-100 dark:stroke-gray-800" />
                        <circle cx="28" cy="28" r="24" fill="none" strokeWidth="4" strokeLinecap="round"
                          className={`${goal.status === "completed" ? "stroke-blue-500" : goal.status === "on-track" ? "stroke-emerald-500" : goal.status === "at-risk" ? "stroke-amber-500" : goal.status === "behind" ? "stroke-rose-500" : "stroke-gray-400"}`}
                          strokeDasharray={`${(goal.progress / 100) * 150.8} 150.8`} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-white">{goal.progress}%</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link to={`/performance/goals/new?edit=${goal._id}`} className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            {goal.title}
                          </Link>
                          {goal.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{goal.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${catCfg.bg} ${catCfg.text}`}>
                          <Layers className="h-3 w-3" />{catCfg.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${priCfg.cls}`}>
                          <Flag className="h-3 w-3" />{priCfg.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                          <Eye className="h-3 w-3" />{goal.visibility}
                        </span>
                        {goal.weightage > 1 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                            <BarChart3 className="h-3 w-3" />Weight: {goal.weightage}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">{goal.period} {goal.year}</span>
                        {daysLeft !== null && (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${daysLeft <= 7 ? "text-rose-600 dark:text-rose-400" : daysLeft <= 30 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                            <Calendar className="h-3 w-3" />{daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Due today" : "Overdue"}
                          </span>
                        )}
                        {milestoneTotal > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                            <Milestone className="h-3 w-3" />{milestoneDone}/{milestoneTotal} milestones
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${progressColor(goal.status)}`} style={{ width: `${Math.min(goal.progress, 100)}%` }} />
                        </div>
                      </div>

                      {/* KPI chips */}
                      {goal.kpis && goal.kpis.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2.5">
                          {goal.kpis.slice(0, 4).map((kpi, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
                              <TrendingUp className="h-3 w-3" />{kpi.name}: {kpi.current}/{kpi.target} {kpi.unit}
                            </span>
                          ))}
                          {goal.kpis.length > 4 && <span className="text-xs text-gray-400">+{goal.kpis.length - 4} more</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setCheckInGoalId(goal._id); setCheckInProgress(goal.progress); }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                        <MessageSquarePlus className="h-3.5 w-3.5" /> Check-in
                      </button>
                      <Link to={`/performance/goals/new?edit=${goal._id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        Edit
                      </Link>
                    </div>
                    <button onClick={() => setExpandedId(expanded ? null : goal._id)}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Less</> : <><ChevronDown className="h-3.5 w-3.5" /> Details</>}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-5 space-y-4">
                    {/* Milestones */}
                    {goal.milestones && goal.milestones.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Milestones</h4>
                        <div className="space-y-2">
                          {goal.milestones.map((ms) => (
                            <div key={ms._id} className="flex items-center gap-3">
                              <button onClick={() => ms._id && handleToggleMilestone(goal._id, ms._id)}
                                className={`shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${ms.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 dark:border-gray-600 hover:border-indigo-500"}`}>
                                {ms.completed && <CheckCircle2 className="h-3.5 w-3.5" />}
                              </button>
                              <span className={`text-sm ${ms.completed ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>{ms.title}</span>
                              {ms.dueDate && (
                                <span className="text-[11px] text-gray-400 ml-auto">
                                  {new Date(ms.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Check-in history */}
                    {goal.checkIns && goal.checkIns.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Recent Check-ins</h4>
                        <div className="space-y-2">
                          {goal.checkIns.slice(-5).reverse().map((ci, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm">
                              <div className="shrink-0 mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">{ci.progress}%</span>
                                  <span className="text-[11px] text-gray-400">{new Date(ci.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                </div>
                                {ci.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ci.note}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      {goal.startDate && <span>Start: {new Date(goal.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>}
                      {goal.dueDate && <span>Due: {new Date(goal.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>}
                      {goal.completedAt && <span>Completed: {new Date(goal.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>}
                      <span>Created: {new Date(goal.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Check-in Modal ── */}
      {checkInGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${card} w-full max-w-md p-6 space-y-4 shadow-xl`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-indigo-500" /> Progress Check-in
            </h3>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Progress ({checkInProgress}%)</label>
              <input type="range" min="0" max="100" step="5" value={checkInProgress}
                onChange={(e) => setCheckInProgress(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Note (optional)</label>
              <textarea value={checkInNote} onChange={(e) => setCheckInNote(e.target.value)} rows={3} placeholder="What progress was made?"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none" />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => { setCheckInGoalId(null); setCheckInNote(""); }} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button onClick={handleCheckIn} disabled={submittingCheckIn}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                {submittingCheckIn ? "Saving..." : "Save Check-in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
