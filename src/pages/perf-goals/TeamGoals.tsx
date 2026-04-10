import { useState, useEffect, useMemo } from "react";
import { Users, Target, Search, Building2, TrendingUp, Calendar, Flag, Layers } from "lucide-react";
import { performanceApi, type GoalData } from "../../api/performanceApi";
import toast from "react-hot-toast";

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

const currentQuarter = () => `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

export default function TeamGoals() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(currentQuarter());
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const year = new Date().getFullYear();

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { year };
    if (period !== "All") params.period = period;
    performanceApi.getTeamGoals(params)
      .then((r) => setGoals(r.data.data ?? []))
      .catch(() => toast.error("Failed to load team goals"))
      .finally(() => setLoading(false));
  }, [period]);

  const departments = useMemo(() => {
    const set = new Set(goals.map((g) => {
      const u = g.userId as any;
      return u?.department || "";
    }).filter(Boolean));
    return [...set].sort();
  }, [goals]);

  const filtered = useMemo(() => goals.filter((g) => {
    const u = g.userId as any;
    if (deptFilter && (u?.department ?? "") !== deptFilter) return false;
    if (statusFilter && g.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u?.name?.toLowerCase().includes(q) && !g.title.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [goals, deptFilter, statusFilter, search]);

  const teamStats = useMemo(() => {
    const total = filtered.length;
    const avgProgress = total > 0 ? Math.round(filtered.reduce((s, g) => s + g.progress, 0) / total) : 0;
    const completed = filtered.filter((g) => g.status === "completed").length;
    const atRisk = filtered.filter((g) => g.status === "at-risk" || g.status === "behind").length;
    return { total, avgProgress, completed, atRisk };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-500" /> Team Goals
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{year} · {period === "All" ? "All Periods" : period} — View and track all team member goals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Goals", value: teamStats.total, cls: "text-gray-900 dark:text-white", border: "border-l-4 border-indigo-500" },
          { label: "Avg Progress", value: `${teamStats.avgProgress}%`, cls: "text-indigo-600 dark:text-indigo-400", border: "border-l-4 border-indigo-500" },
          { label: "Completed", value: teamStats.completed, cls: "text-blue-600 dark:text-blue-400", border: "border-l-4 border-blue-500" },
          { label: "At Risk / Behind", value: teamStats.atRisk, cls: "text-rose-600 dark:text-rose-400", border: "border-l-4 border-rose-500" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${s.border} p-4`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800/60 p-1">
          {["All", "Q1", "Q2", "Q3", "Q4", "H1", "H2", "Annual"].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${period === p ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 pl-8 pr-3 py-2 w-44 outline-none focus:border-indigo-500" />
        </div>
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-gray-400" />
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 px-2.5 py-2 outline-none">
            <option value="">All Depts</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 px-2.5 py-2 outline-none">
          <option value="">All Status</option>
          <option value="on-track">On Track</option>
          <option value="at-risk">At Risk</option>
          <option value="behind">Behind</option>
          <option value="completed">Completed</option>
          <option value="not-started">Not Started</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Target className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">No team goals found.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Goal</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Priority</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Progress</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((goal) => {
                const u = goal.userId as any;
                const cfg = STATUS_CFG[goal.status] || STATUS_CFG["not-started"];
                const priCfg = PRIORITY_CFG[goal.priority] || PRIORITY_CFG.medium;
                const catCfg = CATEGORY_CFG[goal.category] || CATEGORY_CFG.individual;
                const pct = goal.progress;
                const barCls = pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600";
                return (
                  <tr key={goal._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-400">
                          {u?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{u?.name || "—"}</p>
                          <p className="text-[11px] text-gray-400">{u?.department || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-white">{goal.title}</p>
                      {goal.kpis?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {goal.kpis.slice(0, 2).map((k, i) => (
                            <span key={i} className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">
                              <TrendingUp className="h-2.5 w-2.5" />{k.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${catCfg.bg} ${catCfg.text}`}>
                        <Layers className="h-3 w-3" />{catCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${priCfg.cls}`}>
                        <Flag className="h-3 w-3" />{priCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <div className={`h-full rounded-full ${barCls} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 min-w-[2rem] text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {goal.dueDate ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(goal.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
