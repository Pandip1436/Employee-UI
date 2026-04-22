import { useState, useEffect, type FormEvent } from "react";
import {
  Pencil, Trash2, X, Search, Mail, Phone, Building, ArrowLeft, Calendar,
  Shield, Activity, Plus, Eye, EyeOff, Sparkles, Users, ChevronLeft, ChevronRight,
  Briefcase, FileText, Award, User as UserIcon,
} from "lucide-react";
import { userApi } from "../../api/userApi";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import { employeeProfileApi } from "../../api/employeeProfileApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import type { User, Pagination, UserRole, EmployeeProfile } from "../../types";
import toast from "react-hot-toast";
import { validateStrongPassword, checkPassword, passwordStrengthScore } from "../../utils/password";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";

const PALETTES = [
  "from-indigo-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];
const paletteFor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
};

const roleConfig: Record<string, { badge: string; dot: string; label: string }> = {
  admin: {
    badge: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/20",
    dot: "bg-purple-500", label: "Admin",
  },
  manager: {
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    dot: "bg-sky-500", label: "Manager",
  },
  employee: {
    badge: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-400/20 dark:bg-gray-700/50 dark:text-gray-300 dark:ring-gray-500/20",
    dot: "bg-gray-500", label: "Employee",
  },
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userIdRe = /^[a-zA-Z0-9._-]{3,}$/;
const empIdRe = /^[A-Za-z0-9-]{1,}$/;
const aadhaarRe = /^\d{12}$/;
const phoneRe = /^\d{10}$/;

type FormShape = {
  name: string; email: string; userId: string; password?: string;
  empId: string; aadhaar: string; address: string; phone: string; doj: string;
};

function validate(f: FormShape, opts: { requirePassword: boolean }): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = "Name must be at least 2 characters";
  if (!emailRe.test(f.email.trim())) e.email = "Enter a valid email";
  if (!userIdRe.test(f.userId.trim())) e.userId = "Min 3 chars — letters, numbers, . _ -";
  if (opts.requirePassword || (f.password ?? "").length > 0) {
    const pwErr = validateStrongPassword(f.password ?? "");
    if (pwErr) e.password = pwErr;
  }
  if (!empIdRe.test(f.empId.trim())) e.empId = "Employee ID is required";
  if (!aadhaarRe.test(f.aadhaar.trim())) e.aadhaar = "Aadhaar must be exactly 12 digits";
  if (f.address.trim().length < 5) e.address = "Enter the full address";
  if (!phoneRe.test(f.phone.trim())) e.phone = "Phone must be 10 digits";
  if (!f.doj) e.doj = "Date of joining is required";
  else if (new Date(f.doj) > new Date()) e.doj = "DOJ cannot be in the future";
  return e;
}

