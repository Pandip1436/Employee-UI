import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Plus, Trash2, Save, Loader2, ShieldCheck, Copy, Pencil, Check, X,
  Search, LayoutGrid, Table2, ChevronDown, ChevronRight, Users, Sparkles,
  RotateCcw, AlertCircle,
} from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

// ── Permission model ──────────────────────────────────────────────────────
type Action = "view" | "create" | "edit" | "delete" | "approve" | "export";

interface ModuleDef { id: string; label: string; actions: Action[]; }
interface GroupDef { id: string; label: string; modules: ModuleDef[]; }

const PERMISSION_GROUPS: GroupDef[] = [
  {
    id: "core", label: "Core",
    modules: [
      { id: "dashboard", label: "Dashboard", actions: ["view"] },
      { id: "attendance", label: "Attendance", actions: ["view", "create", "edit", "delete"] },
      { id: "timesheet", label: "Timesheet", actions: ["view", "create", "edit", "delete", "approve"] },
    ],
  },
  {
    id: "hr", label: "HR",
    modules: [
      { id: "leave", label: "Leave", actions: ["view", "create", "edit", "delete", "approve"] },
      { id: "documents", label: "Documents", actions: ["view", "create", "edit", "delete"] },
      { id: "employees", label: "Employees", actions: ["view", "create", "edit", "delete"] },
      { id: "approvals", label: "Approvals", actions: ["view", "approve"] },
    ],
  },
  {
    id: "insights", label: "Insights",
    modules: [
      { id: "reports", label: "Reports", actions: ["view", "export"] },
    ],
  },
  {
    id: "system", label: "System",
    modules: [
      { id: "admin", label: "Admin Settings", actions: ["view", "edit"] },
    ],
  },
];

const ALL_MODULES: ModuleDef[] = PERMISSION_GROUPS.flatMap((g) => g.modules);
const moduleById = (id: string) => ALL_MODULES.find((m) => m.id === id);

// Legacy bare "module" string → expand to every action for that module.
const expandLegacyPerms = (perms: string[]): string[] => {
  const out = new Set<string>();
  for (const p of perms || []) {
    if (p.includes(":")) { out.add(p); continue; }
    const mod = moduleById(p);
    if (mod) mod.actions.forEach((a) => out.add(`${p}:${a}`));
    else out.add(p); // unknown legacy key — preserve as-is
  }
  return [...out];
};

const allPermKeys = (): string[] =>
  ALL_MODULES.flatMap((m) => m.actions.map((a) => `${m.id}:${a}`));

