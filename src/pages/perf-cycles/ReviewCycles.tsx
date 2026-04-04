import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Plus, Calendar, ArrowLeft, Save, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { performanceApi, type CycleData } from "../../api/performanceApi";
import toast from "react-hot-toast";

export default function ReviewCycles() {
  
  const navigate = useNavigate();

  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selfDeadline, setSelfDeadline] = useState("");
  const [managerDeadline, setManagerDeadline] = useState("");

  const fetchCycles = () => {
    setLoading(true);
    performanceApi
      .getCycles()
      .then((r) => setCycles(r.data.data ?? []))
      .catch(() => toast.error("Failed to load cycles"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCycles(); }, []);

  const resetForm = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setSelfDeadline("");
    setManagerDeadline("");
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (cycle: CycleData) => {
    setEditId(cycle._id);
    setName(cycle.name);
    setStartDate(cycle.startDate.split("T")[0]);
    setEndDate(cycle.endDate.split("T")[0]);
    setSelfDeadline(cycle.selfDeadline ? cycle.selfDeadline.split("T")[0] : "");
    setManagerDeadline(cycle.managerDeadline ? cycle.managerDeadline.split("T")[0] : "");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    if (!startDate || !endDate) return toast.error("Start and end dates are required");

    setSaving(true);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      startDate,
      endDate,
      selfDeadline: selfDeadline || undefined,
      managerDeadline: managerDeadline || undefined,
    };

    try {
      if (editId) {
        await performanceApi.updateCycle(editId, payload);
        toast.success("Cycle updated");
      } else {
        await performanceApi.createCycle(payload);
        toast.success("Cycle created");
      }
      resetForm();
      fetchCycles();
    } catch {
      toast.error("Failed to save cycle");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cycle: CycleData) => {
    try {
      await performanceApi.updateCycle(cycle._id, { isActive: !cycle.isActive });
      toast.success(cycle.isActive ? "Cycle deactivated" : "Cycle activated");
      fetchCycles();
    } catch {
      toast.error("Failed to update cycle");
    }
  };

  const input = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";
  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="h-6 w-6 text-indigo-500" /> Review Cycles
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage performance review cycles</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> New Cycle
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className={card}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{editId ? "Edit Cycle" : "Create New Cycle"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cycle Name</label>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Q2 2026 Performance Review" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Date</label>
                <input type="date" className={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Date</label>
                <input type="date" className={input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Self-Review Deadline</label>
                <input type="date" className={input} value={selfDeadline} onChange={(e) => setSelfDeadline(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Manager Review Deadline</label>
                <input type="date" className={input} value={managerDeadline} onChange={(e) => setManagerDeadline(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={resetForm} className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving..." : editId ? "Update Cycle" : "Create Cycle"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {/* Empty */}
      {!loading && cycles.length === 0 && (
        <div className={`${card} flex flex-col items-center justify-center py-16 text-center`}>
          <RefreshCw className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No review cycles yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first review cycle to get started</p>
        </div>
      )}

      {/* Cycles List */}
      {!loading && cycles.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cycles.map((cycle) => (
            <div key={cycle._id} className={card}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">{cycle.name}</h3>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0 ${
                  cycle.isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-gray-500/10 text-gray-400"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cycle.isActive ? "bg-emerald-400" : "bg-gray-400"}`} />
                  {cycle.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Dates */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {new Date(cycle.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} - {new Date(cycle.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                {cycle.selfDeadline && (
                  <div className="text-xs text-gray-400">
                    Self deadline: {new Date(cycle.selfDeadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                )}
                {cycle.managerDeadline && (
                  <div className="text-xs text-gray-400">
                    Manager deadline: {new Date(cycle.managerDeadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => toggleActive(cycle)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    cycle.isActive
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                  }`}
                >
                  {cycle.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  {cycle.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => openEdit(cycle)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
