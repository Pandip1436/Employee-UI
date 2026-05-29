import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Mail, Phone, Building, ArrowLeft, Calendar, Shield, Activity, Sparkles,
  Briefcase, FileText, Award, User as UserIcon, Pencil, LogOut,  X,
  Eye,
} from "lucide-react";
import { employeeProfileApi } from "../api/employeeProfileApi";
import type { User, EmployeeProfile } from "../types";

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

const inactiveReasonLabels: Record<string, string> = {
  resigned: "Resigned",
  terminated: "Terminated",
  retired: "Retired",
  "on-long-leave": "On Long Leave",
  "contract-ended": "Contract Ended",
  other: "Other",
};

function Avatar({ name, size = "md", photo }: { name: string; size?: "md" | "lg" | "xl"; photo?: string | null }) {
  const init = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const sz = size === "xl" ? "h-24 w-24 text-2xl" : size === "lg" ? "h-11 w-11 text-sm" : "h-10 w-10 text-[13px]";
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [photo]);
  const src = photo
    ? (/^(https?:|data:)/i.test(photo) ? photo : `/${photo.replace(/^\/+/, "")}`)
    : null;
  if (src && !broken) {
    return (
      <div className={`shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm dark:ring-gray-900 ${sz}`}>
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      </div>
    );
  }
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(name || "?")} font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 ${sz}`}>
      {init}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  gradient = "from-indigo-500 to-purple-600",
  href,
  mono,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | null;
  gradient?: string;
  href?: string;
  mono?: boolean;
}) {
  const display = value || "—";
  const valueCls = `truncate text-sm font-semibold text-gray-900 dark:text-white ${mono ? "font-mono tabular-nums" : ""}`;
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-transparent p-2 transition-all hover:border-gray-200/70 hover:bg-gray-50/60 dark:hover:border-gray-800/80 dark:hover:bg-gray-800/30">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-sm ring-1 ring-white/10 transition-transform group-hover:scale-105`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={labelCls}>{label}</p>
        {value && href ? (
          <a href={href} className={`${valueCls} hover:text-indigo-600 dark:hover:text-indigo-400`}>{display}</a>
        ) : (
          <p className={valueCls}>{display}</p>
        )}
      </div>
    </div>
  );
}

interface UserProfileDetailProps {
  user: User;
  /** Controlled profile. When omitted, the component fetches it itself. */
  profile?: EmployeeProfile | null;
  /** Loading state for the controlled `profile`. Ignored when self-fetching. */
  loading?: boolean;
  canEdit?: boolean;
  kicker?: string;
  onBack: () => void;
  onEdit?: (u: User) => void;
}

