import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Target, Plus, Trash2, Save, ArrowLeft, Calendar, Flag, Layers, Eye, BarChart3 } from "lucide-react";
import { performanceApi } from "../../api/performanceApi";
import toast from "react-hot-toast";
import { useConfirm } from "../../context/ConfirmContext";

interface KpiRow { name: string; target: string; current: string; unit: string }
interface MilestoneRow { title: string; dueDate: string; completed: boolean }

const emptyKpi = (): KpiRow => ({ name: "", target: "", current: "", unit: "" });
const emptyMilestone = (): MilestoneRow => ({ title: "", dueDate: "", completed: false });

function calcProgress(kpis: KpiRow[], milestones: MilestoneRow[]): number {
  const validKpis = kpis.filter((k) => Number(k.target) > 0);
  if (validKpis.length > 0) {
    const total = validKpis.reduce((sum, k) => sum + Math.min(Number(k.current) / Number(k.target), 1), 0);
    return Math.round((total / validKpis.length) * 100);
  }
  if (milestones.length > 0) {
    const done = milestones.filter((m) => m.completed).length;
    return Math.round((done / milestones.length) * 100);
  }
  return 0;
}

const currentQuarter = () => `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

const input = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";
const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6";
const label = "block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5";

export default function GoalForm() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("individual");
  const [priority, setPriority] = useState("medium");
  const [period, setPeriod] = useState(currentQuarter());
  const [year, setYear] = useState(new Date().getFullYear());
  const [visibility, setVisibility] = useState("team");
  const [weightage, setWeightage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [kpis, setKpis] = useState<KpiRow[]>([emptyKpi()]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [deleting, setDeleting] = useState(false);

  const progress = calcProgress(kpis, milestones);

  useEffect(() => {
    if (!editId) return;
    performanceApi.getGoals().then((r) => {
      const goal = (r.data.data ?? []).find((g) => g._id === editId);
      if (goal) {
        setTitle(goal.title);
        setDescription(goal.description || "");
        setCategory(goal.category || "individual");
        setPriority(goal.priority || "medium");
        setPeriod(goal.period || currentQuarter());
        setYear(goal.year || new Date().getFullYear());
        setVisibility(goal.visibility || "team");
        setWeightage(goal.weightage || 1);
        setStartDate(goal.startDate ? goal.startDate.split("T")[0] : "");
        setDueDate(goal.dueDate ? goal.dueDate.split("T")[0] : "");
        setKpis(goal.kpis.length > 0 ? goal.kpis.map((k) => ({ name: k.name, target: String(k.target), current: String(k.current), unit: k.unit })) : [emptyKpi()]);
        setMilestones(goal.milestones?.map((m) => ({ title: m.title, dueDate: m.dueDate ? m.dueDate.split("T")[0] : "", completed: m.completed })) || []);
      }
    }).catch(() => toast.error("Failed to load goal")).finally(() => setLoading(false));
  }, [editId]);

  const updateKpi = (i: number, field: keyof KpiRow, val: string) => setKpis((p) => p.map((k, idx) => idx === i ? { ...k, [field]: val } : k));
  const updateMilestone = (i: number, field: keyof MilestoneRow, val: string | boolean) => setMilestones((p) => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: title.trim(), description: description.trim(),
      category, priority, period, year, visibility, weightage,
      startDate: startDate || undefined, dueDate: dueDate || undefined,
      kpis: kpis.filter((k) => k.name.trim()).map((k) => ({ name: k.name.trim(), target: Number(k.target) || 0, current: Number(k.current) || 0, unit: k.unit.trim() })),
      milestones: milestones.filter((m) => m.title.trim()).map((m) => ({ title: m.title.trim(), dueDate: m.dueDate || undefined, completed: m.completed })),
      progress,
    };
    try {
      if (editId) { await performanceApi.updateGoal(editId, payload); toast.success("Goal updated"); }
      else { await performanceApi.createGoal(payload); toast.success("Goal created"); }
      navigate("/performance/goals");
    } catch { toast.error("Failed to save goal"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!editId) return;
    if (!(await confirm({ title: "Delete goal?", description: "This goal and all its check-ins and progress will be permanently removed.", confirmLabel: "Delete goal" }))) return;
    setDeleting(true);
    try { await performanceApi.deleteGoal(editId); toast.success("Goal deleted"); navigate("/performance/goals"); }
    catch { toast.error("Failed to delete"); } finally { setDeleting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/performance/goals")} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-500" /> {editId ? "Edit Goal" : "New Goal"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define your performance objective, KPIs, and milestones</p>
        </div>
        {editId && (
          <button onClick={handleDelete} disabled={deleting}
            className="rounded-lg border border-rose-300 dark:border-rose-600 px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50">
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Goal Details */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" /> Goal Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className={label}>Title</label>
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Increase quarterly revenue by 20%" />
            </div>
            <div>
              <label className={label}>Description</label>
              <textarea className={`${input} min-h-[80px] resize-y`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the goal objectives and expected outcomes..." />
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" /> Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={label}><Layers className="h-3 w-3 inline mr-1" />Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
                <option value="individual">Individual</option>
                <option value="team">Team</option>
                <option value="company">Company</option>
              </select>
            </div>
            <div>
              <label className={label}><Flag className="h-3 w-3 inline mr-1" />Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={input}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className={label}>Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className={input}>
                {["Q1", "Q2", "Q3", "Q4", "H1", "H2", "annual"].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={input}>
                {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className={label}><Eye className="h-3 w-3 inline mr-1" />Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={input}>
                <option value="private">Private</option>
                <option value="team">Team</option>
                <option value="company">Company-wide</option>
              </select>
            </div>
            <div>
              <label className={label}>Weightage (1-10)</label>
              <input type="number" min="1" max="10" value={weightage} onChange={(e) => setWeightage(Number(e.target.value))} className={input} />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-500" /> Timeline
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Start Date</label>
              <input type="date" className={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className={label}>Due Date</label>
              <input type="date" className={input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Key Performance Indicators</h2>
            <button type="button" onClick={() => setKpis((p) => [...p, emptyKpi()])}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
              <Plus className="h-3.5 w-3.5" /> Add KPI
            </button>
          </div>
          <div className="space-y-3">
            {kpis.map((kpi, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_80px_36px] gap-2 items-end rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
                <input className={input} placeholder="KPI name" value={kpi.name} onChange={(e) => updateKpi(i, "name", e.target.value)} />
                <input type="number" className={input} placeholder="Target" value={kpi.target} onChange={(e) => updateKpi(i, "target", e.target.value)} />
                <input type="number" className={input} placeholder="Current" value={kpi.current} onChange={(e) => updateKpi(i, "current", e.target.value)} />
                <input className={input} placeholder="Unit" value={kpi.unit} onChange={(e) => updateKpi(i, "unit", e.target.value)} />
                <button type="button" onClick={() => setKpis((p) => p.filter((_, idx) => idx !== i))} disabled={kpis.length <= 1}
                  className="flex items-center justify-center h-[42px] w-[36px] rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Milestones</h2>
            <button type="button" onClick={() => setMilestones((p) => [...p, emptyMilestone()])}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
              <Plus className="h-3.5 w-3.5" /> Add Milestone
            </button>
          </div>
          {milestones.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No milestones yet. Add milestones to break down your goal into smaller steps.</p>
          ) : (
            <div className="space-y-3">
              {milestones.map((ms, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_150px_36px] gap-2 items-end rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
                  <input className={input} placeholder="Milestone title" value={ms.title} onChange={(e) => updateMilestone(i, "title", e.target.value)} />
                  <input type="date" className={input} value={ms.dueDate} onChange={(e) => updateMilestone(i, "dueDate", e.target.value)} />
                  <button type="button" onClick={() => setMilestones((p) => p.filter((_, idx) => idx !== i))}
                    className="flex items-center justify-center h-[42px] w-[36px] rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress preview */}
        <div className={card}>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500 dark:text-gray-400">Auto-calculated Progress</span>
            <span className="font-bold text-gray-900 dark:text-white">{progress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate("/performance/goals")}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : editId ? "Update Goal" : "Create Goal"}
          </button>
        </div>
      </form>
    </div>
  );
}
