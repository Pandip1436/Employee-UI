import { useState } from "react";
import {
  User as UserIcon,
  Phone,
  Briefcase,
  Heart,
  Shield,
  CreditCard,
  Award,
  Clock,
  Plus,
  X,
  Save,
  Trash2,
  Sparkles,
  AlertCircle,
  Loader2,
  Pencil,
} from "lucide-react";
import Drawer from "../../components/Drawer";
import type { EmployeeProfile, User, WorkHistoryEntry, CertificationEntry } from "../../types";

type SectionKey =
  | "personal"
  | "contact"
  | "work"
  | "emergency"
  | "bank"
  | "identity"
  | "history"
  | "skills";

const sections: { key: SectionKey; label: string; icon: typeof UserIcon; accent: string }[] = [
  { key: "personal", label: "Personal", icon: UserIcon, accent: "from-indigo-500 to-purple-600" },
  { key: "contact", label: "Contact", icon: Phone, accent: "from-emerald-500 to-teal-600" },
  { key: "work", label: "Work", icon: Briefcase, accent: "from-amber-500 to-orange-600" },
  { key: "emergency", label: "Emergency", icon: Heart, accent: "from-rose-500 to-pink-600" },
  { key: "bank", label: "Bank", icon: CreditCard, accent: "from-sky-500 to-blue-600" },
  { key: "identity", label: "Identity", icon: Shield, accent: "from-purple-500 to-fuchsia-600" },
  { key: "history", label: "Work History", icon: Clock, accent: "from-amber-500 to-orange-600" },
  { key: "skills", label: "Skills", icon: Award, accent: "from-emerald-500 to-teal-600" },
];

// Defined at module scope (not inside the component) so their identity is stable
// across renders — otherwise React remounts these subtrees on every keystroke,
// causing flicker/jitter, especially on mobile.
function ErrMsg({ errors, name }: { errors: Record<string, string>; name: string }) {
  return errors[name] ? (
    <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
      <AlertCircle className="h-3 w-3 shrink-0" /> {errors[name]}
    </p>
  ) : null;
}

