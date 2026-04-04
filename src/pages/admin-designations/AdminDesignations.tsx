import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2, Award } from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

interface Designation {
  name: string;
  level: number;
  grade: string;
}

export default function AdminDesignations() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("");
  const [newGrade, setNewGrade] = useState("");

  const fetchDesignations = () => {
    setLoading(true);
    adminSettingsApi
      .getDesignations()
      .then((r) => setDesignations(r.data.data || []))
      .catch(() => toast.error("Failed to load designations"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const handleAdd = () => {
    const name = newName.trim();
    const level = parseInt(newLevel, 10);
    const grade = newGrade.trim();
    if (!name) return toast.error("Name is required");
    if (isNaN(level) || level < 0) return toast.error("Valid level is required");
    if (!grade) return toast.error("Grade is required");
    if (designations.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Designation already exists");
    }
    setDesignations((prev) => [...prev, { name, level, grade }]);
    setNewName("");
    setNewLevel("");
    setNewGrade("");
    toast.success("Designation added - remember to save");
  };

  const handleDelete = (index: number) => {
    setDesignations((prev) => prev.filter((_, i) => i !== index));
    toast.success("Designation removed - remember to save");
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await adminSettingsApi.updateDesignations(designations);
      toast.success("Designations saved");
    } catch {
      toast.error("Failed to save designations");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Designations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage employee designations, levels, and grades
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All
        </button>
      </div>

      {/* Add New Designation */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
            <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Add New Designation</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Designation name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={inputCls}
          />
          <input
            type="number"
            placeholder="Level (e.g. 1)"
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
            min={0}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Grade (e.g. A1)"
            value={newGrade}
            onChange={(e) => setNewGrade(e.target.value)}
            className={inputCls}
          />
          <button
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Designations List */}
      {designations.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
          No designations configured yet. Add one above.
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    #
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Level
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Grade
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {designations.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                        Level {d.level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {d.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(i)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {designations.map((d, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-white">{d.name}</p>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                        Level {d.level}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {d.grade}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(i)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
