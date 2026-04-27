import { useState, useEffect, useMemo } from "react";
import {
  Save,
  Loader2,
  Building2,
  Globe,
  Calendar,
  Briefcase,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Check,
} from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import type { CompanySettingsData } from "../../api/adminSettingsApi";
import { useCompany } from "../../context/CompanyContext";
import { useConfirm } from "../../context/ConfirmContext";
import toast from "react-hot-toast";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = [
  { key: "Mon", label: "Mon", full: "Monday" },
  { key: "Tue", label: "Tue", full: "Tuesday" },
  { key: "Wed", label: "Wed", full: "Wednesday" },
  { key: "Thu", label: "Thu", full: "Thursday" },
  { key: "Fri", label: "Fri", full: "Friday" },
  { key: "Sat", label: "Sat", full: "Saturday" },
  { key: "Sun", label: "Sun", full: "Sunday" },
];

const input =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

interface SettingCardProps {
  icon: any;
  title: string;
  subtitle: string;
  tint: "indigo" | "emerald" | "amber" | "violet";
  children: React.ReactNode;
  className?: string;
}

const TINTS: Record<string, { glow: string; iconBg: string; iconText: string; ring: string }> = {
  indigo: {
    glow: "from-indigo-500/20 to-indigo-500/0",
    iconBg: "bg-gradient-to-br from-indigo-500 to-purple-600",
    iconText: "text-white",
    ring: "ring-indigo-500/20",
  },
  emerald: {
    glow: "from-emerald-500/20 to-emerald-500/0",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
    iconText: "text-white",
    ring: "ring-emerald-500/20",
  },
  amber: {
    glow: "from-amber-500/20 to-amber-500/0",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
    iconText: "text-white",
    ring: "ring-amber-500/20",
  },
  violet: {
    glow: "from-violet-500/20 to-violet-500/0",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
    iconText: "text-white",
    ring: "ring-violet-500/20",
  },
};

function SettingCard({ icon: Icon, title, subtitle, tint, children, className = "" }: SettingCardProps) {
  const t = TINTS[tint];
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-black/30 ${className}`}>
      <div aria-hidden className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${t.glow} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.iconBg} shadow-md ring-1 ${t.ring}`}>
            <Icon className={`h-5 w-5 ${t.iconText}`} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

const sig = (s: {
  companyName: string;
  timezone: string;
  fiscalYearStart: string;
  workingDays: string[];
}) =>
  JSON.stringify({
    companyName: s.companyName.trim(),
    timezone: s.timezone,
    fiscalYearStart: s.fiscalYearStart,
    workingDays: [...s.workingDays].sort(),
  });

export default function AdminCompanySettings() {
  const { refresh: refreshCompany } = useCompany();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [fiscalYearStart, setFiscalYearStart] = useState("January");
  const [workingDays, setWorkingDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [origSig, setOrigSig] = useState<string>("");

  const fetchSettings = () => {
    setLoading(true);
    adminSettingsApi
      .getCompanySettings()
      .then((r) => {
        const d = r.data.data;
        if (d) {
          const next = {
            companyName: d.companyName || "",
            timezone: d.timezone || "UTC",
            fiscalYearStart: d.fiscalYearStart || "January",
            workingDays: d.workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
          };
          setCompanyName(next.companyName);
          setTimezone(next.timezone);
          setFiscalYearStart(next.fiscalYearStart);
          setWorkingDays(next.workingDays);
          setOrigSig(sig(next));
        }
      })
      .catch(() => toast.error("Failed to load company settings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const dirty = useMemo(
    () => sig({ companyName, timezone, fiscalYearStart, workingDays }) !== origSig,
    [companyName, timezone, fiscalYearStart, workingDays, origSig]
  );

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleReset = async () => {
    if (!dirty) return;
    const ok = await confirm({
      title: "Discard unsaved changes?",
      description: "Your edits to company settings will be reverted to the last saved state.",
      confirmLabel: "Discard",
      cancelLabel: "Keep editing",
    });
    if (!ok) return;
    fetchSettings();
  };

  const handleSave = async () => {
    if (!companyName.trim()) return toast.error("Company name is required");
    setSaving(true);
    try {
      await adminSettingsApi.updateCompanySettings({
        companyName: companyName.trim(),
        timezone,
        fiscalYearStart,
        workingDays,
      } as Partial<CompanySettingsData>);
      setOrigSig(sig({ companyName, timezone, fiscalYearStart, workingDays }));
      toast.success("Company settings saved");
      await refreshCompany();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

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
              <Sparkles className="h-3.5 w-3.5" /> Admin · Workspace
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <Building2 className="h-8 w-8 text-indigo-300" />
              Company Settings
            </h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/80 sm:text-base">
              Configure your organization's identity, timezone, fiscal calendar, and working week —
              the foundations every other module relies on.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30 backdrop-blur-sm">
                <AlertCircle className="h-3.5 w-3.5" />
                Unsaved changes
              </span>
            )}
            {dirty && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15"
              >
                <RotateCcw className="h-4 w-4" /> Discard
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* ━━━ Settings Grid ━━━ */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Company Name */}
        <SettingCard
          icon={Building2}
          title="Company Name"
          subtitle="Your organization's display name"
          tint="indigo"
        >
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. United Nexa Tech"
            className={input}
          />
          {!companyName.trim() && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-3 w-3" /> Required field
            </p>
          )}
        </SettingCard>

        {/* Timezone */}
        <SettingCard
          icon={Globe}
          title="Timezone"
          subtitle="Default timezone for operations"
          tint="emerald"
        >
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={input}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            Affects attendance, reports, and scheduled tasks across the platform.
          </p>
        </SettingCard>

        {/* Fiscal Year Start */}
        <SettingCard
          icon={Calendar}
          title="Fiscal Year Start"
          subtitle="Month when your fiscal year begins"
          tint="amber"
        >
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {MONTHS.map((m) => {
              const active = fiscalYearStart === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFiscalYearStart(m)}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30"
                      : "bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 ring-1 ring-gray-200/50 dark:ring-gray-700/50"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
            Selected: <span className="font-bold text-gray-900 dark:text-white">{fiscalYearStart}</span>
          </p>
        </SettingCard>

        {/* Working Days */}
        <SettingCard
          icon={Briefcase}
          title="Working Days"
          subtitle="Select your organization's working days"
          tint="violet"
        >
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d) => {
              const active = workingDays.includes(d.key);
              const isWeekend = d.key === "Sat" || d.key === "Sun";
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  title={d.full}
                  className={`group/day relative inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-all ${
                    active
                      ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/30 ring-1 ring-white/10"
                      : isWeekend
                      ? "bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500 ring-1 ring-gray-200/60 dark:ring-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                      : "bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 ring-1 ring-gray-200/60 dark:ring-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {active && <Check className="h-3 w-3" />}
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                {workingDays.length}
              </span>{" "}
              day{workingDays.length !== 1 ? "s" : ""} per week
            </p>
            <button
              type="button"
              onClick={() => setWorkingDays(["Mon", "Tue", "Wed", "Thu", "Fri"])}
              className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
            >
              Reset to Mon–Fri
            </button>
          </div>
        </SettingCard>
      </div>

      {/* ━━━ Footer save bar (mobile-friendly fallback) ━━━ */}
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900/80 dark:to-gray-950 px-5 py-4 sm:flex-row sm:items-center sm:justify-between backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {dirty ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              You have unsaved changes
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              All changes saved
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <RotateCcw className="h-4 w-4" /> Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