export default function UserProfileDetail({
  user, profile, loading, canEdit = false, kicker = "Employee Profile", onBack, onEdit,
}: UserProfileDetailProps) {
  const controlled = profile !== undefined;
  const [fetchedProfile, setFetchedProfile] = useState<EmployeeProfile | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    if (controlled) return;
    let active = true;
    setFetchLoading(true);
    employeeProfileApi.getByUserId(user._id)
      .then((r) => { if (active) setFetchedProfile(r.data.data ?? null); })
      .catch(() => { if (active) setFetchedProfile(null); })
      .finally(() => { if (active) setFetchLoading(false); });
    return () => { active = false; };
  }, [controlled, user._id]);

  const p = controlled ? profile ?? null : fetchedProfile;
  const isLoading = controlled ? !!loading : fetchLoading;
  const rc = roleConfig[user.role] || roleConfig.employee;

  // Click-to-preview for the profile photo (only when one exists).
  const [preview, setPreview] = useState(false);
  const photoUrl = p?.profilePhotoUrl || null;
  const previewSrc = photoUrl
    ? (/^(https?:|data:)/i.test(photoUrl) ? photoUrl : `/${photoUrl.replace(/^\/+/, "")}`)
    : null;
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreview(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);
  // The photo can disappear (e.g. switching to a user without one) — close the preview.
  useEffect(() => { if (!previewSrc) setPreview(false); }, [previewSrc]);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
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
            {previewSrc ? (
              <button
                type="button"
                onClick={() => setPreview(true)}
                title="View profile photo"
                aria-label="View profile photo"
                className="group relative block rounded-full bg-white/10 p-1.5 ring-1 ring-white/15 backdrop-blur-sm transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Avatar name={user.name} size="xl" photo={photoUrl} />
                <span className="pointer-events-none absolute inset-1.5 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/45 group-hover:opacity-100">
                  <Eye className="h-6 w-6 text-white" />
                </span>
              </button>
            ) : (
              <div className="rounded-full bg-white/10 p-1.5 ring-1 ring-white/15 backdrop-blur-sm">
                <Avatar name={user.name} size="xl" photo={photoUrl} />
              </div>
            )}
            <span
              className={`pointer-events-none absolute bottom-1 right-1 h-4 w-4 rounded-full ring-4 ring-gray-900 ${
                user.isActive ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80 sm:justify-start">
              <Sparkles className="h-3.5 w-3.5" />
              {kicker}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{user.name}</h2>
            <p className="mt-0.5 text-sm text-indigo-200/70">{user.email}</p>
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
              {user.department && (
                <span className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm">
                  {user.department}
                </span>
              )}
              {p?.employeeId && (
                <span className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm">
                  ID: {p.employeeId}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:flex-nowrap">
            {user.email && (
              <a
                href={`mailto:${user.email}`}
                title={`Email ${user.name}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.97]"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </a>
            )}
            {p?.phone && (
              <a
                href={`tel:${p.phone}`}
                title={`Call ${user.name}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.97]"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call</span>
              </a>
            )}
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(user)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
              >
                <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                  <Pencil className="h-3.5 w-3.5 text-white" />
                </span>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exit details — shown when the account is inactive */}
      {!user.isActive && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 p-5 ring-1 ring-rose-500/5 dark:border-rose-500/20 dark:from-rose-500/[0.07] dark:via-gray-900 dark:to-rose-500/[0.04]">
          <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-rose-400/15 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 shadow-sm ring-1 ring-white/10">
                <LogOut className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-600/90 dark:text-rose-400/90">
                  Exit details
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">This account is inactive</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-rose-200/70 bg-white/70 px-3 py-2 dark:border-rose-500/20 dark:bg-gray-900/50">
                <p className={labelCls}>Reason</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                  {inactiveReasonLabels[user.inactiveReason || ""] || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-rose-200/70 bg-white/70 px-3 py-2 dark:border-rose-500/20 dark:bg-gray-900/50">
                <p className={labelCls}>Relieving date</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                  {user.relievingDate
                    ? new Date(user.relievingDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-12 text-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile...</p>
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(() => {
              const joinedDate = p?.joiningDate ? new Date(p.joiningDate) : new Date(user.createdAt);
              const tenureDays = Math.max(
                0,
                Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)),
              );
              const tenureLabel =
                tenureDays < 30
                  ? `${tenureDays}d at company`
                  : tenureDays < 365
                  ? `${Math.round(tenureDays / 30)}mo at company`
                  : `${(tenureDays / 365).toFixed(1)}yr at company`;
              return [
                {
                  label: "Status",
                  value: user.isActive ? "Active" : "Inactive",
                  sub: user.isActive ? "Can sign in" : "Sign-in disabled",
                  icon: Activity,
                  gradient: user.isActive ? "from-emerald-500 to-teal-600" : "from-rose-500 to-pink-600",
                },
                {
                  label: "Department",
                  value: user.department || "—",
                  sub: p?.designation || "No designation",
                  icon: Building,
                  gradient: "from-sky-500 to-indigo-600",
                },
                {
                  label: "Role",
                  value: rc.label,
                  sub: p?.employeeId ? `ID: ${p.employeeId}` : "No ID",
                  icon: Shield,
                  gradient: "from-purple-500 to-fuchsia-600",
                },
                {
                  label: "Joined",
                  value: joinedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
                  sub: tenureLabel,
                  icon: Calendar,
                  gradient: "from-amber-500 to-orange-600",
                },
              ];
            })().map((s) => (
              <div key={s.label} className={`${cardCls} group relative overflow-hidden p-4`}>
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
                />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={labelCls}>{s.label}</p>
                    <p className="mt-1 truncate text-base font-bold tracking-tight text-gray-900 dark:text-white">
                      {s.value}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-gray-500">{s.sub}</p>
                  </div>
                  <div className={`shrink-0 rounded-lg bg-gradient-to-br ${s.gradient} p-2 shadow-md shadow-black/[0.08] ring-1 ring-white/10`}>
                    <s.icon className="h-3.5 w-3.5 text-white" />
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
                <InfoRow icon={Mail} label="Email" value={user.email} gradient="from-indigo-500 to-purple-600" href={user.email ? `mailto:${user.email}` : undefined} />
                <InfoRow icon={Phone} label="Phone" value={p?.phone} gradient="from-amber-500 to-orange-600" href={p?.phone ? `tel:${p.phone}` : undefined} mono />
                <InfoRow icon={Calendar} label="Date of Birth" value={p?.dateOfBirth} gradient="from-rose-500 to-pink-600" />
                <InfoRow icon={UserIcon} label="Gender" value={p?.gender} gradient="from-purple-500 to-fuchsia-600" />
                <InfoRow icon={Mail} label="Personal Email" value={p?.personalEmail} gradient="from-emerald-500 to-teal-600" href={p?.personalEmail ? `mailto:${p.personalEmail}` : undefined} />
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
                <InfoRow icon={Building} label="Department" value={user.department} gradient="from-emerald-500 to-teal-600" />
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

          {(p?.offerLetterUrl || (p?.certificateUrls?.length || 0) > 0) && (
            <div className={`${cardCls} p-5`}>
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-rose-50 p-2 ring-1 ring-rose-500/10 dark:bg-rose-500/10 dark:ring-rose-400/20">
                  <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Documents</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {p?.offerLetterUrl && (
                  <a
                    href={p.offerLetterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                  >
                    <FileText className="h-4 w-4" /> Offer Letter
                  </a>
                )}
                {p?.certificateUrls?.map((url, i) => (
                  <a
                    key={i}
                    href={url}
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

      {preview && previewSrc && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Profile photo preview"
          onClick={() => setPreview(false)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-8"
        >
          <div className="absolute inset-0 animate-backdrop-fade bg-black/80 backdrop-blur-sm" />
          <div className="relative animate-modal-enter" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewSrc}
              alt={user.name}
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
            />
            <button
              type="button"
              onClick={() => setPreview(false)}
              aria-label="Close preview"
              className="absolute -right-3 -top-3 rounded-full bg-white p-2 text-gray-900 shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
