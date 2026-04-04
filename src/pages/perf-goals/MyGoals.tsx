import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Target, Plus, Calendar, TrendingUp } from "lucide-react";
import { performanceApi, type GoalData } from "../../api/performanceApi";
import toast from "react-hot-toast";

const STATUS_CFG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  "on-track":   { dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400", label: "On Track" },
  "at-risk":    { dot: "bg-amber-400",   bg: "bg-amber-500/10",   text: "text-amber-400",   label: "At Risk" },
  completed:    { dot: "bg-blue-400",     bg: "bg-blue-500/10",    text: "text-blue-400",    label: "Completed" },
  "not-started":{ dot: "bg-gray-400",     bg: "bg-gray-500/10",    text: "text-gray-400",    label: "Not Started" },
};

function progressColor(status: string) {
  if (status === "completed") return "bg-blue-500";
  if (status === "at-risk") return "bg-amber-500";
  if (status === "on-track") return "bg-emerald-500";
  return "bg-gray-500";
}

const TABS = ["All", "On Track", "At Risk", "Completed"] as const;
type Tab = (typeof TABS)[number];

function tabToStatus(tab: Tab): string | null {
  if (tab === "All") return null;
  if (tab === "On Track") return "on-track";
  if (tab === "At Risk") return "at-risk";
  return "completed";
}

export default function MyGoals() {
  
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("All");

  useEffect(() => {
    setLoading(true);
    performanceApi
      .getGoals()
      .then((r) => setGoals(r.data.data ?? []))
      .catch(() => toast.error("Failed to load goals"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = goals.filter((g) => {
    const s = tabToStatus(tab);
    return s ? g.status === s : true;
  });

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-500" /> My Goals
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage your performance goals</p>
        </div>
        <Link
          to="/performance/goals/new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Goal
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800/60 p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t}
            <span className="ml-1.5 text-xs opacity-60">
              {goals.filter((g) => { const s = tabToStatus(t); return s ? g.status === s : true; }).length}
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className={`${card} flex flex-col items-center justify-center py-16 text-center`}>
          <Target className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No goals found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first goal to get started</p>
        </div>
      )}

      {/* Goal Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((goal) => {
          const cfg = STATUS_CFG[goal.status] || STATUS_CFG["not-started"];
          return (
            <Link
              key={goal._id}
              to={`/performance/goals/new?edit=${goal._id}`}
              className={`${card} flex flex-col gap-3 group`}
            >
              {/* Title + Badge */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-500 transition-colors line-clamp-2">
                  {goal.title}
                </h3>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text} flex-shrink-0`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>

              {/* Description */}
              {goal.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{goal.description}</p>
              )}

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-500 dark:text-gray-400">Progress</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{goal.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(goal.status)}`}
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  />
                </div>
              </div>

              {/* KPI Metrics */}
              {goal.kpis && goal.kpis.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {goal.kpis.slice(0, 3).map((kpi, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs text-gray-600 dark:text-gray-400"
                    >
                      <TrendingUp className="h-3 w-3" />
                      {kpi.name}: {kpi.current}/{kpi.target} {kpi.unit}
                    </span>
                  ))}
                  {goal.kpis.length > 3 && (
                    <span className="text-xs text-gray-400">+{goal.kpis.length - 3} more</span>
                  )}
                </div>
              )}

              {/* Due Date */}
              {goal.dueDate && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
                  <Calendar className="h-3.5 w-3.5" />
                  Due {new Date(goal.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
