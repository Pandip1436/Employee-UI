import { useState, useEffect, useRef, type FormEvent } from "react";
import {
  User as UserIcon, Mail, Phone, MapPin, Building, Briefcase, Calendar, Heart, Shield,
  CreditCard, FileText, Award, Clock, Plus, X, Pencil, Save, Camera, Upload, Trash2, ChevronRight
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
const cardCls = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 transition-all";
const readCls = "text-sm font-medium text-gray-900 dark:text-white";
const readLabelCls = "text-xs text-gray-500 dark:text-gray-400";

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<EmployeeProfile>>({});
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    employeeProfileApi.getMyProfile().then((r) => {
      setProfile(r.data.data!);
      setForm(r.data.data!);
    }).catch(() => { /* interceptor */ });
  }, []);

  if (!user) return null;

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const res = await employeeProfileApi.updateMyProfile(form);
      setProfile(res.data.data!);
      setForm(res.data.data!);
      setEditing(false);
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

  const setField = (key: string, value: unknown) => setForm((p) => ({ ...p, [key]: value }));

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

  return (
    <div className="space-y-6">
      {/* ━━━ Profile Header ━━━ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-3xl font-bold shadow-lg ring-4 ring-white/20 overflow-hidden">
              {profile?.profilePhotoUrl ? (
                <img src={profile.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <button
              onClick={() => photoRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-indigo-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
          </div>

          <div className="text-center sm:text-left flex-1 min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{user.name}</h1>
            <p className="mt-1 text-indigo-200">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium capitalize">{user.role}</span>
              {profile?.designation && <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium">{profile.designation}</span>}
              {user.department && <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium">{user.department}</span>}
              {profile?.employeeId && <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium">ID: {profile.employeeId}</span>}
            </div>
          </div>

          <button
            onClick={() => { if (editing) handleSave(); else setEditing(true); }}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-lg transition-all hover:scale-105 active:scale-100"
          >
            {editing ? <><Save className="h-4 w-4" /> Save</> : <><Pencil className="h-4 w-4" /> Edit Profile</>}
          </button>
        </div>
      </div>

      {/* ━━━ Tabs ━━━ */}
      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="inline-flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                activeTab === t.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
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
                <div><label className={labelCls}>Date of Birth</label><input type="date" value={form.dateOfBirth || ""} onChange={(e) => setField("dateOfBirth", e.target.value)} className={inputCls} /></div>
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
                <div><label className={labelCls}>Personal Email</label><input type="email" value={form.personalEmail || ""} onChange={(e) => setField("personalEmail", e.target.value)} className={inputCls} placeholder="personal@email.com" /></div>
                <div><label className={labelCls}>Phone</label><input value={form.phone || ""} onChange={(e) => setField("phone", e.target.value)} className={inputCls} placeholder="+91 9876543210" /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Address</label><textarea rows={3} value={form.address || ""} onChange={(e) => setField("address", e.target.value)} className={inputCls} placeholder="Full address" /></div>
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
                <div><label className={labelCls}>Employee ID</label><input value={form.employeeId || ""} onChange={(e) => setField("employeeId", e.target.value)} className={inputCls} placeholder="EMP-001" /></div>
                <div><label className={labelCls}>Department</label>
                  <select value={user.department || ""} disabled className={`${inputCls} opacity-60`}>
                    <option>{user.department || "Not assigned"}</option>
                  </select></div>
                <div><label className={labelCls}>Designation</label><input value={form.designation || ""} onChange={(e) => setField("designation", e.target.value)} className={inputCls} placeholder="Software Engineer" /></div>
                <div><label className={labelCls}>Joining Date</label><input type="date" value={form.joiningDate || ""} onChange={(e) => setField("joiningDate", e.target.value)} className={inputCls} /></div>
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
                <div><label className={labelCls}>Name</label><input value={form.emergencyName || ""} onChange={(e) => setField("emergencyName", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Relationship</label><input value={form.emergencyRelation || ""} onChange={(e) => setField("emergencyRelation", e.target.value)} className={inputCls} placeholder="Father / Spouse" /></div>
                <div><label className={labelCls}>Phone</label><input value={form.emergencyPhone || ""} onChange={(e) => setField("emergencyPhone", e.target.value)} className={inputCls} /></div>
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
                <div><label className={labelCls}>Account Number</label><input value={form.bankAccountNumber || ""} onChange={(e) => setField("bankAccountNumber", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>IFSC Code</label><input value={form.bankIfsc || ""} onChange={(e) => setField("bankIfsc", e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Bank Name</label><input value={form.bankName || ""} onChange={(e) => setField("bankName", e.target.value)} className={inputCls} /></div>
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
                <div><label className={labelCls}>Aadhaar Number</label><input value={form.aadhaarNumber || ""} onChange={(e) => setField("aadhaarNumber", e.target.value)} className={inputCls} placeholder="1234 5678 9012" /></div>
                <div><label className={labelCls}>PAN Number</label><input value={form.panNumber || ""} onChange={(e) => setField("panNumber", e.target.value)} className={inputCls} placeholder="ABCDE1234F" /></div>
                <div><label className={labelCls}>Passport Number</label><input value={form.passportNumber || ""} onChange={(e) => setField("passportNumber", e.target.value)} className={inputCls} /></div>
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
                  <div className="flex items-center gap-2 mt-2">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">Uploaded</span>
                    <a href={profile.offerLetterUrl} target="_blank" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View</a>
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
                  <div className="mt-2 space-y-1.5">
                    {profile!.certificateUrls!.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="truncate flex-1 text-gray-700 dark:text-gray-300">Certificate {i + 1}</span>
                        <a href={url} target="_blank" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View</a>
                      </div>
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
    </div>
  );
}
