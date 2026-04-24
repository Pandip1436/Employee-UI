import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Building,
  Award,
  Pencil,
  Check,
  Search,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Users,
  Layers,
  TrendingUp,
  Network,
} from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import { userApi } from "../../api/userApi";
import toast from "react-hot-toast";

// ── Types ──
interface Department {
  name: string;
  description?: string;
}
interface Designation {
  name: string;
  level: number;
  grade: string;
}
type Tab = "departments" | "designations";

// ── Helpers ──
const deptSig = (ds: Department[]): string =>
  JSON.stringify(
    ds.map((d) => ({ name: d.name.trim(), description: (d.description || "").trim() }))
  );
const desigSig = (ds: Designation[]): string =>
  JSON.stringify(
    ds.map((d) => ({ name: d.name.trim(), level: d.level, grade: d.grade.trim() }))
  );

// ── Reusable primitives ──
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tint,
}: {
  icon: any;
  label: string;
  value: string | number;
  sublabel?: string;
  tint: "indigo" | "emerald" | "amber" | "rose";
}) {
  const tints: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/0 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    rose: "from-rose-500/20 to-rose-500/0 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${tints[tint]} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
          {sublabel && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tints[tint]} ring-1`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
      </div>
    </div>
  );
}

const input =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

export default function AdminOrgStructure() {
  const [tab, setTab] = useState<Tab>("departments");
  const [loading, setLoading] = useState(true);
  const [savingDept, setSavingDept] = useState(false);
  const [savingDesig, setSavingDesig] = useState(false);

  // Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptOrigSig, setDeptOrigSig] = useState("[]");
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [deptSearch, setDeptSearch] = useState("");
  const [editingDeptIdx, setEditingDeptIdx] = useState<number | null>(null);

  // Designations
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [desigOrigSig, setDesigOrigSig] = useState("[]");
  const [newDesigName, setNewDesigName] = useState("");
  const [newDesigLevel, setNewDesigLevel] = useState("");
  const [newDesigGrade, setNewDesigGrade] = useState("");
  const [desigSearch, setDesigSearch] = useState("");
  const [editingDesigIdx, setEditingDesigIdx] = useState<number | null>(null);

  // Fetch
  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      adminSettingsApi.getDepartments(),
      adminSettingsApi.getDesignations(),
      userApi.getAll({ limit: 500 }).catch(() => null),
    ])
      .then(([depRes, desigRes, userRes]) => {
        const depts: Department[] = (depRes.data.data || []).map((d: any) => ({
          name: d.name,
          description: d.description || "",
        }));
        const desigs: Designation[] = desigRes.data.data || [];
        setDepartments(depts);
        setDeptOrigSig(deptSig(depts));
        setDesignations(desigs);
        setDesigOrigSig(desigSig(desigs));
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
      .catch(() => toast.error("Failed to load org structure"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const deptDirty = useMemo(() => deptSig(departments) !== deptOrigSig, [departments, deptOrigSig]);
  const desigDirty = useMemo(() => desigSig(designations) !== desigOrigSig, [designations, desigOrigSig]);
  const dirty = deptDirty || desigDirty;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Department actions
  const setDeptAt = (i: number, patch: Partial<Department>) =>
    setDepartments((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const addDept = () => {
    const name = newDeptName.trim();
    if (!name) return toast.error("Name is required");
    if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Department already exists");
    }
    setDepartments((prev) => [...prev, { name, description: newDeptDesc.trim() }]);
    setNewDeptName("");
    setNewDeptDesc("");
  };

  const deleteDept = (i: number) => {
    const d = departments[i];
    const count = userCounts[d.name] || 0;
    const msg = count > 0
      ? `Delete "${d.name}"? ${count} user${count !== 1 ? "s are" : " is"} assigned to it.`
      : `Delete "${d.name}"?`;
    if (!confirm(msg)) return;
    setDepartments((prev) => prev.filter((_, idx) => idx !== i));
  };

  const saveDepts = async () => {
    const names = departments.map((d) => d.name.trim().toLowerCase());
    if (names.some((n) => !n)) return toast.error("Every department must have a name");
    if (new Set(names).size !== names.length) return toast.error("Department names must be unique");
    setSavingDept(true);
    try {
      await adminSettingsApi.updateDepartments(
        departments.map((d) => ({
          name: d.name.trim(),
          description: (d.description || "").trim(),
        }))
      );
      setDeptOrigSig(deptSig(departments));
      toast.success("Departments saved");
    } catch {
      toast.error("Failed to save departments");
    } finally {
      setSavingDept(false);
    }
  };

  // Designation actions
  const setDesigAt = (i: number, patch: Partial<Designation>) =>
    setDesignations((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const addDesig = () => {
    const name = newDesigName.trim();
    const level = parseInt(newDesigLevel, 10);
    const grade = newDesigGrade.trim();
    if (!name) return toast.error("Name is required");
    if (isNaN(level) || level < 0) return toast.error("Valid level is required");
    if (!grade) return toast.error("Grade is required");
    if (designations.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Designation already exists");
    }
    setDesignations((prev) => [...prev, { name, level, grade }]);
    setNewDesigName("");
    setNewDesigLevel("");
    setNewDesigGrade("");
  };

  const deleteDesig = (i: number) => {
    const d = designations[i];
    if (!confirm(`Delete designation "${d.name}"?`)) return;
    setDesignations((prev) => prev.filter((_, idx) => idx !== i));
  };

  const saveDesigs = async () => {
    const names = designations.map((d) => d.name.trim().toLowerCase());
    if (names.some((n) => !n)) return toast.error("Every designation must have a name");
    if (new Set(names).size !== names.length) return toast.error("Designation names must be unique");
    if (designations.some((d) => isNaN(d.level) || d.level < 0))
      return toast.error("Level must be a non-negative number");
    if (designations.some((d) => !d.grade.trim())) return toast.error("Every designation needs a grade");
    setSavingDesig(true);
    try {
      await adminSettingsApi.updateDesignations(
        designations.map((d) => ({ name: d.name.trim(), level: d.level, grade: d.grade.trim() }))
      );
      setDesigOrigSig(desigSig(designations));
      toast.success("Designations saved");
    } catch {
      toast.error("Failed to save designations");
    } finally {
      setSavingDesig(false);
    }
  };

  const resetAll = () => {
    if (!dirty) return;
    if (!confirm("Discard all unsaved changes?")) return;
    fetchAll();
  };

  // Filtered
  const visibleDepts = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return departments.map((d, idx) => ({ d, idx }));
    return departments
      .map((d, idx) => ({ d, idx }))
      .filter(
        ({ d }) =>
          d.name.toLowerCase().includes(q) || (d.description || "").toLowerCase().includes(q)
      );
  }, [departments, deptSearch]);

  const visibleDesigs = useMemo(() => {
    const q = desigSearch.trim().toLowerCase();
    if (!q) return designations.map((d, idx) => ({ d, idx }));
    return designations
      .map((d, idx) => ({ d, idx }))
      .filter(
        ({ d }) =>
          d.name.toLowerCase().includes(q) ||
          d.grade.toLowerCase().includes(q) ||
          String(d.level).includes(q)
      );
  }, [designations, desigSearch]);

  // Stats
  const stats = useMemo(() => {
    const assignedUsers = Object.values(userCounts).reduce((s, n) => s + n, 0);
    const topLevel = designations.reduce((max, d) => Math.max(max, d.level), 0);
    return {
      deptCount: departments.length,
      desigCount: designations.length,
      assignedUsers,
      topLevel,
    };
  }, [departments, designations, userCounts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ━━━ Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-200 backdrop-blur-sm ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" /> Admin · Settings
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <Network className="h-8 w-8 text-indigo-300" />
              Departments & Designations
            </h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/80 sm:text-base">
              Shape your org chart — manage departments, titles, levels, and grades in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30 backdrop-blur-sm">
                <AlertCircle className="h-3.5 w-3.5" />
                Unsaved changes
              </span>
            )}
            {dirty && (
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15"
              >
                <RotateCcw className="h-4 w-4" /> Discard
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ Stats ━━━ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Building} label="Departments" value={stats.deptCount} sublabel="Configured" tint="emerald" />
        <StatCard icon={Award} label="Designations" value={stats.desigCount} sublabel="Titles + grades" tint="indigo" />
        <StatCard icon={Users} label="Assigned" value={stats.assignedUsers} sublabel="Users in a dept" tint="amber" />
        <StatCard icon={TrendingUp} label="Top level" value={stats.topLevel || "—"} sublabel="Highest designation" tint="rose" />
      </div>

      {/* ━━━ Tabs ━━━ */}
      <div className="flex items-center gap-1 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 p-1 backdrop-blur-sm w-fit">
        {(
          [
            { key: "departments" as const, label: "Departments", icon: Building, count: departments.length, dirty: deptDirty },
            { key: "designations" as const, label: "Designations", icon: Award, count: designations.length, dirty: desigDirty },
          ]
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                tab === t.key
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  tab === t.key
                    ? "bg-white/25 text-white"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {t.count}
              </span>
              {t.dirty && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ━━━ Departments Tab ━━━ */}
      {tab === "departments" && (
        <div className="space-y-5">
          {/* Add card */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-white to-emerald-50/50 dark:from-gray-900 dark:to-emerald-950/30 p-5 sm:p-6 shadow-sm">
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">New department</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Set up a team or business unit
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-5">
                <input
                  type="text"
                  placeholder="Name (e.g. Engineering)"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDept()}
                  className={`sm:col-span-2 ${input}`}
                />
                <input
                  type="text"
                  placeholder="Short description (optional)"
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDept()}
                  className={`sm:col-span-2 ${input}`}
                />
                <button
                  onClick={addDept}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 transition-all"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                placeholder="Search departments…"
                className={`${input} pl-10`}
              />
            </div>
            <button
              onClick={saveDepts}
              disabled={savingDept || !deptDirty}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {savingDept ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Departments
            </button>
          </div>

          {/* Empty states / list */}
          {departments.length === 0 ? (
            <EmptyBlock
              title="No departments yet"
              sub="Add one above to start building your org structure."
              tone="emerald"
              icon={Building}
            />
          ) : visibleDepts.length === 0 ? (
            <EmptyBlock
              title={`No departments match "${deptSearch}"`}
              sub="Try a different search term."
              tone="emerald"
              icon={Search}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 backdrop-blur-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200/70 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-800/40">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-12">#</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-32">Users</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-28 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {visibleDepts.map(({ d, idx }) => {
                      const count = userCounts[d.name] || 0;
                      return (
                        <tr key={idx} className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 tabular-nums text-gray-400 dark:text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3">
                            {editingDeptIdx === idx ? (
                              <input
                                autoFocus
                                value={d.name}
                                onChange={(e) => setDeptAt(idx, { name: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape") setEditingDeptIdx(null);
                                }}
                                onBlur={() => setEditingDeptIdx(null)}
                                className={`${input} font-semibold`}
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/5 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
                                  <Building className="h-3.5 w-3.5" />
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">{d.name}</span>
                                <button
                                  onClick={() => setEditingDeptIdx(idx)}
                                  className="rounded-md p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={d.description || ""}
                              onChange={(e) => setDeptAt(idx, { description: e.target.value })}
                              placeholder="—"
                              className="w-full bg-transparent text-gray-600 dark:text-gray-400 text-sm outline-none focus:bg-gray-50 dark:focus:bg-gray-800/60 rounded px-2 py-1 transition-colors"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ${
                                count > 0
                                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-indigo-500/20"
                                  : "bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 ring-gray-500/20"
                              }`}
                            >
                              {count} {count === 1 ? "user" : "users"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => deleteDept(idx)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
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
                {visibleDepts.map(({ d, idx }) => {
                  const count = userCounts[d.name] || 0;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 space-y-2"
                    >
                      {editingDeptIdx === idx ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={d.name}
                            onChange={(e) => setDeptAt(idx, { name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape") setEditingDeptIdx(null);
                            }}
                            className={`${input} font-semibold`}
                          />
                          <button onClick={() => setEditingDeptIdx(null)} className="rounded-md p-2 text-emerald-600">
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="flex-1 font-bold text-gray-900 dark:text-white">{d.name}</p>
                          <button onClick={() => setEditingDeptIdx(idx)} className="rounded-md p-1 text-gray-400">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <input
                        value={d.description || ""}
                        onChange={(e) => setDeptAt(idx, { description: e.target.value })}
                        placeholder="Add description…"
                        className={`text-xs ${input}`}
                      />
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                            count > 0
                              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-indigo-500/20"
                              : "bg-gray-100 dark:bg-gray-800/50 text-gray-500 ring-gray-500/20"
                          }`}
                        >
                          {count} {count === 1 ? "user" : "users"}
                        </span>
                        <button
                          onClick={() => deleteDept(idx)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ━━━ Designations Tab ━━━ */}
      {tab === "designations" && (
        <div className="space-y-5">
          {/* Add card */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-white to-indigo-50/50 dark:from-gray-900 dark:to-indigo-950/30 p-5 sm:p-6 shadow-sm">
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/15 blur-3xl" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">New designation</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Define a title with its seniority level and grade
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  placeholder="Title (e.g. Senior Engineer)"
                  value={newDesigName}
                  onChange={(e) => setNewDesigName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDesig()}
                  className={input}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Level (e.g. 3)"
                  value={newDesigLevel}
                  onChange={(e) => setNewDesigLevel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDesig()}
                  className={input}
                />
                <input
                  type="text"
                  placeholder="Grade (e.g. L3)"
                  value={newDesigGrade}
                  onChange={(e) => setNewDesigGrade(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDesig()}
                  className={input}
                />
                <button
                  onClick={addDesig}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 transition-all"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={desigSearch}
                onChange={(e) => setDesigSearch(e.target.value)}
                placeholder="Search titles, levels, grades…"
                className={`${input} pl-10`}
              />
            </div>
            <button
              onClick={saveDesigs}
              disabled={savingDesig || !desigDirty}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {savingDesig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Designations
            </button>
          </div>

          {/* Empty / list */}
          {designations.length === 0 ? (
            <EmptyBlock
              title="No designations yet"
              sub="Add one above to define career levels."
              tone="indigo"
              icon={Award}
            />
          ) : visibleDesigs.length === 0 ? (
            <EmptyBlock
              title={`No designations match "${desigSearch}"`}
              sub="Try a different search term."
              tone="indigo"
              icon={Search}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 backdrop-blur-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200/70 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-800/40">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-12">#</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Title</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-32">Level</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-32">Grade</th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-28 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {visibleDesigs.map(({ d, idx }) => (
                      <tr key={idx} className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 tabular-nums text-gray-400 dark:text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3">
                          {editingDesigIdx === idx ? (
                            <input
                              autoFocus
                              value={d.name}
                              onChange={(e) => setDesigAt(idx, { name: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") setEditingDesigIdx(null);
                              }}
                              onBlur={() => setEditingDesigIdx(null)}
                              className={`${input} font-semibold`}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/5 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20">
                                <Award className="h-3.5 w-3.5" />
                              </div>
                              <span className="font-semibold text-gray-900 dark:text-white">{d.name}</span>
                              <button
                                onClick={() => setEditingDesigIdx(idx)}
                                className="rounded-md p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={d.level}
                            onChange={(e) => setDesigAt(idx, { level: parseInt(e.target.value, 10) || 0 })}
                            className="w-24 rounded-lg bg-indigo-50/60 dark:bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20 outline-none focus:ring-2 focus:ring-indigo-500/30 tabular-nums"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={d.grade}
                            onChange={(e) => setDesigAt(idx, { grade: e.target.value })}
                            className="w-24 rounded-lg bg-amber-50/60 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20 outline-none focus:ring-2 focus:ring-amber-500/30"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteDesig(idx)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
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

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {visibleDesigs.map(({ d, idx }) => (
                  <div key={idx} className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 space-y-3">
                    {editingDesigIdx === idx ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={d.name}
                          onChange={(e) => setDesigAt(idx, { name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape") setEditingDesigIdx(null);
                          }}
                          className={`${input} font-semibold`}
                        />
                        <button onClick={() => setEditingDesigIdx(null)} className="rounded-md p-2 text-emerald-600">
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="flex-1 font-bold text-gray-900 dark:text-white">{d.name}</p>
                        <button onClick={() => setEditingDesigIdx(idx)} className="rounded-md p-1 text-gray-400">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Level</label>
                      <input
                        type="number"
                        min={0}
                        value={d.level}
                        onChange={(e) => setDesigAt(idx, { level: parseInt(e.target.value, 10) || 0 })}
                        className="w-20 rounded-lg bg-indigo-50/60 dark:bg-indigo-500/10 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20 tabular-nums"
                      />
                      <label className="ml-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Grade</label>
                      <input
                        value={d.grade}
                        onChange={(e) => setDesigAt(idx, { grade: e.target.value })}
                        className="w-20 rounded-lg bg-amber-50/60 dark:bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20"
                      />
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => deleteDesig(idx)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* silence unused symbol */}
      <span className="hidden">{Layers.name}</span>
    </div>
  );
}

function EmptyBlock({
  title,
  sub,
  tone,
  icon: Icon,
}: {
  title: string;
  sub: string;
  tone: "emerald" | "indigo";
  icon: any;
}) {
  const gradient =
    tone === "emerald"
      ? "from-emerald-500 to-teal-600"
      : "from-indigo-500 to-violet-600";
  const glow = tone === "emerald" ? "bg-emerald-500/20" : "bg-indigo-500/20";
  return (
    <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-4">
        <div className={`absolute inset-0 ${glow} blur-2xl`} />
        <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
      <p className="text-base font-bold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{sub}</p>
    </div>
  );
}
