import { useState, useEffect, useRef, type FormEvent } from "react";
import {
  User as UserIcon, Mail, Phone, MapPin, Building, Briefcase, Calendar, Heart, Shield,
  CreditCard, FileText, Award, Clock, Plus, X, Pencil, Save, Camera, Upload, Trash2, ChevronRight,
  Eye, Download, ExternalLink, Loader2, Sparkles, CheckCircle2, AlertCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { employeeProfileApi } from "../../api/employeeProfileApi";
import type { EmployeeProfile, WorkHistoryEntry, CertificationEntry } from "../../types";
import toast from "react-hot-toast";

const tabs = [
  { key: "personal", label: "Personal", icon: UserIcon },
  { key: "contact", label: "Contact", icon: Phone },
  { key: "work", label: "Work Info", icon: Briefcase },
  { key: "emergency", label: "Emergency", icon: Heart },
  { key: "bank", label: "Bank", icon: CreditCard },
  { key: "identity", label: "Identity", icon: Shield },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "history", label: "History", icon: Clock },
  { key: "skills", label: "Skills", icon: Award },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";
const cardCls = "rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03] p-6 sm:p-8 transition-all";
const readCls = "text-sm font-medium text-gray-900 dark:text-white";
const readLabelCls = "text-xs text-gray-500 dark:text-gray-400";

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<EmployeeProfile>>({});
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreview(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [preview]);

  useEffect(() => {
    employeeProfileApi.getMyProfile().then((r) => {
      setProfile(r.data.data!);
      setForm(r.data.data!);
    }).catch(() => { /* interceptor */ });
  }, []);

  if (!user) return null;

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!validateAll()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      const res = await employeeProfileApi.updateMyProfile(form);
      setProfile(res.data.data!);
      setForm(res.data.data!);
      setEditing(false);
      setErrors({});
      toast.success("Profile updated!");
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (file: File) => {
    const fd = new FormData();
    fd.append("photo", file);
    try {
      const res = await employeeProfileApi.uploadPhoto(fd);
      setProfile(res.data.data!);
      toast.success("Photo uploaded!");
    } catch { /* interceptor */ }
  };

  const handleOfferLetter = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await employeeProfileApi.uploadOfferLetter(fd);
      setProfile(res.data.data!);
      toast.success("Offer letter uploaded!");
    } catch { /* interceptor */ }
  };

  const handleCertFiles = async (files: FileList) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    try {
      const res = await employeeProfileApi.uploadCertificates(fd);
      setProfile(res.data.data!);
      toast.success("Certificates uploaded!");
    } catch { /* interceptor */ }
  };

  const setField = (key: string, value: unknown) => {
    setForm((p) => ({ ...p, [key]: value }));
    // If the field already has a visible error, re-validate as the user types
    // so they see it clear in real time once they fix it.
    if (errors[key]) {
      const msg = runValidator(key, value);
      setErrors((prev) => ({ ...prev, [key]: msg || "" }));
    }
  };

  // ── Validation ──
  const [errors, setErrors] = useState<Record<string, string>>({});

  function runValidator(key: string, raw: unknown): string {
    const v = typeof raw === "string" ? raw.trim() : raw;
    if (v == null || v === "") return ""; // empty values are allowed; specific required fields handled separately
    switch (key) {
      case "personalEmail":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) ? "" : "Enter a valid email address";
      case "phone":
      case "emergencyPhone": {
        const digits = String(v).replace(/\D/g, "");
        if (digits.length < 10) return "Phone must have at least 10 digits";
        if (digits.length > 15) return "Phone is too long";
        if (!/^\+?[\d\s\-()]+$/.test(String(v))) return "Only digits, +, -, spaces and () are allowed";
        return "";
      }
      case "aadhaarNumber": {
        const digits = String(v).replace(/\s/g, "");
        if (!/^\d{12}$/.test(digits)) return "Aadhaar must be 12 digits";
        return "";
      }
      case "panNumber": {
        const upper = String(v).toUpperCase();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(upper)) return "PAN format: ABCDE1234F";
        return "";
      }
      case "passportNumber":
        if (!/^[A-Z0-9]{6,9}$/i.test(String(v))) return "Passport must be 6–9 alphanumeric characters";
        return "";
      case "bankAccountNumber":
        if (!/^\d{9,18}$/.test(String(v))) return "Account number must be 9–18 digits";
        return "";
      case "bankIfsc":
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(v))) return "IFSC format: ABCD0XXXXXX";
        return "";
      case "bankName":
        if (String(v).length < 2) return "Bank name is too short";
        return "";
      case "employeeId":
        if (!/^[A-Z0-9-]{3,20}$/i.test(String(v))) return "Use 3–20 chars: letters, digits, hyphens";
        return "";
      case "designation":
        if (String(v).length < 2) return "Designation is too short";
        return "";
      case "emergencyName":
      case "emergencyRelation":
        if (String(v).length < 2) return "At least 2 characters";
        return "";
      case "address":
        if (String(v).length < 5) return "Address is too short";
        return "";
      case "dateOfBirth": {
        const d = new Date(String(v));
        if (isNaN(d.getTime())) return "Invalid date";
        const now = new Date();
        if (d > now) return "Date of birth cannot be in the future";
        const ageMs = now.getTime() - d.getTime();
        const years = ageMs / (365.25 * 24 * 3600 * 1000);
        if (years < 14) return "Must be at least 14 years old";
        if (years > 100) return "Date of birth is too far in the past";
        return "";
      }
      case "joiningDate": {
        const d = new Date(String(v));
        if (isNaN(d.getTime())) return "Invalid date";
        const now = new Date();
        // Allow future dates up to 1 year ahead (offer accepted but not started yet)
        const oneYearAhead = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        if (d > oneYearAhead) return "Joining date is too far in the future";
        return "";
      }
      default:
        return "";
    }
  }

  function validateField(key: string, value: unknown) {
    const msg = runValidator(key, value);
    setErrors((prev) => ({ ...prev, [key]: msg }));
    return !msg;
  }

  function validateAll(): boolean {
    const fields = [
      "personalEmail", "phone", "address", "dateOfBirth",
      "designation", "employeeId", "joiningDate",
      "emergencyName", "emergencyRelation", "emergencyPhone",
      "bankAccountNumber", "bankIfsc", "bankName",
      "aadhaarNumber", "panNumber", "passportNumber",
    ];
    const next: Record<string, string> = {};
    let ok = true;
    for (const f of fields) {
      const msg = runValidator(f, (form as any)[f]);
      if (msg) { next[f] = msg; ok = false; }
    }
    setErrors(next);
    return ok;
  }

  const inputClsFor = (key: string) =>
    `${inputCls} ${
      errors[key]
        ? "!border-rose-500 focus:!border-rose-500 focus:!ring-rose-500/20 dark:!border-rose-500/70"
        : ""
    }`;

  const ErrMsg = ({ name }: { name: string }) =>
    errors[name] ? (
      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-3 w-3 shrink-0" /> {errors[name]}
      </p>
    ) : null;

  // Work history helpers
  const addWorkEntry = () => setForm((p) => ({
    ...p,
    workHistory: [...(p.workHistory || []), { company: "", role: "", from: "", to: "", description: "" }],
  }));
  const updateWorkEntry = (i: number, key: keyof WorkHistoryEntry, val: string) =>
    setForm((p) => ({
      ...p,
      workHistory: (p.workHistory || []).map((w, idx) => idx === i ? { ...w, [key]: val } : w),
    }));
  const removeWorkEntry = (i: number) =>
    setForm((p) => ({ ...p, workHistory: (p.workHistory || []).filter((_, idx) => idx !== i) }));

  // Cert helpers
  const addCert = () => setForm((p) => ({
    ...p,
    certifications: [...(p.certifications || []), { name: "", issuer: "", year: "" }],
  }));
  const updateCert = (i: number, key: keyof CertificationEntry, val: string) =>
    setForm((p) => ({
      ...p,
      certifications: (p.certifications || []).map((c, idx) => idx === i ? { ...c, [key]: val } : c),
    }));
  const removeCert = (i: number) =>
    setForm((p) => ({ ...p, certifications: (p.certifications || []).filter((_, idx) => idx !== i) }));

  // Skills helpers
  const [skillInput, setSkillInput] = useState("");
  const addSkill = () => {
    if (!skillInput.trim()) return;
    setForm((p) => ({ ...p, skills: [...(p.skills || []), skillInput.trim()] }));
    setSkillInput("");
  };
  const removeSkill = (i: number) => setForm((p) => ({ ...p, skills: (p.skills || []).filter((_, idx) => idx !== i) }));

  const ReadField = ({ label, value, icon: Icon }: { label: string; value?: string; icon?: typeof UserIcon }) => (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
          <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </div>
      )}
      <div>
        <p className={readLabelCls}>{label}</p>
        <p className={readCls}>{value || "—"}</p>
      </div>
    </div>
  );

  // ── Profile completion meter ──
  const completion = (() => {
    const checks: boolean[] = [
      !!profile?.dateOfBirth,
      !!profile?.gender,
      !!profile?.bloodGroup,
      !!profile?.phone,
      !!profile?.personalEmail,
      !!profile?.address,
      !!profile?.designation,
      !!profile?.employeeId,
      !!profile?.joiningDate,
      !!profile?.emergencyName,
      !!profile?.emergencyPhone,
      !!profile?.bankAccountNumber || !!profile?.bankAccountNumberMasked,
      !!profile?.bankIfsc,
      !!profile?.aadhaarNumber || !!profile?.aadhaarNumberMasked,
      !!profile?.panNumber,
      !!profile?.profilePhotoUrl,
      !!profile?.offerLetterUrl,
      (profile?.skills?.length || 0) > 0,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  })();

  return (
    <div className="space-y-6">
      {/* ━━━ Premium Profile Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 sm:p-8 text-white shadow-2xl ring-1 ring-white/10 dark:from-black dark:via-indigo-950 dark:to-black">
        {/* Ambient blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-44 w-44 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        {/* Dot pattern with mask */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          {/* Avatar with ring + completion meter */}
          <div className="relative mx-auto sm:mx-0">
            {/* Animated conic ring showing completion */}
            <div
              aria-hidden
              className="relative h-32 w-32 rounded-full p-[3px] shadow-2xl shadow-black/40"
              style={{
                background: `conic-gradient(from 0deg, #818cf8 ${completion}%, rgba(255,255,255,0.12) ${completion}%)`,
              }}
            >
              <div className="group relative h-full w-full overflow-hidden rounded-full bg-gray-900 ring-1 ring-white/10">
                {profile?.profilePhotoUrl ? (
                  <img src={profile.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => photoRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-gray-950/60 opacity-0 backdrop-blur-sm transition-opacity hover:opacity-100"
                  aria-label="Change profile photo"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>
            {/* Online dot */}
            <span className="absolute bottom-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-gray-900">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-200 ring-1 ring-white/15 backdrop-blur-sm">
              <Sparkles className="h-3 w-3" /> My Profile
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {user.name}
            </h1>
            <p className="mt-1 text-sm text-indigo-200/70">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold capitalize text-indigo-100 ring-1 ring-white/15 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {user.role}
              </span>
              {profile?.designation && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-100 ring-1 ring-white/15 backdrop-blur-sm">
                  {profile.designation}
                </span>
              )}
              {user.department && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-100 ring-1 ring-white/15 backdrop-blur-sm">
                  {user.department}
                </span>
              )}
              {profile?.employeeId && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-mono font-semibold text-indigo-200 ring-1 ring-white/15 backdrop-blur-sm">
                  {profile.employeeId}
                </span>
              )}
            </div>
          </div>

          {/* Right side: completion + edit */}
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            {/* Completion card */}
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200/80">
                  Profile complete
                </p>
                <p className="text-base font-bold tabular-nums text-white">{completion}%</p>
              </div>
              <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-fuchsia-400 transition-[width] duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              {completion === 100 ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-200">
                  <CheckCircle2 className="h-3 w-3" /> All set
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-indigo-200/70">
                  Fill remaining fields to reach 100%
                </p>
              )}
            </div>

            <button
              onClick={() => { if (editing) handleSave(); else setEditing(true); }}
              disabled={saving}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/30 transition-all hover:shadow-xl active:scale-[0.99] disabled:opacity-60"
            >
              <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {editing ? (saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save</>) : <><Pencil className="h-4 w-4" /> Edit Profile</>}
            </button>
          </div>
        </div>
      </div>

      {/* ━━━ Premium Tab Nav (sticky) ━━━ */}
      <div className="sticky top-3 z-20 -mx-1 px-1">
        <div className="overflow-x-auto rounded-2xl border border-gray-200/70 bg-white/80 p-1.5 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-xl scrollbar-hide dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03]">
          <div className="inline-flex gap-1">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`group inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/25 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/30"
                      : "text-gray-500 hover:bg-gray-100/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
                  }`}
                >
                  <t.icon
                    className={`h-3.5 w-3.5 transition-colors ${
                      active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                    }`}
                  />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ━━━ Tab Content ━━━ */}
      <div className={cardCls}>

        {/* Personal */}
        {activeTab === "personal" && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><UserIcon className="h-5 w-5 text-indigo-500" /> Personal Information</h3>
            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input
                    type="date"
                    value={form.dateOfBirth || ""}
                    onChange={(e) => setField("dateOfBirth", e.target.value)}
                    onBlur={(e) => validateField("dateOfBirth", e.target.value)}
                    className={inputClsFor("dateOfBirth")}
                  />
                  <ErrMsg name="dateOfBirth" />
                </div>
                <div><label className={labelCls}>Gender</label>
                  <select value={form.gender || ""} onChange={(e) => setField("gender", e.target.value)} className={inputCls}>
                    <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select></div>
                <div><label className={labelCls}>Blood Group</label>
                  <select value={form.bloodGroup || ""} onChange={(e) => setField("bloodGroup", e.target.value)} className={inputCls}>
                    <option value="">Select</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select></div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ReadField label="Full Name" value={user.name} icon={UserIcon} />
                <ReadField label="Email" value={user.email} icon={Mail} />
                <ReadField label="Date of Birth" value={profile?.dateOfBirth} icon={Calendar} />
                <ReadField label="Gender" value={profile?.gender} icon={UserIcon} />
                <ReadField label="Blood Group" value={profile?.bloodGroup} icon={Heart} />
              </div>
            )}
          </div>
        )}

        {/* Contact */}
        {activeTab === "contact" && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Phone className="h-5 w-5 text-emerald-500" /> Contact Details</h3>
            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Personal Email</label>
                  <input
                    type="email"
                    value={form.personalEmail || ""}
                    onChange={(e) => setField("personalEmail", e.target.value)}
                    onBlur={(e) => validateField("personalEmail", e.target.value)}
                    className={inputClsFor("personalEmail")}
                    placeholder="personal@email.com"
                  />
                  <ErrMsg name="personalEmail" />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    value={form.phone || ""}
                    onChange={(e) => setField("phone", e.target.value)}
                    onBlur={(e) => validateField("phone", e.target.value)}
                    className={inputClsFor("phone")}
                    placeholder="+91 9876543210"
                    inputMode="tel"
                  />
                  <ErrMsg name="phone" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Address</label>
                  <textarea
                    rows={3}
                    value={form.address || ""}
                    onChange={(e) => setField("address", e.target.value)}
                    onBlur={(e) => validateField("address", e.target.value)}
                    className={inputClsFor("address")}
                    placeholder="Full address"
                  />
                  <ErrMsg name="address" />
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ReadField label="Personal Email" value={profile?.personalEmail} icon={Mail} />
                <ReadField label="Phone" value={profile?.phone} icon={Phone} />
                <ReadField label="Address" value={profile?.address} icon={MapPin} />
              </div>
            )}
          </div>
        )}

        {/* Work Info */}
        {activeTab === "work" && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Briefcase className="h-5 w-5 text-amber-500" /> Work Information</h3>
            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Employee ID</label>
                  <input
                    value={form.employeeId || ""}
                    onChange={(e) => setField("employeeId", e.target.value)}
                    onBlur={(e) => validateField("employeeId", e.target.value)}
                    className={inputClsFor("employeeId")}
                    placeholder="EMP-001"
                  />
                  <ErrMsg name="employeeId" />
                </div>
                <div><label className={labelCls}>Department</label>
                  <select value={user.department || ""} disabled className={`${inputCls} opacity-60`}>
                    <option>{user.department || "Not assigned"}</option>
                  </select></div>
                <div>
                  <label className={labelCls}>Designation</label>
                  <input
                    value={form.designation || ""}
                    onChange={(e) => setField("designation", e.target.value)}
                    onBlur={(e) => validateField("designation", e.target.value)}
                    className={inputClsFor("designation")}
                    placeholder="Software Engineer"
                  />
                  <ErrMsg name="designation" />
                </div>
                <div>
                  <label className={labelCls}>Joining Date</label>
                  <input
                    type="date"
                    value={form.joiningDate || ""}
                    onChange={(e) => setField("joiningDate", e.target.value)}
                    onBlur={(e) => validateField("joiningDate", e.target.value)}
                    className={inputClsFor("joiningDate")}
                  />
                  <ErrMsg name="joiningDate" />
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ReadField label="Employee ID" value={profile?.employeeId} icon={Shield} />
                <ReadField label="Department" value={user.department} icon={Building} />
                <ReadField label="Designation" value={profile?.designation} icon={Briefcase} />
                <ReadField label="Joining Date" value={profile?.joiningDate} icon={Calendar} />
              </div>
            )}
          </div>
        )}

        {/* Emergency */}
        {activeTab === "emergency" && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Heart className="h-5 w-5 text-rose-500" /> Emergency Contact</h3>
            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelCls}>Name</label>
                  <input
                    value={form.emergencyName || ""}
                    onChange={(e) => setField("emergencyName", e.target.value)}
                    onBlur={(e) => validateField("emergencyName", e.target.value)}
                    className={inputClsFor("emergencyName")}
                  />
                  <ErrMsg name="emergencyName" />
                </div>
                <div>
                  <label className={labelCls}>Relationship</label>
                  <input
                    value={form.emergencyRelation || ""}
                    onChange={(e) => setField("emergencyRelation", e.target.value)}
                    onBlur={(e) => validateField("emergencyRelation", e.target.value)}
                    className={inputClsFor("emergencyRelation")}
                    placeholder="Father / Spouse"
                  />
                  <ErrMsg name="emergencyRelation" />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input
                    value={form.emergencyPhone || ""}
                    onChange={(e) => setField("emergencyPhone", e.target.value)}
                    onBlur={(e) => validateField("emergencyPhone", e.target.value)}
                    className={inputClsFor("emergencyPhone")}
                    placeholder="+91 9876543210"
                    inputMode="tel"
                  />
                  <ErrMsg name="emergencyPhone" />
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ReadField label="Name" value={profile?.emergencyName} icon={UserIcon} />
                <ReadField label="Relationship" value={profile?.emergencyRelation} icon={Heart} />
                <ReadField label="Phone" value={profile?.emergencyPhone} icon={Phone} />
              </div>
            )}
          </div>
        )}

        {/* Bank */}
        {activeTab === "bank" && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><CreditCard className="h-5 w-5 text-blue-500" /> Bank Details</h3>
            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelCls}>Account Number</label>
                  <input
                    value={form.bankAccountNumber || ""}
                    onChange={(e) => setField("bankAccountNumber", e.target.value.replace(/\D/g, ""))}
                    onBlur={(e) => validateField("bankAccountNumber", e.target.value)}
                    className={inputClsFor("bankAccountNumber")}
                    inputMode="numeric"
                    placeholder="9-18 digits"
                  />
                  <ErrMsg name="bankAccountNumber" />
                </div>
                <div>
                  <label className={labelCls}>IFSC Code</label>
                  <input
                    value={form.bankIfsc || ""}
                    onChange={(e) => setField("bankIfsc", e.target.value.toUpperCase())}
                    onBlur={(e) => validateField("bankIfsc", e.target.value)}
                    className={inputClsFor("bankIfsc")}
                    placeholder="ABCD0XXXXXX"
                    maxLength={11}
                  />
                  <ErrMsg name="bankIfsc" />
                </div>
                <div>
                  <label className={labelCls}>Bank Name</label>
                  <input
                    value={form.bankName || ""}
                    onChange={(e) => setField("bankName", e.target.value)}
                    onBlur={(e) => validateField("bankName", e.target.value)}
                    className={inputClsFor("bankName")}
                  />
                  <ErrMsg name="bankName" />
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ReadField label="Account Number" value={profile?.bankAccountNumber || profile?.bankAccountNumberMasked || "—"} icon={CreditCard} />
                <ReadField label="IFSC Code" value={profile?.bankIfsc} icon={Building} />
                <ReadField label="Bank Name" value={profile?.bankName} icon={Building} />
              </div>
            )}
          </div>
        )}

        {/* Identity */}
        {activeTab === "identity" && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="h-5 w-5 text-purple-500" /> Identity Details</h3>
            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelCls}>Aadhaar Number</label>
                  <input
                    value={form.aadhaarNumber || ""}
                    onChange={(e) => setField("aadhaarNumber", e.target.value.replace(/[^\d\s]/g, ""))}
                    onBlur={(e) => validateField("aadhaarNumber", e.target.value)}
                    className={inputClsFor("aadhaarNumber")}
                    placeholder="1234 5678 9012"
                    inputMode="numeric"
                    maxLength={14}
                  />
                  <ErrMsg name="aadhaarNumber" />
                </div>
                <div>
                  <label className={labelCls}>PAN Number</label>
                  <input
                    value={form.panNumber || ""}
                    onChange={(e) => setField("panNumber", e.target.value.toUpperCase().slice(0, 10))}
                    onBlur={(e) => validateField("panNumber", e.target.value)}
                    className={inputClsFor("panNumber")}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                  <ErrMsg name="panNumber" />
                </div>
                <div>
                  <label className={labelCls}>Passport Number</label>
                  <input
                    value={form.passportNumber || ""}
                    onChange={(e) => setField("passportNumber", e.target.value.toUpperCase())}
                    onBlur={(e) => validateField("passportNumber", e.target.value)}
                    className={inputClsFor("passportNumber")}
                    maxLength={9}
                  />
                  <ErrMsg name="passportNumber" />
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <ReadField label="Aadhaar" value={profile?.aadhaarNumber || profile?.aadhaarNumberMasked || "—"} icon={Shield} />
                <ReadField label="PAN" value={profile?.panNumber || profile?.panNumberMasked || "—"} icon={FileText} />
                <ReadField label="Passport" value={profile?.passportNumber || profile?.passportNumberMasked || "—"} icon={FileText} />
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        {activeTab === "documents" && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileText className="h-5 w-5 text-rose-500" /> Documents</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Offer Letter */}
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-5">
                <p className={labelCls}>Offer Letter</p>
                {profile?.offerLetterUrl ? (
                  <div className="mt-2 flex items-center gap-3">
                    <DocThumb
                      url={profile.offerLetterUrl}
                      name="Offer Letter"
                      onOpen={() => setPreview({ url: profile.offerLetterUrl!, name: "Offer Letter" })}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-700 dark:text-gray-300">Uploaded</p>
                      <button
                        type="button"
                        onClick={() => setPreview({ url: profile.offerLetterUrl!, name: "Offer Letter" })}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Not uploaded</p>
                )}
                <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <Upload className="h-3.5 w-3.5" /> Upload
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleOfferLetter(e.target.files[0])} />
                </label>
              </div>

              {/* Certificates */}
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-5">
                <p className={labelCls}>Certificates</p>
                {(profile?.certificateUrls?.length || 0) > 0 ? (
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {profile!.certificateUrls!.map((url, i) => (
                      <DocThumb
                        key={i}
                        url={url}
                        name={`Certificate ${i + 1}`}
                        size="lg"
                        onOpen={() => setPreview({ url, name: `Certificate ${i + 1}` })}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">No certificates</p>
                )}
                <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <Upload className="h-3.5 w-3.5" /> Upload Files
                  <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleCertFiles(e.target.files)} />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Work History */}
        {activeTab === "history" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Clock className="h-5 w-5 text-amber-500" /> Work History</h3>
              {editing && (
                <button onClick={addWorkEntry} className="flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              )}
            </div>

            {(form.workHistory || []).length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No work history added.</p>
            ) : (
              <div className="space-y-4">
                {(editing ? form.workHistory! : profile?.workHistory || []).map((w, i) => (
                  <div key={i} className="relative rounded-xl border border-gray-200 dark:border-gray-800 p-4 pl-6">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-indigo-500 bg-white dark:bg-gray-900" />
                    {editing ? (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input placeholder="Company" value={w.company} onChange={(e) => updateWorkEntry(i, "company", e.target.value)} className={inputCls} />
                          <input placeholder="Role / Title" value={w.role} onChange={(e) => updateWorkEntry(i, "role", e.target.value)} className={inputCls} />
                          <input type="date" value={w.from} onChange={(e) => updateWorkEntry(i, "from", e.target.value)} className={inputCls} />
                          <input type="date" value={w.to} onChange={(e) => updateWorkEntry(i, "to", e.target.value)} className={inputCls} />
                        </div>
                        <textarea rows={2} placeholder="Description" value={w.description || ""} onChange={(e) => updateWorkEntry(i, "description", e.target.value)} className={inputCls} />
                        <button onClick={() => removeWorkEntry(i)} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{w.role}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{w.company}</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{w.from} — {w.to || "Present"}</p>
                        {w.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{w.description}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Skills & Certs */}
        {activeTab === "skills" && (
          <div className="space-y-6">
            {/* Skills */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4"><Award className="h-5 w-5 text-emerald-500" /> Skills</h3>
              {editing && (
                <div className="flex gap-2 mb-3">
                  <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} className={`flex-1 ${inputCls}`} placeholder="Type a skill and press Enter" />
                  <button onClick={addSkill} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Add</button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {(editing ? form.skills : profile?.skills || [])?.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                    {s}
                    {editing && (
                      <button onClick={() => removeSkill(i)} className="hover:text-rose-500"><X className="h-3 w-3" /></button>
                    )}
                  </span>
                ))}
                {((editing ? form.skills : profile?.skills) || []).length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">No skills added.</p>
                )}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Award className="h-5 w-5 text-purple-500" /> Certifications</h3>
                {editing && (
                  <button onClick={addCert} className="flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                )}
              </div>
              {(editing ? form.certifications : profile?.certifications || [])?.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No certifications added.</p>
              ) : (
                <div className="space-y-3">
                  {(editing ? form.certifications! : profile?.certifications || []).map((c, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                      {editing ? (
                        <div className="grid gap-3 sm:grid-cols-3">
                          <input placeholder="Certification Name" value={c.name} onChange={(e) => updateCert(i, "name", e.target.value)} className={inputCls} />
                          <input placeholder="Issuer" value={c.issuer || ""} onChange={(e) => updateCert(i, "issuer", e.target.value)} className={inputCls} />
                          <div className="flex gap-2">
                            <input placeholder="Year" value={c.year || ""} onChange={(e) => updateCert(i, "year", e.target.value)} className={inputCls} />
                            <button onClick={() => removeCert(i)} className="shrink-0 rounded-lg p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{c.issuer}{c.year ? ` — ${c.year}` : ""}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom save bar when editing */}
      {editing && (
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => { setEditing(false); setForm(profile || {}); }} className="rounded-lg border border-gray-300 dark:border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={() => handleSave()} disabled={saving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving..." : <><Save className="h-4 w-4" /> Save Changes</>}
          </button>
        </div>
      )}

      {preview && (
        <DocPreview
          url={preview.url}
          name={preview.name}
          loading={previewLoading}
          onLoadStart={() => setPreviewLoading(true)}
          onLoadEnd={() => setPreviewLoading(false)}
          onClose={() => { setPreview(null); setPreviewLoading(false); }}
        />
      )}
    </div>
  );
}

function getFileKind(url: string): "image" | "pdf" | "other" {
  const cleaned = url.split("?")[0].split("#")[0].toLowerCase();
  const ext = cleaned.split(".").pop() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "other";
}

function DocThumb({
  url, name, size = "md", onOpen,
}: {
  url: string;
  name: string;
  size?: "md" | "lg";
  onOpen: () => void;
}) {
  const kind = getFileKind(url);
  const dim = size === "lg" ? "aspect-square w-full" : "h-14 w-14";
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Preview ${name}`}
      className={`group relative ${dim} overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-all hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md hover:ring-2 hover:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800/60`}
    >
      {kind === "image" ? (
        <img
          src={url}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            // Replace broken image with the generic icon fallback
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-1 ${
            kind === "pdf"
              ? "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-500/10 dark:to-rose-500/5"
              : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-800/30"
          }`}
        >
          <FileText className={`${size === "lg" ? "h-6 w-6" : "h-5 w-5"} ${kind === "pdf" ? "text-rose-500" : "text-gray-400"}`} />
          {size === "lg" && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {kind === "pdf" ? "PDF" : "FILE"}
            </span>
          )}
        </div>
      )}
      {/* Hover overlay with eye icon + name */}
      <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold text-white">
          <Eye className="h-3 w-3 shrink-0" />
          {size === "lg" ? <span className="truncate">{name}</span> : null}
        </div>
      </div>
    </button>
  );
}

function DocPreview({
  url, name, loading, onClose, onLoadStart, onLoadEnd,
}: {
  url: string;
  name: string;
  loading: boolean;
  onClose: () => void;
  onLoadStart: () => void;
  onLoadEnd: () => void;
}) {
  const kind = getFileKind(url);

  // Trigger loading state on mount
  useEffect(() => {
    onLoadStart();
    // images and iframes will fire onLoad; "other" types just dismiss the spinner
    if (kind === "other") onLoadEnd();
  }, [url, kind, onLoadStart, onLoadEnd]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-3 py-4 sm:px-6 sm:py-8 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${name}`}
    >
      <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-2xl dark:border-gray-800/80 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white px-5 py-3 dark:border-gray-800 dark:from-gray-900/80 dark:to-gray-900">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md ring-1 ring-white/10">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{name}</p>
            <p className="truncate text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {kind === "image" ? "Image preview" : kind === "pdf" ? "PDF preview" : "File preview"}
            </p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ExternalLink className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Open</span>
          </a>
          <a
            href={url}
            download
            title="Download"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Download</span>
          </a>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="ml-1 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/80 dark:bg-gray-950/80">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          )}
          {kind === "image" && (
            <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
              <img
                src={url}
                alt={name}
                onLoad={onLoadEnd}
                onError={onLoadEnd}
                className="max-h-full max-w-full rounded-md object-contain shadow-lg"
              />
            </div>
          )}
          {kind === "pdf" && (
            <iframe
              src={url}
              title={name}
              onLoad={onLoadEnd}
              className="h-full w-full border-0"
            />
          )}
          {kind === "other" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="rounded-full bg-gray-200 p-4 dark:bg-gray-800">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Preview not available for this file type
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use Open or Download to view it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
