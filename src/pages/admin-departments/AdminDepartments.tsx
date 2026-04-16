import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Save, Loader2, Building, Pencil, Check, Search, AlertCircle, RotateCcw } from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import { userApi } from "../../api/userApi";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

interface Department {
  name: string;
  description?: string;
}

const normalize = (ds: Department[]): string =>
  JSON.stringify(ds.map((d) => ({ name: d.name.trim(), description: (d.description || "").trim() })));

export default function AdminDepartments() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [originalSig, setOriginalSig] = useState("[]");
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [search, setSearch] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      adminSettingsApi.getDepartments(),
      userApi.getAll({ limit: 500 }).catch(() => null),
    ])
      .then(([depRes, userRes]) => {
        const depts: Department[] = (depRes.data.data || []).map((d: any) => ({
          name: d.name, description: d.description || "",
        }));
        setDepartments(depts);
        setOriginalSig(normalize(depts));
        if (userRes) {
          const counts: Record<string, number> = {};
          for (const u of userRes.data.data) {
            const key = (u.department || "").trim();
            if (!key) continue;
            counts[key] = (counts[key] || 0) + 1;
          }
          setUserCounts(counts);
        }
      })
      .catch(() => toast.error("Failed to load departments"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const dirty = useMemo(() => normalize(departments) !== originalSig, [departments, originalSig]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const setAt = (i: number, patch: Partial<Department>) =>
    setDepartments((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return toast.error("Name is required");
    if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Department already exists");
    }
    setDepartments((prev) => [...prev, { name, description: newDesc.trim() }]);
    setNewName(""); setNewDesc("");
  };

  const handleDelete = (i: number) => {
    const dept = departments[i];
    const count = userCounts[dept.name] || 0;
    const msg = count > 0
      ? `Delete "${dept.name}"? ${count} user${count !== 1 ? "s are" : " is"} assigned to it.`
      : `Delete "${dept.name}"?`;
    if (!confirm(msg)) return;
    setDepartments((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleReset = () => {
    if (!dirty) return;
    if (!confirm("Discard all unsaved changes?")) return;
    fetchAll();
  };

  const handleSaveAll = async () => {
    const names = departments.map((d) => d.name.trim().toLowerCase());
    if (names.some((n) => !n)) return toast.error("Every department must have a name");
    if (new Set(names).size !== names.length) return toast.error("Department names must be unique");

    setSaving(true);
    try {
      await adminSettingsApi.updateDepartments(
        departments.map((d) => ({ name: d.name.trim(), description: (d.description || "").trim() }))
      );
      setOriginalSig(normalize(departments));
      toast.success("Departments saved");
    } catch {
      toast.error("Failed to save departments");
    } finally {
      setSaving(false);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments.map((d, idx) => ({ d, idx }));
    return departments
      .map((d, idx) => ({ d, idx }))
      .filter(({ d }) =>
        d.name.toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q)
      );
  }, [departments, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Departments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage the list of departments employees can be assigned to
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              Unsaved changes
            </span>
          )}
          {dirty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Discard
            </button>
          )}
          <button
            onClick={handleSaveAll}
            disabled={saving || !dirty}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All
          </button>
        </div>
      </div>

      {/* Add New */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
            <Building className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Add New Department</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Name (e.g. Engineering)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            className={`sm:col-span-2 ${inputCls}`}
          />
          <input
            type="text"
            placeholder="Short description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            className={`sm:col-span-2 ${inputCls}`}
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

      {/* Search */}
      {departments.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments..."
            className={`w-full pl-9 ${inputCls}`}
          />
        </div>
      )}

      {/* List */}
      {departments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
          No departments yet. Add one above.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
          No departments match "{search}"
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">#</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Users</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visible.map(({ d, idx }) => {
                  const count = userCounts[d.name] || 0;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        {editingIdx === idx ? (
                          <input
                            autoFocus
                            value={d.name}
                            onChange={(e) => setAt(idx, { name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingIdx(null); }}
                            onBlur={() => setEditingIdx(null)}
                            className={`${inputCls} font-medium`}
                          />
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-medium text-gray-900 dark:text-white">{d.name}</span>
                            <button
                              onClick={() => setEditingIdx(idx)}
                              className="rounded-md p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={d.description || ""}
                          onChange={(e) => setAt(idx, { description: e.target.value })}
                          placeholder="—"
                          className="w-full bg-transparent text-gray-600 dark:text-gray-400 text-sm outline-none focus:bg-gray-50 dark:focus:bg-gray-800 rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          count > 0
                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        }`}>
                          {count} user{count !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(idx)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {visible.map(({ d, idx }) => {
              const count = userCounts[d.name] || 0;
              return (
                <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      {editingIdx === idx ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={d.name}
                            onChange={(e) => setAt(idx, { name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingIdx(null); }}
                            className={`${inputCls} font-semibold`}
                          />
                          <button onClick={() => setEditingIdx(null)} className="rounded-md p-1.5 text-emerald-600">
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">{d.name}</p>
                          <button onClick={() => setEditingIdx(idx)} className="rounded-md p-1 text-gray-400">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <input
                        value={d.description || ""}
                        onChange={(e) => setAt(idx, { description: e.target.value })}
                        placeholder="Add description..."
                        className={`w-full text-xs ${inputCls}`}
                      />
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        count > 0
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}>
                        {count} user{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
