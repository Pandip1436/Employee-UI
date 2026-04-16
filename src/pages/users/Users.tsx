import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  Pencil, Trash2, X, ShieldCheck, ShieldAlert, User as UserIcon,
  Plus, Eye, EyeOff, Search, CheckCircle, XCircle,
} from "lucide-react";
import { userApi } from "../../api/userApi";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import type { User, Pagination, UserRole } from "../../types";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useConfirm } from "../../context/ConfirmContext";
import { useAuth } from "../../context/AuthContext";
import { validateStrongPassword, checkPassword, passwordStrengthScore } from "../../utils/password";

// ── Validators ──
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userIdRe = /^[a-zA-Z0-9._-]{3,}$/;

function validateCreate(f: { name: string; email: string; userId: string; password: string }): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = "Name must be at least 2 characters";
  if (!emailRe.test(f.email.trim())) e.email = "Enter a valid email";
  if (!userIdRe.test(f.userId.trim())) e.userId = "Min 3 chars — letters, numbers, . _ -";
  const pwErr = validateStrongPassword(f.password);
  if (pwErr) e.password = pwErr;
  return e;
}

function validateEdit(f: { name: string; email: string; userId: string; password: string }): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = "Name must be at least 2 characters";
  if (!emailRe.test(f.email.trim())) e.email = "Enter a valid email";
  if (!userIdRe.test(f.userId.trim())) e.userId = "Min 3 chars — letters, numbers, . _ -";
  if (f.password) {
    const pwErr = validateStrongPassword(f.password);
    if (pwErr) e.password = pwErr;
  }
  return e;
}

function PasswordStrength({ pw }: { pw: string }) {
  if (!pw) return null;
  const c = checkPassword(pw);
  const score = passwordStrengthScore(pw);
  const barColor = score <= 2 ? "bg-rose-500" : score === 3 ? "bg-amber-500" : score === 4 ? "bg-lime-500" : "bg-emerald-500";
  const label = score <= 2 ? "Weak" : score === 3 ? "Fair" : score === 4 ? "Good" : "Strong";
  const labelColor = score <= 2 ? "text-rose-600 dark:text-rose-400" : score === 3 ? "text-amber-600 dark:text-amber-400" : score === 4 ? "text-lime-600 dark:text-lime-400" : "text-emerald-600 dark:text-emerald-400";
  const Item = ({ ok, text }: { ok: boolean; text: string }) => (
    <span className={`inline-flex items-center gap-1 text-[10px] ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`} />
      {text}
    </span>
  );
  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className={`h-full transition-all ${barColor}`} style={{ width: `${(score / 5) * 100}%` }} />
        </div>
        <span className={`text-[10px] font-semibold uppercase ${labelColor}`}>{label}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        <Item ok={c.length} text="8+ chars" />
        <Item ok={c.upper} text="A-Z" />
        <Item ok={c.lower} text="a-z" />
        <Item ok={c.digit} text="0-9" />
        <Item ok={c.symbol} text="symbol" />
      </div>
    </div>
  );
}

// ── Display helpers ──
const roleBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  employee: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const roleIcon = (role: string) => {
  if (role === "admin") return <ShieldCheck className="h-4 w-4" />;
  if (role === "manager") return <ShieldAlert className="h-4 w-4" />;
  return <UserIcon className="h-4 w-4" />;
};

const statusDot = (active: boolean) => (
  <span className={clsx("inline-block h-2 w-2 rounded-full", active ? "bg-emerald-500" : "bg-red-500")} />
);

const roleDot = (role: string) => (
  <span
    className={clsx(
      "inline-block h-2 w-2 rounded-full",
      role === "admin" ? "bg-purple-500" : role === "manager" ? "bg-blue-500" : "bg-gray-400"
    )}
  />
);

// "3 hours ago", "2 days ago", "Jan 12"
function relTime(iso?: string): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const inputCls =
  "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors";

