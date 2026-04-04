import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2, ShieldCheck } from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const ALL_PERMISSIONS = [
  "dashboard",
  "attendance",
  "timesheet",
  "leave",
  "documents",
  "employees",
  "approvals",
  "reports",
  "admin",
];

interface Role {
  name: string;
  permissions: string[];
}

export default function AdminRoles() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);

  const fetchRoles = () => {
    setLoading(true);
    adminSettingsApi
      .getRoles()
      .then((r) => setRoles(r.data.data || []))
      .catch(() => toast.error("Failed to load roles"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const toggleNewPermission = (perm: string) => {
    setNewPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleRolePermission = (roleIndex: number, perm: string) => {
    setRoles((prev) =>
      prev.map((role, i) => {
        if (i !== roleIndex) return role;
        const perms = role.permissions.includes(perm)
          ? role.permissions.filter((p) => p !== perm)
          : [...role.permissions, perm];
        return { ...role, permissions: perms };
      })
    );
  };

  const handleAdd = () => {
    const name = newRoleName.trim();
    if (!name) return toast.error("Role name is required");
    if (newPermissions.length === 0) return toast.error("Select at least one permission");
    if (roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Role already exists");
    }
    setRoles((prev) => [...prev, { name, permissions: [...newPermissions] }]);
    setNewRoleName("");
    setNewPermissions([]);
    toast.success("Role added - remember to save");
  };

  const handleDelete = (index: number) => {
    setRoles((prev) => prev.filter((_, i) => i !== index));
    toast.success("Role removed - remember to save");
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await adminSettingsApi.updateRoles(roles);
      toast.success("Roles saved");
    } catch {
      toast.error("Failed to save roles");
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define roles and assign module-level permissions
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

      {/* Add New Role */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10">
            <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Add New Role</h3>
        </div>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Role name (e.g. Manager)"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            className={`w-full sm:max-w-sm ${inputCls}`}
          />
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Permissions</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <button
                  key={perm}
                  type="button"
                  onClick={() => toggleNewPermission(perm)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                    newPermissions.includes(perm)
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {perm}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Role
          </button>
        </div>
      </div>

      {/* Roles List */}
      {roles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
          No roles configured yet. Add one above.
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role, ri) => (
            <div
              key={ri}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                    <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                </div>
                <button
                  onClick={() => handleDelete(ri)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => toggleRolePermission(ri, perm)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                      role.permissions.includes(perm)
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {perm}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""} assigned
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
