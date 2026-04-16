import { useState, useEffect, type FormEvent } from "react";
import { Pencil, Trash2, X, Search, Mail, Phone, Building, ArrowLeft, Calendar, Shield, Activity, Plus, Eye, EyeOff } from "lucide-react";
import { userApi } from "../../api/userApi";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import { employeeProfileApi } from "../../api/employeeProfileApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import type { User, Pagination, UserRole, EmployeeProfile } from "../../types";
import toast from "react-hot-toast";
import { validateStrongPassword, checkPassword, passwordStrengthScore } from "../../utils/password";

const roleBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  employee: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const roleDot: Record<string, string> = {
  admin: "bg-purple-500",
  manager: "bg-blue-500",
  employee: "bg-gray-400 dark:bg-gray-500",
};

// ── Validators ──
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userIdRe = /^[a-zA-Z0-9._-]{3,}$/;
const empIdRe = /^[A-Za-z0-9-]{1,}$/;
const aadhaarRe = /^\d{12}$/;
const phoneRe = /^\d{10}$/;

type FormShape = {
  name: string;
  email: string;
  userId: string;
  password?: string;
  empId: string;
  aadhaar: string;
  address: string;
  phone: string;
  doj: string;
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

  // Load admin-managed departments + designations
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

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

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
  const InfoRow = ({ icon: Icon, label, value, color = "indigo" }: { icon: typeof Mail; label: string; value?: string | null; color?: string }) => (
    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-${color}-50 dark:bg-${color}-500/10`}>
        <Icon className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{value || "—"}</p>
      </div>
    </div>
  );

  if (profileUser) {
    const p = empProfile;
    return (
      <div className="space-y-6">
        <button onClick={() => { setProfileUser(null); setEmpProfile(null); }}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </button>

        {/* Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-3xl font-bold ring-4 ring-white/20 overflow-hidden">
              {p?.profilePhoto ? <img src={`/${p.profilePhoto}`} alt="" className="h-full w-full object-cover" /> : profileUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold">{profileUser.name}</h2>
              <p className="text-sm text-indigo-200">{profileUser.email}</p>
              <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium capitalize">{profileUser.role}</span>
                {p?.designation && <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs">{p.designation}</span>}
                {profileUser.department && <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs">{profileUser.department}</span>}
                {p?.employeeId && <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs">ID: {p.employeeId}</span>}
              </div>
            </div>
          </div>
        </div>

        {profileLoading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" /></div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Status", value: profileUser.isActive ? "Active" : "Inactive", color: "emerald", icon: Activity },
                { label: "Department", value: profileUser.department || "—", color: "blue", icon: Building },
                { label: "Role", value: profileUser.role, color: "purple", icon: Shield },
                { label: "Joined", value: new Date(profileUser.createdAt).toLocaleDateString(), color: "rose", icon: Calendar },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border border-${s.color}-200 dark:border-${s.color}-500/20 bg-white dark:bg-gray-900 p-4 relative overflow-hidden`}>
                  <div className={`absolute left-0 top-0 h-full w-1 bg-${s.color}-500`} />
                  <div className="pl-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">{s.label}</p>
                    <p className="text-base font-bold capitalize text-gray-900 dark:text-white">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Personal & Contact */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Mail className="h-4 w-4 text-indigo-500" /> Personal & Contact</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={Mail} label="Email" value={profileUser.email} />
                  <InfoRow icon={Phone} label="Phone" value={p?.phone} color="amber" />
                  <InfoRow icon={Calendar} label="Date of Birth" value={p?.dateOfBirth} color="rose" />
                  <InfoRow icon={Shield} label="Gender" value={p?.gender} color="purple" />
                  <InfoRow icon={Mail} label="Personal Email" value={p?.personalEmail} color="emerald" />
                  <InfoRow icon={Building} label="Blood Group" value={p?.bloodGroup} color="rose" />
                </div>
                {p?.address && (
                  <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Address</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{p.address}</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Building className="h-4 w-4 text-emerald-500" /> Work Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={Shield} label="Employee ID" value={p?.employeeId} color="blue" />
                  <InfoRow icon={Building} label="Department" value={profileUser.department} color="emerald" />
                  <InfoRow icon={Activity} label="Designation" value={p?.designation} color="purple" />
                  <InfoRow icon={Calendar} label="Joining Date" value={p?.joiningDate} color="amber" />
                </div>
              </div>
            </div>

            {/* Emergency & Bank */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Phone className="h-4 w-4 text-rose-500" /> Emergency Contact</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={Activity} label="Name" value={p?.emergencyName} color="rose" />
                  <InfoRow icon={Shield} label="Relationship" value={p?.emergencyRelation} color="amber" />
                  <InfoRow icon={Phone} label="Phone" value={p?.emergencyPhone} color="emerald" />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500" /> Bank & Identity</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow icon={Shield} label="Bank" value={p?.bankName} color="blue" />
                  <InfoRow icon={Shield} label="Account Number" value={p?.bankAccountNumber || p?.bankAccountNumberMasked} color="blue" />
                  <InfoRow icon={Shield} label="IFSC" value={p?.bankIfsc} color="blue" />
                  <InfoRow icon={Shield} label="Aadhaar" value={p?.aadhaarNumber || p?.aadhaarNumberMasked} color="purple" />
                  <InfoRow icon={Shield} label="PAN" value={p?.panNumber || p?.panNumberMasked} color="purple" />
                  <InfoRow icon={Shield} label="Passport" value={p?.passportNumber || p?.passportNumberMasked} color="purple" />
                </div>
              </div>
            </div>

            {/* Skills & Work History */}
            <div className="grid gap-6 lg:grid-cols-2">
              {(p?.skills?.length || 0) > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                  <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Activity className="h-4 w-4 text-emerald-500" /> Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {p!.skills!.map((s, i) => (
                      <span key={i} className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {(p?.workHistory?.length || 0) > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                  <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Calendar className="h-4 w-4 text-amber-500" /> Work History</h3>
                  <div className="space-y-3">
                    {p!.workHistory!.map((w, i) => (
                      <div key={i} className="relative rounded-lg border border-gray-100 dark:border-gray-800 p-3 pl-5">
                        <div className="absolute left-0 top-3 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-indigo-500 bg-white dark:bg-gray-900" />
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{w.role}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{w.company}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{w.from} — {w.to || "Present"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(p?.certifications?.length || 0) > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="h-4 w-4 text-purple-500" /> Certifications</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {p!.certifications!.map((c, i) => (
                    <div key={i} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.issuer}{c.year ? ` — ${c.year}` : ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(p?.offerLetterPath || (p?.certificatePaths?.length || 0) > 0) && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="h-4 w-4 text-rose-500" /> Documents</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {p?.offerLetterPath && (
                    <a href={`/${p.offerLetterPath}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Shield className="h-4 w-4" /> Offer Letter
                    </a>
                  )}
                  {p?.certificatePaths?.map((path, i) => (
                    <a key={i} href={`/${path}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Shield className="h-4 w-4" /> Certificate {i + 1}
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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your team members and their roles
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Employee
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Employee</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Department</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Role</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Joined</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-gray-400 dark:text-gray-500">
                  No employees found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/60 transition-colors">
                  <td className="px-5 py-4">
                    <button onClick={() => openProfile(u)} className="flex items-center gap-3 group">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white shadow-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{u.department || "\u2014"}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadge[u.role]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${roleDot[u.role]}`} />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${u.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="rounded-lg p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(u._id)} className="rounded-lg p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-12 text-center text-gray-400 dark:text-gray-500">
            No employees found.
          </div>
        ) : (
          filtered.map((u) => (
            <div key={u._id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              {/* Top: Avatar + Name + Email + Role */}
              <div className="flex items-center gap-3">
                <button onClick={() => openProfile(u)} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white shadow-sm">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                  </div>
                </button>
                <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadge[u.role]}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${roleDot[u.role]}`} />
                  {u.role}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Department</p>
                  <p className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{u.department || "\u2014"}</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</p>
                  <p className={`mt-0.5 text-xs font-medium ${u.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Joined</p>
                  <p className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">{new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="mt-3 flex gap-1 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <button onClick={() => openEdit(u)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(u._id)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">Previous</button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && (() => {
        const fieldCls = (err?: string) =>
          `w-full rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm outline-none focus:ring-2 transition-colors ${
            err
              ? "border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-indigo-500/20"
          }`;
        const LabelText = ({ children }: { children: React.ReactNode }) => (
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{children}</label>
        );
        const ErrText = ({ msg }: { msg?: string }) =>
          msg ? <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{msg}</p> : null;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 dark:bg-black/60 px-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? "Edit Employee" : "New Employee"}</h2>
              <button onClick={resetForm} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            </div>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
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
              <div className="grid sm:grid-cols-2 gap-4">
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
              <div className="grid sm:grid-cols-2 gap-4">
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrength pw={formPassword} />
                  <ErrText msg={errors.password} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <LabelText>Aadhaar No</LabelText>
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
              <div className="grid sm:grid-cols-2 gap-4">
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
                <label className="flex items-center gap-2.5 text-sm text-gray-900 dark:text-gray-300">
                  <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600 text-indigo-600" />
                  Active
                </label>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/25">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