function SectionTitle({
  icon: Icon,
  color,
  children,
  description,
}: {
  icon: typeof UserIcon;
  color: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-md ring-1 ring-white/15`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">{children}</p>
        {description && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  saving: boolean;
  user: User;
  form: Partial<EmployeeProfile>;
  errors: Record<string, string>;
  inputCls: string;
  labelCls: string;
  inputClsFor: (key: string) => string;
  setField: (key: string, value: unknown) => void;
  validateField: (key: string, value: unknown) => boolean;
  addWorkEntry: () => void;
  updateWorkEntry: (i: number, key: keyof WorkHistoryEntry, val: string) => void;
  removeWorkEntry: (i: number) => void;
  addCert: () => void;
  updateCert: (i: number, key: keyof CertificationEntry, val: string) => void;
  removeCert: (i: number) => void;
  skillInput: string;
  setSkillInput: (s: string) => void;
  addSkill: () => void;
  removeSkill: (i: number) => void;
  onSave: () => void;
}

export default function ProfileEditDrawer(props: Props) {
  const {
    open,
    onClose,
    saving,
    user,
    form,
    errors,
    inputCls,
    labelCls,
    inputClsFor,
    setField,
    validateField,
    addWorkEntry,
    updateWorkEntry,
    removeWorkEntry,
    addCert,
    updateCert,
    removeCert,
    skillInput,
    setSkillInput,
    addSkill,
    removeSkill,
    onSave,
  } = props;

  const [activeSection, setActiveSection] = useState<SectionKey>("personal");
  const errorCount = Object.values(errors).filter(Boolean).length;

  // Show the user's photo in the drawer header (falls back to the pencil icon).
  const rawPhoto = form.profilePhotoUrl || user.profilePhotoUrl;
  const headerPhoto = rawPhoto
    ? (/^(https?:|data:)/i.test(rawPhoto) ? rawPhoto : `/${rawPhoto.replace(/^\/+/, "")}`)
    : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="xl"
      icon={
        headerPhoto ? (
          <img src={headerPhoto} alt={user.name} className="h-11 w-11 rounded-2xl object-cover" />
        ) : (
          <Pencil className="h-5 w-5 text-indigo-200" />
        )
      }
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          Editing profile
        </span>
      }
      title={user.name}
      closeOnBackdrop={false}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px]">
            {errorCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 font-semibold text-rose-600 ring-1 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertCircle className="h-3 w-3" />
                {errorCount} {errorCount === 1 ? "issue" : "issues"} to fix
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">All fields look good</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      {/* Section nav */}
      <div className="sticky top-0 z-10 border-b border-gray-200/70 bg-white px-4 py-2.5 dark:border-gray-800/80 dark:bg-gray-900">
        <div className="flex gap-1 overflow-x-auto scroll-smooth scrollbar-hide">
          {sections.map((s) => {
            const active = activeSection === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setActiveSection(s.key);
                  const el = document.getElementById(`section-${s.key}`);
                  const scroller = el?.closest<HTMLElement>(".sidebar-scroll");
                  if (el && scroller) {
                    // Scroll the drawer body itself (single axis, deterministic) instead
                    // of scrollIntoView, which on mobile also nudges other scroll
                    // ancestors and causes the visible jitter. 56px clears the sticky nav.
                    const top = scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 56;
                    scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
                  } else {
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? `bg-gradient-to-br ${s.accent} text-white shadow-sm`
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60"
                }`}
              >
                <s.icon className="h-3 w-3" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form body */}
      <div className="space-y-7 p-5 sm:p-6 [&>section]:scroll-mt-20">
        {/* Personal */}
        <section id="section-personal">
          <SectionTitle icon={UserIcon} color="from-indigo-500 to-purple-600" description="Basic info — name and email come from your account">
            Personal Information
          </SectionTitle>
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
              <ErrMsg errors={errors} name="dateOfBirth" />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select
                value={form.gender || ""}
                onChange={(e) => setField("gender", e.target.value)}
                className={inputCls}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Blood Group</label>
              <select
                value={form.bloodGroup || ""}
                onChange={(e) => setField("bloodGroup", e.target.value)}
                className={inputCls}
              >
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="section-contact">
          <SectionTitle icon={Phone} color="from-emerald-500 to-teal-600" description="How we reach you outside of work">
            Contact Details
          </SectionTitle>
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
              <ErrMsg errors={errors} name="personalEmail" />
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
              <ErrMsg errors={errors} name="phone" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Address</label>
              <textarea
                rows={3}
                value={form.address || ""}
                onChange={(e) => setField("address", e.target.value)}
                onBlur={(e) => validateField("address", e.target.value)}
                className={`${inputClsFor("address")} resize-y`}
                placeholder="Full address"
              />
              <ErrMsg errors={errors} name="address" />
            </div>
          </div>
        </section>

        {/* Work */}
        <section id="section-work">
          <SectionTitle icon={Briefcase} color="from-amber-500 to-orange-600" description="Department is managed by HR">
            Work Information
          </SectionTitle>
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
              <ErrMsg errors={errors} name="employeeId" />
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <input value={user.department || "Not assigned"} disabled className={`${inputCls} cursor-not-allowed opacity-60`} />
            </div>
            <div>
              <label className={labelCls}>Designation</label>
              <input
                value={form.designation || ""}
                onChange={(e) => setField("designation", e.target.value)}
                onBlur={(e) => validateField("designation", e.target.value)}
                className={inputClsFor("designation")}
                placeholder="Software Engineer"
              />
              <ErrMsg errors={errors} name="designation" />
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
              <ErrMsg errors={errors} name="joiningDate" />
            </div>
          </div>
        </section>

        {/* Emergency */}
        <section id="section-emergency">
          <SectionTitle icon={Heart} color="from-rose-500 to-pink-600" description="Who to call in case of emergency">
            Emergency Contact
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelCls}>Name</label>
              <input
                value={form.emergencyName || ""}
                onChange={(e) => setField("emergencyName", e.target.value)}
                onBlur={(e) => validateField("emergencyName", e.target.value)}
                className={inputClsFor("emergencyName")}
              />
              <ErrMsg errors={errors} name="emergencyName" />
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
              <ErrMsg errors={errors} name="emergencyRelation" />
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
              <ErrMsg errors={errors} name="emergencyPhone" />
            </div>
          </div>
        </section>

        {/* Bank */}
        <section id="section-bank">
          <SectionTitle icon={CreditCard} color="from-sky-500 to-blue-600" description="Used for salary disbursement only">
            Bank Details
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelCls}>Account Number</label>
              <input
                value={form.bankAccountNumber || ""}
                onChange={(e) => setField("bankAccountNumber", e.target.value.replace(/\D/g, ""))}
                onBlur={(e) => validateField("bankAccountNumber", e.target.value)}
                className={`${inputClsFor("bankAccountNumber")} font-mono tabular-nums`}
                inputMode="numeric"
                placeholder="9–18 digits"
              />
              <ErrMsg errors={errors} name="bankAccountNumber" />
            </div>
            <div>
              <label className={labelCls}>IFSC Code</label>
              <input
                value={form.bankIfsc || ""}
                onChange={(e) => setField("bankIfsc", e.target.value.toUpperCase())}
                onBlur={(e) => validateField("bankIfsc", e.target.value)}
                className={`${inputClsFor("bankIfsc")} font-mono`}
                placeholder="ABCD0XXXXXX"
                maxLength={11}
              />
              <ErrMsg errors={errors} name="bankIfsc" />
            </div>
            <div>
              <label className={labelCls}>Bank Name</label>
              <input
                value={form.bankName || ""}
                onChange={(e) => setField("bankName", e.target.value)}
                onBlur={(e) => validateField("bankName", e.target.value)}
                className={inputClsFor("bankName")}
              />
              <ErrMsg errors={errors} name="bankName" />
            </div>
          </div>
        </section>

        {/* Identity */}
        <section id="section-identity">
          <SectionTitle icon={Shield} color="from-purple-500 to-fuchsia-600" description="Stored encrypted — only masked values shown elsewhere">
            Identity Documents
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelCls}>Aadhaar Number</label>
              <input
                value={form.aadhaarNumber || ""}
                onChange={(e) => setField("aadhaarNumber", e.target.value.replace(/[^\d\s]/g, ""))}
                onBlur={(e) => validateField("aadhaarNumber", e.target.value)}
                className={`${inputClsFor("aadhaarNumber")} font-mono tabular-nums`}
                placeholder="1234 5678 9012"
                inputMode="numeric"
                maxLength={14}
              />
              <ErrMsg errors={errors} name="aadhaarNumber" />
            </div>
            <div>
              <label className={labelCls}>PAN Number</label>
              <input
                value={form.panNumber || ""}
                onChange={(e) => setField("panNumber", e.target.value.toUpperCase().slice(0, 10))}
                onBlur={(e) => validateField("panNumber", e.target.value)}
                className={`${inputClsFor("panNumber")} font-mono`}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
              <ErrMsg errors={errors} name="panNumber" />
            </div>
            <div>
              <label className={labelCls}>Passport Number</label>
              <input
                value={form.passportNumber || ""}
                onChange={(e) => setField("passportNumber", e.target.value.toUpperCase())}
                onBlur={(e) => validateField("passportNumber", e.target.value)}
                className={`${inputClsFor("passportNumber")} font-mono`}
                maxLength={9}
              />
              <ErrMsg errors={errors} name="passportNumber" />
            </div>
          </div>
        </section>

        {/* Work History */}
        <section id="section-history">
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle icon={Clock} color="from-amber-500 to-orange-600">
              Work History
            </SectionTitle>
            <button
              onClick={addWorkEntry}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {(form.workHistory || []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center dark:border-gray-800 dark:bg-gray-800/30">
              <Clock className="mx-auto h-6 w-6 text-gray-400" />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No work history yet — add your previous roles.</p>
            </div>
          ) : (
            <div className="relative space-y-3 pl-5">
              <span aria-hidden className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-400/40 via-orange-400/40 to-transparent" />
              {(form.workHistory || []).map((w, i) => (
                <div
                  key={i}
                  className="relative rounded-xl border border-gray-200/70 bg-white p-4 ring-1 ring-black/[0.02] dark:border-gray-800/80 dark:bg-gray-900 dark:ring-white/[0.03]"
                >
                  <span aria-hidden className="absolute -left-[20px] top-5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 ring-2 ring-white dark:ring-gray-900" />
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input placeholder="Company" value={w.company} onChange={(e) => updateWorkEntry(i, "company", e.target.value)} className={inputCls} />
                      <input placeholder="Role / Title" value={w.role} onChange={(e) => updateWorkEntry(i, "role", e.target.value)} className={inputCls} />
                      <input type="date" value={w.from} onChange={(e) => updateWorkEntry(i, "from", e.target.value)} className={inputCls} />
                      <input type="date" value={w.to} onChange={(e) => updateWorkEntry(i, "to", e.target.value)} className={inputCls} />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Description (optional)"
                      value={w.description || ""}
                      onChange={(e) => updateWorkEntry(i, "description", e.target.value)}
                      className={`${inputCls} resize-y`}
                    />
                    <button
                      onClick={() => removeWorkEntry(i)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Skills & Certifications */}
        <section id="section-skills" className="space-y-6">
          <div>
            <SectionTitle icon={Award} color="from-emerald-500 to-teal-600" description="Press Enter to add">
              Skills
            </SectionTitle>
            <div className="flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill and press Enter"
                className={`flex-1 ${inputCls}`}
              />
              <button
                onClick={addSkill}
                disabled={!skillInput.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(form.skills || []).length === 0 ? (
                <p className="text-xs italic text-gray-400 dark:text-gray-500">No skills added yet.</p>
              ) : (
                (form.skills || []).map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-500/20 dark:from-indigo-500/10 dark:to-purple-500/10 dark:text-indigo-300 dark:ring-indigo-400/25"
                  >
                    {s}
                    <button onClick={() => removeSkill(i)} className="rounded-full p-0.5 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle icon={Award} color="from-purple-500 to-fuchsia-600">
                Certifications
              </SectionTitle>
              <button
                onClick={addCert}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {(form.certifications || []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center dark:border-gray-800 dark:bg-gray-800/30">
                <Award className="mx-auto h-6 w-6 text-gray-400" />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No certifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(form.certifications || []).map((c, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200/70 bg-white p-3.5 ring-1 ring-black/[0.02] dark:border-gray-800/80 dark:bg-gray-900 dark:ring-white/[0.03]"
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr,1fr,auto]">
                      <input
                        placeholder="Certification Name"
                        value={c.name}
                        onChange={(e) => updateCert(i, "name", e.target.value)}
                        className={inputCls}
                      />
                      <input
                        placeholder="Issuer"
                        value={c.issuer || ""}
                        onChange={(e) => updateCert(i, "issuer", e.target.value)}
                        className={inputCls}
                      />
                      <div className="flex gap-2">
                        <input
                          placeholder="Year"
                          value={c.year || ""}
                          onChange={(e) => updateCert(i, "year", e.target.value)}
                          className={`${inputCls} w-24`}
                        />
                        <button
                          onClick={() => removeCert(i)}
                          title="Remove"
                          className="shrink-0 rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </Drawer>
  );
}