// ── Presets ───────────────────────────────────────────────────────────────
const PRESETS: { name: string; description: string; perms: string[] }[] = [
  { name: "Admin", description: "Full access to every module and setting", perms: allPermKeys() },
  {
    name: "Manager", description: "View team data, approve requests, no admin settings",
    perms: [
      ...ALL_MODULES.filter((m) => m.id !== "admin").flatMap((m) => [`${m.id}:view`]),
      "timesheet:approve", "leave:approve", "approvals:approve", "reports:export",
    ],
  },
  {
    name: "HR", description: "Manage employees, leave, documents, and reports",
    perms: [
      "dashboard:view",
      ...["leave", "documents", "employees"].flatMap((id) =>
        (moduleById(id)!.actions as Action[]).map((a) => `${id}:${a}`)),
      "attendance:view", "timesheet:view", "reports:view", "reports:export",
      "approvals:view", "approvals:approve",
    ],
  },
  {
    name: "Employee", description: "Basic access: dashboard + own attendance / timesheet / leave",
    perms: [
      "dashboard:view", "attendance:view", "attendance:create",
      "timesheet:view", "timesheet:create", "leave:view", "leave:create",
      "documents:view",
    ],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────
interface Role {
  name: string;
  description?: string;
  permissions: string[]; // granular: "module:action"
}

// Canonical signature for unsaved-change detection
const normalizeRoles = (rs: Role[]): string =>
  JSON.stringify(
    rs.map((r) => ({
      name: r.name,
      description: r.description || "",
      permissions: [...r.permissions].sort(),
    }))
  );

export default function AdminRoles() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [originalSig, setOriginalSig] = useState<string>("[]");
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "matrix">("cards");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.id, true]))
  );
  const [editingNameIdx, setEditingNameIdx] = useState<number | null>(null);
  const [editingDescIdx, setEditingDescIdx] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  // New-role form
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);

  // ── Fetchers ──
  const fetchRoles = () => {
    setLoading(true);
    Promise.all([adminSettingsApi.getRoles(), adminSettingsApi.getRoleUserCounts().catch(() => null)])
      .then(([rolesRes, countsRes]) => {
        const raw = rolesRes.data.data || [];
        const hydrated: Role[] = raw.map((r: any) => ({
          name: r.name,
          description: r.description || "",
          permissions: expandLegacyPerms(r.permissions || []),
        }));
        setRoles(hydrated);
        setOriginalSig(normalizeRoles(hydrated));
        if (countsRes) setUserCounts(countsRes.data.data || {});
      })
      .catch(() => toast.error("Failed to load roles"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRoles(); }, []);

  // Warn on navigate-away with unsaved changes
  const dirty = useMemo(() => normalizeRoles(roles) !== originalSig, [roles, originalSig]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ── Helpers ──
  const setRoleAt = (i: number, patch: Partial<Role>) =>
    setRoles((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const toggleRolePerm = (i: number, key: string) =>
    setRoleAt(i, {
      permissions: roles[i].permissions.includes(key)
        ? roles[i].permissions.filter((p) => p !== key)
        : [...roles[i].permissions, key],
    });

  const toggleNewPerm = (key: string) =>
    setNewPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));

  const setGroupForRole = (i: number, groupId: string, value: boolean) => {
    const group = PERMISSION_GROUPS.find((g) => g.id === groupId)!;
    const groupKeys = group.modules.flatMap((m) => m.actions.map((a) => `${m.id}:${a}`));
    const set = new Set(roles[i].permissions);
    if (value) groupKeys.forEach((k) => set.add(k));
    else groupKeys.forEach((k) => set.delete(k));
    setRoleAt(i, { permissions: [...set] });
  };

  const setGroupForNew = (groupId: string, value: boolean) => {
    const group = PERMISSION_GROUPS.find((g) => g.id === groupId)!;
    const groupKeys = group.modules.flatMap((m) => m.actions.map((a) => `${m.id}:${a}`));
    setNewPermissions((prev) => {
      const set = new Set(prev);
      if (value) groupKeys.forEach((k) => set.add(k));
      else groupKeys.forEach((k) => set.delete(k));
      return [...set];
    });
  };

  const setModuleForRole = (i: number, modId: string, value: boolean) => {
    const mod = moduleById(modId)!;
    const keys = mod.actions.map((a) => `${modId}:${a}`);
    const set = new Set(roles[i].permissions);
    if (value) keys.forEach((k) => set.add(k));
    else keys.forEach((k) => set.delete(k));
    setRoleAt(i, { permissions: [...set] });
  };

  const setModuleForNew = (modId: string, value: boolean) => {
    const mod = moduleById(modId)!;
    const keys = mod.actions.map((a) => `${modId}:${a}`);
    setNewPermissions((prev) => {
      const set = new Set(prev);
      if (value) keys.forEach((k) => set.add(k));
      else keys.forEach((k) => set.delete(k));
      return [...set];
    });
  };

  // ── Actions ──
  const handleAdd = () => {
    const name = newRoleName.trim();
    if (!name) return toast.error("Role name is required");
    if (newPermissions.length === 0) return toast.error("Select at least one permission");
    if (roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Role already exists");
    }
    setRoles((prev) => [...prev, { name, description: newRoleDesc.trim(), permissions: [...newPermissions] }]);
    setNewRoleName(""); setNewRoleDesc(""); setNewPermissions([]);
    toast.success("Role added — remember to save");
  };

  const handleDelete = (i: number) => {
    if (!confirm(`Delete role "${roles[i].name}"?`)) return;
    setRoles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleClone = (i: number) => {
    const src = roles[i];
    let name = `${src.name} (Copy)`;
    let n = 2;
    while (roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      name = `${src.name} (Copy ${n++})`;
    }
    setRoles((prev) => [...prev, { ...src, name, permissions: [...src.permissions] }]);
    toast.success(`Cloned as "${name}"`);
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    let name = preset.name;
    let n = 2;
    while (roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      name = `${preset.name} ${n++}`;
    }
    setRoles((prev) => [...prev, { name, description: preset.description, permissions: [...preset.perms] }]);
    setShowPresets(false);
    toast.success(`Added "${name}" from preset`);
  };

  const handleResetChanges = () => {
    if (!dirty) return;
    if (!confirm("Discard all unsaved changes?")) return;
    fetchRoles();
  };

  const handleSaveAll = async () => {
    // Validate unique names
    const names = roles.map((r) => r.name.trim().toLowerCase());
    if (names.some((n) => !n)) return toast.error("Every role must have a name");
    if (new Set(names).size !== names.length) return toast.error("Role names must be unique");

    setSaving(true);
    try {
      await adminSettingsApi.updateRoles(
        roles.map((r) => ({ name: r.name.trim(), description: r.description?.trim() || "", permissions: r.permissions }))
      );
      setOriginalSig(normalizeRoles(roles));
      toast.success("Roles saved");
      // Refresh counts (names may have changed)
      adminSettingsApi.getRoleUserCounts().then((r) => setUserCounts(r.data.data || {})).catch(() => {});
    } catch {
      toast.error("Failed to save roles");
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered roles ──
  const visibleRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles.map((r, i) => ({ role: r, idx: i }));
    return roles
      .map((r, i) => ({ role: r, idx: i }))
      .filter(({ role }) =>
        role.name.toLowerCase().includes(q) ||
        (role.description || "").toLowerCase().includes(q)
      );
  }, [roles, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // ── Render helpers ──
  const ActionPill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-all ${
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );

  const renderGroupEditor = (
    perms: string[],
    onTogglePerm: (k: string) => void,
    onToggleGroup: (gid: string, val: boolean) => void,
    onToggleModule: (mid: string, val: boolean) => void,
  ) => (
    <div className="space-y-3">
      {PERMISSION_GROUPS.map((group) => {
        const groupKeys = group.modules.flatMap((m) => m.actions.map((a) => `${m.id}:${a}`));
        const selectedInGroup = groupKeys.filter((k) => perms.includes(k)).length;
        const allSelected = selectedInGroup === groupKeys.length;
        const expanded = expandedGroups[group.id];
        return (
          <div key={group.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setExpandedGroups((p) => ({ ...p, [group.id]: !p[group.id] }))}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {group.label}
                <span className="ml-1 rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-[10px] text-gray-600 dark:text-gray-300">
                  {selectedInGroup}/{groupKeys.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onToggleGroup(group.id, !allSelected)}
                className={`text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
                  allSelected
                    ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                }`}
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>
            {expanded && (
              <div className="space-y-2 px-3 pb-3">
                {group.modules.map((mod) => {
                  const modKeys = mod.actions.map((a) => `${mod.id}:${a}`);
                  const modSelected = modKeys.filter((k) => perms.includes(k)).length;
                  const allModSelected = modSelected === modKeys.length;
                  return (
                    <div key={mod.id} className="rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{mod.label}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {modSelected}/{modKeys.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleModule(mod.id, !allModSelected)}
                          className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {allModSelected ? "clear" : "all"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.actions.map((a) => {
                          const key = `${mod.id}:${a}`;
                          return (
                            <ActionPill key={key} active={perms.includes(key)} onClick={() => onTogglePerm(key)}>
                              {a}
                            </ActionPill>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ━━━ Header ━━━ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define roles and assign granular, action-level permissions
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
              onClick={handleResetChanges}
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

      {/* ━━━ Toolbar: search + presets + view toggle ━━━ */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles by name or description..."
            className={`w-full pl-9 ${inputCls}`}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "cards" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "matrix" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <Table2 className="h-3.5 w-3.5" /> Matrix
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowPresets((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Sparkles className="h-4 w-4 text-amber-500" /> Preset
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showPresets && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPresets(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  Insert role from preset
                </p>
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className="block w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {p.perms.length} permissions
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ━━━ Add New Role (cards mode only) ━━━ */}
      {viewMode === "cards" && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10">
              <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Add New Role</h3>
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Role name (e.g. Team Lead)"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className={`w-full ${inputCls}`}
              />
              <input
                type="text"
                placeholder="Short description (optional)"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className={`w-full ${inputCls}`}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Permissions</p>
              {renderGroupEditor(
                newPermissions,
                toggleNewPerm,
                setGroupForNew,
                setModuleForNew,
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Role
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {newPermissions.length} permission{newPermissions.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ Roles List ━━━ */}
      {roles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
          No roles configured yet. Add one above or pick a preset.
        </div>
      ) : visibleRoles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
          No roles match "{search}"
        </div>
      ) : viewMode === "cards" ? (
        <div className="space-y-4">
          {visibleRoles.map(({ role, idx }) => {
            const totalPerms = allPermKeys().length;
            const selectedPerms = role.permissions.filter((p) => p.includes(":")).length;
            const count = userCounts[role.name] ?? 0;
            return (
              <div
                key={idx}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                      <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Inline name editor */}
                      {editingNameIdx === idx ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={role.name}
                            onChange={(e) => setRoleAt(idx, { name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingNameIdx(null); }}
                            className={`${inputCls} text-lg font-semibold`}
                          />
                          <button onClick={() => setEditingNameIdx(null)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                          <button onClick={() => setEditingNameIdx(idx)} className="rounded-md p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                            <Users className="h-3 w-3" /> {count} user{count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {/* Inline description editor */}
                      {editingDescIdx === idx ? (
                        <div className="mt-2 flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={role.description || ""}
                            placeholder="Describe this role..."
                            onChange={(e) => setRoleAt(idx, { description: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingDescIdx(null); }}
                            className={`flex-1 ${inputCls} text-xs`}
                          />
                          <button onClick={() => setEditingDescIdx(null)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingDescIdx(idx)}
                          className="mt-1 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-left flex items-center gap-1 group"
                        >
                          {role.description || <span className="italic text-gray-400 dark:text-gray-500">Add description...</span>}
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleClone(idx)}
                      title="Clone role"
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Clone
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {renderGroupEditor(
                  role.permissions,
                  (k) => toggleRolePerm(idx, k),
                  (gid, v) => setGroupForRole(idx, gid, v),
                  (mid, v) => setModuleForRole(idx, mid, v),
                )}

                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  {selectedPerms}/{totalPerms} permissions assigned
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        // ━━━ Matrix view ━━━
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 sticky top-0">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 min-w-[180px]">
                  Permission
                </th>
                {visibleRoles.map(({ role, idx }) => (
                  <th key={idx} className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200 min-w-[100px]">
                    <div className="flex flex-col items-center">
                      <span className="truncate max-w-[100px]">{role.name}</span>
                      <span className="text-[10px] font-normal text-gray-400">
                        {userCounts[role.name] ?? 0} user{(userCounts[role.name] ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <Fragment key={group.id}>
                  <tr className="bg-gray-100 dark:bg-gray-800/80">
                    <td colSpan={visibleRoles.length + 1} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      {group.label}
                    </td>
                  </tr>
                  {group.modules.map((mod) =>
                    mod.actions.map((action) => {
                      const key = `${mod.id}:${action}`;
                      return (
                        <tr key={key} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="sticky left-0 bg-white dark:bg-gray-900 px-4 py-2 text-xs text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{mod.label}</span>
                            <span className="ml-1 text-gray-400 dark:text-gray-500">· {action}</span>
                          </td>
                          {visibleRoles.map(({ role, idx }) => {
                            const has = role.permissions.includes(key);
                            return (
                              <td key={idx} className="px-3 py-2 text-center">
                                <button
                                  onClick={() => toggleRolePerm(idx, key)}
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-all ${
                                    has
                                      ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                                      : "border border-gray-300 dark:border-gray-600 text-transparent hover:border-indigo-400 hover:text-indigo-400"
                                  }`}
                                >
                                  {has ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