function Avatar({ name, size = "md", photo }: { name: string; size?: "md" | "lg" | "xl"; photo?: string | null }) {
  const init = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const sz = size === "xl" ? "h-24 w-24 text-2xl" : size === "lg" ? "h-11 w-11 text-sm" : "h-10 w-10 text-[13px]";
  if (photo) {
    return (
      <div className={`overflow-hidden rounded-full ring-2 ring-white shadow-sm dark:ring-gray-900 ${sz}`}>
        <img src={`/${photo}`} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(name || "?")} font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 ${sz}`}>
      {init}
    </div>
  );
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
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
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

export default function Employees() {
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [empProfile, setEmpProfile] = useState<EmployeeProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const openProfile = (u: User) => {
    setProfileUser(u);
    setProfileLoading(true);
    employeeProfileApi.getByUserId(u._id).then((r) => setEmpProfile(r.data.data ?? null)).catch(() => setEmpProfile(null)).finally(() => setProfileLoading(false));
  };

  // Form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("employee");
  const [formDept, setFormDept] = useState("");
  const [formDesignation, setFormDesignation] = useState("");
  const [formEmpId, setFormEmpId] = useState("");
  const [formAadhaar, setFormAadhaar] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDOJ, setFormDOJ] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchUsers = () => {
    userApi.getAll({ page, limit: 10, role: "employee" }).then((res) => {
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    }).catch(() => {});
  };

  useEffect(() => { fetchUsers(); }, [page]);

  useEffect(() => {
    if (!isAdmin) return;
    adminSettingsApi.getDepartments()
      .then((res) => setDepartments((res.data.data || []).map((d) => d.name).filter(Boolean)))
      .catch(() => {});
    adminSettingsApi.getDesignations()
      .then((res) => setDesignations((res.data.data || []).map((d) => d.name).filter(Boolean)))
      .catch(() => {});
  }, [isAdmin]);

  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const resetForm = () => {
    setFormName(""); setFormEmail(""); setFormUserId(""); setFormPassword("");
    setFormRole("employee"); setFormDept(""); setFormDesignation("");
    setFormEmpId(""); setFormAadhaar(""); setFormAddress("");
    setFormPhone(""); setFormDOJ("");
    setFormActive(true); setShowPassword(false);
    setEditing(null); setShowModal(false);
    setErrors({});
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (u: User) => {
    setEditing(u);
    setFormName(u.name); setFormEmail(u.email);
    setFormUserId(u.userId || ""); setFormPassword("");
    setFormRole(u.role); setFormDept(u.department || "");
    setFormDesignation(""); setShowPassword(false);
    setFormEmpId(""); setFormAadhaar(""); setFormAddress("");
    setFormPhone(""); setFormDOJ("");
    setFormActive(u.isActive); setShowModal(true);
    setErrors({});
    employeeProfileApi.getByUserId(u._id)
      .then((r) => {
        const p = r.data.data;
        setFormDesignation(p?.designation || "");
        setFormEmpId(p?.employeeId || "");
        setFormAadhaar(p?.aadhaarNumber || "");
        setFormAddress(p?.address || "");
        setFormPhone(p?.phone || "");
        setFormDOJ(p?.joiningDate || "");
      })
      .catch(() => {});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formErrs = validate(
      {
        name: formName, email: formEmail, userId: formUserId,
        password: formPassword, empId: formEmpId, aadhaar: formAadhaar,
        address: formAddress, phone: formPhone, doj: formDOJ,
      },
      { requirePassword: !editing },
    );
    if (Object.keys(formErrs).length) {
      setErrors(formErrs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setSaving(true);

    const profilePatch = {
      designation: formDesignation,
      employeeId: formEmpId.trim(),
      aadhaarNumber: formAadhaar.trim(),
      address: formAddress.trim(),
      phone: formPhone.trim(),
      joiningDate: formDOJ,
    };

    try {
      if (editing) {
        const patch: Partial<User> = {
          name: formName, email: formEmail, role: formRole,
          department: formDept, isActive: formActive,
        };
        if (formUserId.trim() && formUserId.trim() !== (editing.userId || "")) {
          patch.userId = formUserId.trim();
        }
        await userApi.update(editing._id, patch);
        await employeeProfileApi.updateByUserId(editing._id, profilePatch);
        if (formPassword) {
          await userApi.resetPassword(editing._id, formPassword);
          toast.success("Password reset — user must sign in again");
        }
        toast.success("Employee updated!");
      } else {
        const res = await userApi.create({
          name: formName, email: formEmail,
          userId: formUserId.trim(), password: formPassword,
          role: formRole, department: formDept,
        });
        const newId = res.data.data?._id;
        if (newId) {
          await employeeProfileApi.updateByUserId(newId, profilePatch).catch(() => {});
        }
        toast.success("Employee created!");
      }
      resetForm(); fetchUsers();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete employee?", description: "The employee record and their access will be permanently removed.", confirmLabel: "Delete" }))) return;
    try {
      await userApi.delete(id);
      toast.success("Employee deleted.");
      fetchUsers();
    } catch { /* interceptor */ }
  };

  /* ─── Profile view ─── */
  const InfoRow = ({ icon: Icon, label, value, gradient = "from-indigo-500 to-purple-600" }: { icon: typeof Mail; label: string; value?: string | null; gradient?: string }) => (
    <div className="flex items-center gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-sm ring-1 ring-white/10`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className={labelCls}>{label}</p>
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{value || "—"}</p>
      </div>
    </div>
  );

  if (profileUser) {
    const p = empProfile;
    const rc = roleConfig[profileUser.role] || roleConfig.employee;
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setProfileUser(null); setEmpProfile(null); }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-indigo-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:border-gray-800/80 dark:bg-gray-900/80 dark:text-indigo-400 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to list
        </button>

        {/* ── Profile Hero (no grid) ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
          </div>
          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div className="rounded-full bg-white/10 p-1.5 ring-1 ring-white/15 backdrop-blur-sm">
                <Avatar name={profileUser.name} size="xl" photo={p?.profilePhoto} />
              </div>
              <span
                className={`absolute bottom-1 right-1 h-4 w-4 rounded-full ring-4 ring-gray-900 ${
                  profileUser.isActive ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80 sm:justify-start">
                <Sparkles className="h-3.5 w-3.5" />
                Employee Profile
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{profileUser.name}</h2>
              <p className="mt-0.5 text-sm text-indigo-200/70">{profileUser.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm">
                  <span className={`h-1.5 w-1.5 rounded-full ${rc.dot}`} />
                  {rc.label}
                </span>
                {p?.designation && (
                  <span className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm">
                    {p.designation}
                  </span>
                )}
                {profileUser.department && (
                  <span className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm">
                    {profileUser.department}
                  </span>
                )}
                {p?.employeeId && (
                  <span className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm">
                    ID: {p.employeeId}
                  </span>
                )}
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => openEdit(profileUser)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
              >
                <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                  <Pencil className="h-3.5 w-3.5 text-white" />
                </span>
                Edit
              </button>
            )}
          </div>
        </div>

        {profileLoading ? (
          <div className={`${cardCls} flex flex-col items-center gap-3 py-12 text-center`}>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile...</p>
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Status",
                  value: profileUser.isActive ? "Active" : "Inactive",
                  icon: Activity,
                  gradient: profileUser.isActive ? "from-emerald-500 to-teal-600" : "from-rose-500 to-pink-600",
                },
                { label: "Department", value: profileUser.department || "—", icon: Building, gradient: "from-sky-500 to-indigo-600" },
                { label: "Role", value: rc.label, icon: Shield, gradient: "from-purple-500 to-fuchsia-600" },
                { label: "Joined", value: new Date(profileUser.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }), icon: Calendar, gradient: "from-amber-500 to-orange-600" },
              ].map((s) => (
                <div key={s.label} className={`${cardCls} p-4`}>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg bg-gradient-to-br ${s.gradient} p-2 shadow-sm ring-1 ring-white/10`}>
                      <s.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className={labelCls}>{s.label}</p>
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Personal & Contact */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className={`${cardCls} p-5`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:ring-indigo-400/20">
                    <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Personal & Contact</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={Mail} label="Email" value={profileUser.email} gradient="from-indigo-500 to-purple-600" />
                  <InfoRow icon={Phone} label="Phone" value={p?.phone} gradient="from-amber-500 to-orange-600" />
                  <InfoRow icon={Calendar} label="Date of Birth" value={p?.dateOfBirth} gradient="from-rose-500 to-pink-600" />
                  <InfoRow icon={UserIcon} label="Gender" value={p?.gender} gradient="from-purple-500 to-fuchsia-600" />
                  <InfoRow icon={Mail} label="Personal Email" value={p?.personalEmail} gradient="from-emerald-500 to-teal-600" />
                  <InfoRow icon={Activity} label="Blood Group" value={p?.bloodGroup} gradient="from-rose-500 to-pink-600" />
                </div>
                {p?.address && (
                  <div className="mt-4 rounded-xl border border-gray-200/70 bg-gray-50/60 p-3 dark:border-gray-800/80 dark:bg-gray-800/40">
                    <p className={labelCls}>Address</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{p.address}</p>
                  </div>
                )}
              </div>

              <div className={`${cardCls} p-5`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-500/10 dark:bg-emerald-500/10 dark:ring-emerald-400/20">
                    <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Work Information</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={Shield} label="Employee ID" value={p?.employeeId} gradient="from-sky-500 to-indigo-600" />
                  <InfoRow icon={Building} label="Department" value={profileUser.department} gradient="from-emerald-500 to-teal-600" />
                  <InfoRow icon={Activity} label="Designation" value={p?.designation} gradient="from-purple-500 to-fuchsia-600" />
                  <InfoRow icon={Calendar} label="Joining Date" value={p?.joiningDate} gradient="from-amber-500 to-orange-600" />
                </div>
              </div>
            </div>

            {/* Emergency & Bank */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className={`${cardCls} p-5`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-rose-50 p-2 ring-1 ring-rose-500/10 dark:bg-rose-500/10 dark:ring-rose-400/20">
                    <Phone className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Emergency Contact</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={UserIcon} label="Name" value={p?.emergencyName} gradient="from-rose-500 to-pink-600" />
                  <InfoRow icon={Shield} label="Relationship" value={p?.emergencyRelation} gradient="from-amber-500 to-orange-600" />
                  <InfoRow icon={Phone} label="Phone" value={p?.emergencyPhone} gradient="from-emerald-500 to-teal-600" />
                </div>
              </div>

              <div className={`${cardCls} p-5`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-sky-50 p-2 ring-1 ring-sky-500/10 dark:bg-sky-500/10 dark:ring-sky-400/20">
                    <Shield className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bank & Identity</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={Shield} label="Bank" value={p?.bankName} gradient="from-sky-500 to-indigo-600" />
                  <InfoRow icon={Shield} label="Account" value={p?.bankAccountNumber || p?.bankAccountNumberMasked} gradient="from-sky-500 to-indigo-600" />
                  <InfoRow icon={Shield} label="IFSC" value={p?.bankIfsc} gradient="from-sky-500 to-indigo-600" />
                  <InfoRow icon={Shield} label="Aadhaar" value={p?.aadhaarNumber || p?.aadhaarNumberMasked} gradient="from-purple-500 to-fuchsia-600" />
                  <InfoRow icon={Shield} label="PAN" value={p?.panNumber || p?.panNumberMasked} gradient="from-purple-500 to-fuchsia-600" />
                  <InfoRow icon={Shield} label="Passport" value={p?.passportNumber || p?.passportNumberMasked} gradient="from-purple-500 to-fuchsia-600" />
                </div>
              </div>
            </div>

            {/* Skills & Work History */}
            {((p?.skills?.length || 0) > 0 || (p?.workHistory?.length || 0) > 0) && (
              <div className="grid gap-6 lg:grid-cols-2">
                {(p?.skills?.length || 0) > 0 && (
                  <div className={`${cardCls} p-5`}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-500/10 dark:bg-emerald-500/10 dark:ring-emerald-400/20">
                        <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Skills</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p!.skills!.map((s, i) => (
                        <span
                          key={i}
                          className={`rounded-md bg-gradient-to-br ${PALETTES[i % PALETTES.length]} px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-white/10`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(p?.workHistory?.length || 0) > 0 && (
                  <div className={`${cardCls} p-5`}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="rounded-lg bg-amber-50 p-2 ring-1 ring-amber-500/10 dark:bg-amber-500/10 dark:ring-amber-400/20">
                        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Work History</h3>
                    </div>
                    <div className="relative space-y-3 pl-5">
                      <span aria-hidden className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-indigo-400/40 via-purple-400/40 to-transparent" />
                      {p!.workHistory!.map((w, i) => (
                        <div key={i} className="relative rounded-lg border border-gray-200/70 bg-gray-50/60 p-3 dark:border-gray-800/80 dark:bg-gray-800/40">
                          <span
                            aria-hidden
                            className="absolute left-[-20px] top-4 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 ring-2 ring-white dark:ring-gray-900"
                          />
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{w.role}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{w.company}</p>
                          <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">{w.from} — {w.to || "Present"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(p?.certifications?.length || 0) > 0 && (
              <div className={`${cardCls} p-5`}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-purple-50 p-2 ring-1 ring-purple-500/10 dark:bg-purple-500/10 dark:ring-purple-400/20">
                    <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Certifications</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {p!.certifications!.map((c, i) => (
                    <div key={i} className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-3 dark:border-gray-800/80 dark:bg-gray-800/40">
                      <div className="flex items-start gap-2">
                        <div className="rounded-md bg-gradient-to-br from-purple-500 to-fuchsia-600 p-1 shadow-sm ring-1 ring-white/10">
                          <Award className="h-3 w-3 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{c.name}</p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {c.issuer}{c.year ? ` · ${c.year}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(p?.offerLetterPath || (p?.certificatePaths?.length || 0) > 0) && (
              <div className={`${cardCls} p-5`}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-rose-50 p-2 ring-1 ring-rose-500/10 dark:bg-rose-500/10 dark:ring-rose-400/20">
                    <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Documents</h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {p?.offerLetterPath && (
                    <a
                      href={`/${p.offerLetterPath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                    >
                      <FileText className="h-4 w-4" /> Offer Letter
                    </a>
                  )}
                  {p?.certificatePaths?.map((path, i) => (
                    <a
                      key={i}
                      href={`/${path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                    >
                      <Award className="h-4 w-4" /> Certificate {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  /* ─── List view ─── */
  const totalEmployees = pagination?.total ?? users.length;
  const activeEmployees = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <Users className="h-10 w-10 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Workforce directory
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Your <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Employees</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Manage your team members and their roles</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Active</p>
              <p className="text-xl font-bold tracking-tight">
                {activeEmployees}<span className="text-sm font-normal text-indigo-200/60"> / {totalEmployees}</span>
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
              >
                <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                  <Plus className="h-3.5 w-3.5 text-white" />
                </span>
                New Employee
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full rounded-xl border border-gray-200/70 bg-white/80 py-2.5 pl-9 pr-${search ? "8" : "4"} text-sm text-gray-900 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800/80 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-500 dark:ring-white/[0.03]`}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Desktop Table ── */}
      <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
              <tr>
                {["Employee", "Department", "Role", "Status", "Joined", ""].map((h, i) => (
                  <th key={i} className={`px-5 py-3 ${labelCls} ${i === 5 ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No employees found</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {search ? "Try a different search term" : isAdmin ? "Click 'New Employee' to add one" : "Employees will appear here once added"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const rc = roleConfig[u.role] || roleConfig.employee;
                  return (
                    <tr key={u._id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                      <td className="px-5 py-3">
                        <button onClick={() => openProfile(u)} className="group flex items-center gap-3 text-left">
                          <Avatar name={u.name} />
                          <div>
                            <p className="font-semibold text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">{u.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{u.department || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${rc.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${rc.dot}`} />
                          {rc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20"
                            : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEdit(u)}
                              title="Edit"
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(u._id)}
                              title="Delete"
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className={`${cardCls} flex flex-col items-center gap-2 py-12 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No employees found</p>
          </div>
        ) : filtered.map((u) => {
          const rc = roleConfig[u.role] || roleConfig.employee;
          return (
            <div key={u._id} className={`${cardCls} p-4`}>
              <div className="flex items-center gap-3">
                <button onClick={() => openProfile(u)} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={u.name} />
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{u.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                </button>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${rc.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${rc.dot}`} />
                  {rc.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
                  <p className={labelCls}>Dept</p>
                  <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">{u.department || "—"}</p>
                </div>
                <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
                  <p className={labelCls}>Status</p>
                  <p className={`text-xs font-semibold ${u.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-2.5 py-2 text-center dark:border-gray-800/80 dark:bg-gray-800/40">
                  <p className={labelCls}>Joined</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{new Date(u.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-3 flex gap-1 border-t border-gray-200/70 pt-3 dark:border-gray-800/80">
                  <button
                    onClick={() => openEdit(u)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(u._id)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className={`${cardCls} flex items-center justify-between p-3`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">({pagination.total} total)</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Edit / Create Modal ── */}
      {showModal && (() => {
        const fieldCls = (err?: string) =>
          `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors dark:bg-gray-800 dark:text-white ${
            err
              ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-rose-500"
              : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700"
          }`;
        const LabelText = ({ children }: { children: React.ReactNode }) => (
          <label className={`${labelCls} mb-1.5 block`}>{children}</label>
        );
        const ErrText = ({ msg }: { msg?: string }) =>
          msg ? <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{msg}</p> : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm px-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
              <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:to-gray-900">
                <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-400/20 blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                      {editing ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        {editing ? "Edit Employee" : "New Employee"}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {editing ? "Update employee details" : "Create a new employee record"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    aria-label="Close"
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="max-h-[calc(90vh-5rem)] space-y-4 overflow-y-auto p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <LabelText>Name</LabelText>
                    <input value={formName} onChange={(e) => setFormName(e.target.value)} className={fieldCls(errors.name)} />
                    <ErrText msg={errors.name} />
                  </div>
                  <div>
                    <LabelText>Employee ID</LabelText>
                    <input value={formEmpId} onChange={(e) => setFormEmpId(e.target.value)} placeholder="EMP-001" className={fieldCls(errors.empId)} />
                    <ErrText msg={errors.empId} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <LabelText>Email</LabelText>
                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className={fieldCls(errors.email)} />
                    <ErrText msg={errors.email} />
                  </div>
                  <div>
                    <LabelText>Phone</LabelText>
                    <input inputMode="numeric" maxLength={10} value={formPhone} onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ""))} placeholder="10 digits" className={fieldCls(errors.phone)} />
                    <ErrText msg={errors.phone} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <LabelText>User ID</LabelText>
                    <input value={formUserId} onChange={(e) => setFormUserId(e.target.value)} placeholder="login.id" className={fieldCls(errors.userId)} />
                    <ErrText msg={errors.userId} />
                  </div>
                  <div>
                    <LabelText>{editing ? "Reset Password" : "Password"}</LabelText>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder={editing ? "Leave blank to keep" : "Strong password"}
                        className={`${fieldCls(errors.password)} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrength pw={formPassword} />
                    <ErrText msg={errors.password} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <LabelText>Aadhaar</LabelText>
                    <input inputMode="numeric" maxLength={12} value={formAadhaar} onChange={(e) => setFormAadhaar(e.target.value.replace(/\D/g, ""))} placeholder="12 digits" className={fieldCls(errors.aadhaar)} />
                    <ErrText msg={errors.aadhaar} />
                  </div>
                  <div>
                    <LabelText>Date of Joining</LabelText>
                    <input type="date" value={formDOJ} onChange={(e) => setFormDOJ(e.target.value)} max={new Date().toISOString().slice(0, 10)} className={fieldCls(errors.doj)} />
                    <ErrText msg={errors.doj} />
                  </div>
                </div>
                <div>
                  <LabelText>Address</LabelText>
                  <textarea rows={2} value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Full residential address" className={fieldCls(errors.address)} />
                  <ErrText msg={errors.address} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <LabelText>Role</LabelText>
                    <select value={formRole} onChange={(e) => setFormRole(e.target.value as UserRole)} className={fieldCls()}>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <LabelText>Department</LabelText>
                    <select value={formDept} onChange={(e) => setFormDept(e.target.value)} className={fieldCls()}>
                      <option value="">— Select —</option>
                      {(formDept && !departments.includes(formDept)) && (
                        <option value={formDept}>{formDept}</option>
                      )}
                      {departments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <LabelText>Designation</LabelText>
                  <select value={formDesignation} onChange={(e) => setFormDesignation(e.target.value)} className={fieldCls()}>
                    <option value="">— Select —</option>
                    {(formDesignation && !designations.includes(formDesignation)) && (
                      <option value={formDesignation}>{formDesignation}</option>
                    )}
                    {designations.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {editing && (
                  <label className="flex items-center gap-2.5 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 text-sm text-gray-900 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
                    />
                    <span className="font-semibold">Account active</span>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      {formActive ? "Can sign in" : "Sign-in disabled"}
                    </span>
                  </label>
                )}

                <div className="flex gap-3 border-t border-gray-200/70 pt-4 dark:border-gray-800/80">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
                  >
                    {saving ? "Saving..." : editing ? "Update Employee" : "Create Employee"}
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
