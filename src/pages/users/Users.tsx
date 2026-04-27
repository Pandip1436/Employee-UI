import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  Pencil, Trash2, X, ShieldCheck, ShieldAlert, User as UserIcon,
 Eye, EyeOff, Search, CheckCircle, XCircle, Sparkles, Users as UsersIcon,
  Activity, UserPlus, ChevronLeft, ChevronRight, Loader2, KeyRound, AtSign,
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
const ROLE_CFG: Record<string, { dot: string; bg: string; text: string; ring: string; label: string }> = {
  admin: {
    dot: "bg-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/20",
    label: "Admin",
  },
  manager: {
    dot: "bg-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/20",
    label: "Manager",
  },
  employee: {
    dot: "bg-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800/60",
    text: "text-gray-700 dark:text-gray-300",
    ring: "ring-gray-500/20",
    label: "Employee",
  },
};

const roleIcon = (role: string) => {
  if (role === "admin") return <ShieldCheck className="h-3.5 w-3.5" />;
  if (role === "manager") return <ShieldAlert className="h-3.5 w-3.5" />;
  return <UserIcon className="h-3.5 w-3.5" />;
};

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

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

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
  "w-full rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

export default function Users() {
  const confirm = useConfirm();
  const { user: me } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  // Filters — this page shows admins only.
  const [search, setSearch] = useState("");
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
      role: "admin",
    };
    if (search.trim()) params.search = search.trim();
    if (statusFilter) params.isActive = statusFilter === "active" ? "true" : "false";
    userApi.getAll(params).then((res) => {
      setUsers(res.data.data);
      setPagination(res.data.pagination);
      setSelected(new Set());
    }).catch(() => {});
  };

  useEffect(() => {
    const id = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

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

  const activeFilterCount = (statusFilter ? 1 : 0) + (search.trim() ? 1 : 0);

  // ── Derived stats ──
  const stats = useMemo(() => {
    const total = pagination?.total ?? users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = users.length - active;
    const newJoiners = users.filter(
      (u) => Date.now() - new Date(u.createdAt).getTime() < 7 * 86400e3
    ).length;
    return { total, active, inactive, newJoiners };
  }, [users, pagination]);

  return (
    <div className="space-y-6">
      {/* ━━━ Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl" />
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
              <Sparkles className="h-3.5 w-3.5" /> Admin · Access Control
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <UsersIcon className="h-8 w-8 text-indigo-300" />
              User Management
            </h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/80 sm:text-base">
              Manage admin accounts. Control who can access, configure, and approve across the platform.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.98]"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <UserPlus className="h-4 w-4" /> Create User
          </button>
        </div>
      </div>

      {/* ━━━ Stats ━━━ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ShieldCheck} label="Total admins" value={stats.total} sublabel="In current view" tint="indigo" />
        <StatCard icon={Activity} label="Active" value={stats.active} sublabel="Can sign in" tint="emerald" />
        <StatCard icon={XCircle} label="Inactive" value={stats.inactive} sublabel="Sign-in disabled" tint="rose" />
        <StatCard icon={UserPlus} label="New (7d)" value={stats.newJoiners} sublabel="Recently added" tint="amber" />
      </div>

      {/* ━━━ Toolbar ━━━ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or user ID…"
            className={`${input} pl-10`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 p-1 backdrop-blur-sm">
            {[
              { value: "" as const, label: "Any" },
              { value: "active" as const, label: "Active" },
              { value: "inactive" as const, label: "Inactive" },
            ].map((s) => (
              <button
                key={s.value || "any"}
                onClick={() => { setStatusFilter(s.value); setPage(1); }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === s.value
                    ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSearch(""); setStatusFilter(""); setPage(1); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ━━━ Bulk action bar ━━━ */}
      {someSelected && (
        <div className="relative overflow-hidden flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 px-4 py-3 backdrop-blur-sm">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
          <span className="relative inline-flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-300">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
              {selectedArray.length}
            </span>
            user{selectedArray.length !== 1 ? "s" : ""} selected
          </span>
          <div className="relative ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => runBulk("activate")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 transition-all"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Activate
            </button>
            <button
              onClick={() => runBulk("deactivate")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-amber-500/30 hover:shadow-lg hover:shadow-amber-500/40 transition-all"
            >
              <XCircle className="h-3.5 w-3.5" /> Deactivate
            </button>
            <button
              onClick={() => runBulk("delete")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-500/30 hover:shadow-lg hover:shadow-rose-500/40 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ━━━ Desktop Table ━━━ */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200/70 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-800/40">
              <tr>
                <th className="w-10 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                {["User", "User ID", "Role", "Department", "Status", "Last Login", "Joined", ""].map((h) => (
                  <th key={h || "actions"} className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
                        <UsersIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">No users match</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Try adjusting your filters or search term.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : users.map((u) => {
                const cfg = ROLE_CFG[u.role] || ROLE_CFG.employee;
                return (
                  <tr key={u._id} className={clsx(
                    "group transition-colors duration-150 hover:bg-gray-50/60 dark:hover:bg-gray-800/30",
                    selected.has(u._id) && "bg-indigo-50/70 dark:bg-indigo-500/5",
                  )}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(u._id)}
                        onChange={() => toggleOne(u._id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md">
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-gray-900 dark:text-white">
                            {u.name}
                            {u._id === me?._id && (
                              <span className="ml-1.5 inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                you
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {u.userId ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800/60 px-2 py-1 font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                          <AtSign className="h-3 w-3" />
                          {u.userId}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", cfg.bg, cfg.text, cfg.ring)}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {roleIcon(u.role)}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{u.department || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                        u.isActive
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20"
                          : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/20"
                      )}>
                        {u.isActive ? (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </span>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        )}
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400 tabular-nums" title={u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : ""}>
                      {relTime(u.lastLoginAt)}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600/40 transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u._id)}
                          disabled={u._id === me?._id}
                          title={u._id === me?._id ? "Can't delete yourself" : "Delete"}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-600/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-900 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ━━━ Mobile Cards ━━━ */}
      <div className="md:hidden space-y-3">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white">No users match</p>
            </div>
          </div>
        ) : users.map((u) => {
          const cfg = ROLE_CFG[u.role] || ROLE_CFG.employee;
          return (
            <div
              key={u._id}
              className={clsx(
                "rounded-2xl border bg-white dark:bg-gray-900/80 backdrop-blur-sm p-4 transition-all",
                selected.has(u._id) ? "border-indigo-400 dark:border-indigo-500/40" : "border-gray-200/70 dark:border-gray-800/80"
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md">
                    {initials(u.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900 dark:text-white">{u.name}</p>
                    <p className="truncate text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                      {u.userId ? `@${u.userId}` : u.email}
                    </p>
                  </div>
                </div>
                <span className={clsx("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", cfg.bg, cfg.text, cfg.ring)}>
                  {roleIcon(u.role)}
                  {cfg.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 py-2 text-center ring-1 ring-gray-200/60 dark:ring-gray-800/60">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</p>
                  <p className={clsx("mt-0.5 text-[11px] font-bold", u.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {u.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 py-2 text-center ring-1 ring-gray-200/60 dark:ring-gray-800/60">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Last login</p>
                  <p className="mt-0.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 tabular-nums">{relTime(u.lastLoginAt)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 py-2 text-center ring-1 ring-gray-200/60 dark:ring-gray-800/60">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Dept</p>
                  <p className="mt-0.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{u.department || "—"}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openEdit(u)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(u._id)}
                  disabled={u._id === me?._id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-gray-900 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ━━━ Pagination ━━━ */}
      {pagination && pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 backdrop-blur-sm px-5 py-3.5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 tabular-nums">
            Page <span className="font-bold text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="font-bold text-gray-900 dark:text-white">{pagination.pages}</span>{" "}
            <span className="text-xs">· {pagination.total} total</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ━━━ Edit Modal ━━━ */}
      {editing && (() => {
        const fieldCls = (err?: string) =>
          `${input} ${err ? "!border-rose-400 dark:!border-rose-500 focus:!border-rose-500 focus:!ring-rose-500/20" : ""}`;
        const L = ({ children }: { children: React.ReactNode }) => (
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{children}</label>
        );
        const E = ({ msg }: { msg?: string }) =>
          msg ? <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">{msg}</p> : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-md max-h-[92vh] overflow-hidden rounded-3xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
              {/* Banner */}
              <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 px-6 py-5 text-white">
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />
                  <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
                </div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white ring-2 ring-white/15 shadow-lg shadow-indigo-500/30">
                      {initials(editing.name)}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200/80">Editing</p>
                      <h2 className="text-lg font-bold leading-tight">{editing.name}</h2>
                    </div>
                  </div>
                  <button onClick={closeEdit} className="rounded-lg p-2 text-indigo-200/80 hover:bg-white/10 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdate} noValidate className="overflow-y-auto px-6 py-5 space-y-4">
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
                  <L><KeyRound className="inline h-3 w-3 mr-1 -mt-0.5" /> Reset password</L>
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
                <div>
                  <L>Department</L>
                  <select value={eDept} onChange={(e) => setEDept(e.target.value)} className={input}>
                    <option value="">— Select —</option>
                    {(eDept && !departments.includes(eDept)) && <option value={eDept}>{eDept}</option>}
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Active toggle */}
                <div
                  className={`flex items-center justify-between rounded-xl p-3.5 ring-1 transition-all ${
                    eActive
                      ? "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-500/20"
                      : "bg-gray-50 dark:bg-gray-800/40 ring-gray-200 dark:ring-gray-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        eActive
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                          : "bg-white dark:bg-gray-900 text-gray-400"
                      }`}
                    >
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Account active</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {eActive ? "User can sign in" : "Sign-in is disabled"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEActive((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      eActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                    }`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${eActive ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeEdit} className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="group relative flex-1 inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? "Saving…" : "Update"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ━━━ Create Modal ━━━ */}
      {creating && (() => {
        const fieldCls = (err?: string) =>
          `${input} ${err ? "!border-rose-400 dark:!border-rose-500 focus:!border-rose-500 focus:!ring-rose-500/20" : ""}`;
        const L = ({ children }: { children: React.ReactNode }) => (
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{children}</label>
        );
        const E = ({ msg }: { msg?: string }) =>
          msg ? <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">{msg}</p> : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-md max-h-[92vh] overflow-hidden rounded-3xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
              {/* Banner */}
              <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 px-6 py-5 text-white">
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />
                  <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl" />
                </div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
                      <UserPlus className="h-5 w-5 text-indigo-200" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200/80">New</p>
                      <h2 className="text-lg font-bold leading-tight">Create User</h2>
                    </div>
                  </div>
                  <button onClick={resetCreate} className="rounded-lg p-2 text-indigo-200/80 hover:bg-white/10 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreate} noValidate className="overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <L>Full name</L>
                  <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Jane Doe" className={fieldCls(cErrors.name)} />
                  <E msg={cErrors.name} />
                </div>
                <div>
                  <L>Email</L>
                  <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="jane@company.com" className={fieldCls(cErrors.email)} />
                  <E msg={cErrors.email} />
                </div>
                <div>
                  <L><AtSign className="inline h-3 w-3 mr-1 -mt-0.5" /> User ID</L>
                  <input value={cUserId} onChange={(e) => setCUserId(e.target.value)} placeholder="jane.doe" className={fieldCls(cErrors.userId)} />
                  <E msg={cErrors.userId} />
                </div>
                <div>
                  <L><KeyRound className="inline h-3 w-3 mr-1 -mt-0.5" /> Password</L>
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
                {/* Role is fixed to admin on this page */}
                <div className="flex items-center gap-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 px-3.5 py-2.5 ring-1 ring-violet-500/20">
                  <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                    Role: Admin
                  </p>
                  <p className="text-[11px] text-violet-600/70 dark:text-violet-300/70">
                    · Full platform access
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetCreate} className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="group relative flex-1 inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saving ? "Creating…" : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
