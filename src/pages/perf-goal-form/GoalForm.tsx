import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Target, Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { performanceApi } from "../../api/performanceApi";
import toast from "react-hot-toast";

interface KpiRow { name: string; target: string; current: string; unit: string; }

const emptyKpi = (): KpiRow => ({ name: "", target: "", current: "", unit: "" });

function calcProgress(kpis: KpiRow[]): number {
  const valid = kpis.filter((k) => Number(k.target) > 0);
  if (valid.length === 0) return 0;
  const total = valid.reduce((sum, k) => sum + Math.min(Number(k.current) / Number(k.target), 1), 0);
  return Math.round((total / valid.length) * 100);
}

export default function GoalForm() {
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [kpis, setKpis] = useState<KpiRow[]>([emptyKpi()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  const progress = calcProgress(kpis);

  useEffect(() => {
    if (!editId) return;
    performanceApi
      .getGoals()
      .then((r) => {
        const goal = (r.data.data ?? []).find((g) => g._id === editId);
        if (goal) {
          setTitle(goal.title);
          setDescription(goal.description || "");
          setDueDate(goal.dueDate ? goal.dueDate.split("T")[0] : "");
          setKpis(
            goal.kpis.length > 0
              ? goal.kpis.map((k) => ({ name: k.name, target: String(k.target), current: String(k.current), unit: k.unit }))
              : [emptyKpi()]
          );
        }
      })
      .catch(() => toast.error("Failed to load goal"))
      .finally(() => setLoading(false));
  }, [editId]);

  const updateKpi = (idx: number, field: keyof KpiRow, value: string) => {
    setKpis((prev) => prev.map((k, i) => (i === idx ? { ...k, [field]: value } : k)));
  };

  const addKpi = () => setKpis((prev) => [...prev, emptyKpi()]);
  const removeKpi = (idx: number) => setKpis((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    setSaving(true);

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || undefined,
      kpis: kpis
        .filter((k) => k.name.trim())
        .map((k) => ({ name: k.name.trim(), target: Number(k.target) || 0, current: Number(k.current) || 0, unit: k.unit.trim() })),
      progress,
    };

    try {
      if (editId) {
        await performanceApi.updateGoal(editId, payload);
        toast.success("Goal updated");
      } else {
        await performanceApi.createGoal(payload);
        toast.success("Goal created");
      }
      navigate("/performance/goals");
    } catch {
      toast.error("Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";
  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/performance/goals")} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-500" /> {editId ? "Edit Goal" : "New Goal"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define your performance goal and KPIs</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Goal Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Increase quarterly sales by 20%" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea className={`${input} min-h-[100px] resize-y`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the goal objectives and expected outcomes..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date</label>
              <input type="date" className={input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Key Performance Indicators</h2>
            <button type="button" onClick={addKpi} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add KPI
            </button>
          </div>

          <div className="space-y-3">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_80px_36px] gap-2 items-end rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 sm:hidden">Name</label>
                  <input className={input} placeholder="KPI name" value={kpi.name} onChange={(e) => updateKpi(idx, "name", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 sm:hidden">Target</label>
                  <input type="number" className={input} placeholder="Target" value={kpi.target} onChange={(e) => updateKpi(idx, "target", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 sm:hidden">Current</label>
                  <input type="number" className={input} placeholder="Current" value={kpi.current} onChange={(e) => updateKpi(idx, "current", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 sm:hidden">Unit</label>
                  <input className={input} placeholder="Unit" value={kpi.unit} onChange={(e) => updateKpi(idx, "unit", e.target.value)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeKpi(idx)}
                  disabled={kpis.length <= 1}
                  className="flex items-center justify-center h-[42px] w-[36px] rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Auto-calculated Progress */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500 dark:text-gray-400">Auto-calculated Progress</span>
              <span className="font-bold text-gray-900 dark:text-white">{progress}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate("/performance/goals")} className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : editId ? "Update Goal" : "Create Goal"}
          </button>
        </div>
      </form>
    </div>
  );
}