export default function Users() {
  const confirm = useConfirm();
  const { user: me } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  // Filters — this page shows system operators (admins + managers).
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "admin" | "manager">("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");

  const [departments, setDepartments] = useState<string[]>([]);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = users.length > 0 && users.every((u) => selected.has(u._id));
  const someSelected = users.some((u) => selected.has(u._id));

  // Edit modal
  const [editing, setEditing] = useState<User | null>(null);
  const [eName, setEName] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eUserId, setEUserId] = useState("");
  const [ePassword, setEPassword] = useState("");
  const [eShowPassword, setEShowPassword] = useState(false);
  const [eRole, setERole] = useState<UserRole>("employee");
  const [eDept, setEDept] = useState("");
  const [eActive, setEActive] = useState(true);
  const [eErrors, setEErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Create modal
  const [creating, setCreating] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cUserId, setCUserId] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRole, setCRole] = useState<UserRole>("admin");
  const [cShowPassword, setCShowPassword] = useState(false);
  const [cErrors, setCErrors] = useState<Record<string, string>>({});

  const resetCreate = () => {
    setCName(""); setCEmail(""); setCUserId(""); setCPassword("");
    setCRole("admin"); setCShowPassword(false); setCErrors({}); setCreating(false);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateCreate({ name: cName, email: cEmail, userId: cUserId, password: cPassword });
    if (Object.keys(errs).length) {
      setCErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setCErrors({});
    setSaving(true);
    try {
      await userApi.create({
        name: cName.trim(), email: cEmail.trim(),
        userId: cUserId.trim(), password: cPassword, role: cRole,
      });
      toast.success("User created!");
      resetCreate();
      fetchUsers();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const fetchUsers = () => {
    const params: Record<string, string | number> = {
      page, limit: 10,
      // System operators only — exclude "employee" role from this view.
      role: roleFilter || "admin,manager",
    };
    if (search.trim()) params.search = search.trim();
    if (statusFilter) params.isActive = statusFilter === "active" ? "true" : "false";
    userApi.getAll(params).then((res) => {
      setUsers(res.data.data);
      setPagination(res.data.pagination);
      setSelected(new Set()); // reset selection on filter/page change
    }).catch(() => {});
  };

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, roleFilter, statusFilter]);

  // Load departments once for the edit modal
  useEffect(() => {
    adminSettingsApi.getDepartments()
      .then((r) => setDepartments((r.data.data || []).map((d) => d.name).filter(Boolean)))
      .catch(() => {});
  }, []);

  const openEdit = (u: User) => {
    setEditing(u);
    setEName(u.name); setEEmail(u.email); setEUserId(u.userId || "");
    setEPassword(""); setEShowPassword(false);
    setERole(u.role); setEDept(u.department || ""); setEActive(u.isActive);
    setEErrors({});
  };
  const closeEdit = () => { setEditing(null); setEErrors({}); };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const errs = validateEdit({ name: eName, email: eEmail, userId: eUserId, password: ePassword });
    if (Object.keys(errs).length) {
      setEErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setEErrors({});
    setSaving(true);
    try {
      const patch: Partial<User> = {
        name: eName.trim(), email: eEmail.trim(), role: eRole,
        department: eDept, isActive: eActive,
      };
      if (eUserId.trim() && eUserId.trim() !== (editing.userId || "")) {
        patch.userId = eUserId.trim();
      }
      await userApi.update(editing._id, patch);
      if (ePassword) {
        await userApi.resetPassword(editing._id, ePassword);
        toast.success("Password reset — user must sign in again");
      }
      toast.success("User updated!");
      closeEdit();
      fetchUsers();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (id === me?._id) return toast.error("You can't delete your own account");
    if (!(await confirm({
      title: "Delete user?",
      description: "The user will be permanently removed along with their access. This cannot be undone.",
      confirmLabel: "Delete user",
    }))) return;
    try {
      await userApi.delete(id);
      toast.success("User deleted.");
      fetchUsers();
    } catch { /* interceptor */ }
  };

  // Bulk actions
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      if (users.every((u) => prev.has(u._id))) return new Set();
      const next = new Set(prev);
      users.forEach((u) => next.add(u._id));
      return next;
    });

  const selectedArray = useMemo(() => [...selected], [selected]);
  const selectedWithoutMe = selectedArray.filter((id) => id !== me?._id);

  const runBulk = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedWithoutMe.length === 0) {
      return toast.error(selectedArray.length ? "You can't apply actions to your own account" : "Select at least one user");
    }
    const verb = action === "delete" ? "delete" : action;
    if (!(await confirm({
      title: `${verb[0].toUpperCase() + verb.slice(1)} ${selectedWithoutMe.length} user${selectedWithoutMe.length !== 1 ? "s" : ""}?`,
      description: action === "delete"
        ? "Selected users will be permanently removed along with their access."
        : `Selected users will be ${action}d.`,
      confirmLabel: verb[0].toUpperCase() + verb.slice(1),
    }))) return;
    try {
      await userApi.bulkAction(selectedWithoutMe, action);
      toast.success(`${selectedWithoutMe.length} user${selectedWithoutMe.length !== 1 ? "s" : ""} ${action}d`);
      fetchUsers();
    } catch { /* interceptor */ }
  };

  const activeFilterCount = (roleFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (search.trim() ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">System operators — admins and managers</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Create User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or user ID..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as any); setPage(1); }}
          className={`sm:w-40 ${inputCls}`}
        >
          <option value="">All operators</option>
          <option value="admin">Admins only</option>
          <option value="manager">Managers only</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
          className={`sm:w-36 ${inputCls}`}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setSearch(""); setRoleFilter(""); setStatusFilter(""); setPage(1); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2.5">
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            {selectedArray.length} selected
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => runBulk("activate")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Activate
            </button>
            <button
              onClick={() => runBulk("deactivate")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" /> Deactivate
            </button>
            <button
              onClick={() => runBulk("delete")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ───────── Desktop Table ───────── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60">
            <tr>
              <th className="w-10 px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              {["User", "User ID", "Role", "Department", "Status", "Last Login", "Joined", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center text-gray-400 dark:text-gray-500">
                  No users match the current filters.
                </td>
              </tr>
            ) : users.map((u) => (
              <tr key={u._id} className={clsx(
                "transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/60",
                selected.has(u._id) && "bg-indigo-50/50 dark:bg-indigo-500/5",
              )}>
                <td className="px-3 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(u._id)}
                    onChange={() => toggleOne(u._id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {u.name} {u._id === me?._id && <span className="ml-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                  {u.userId ? `@${u.userId}` : "—"}
                </td>
                <td className="px-5 py-4">
                  <span className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                    roleBadge[u.role]
                  )}>
                    {roleDot(u.role)}
                    {roleIcon(u.role)}
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{u.department || "—"}</td>
                <td className="px-5 py-4">
                  <span className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                    u.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  )}>
                    {statusDot(u.isActive)}
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400" title={u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : ""}>
                  {relTime(u.lastLoginAt)}
                </td>
                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u._id)}
                      disabled={u._id === me?._id}
                      className="rounded-lg p-2 text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={u._id === me?._id ? "Can't delete yourself" : "Delete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ───────── Mobile Cards ───────── */}
      <div className="md:hidden space-y-3">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
            No users match the current filters.
          </div>
        ) : users.map((u) => (
          <div
            key={u._id}
            className={clsx(
              "rounded-2xl border bg-white dark:bg-gray-900 p-4 shadow-sm transition-shadow hover:shadow-md",
              selected.has(u._id) ? "border-indigo-400 dark:border-indigo-500" : "border-gray-200 dark:border-gray-800"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={selected.has(u._id)}
                  onChange={() => toggleOne(u._id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">{u.name}</p>
                  <p className="truncate text-xs font-mono text-indigo-600 dark:text-indigo-400">
                    {u.userId ? `@${u.userId}` : u.email}
                  </p>
                </div>
              </div>
              <span className={clsx(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                roleBadge[u.role]
              )}>
                {roleIcon(u.role)}
                {u.role}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 py-2 px-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</p>
                <p className={clsx("mt-0.5 text-xs font-medium", u.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {u.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 py-2 px-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Last Login</p>
                <p className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">{relTime(u.lastLoginAt)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 py-2 px-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Dept</p>
                <p className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{u.department || "—"}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => openEdit(u)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => handleDelete(u._id)}
                disabled={u._id === me?._id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3.5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Page <span className="text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="text-gray-900 dark:text-white">{pagination.pages}</span>{" "}
            <span className="text-xs">({pagination.total} total)</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ───────── Edit Modal ───────── */}
      {editing && (() => {
        const fieldCls = (err?: string) =>
          `${inputCls} ${err ? "!border-rose-400 dark:!border-rose-500 focus:!border-rose-500 focus:!ring-rose-500/20" : ""}`;
        const L = ({ children }: { children: React.ReactNode }) => (
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{children}</label>
        );
        const E = ({ msg }: { msg?: string }) =>
          msg ? <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{msg}</p> : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit User</h2>
                <button onClick={closeEdit} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpdate} noValidate className="space-y-4">
                <div>
                  <L>Name</L>
                  <input value={eName} onChange={(e) => setEName(e.target.value)} className={fieldCls(eErrors.name)} />
                  <E msg={eErrors.name} />
                </div>
                <div>
                  <L>Email</L>
                  <input type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} className={fieldCls(eErrors.email)} />
                  <E msg={eErrors.email} />
                </div>
                <div>
                  <L>User ID</L>
                  <input value={eUserId} onChange={(e) => setEUserId(e.target.value)} placeholder="login.id" className={fieldCls(eErrors.userId)} />
                  <E msg={eErrors.userId} />
                </div>
                <div>
                  <L>Reset Password</L>
                  <div className="relative">
                    <input
                      type={eShowPassword ? "text" : "password"}
                      value={ePassword}
                      onChange={(e) => setEPassword(e.target.value)}
                      placeholder="Leave blank to keep"
                      className={`${fieldCls(eErrors.password)} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setEShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {eShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrength pw={ePassword} />
                  <E msg={eErrors.password} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <L>Role</L>
                    <select value={eRole} onChange={(e) => setERole(e.target.value as UserRole)} className={inputCls}>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <L>Department</L>
                    <select value={eDept} onChange={(e) => setEDept(e.target.value)} className={inputCls}>
                      <option value="">— Select —</option>
                      {(eDept && !departments.includes(eDept)) && <option value={eDept}>{eDept}</option>}
                      {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2.5 text-sm text-gray-900 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={eActive}
                    onChange={(e) => setEActive(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  Active
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeEdit} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">{saving ? "Saving..." : "Update"}</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ───────── Create Modal ───────── */}
      {creating && (() => {
        const fieldCls = (err?: string) =>
          `${inputCls} ${err ? "!border-rose-400 dark:!border-rose-500 focus:!border-rose-500 focus:!ring-rose-500/20" : ""}`;
        const L = ({ children }: { children: React.ReactNode }) => (
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{children}</label>
        );
        const E = ({ msg }: { msg?: string }) =>
          msg ? <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{msg}</p> : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create User</h2>
                <button onClick={resetCreate} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} noValidate className="space-y-4">
                <div>
                  <L>Name</L>
                  <input value={cName} onChange={(e) => setCName(e.target.value)} className={fieldCls(cErrors.name)} />
                  <E msg={cErrors.name} />
                </div>
                <div>
                  <L>Email</L>
                  <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} className={fieldCls(cErrors.email)} />
                  <E msg={cErrors.email} />
                </div>
                <div>
                  <L>User ID</L>
                  <input value={cUserId} onChange={(e) => setCUserId(e.target.value)} placeholder="login.id" className={fieldCls(cErrors.userId)} />
                  <E msg={cErrors.userId} />
                </div>
                <div>
                  <L>Password</L>
                  <div className="relative">
                    <input
                      type={cShowPassword ? "text" : "password"}
                      value={cPassword}
                      onChange={(e) => setCPassword(e.target.value)}
                      placeholder="Strong password"
                      className={`${fieldCls(cErrors.password)} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setCShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {cShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrength pw={cPassword} />
                  <E msg={cErrors.password} />
                </div>
                <div>
                  <L>Role</L>
                  <select value={cRole} onChange={(e) => setCRole(e.target.value as UserRole)} className={inputCls}>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetCreate} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">{saving ? "Creating..." : "Create"}</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
