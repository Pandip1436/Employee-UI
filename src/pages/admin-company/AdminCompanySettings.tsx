import { useState, useEffect } from "react";
import { Save, Loader2, Building2, Globe, Calendar, Briefcase } from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import type { CompanySettingsData } from "../../api/adminSettingsApi";
import { useCompany } from "../../context/CompanyContext";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full";

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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminCompanySettings() {
  const { refresh: refreshCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [fiscalYearStart, setFiscalYearStart] = useState("January");
  const [workingDays, setWorkingDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);

  useEffect(() => {
    adminSettingsApi
      .getCompanySettings()
      .then((r) => {
        const d = r.data.data;
        if (d) {
          setCompanyName(d.companyName || "");
          setTimezone(d.timezone || "UTC");
          setFiscalYearStart(d.fiscalYearStart || "January");
          setWorkingDays(d.workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri"]);
        }
      })
      .catch(() => toast.error("Failed to load company settings"))
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure your organization details and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Name */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Company Name</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your organization's display name</p>
            </div>
          </div>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            className={inputCls}
          />
        </div>

        {/* Timezone */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Timezone</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Default timezone for operations</p>
            </div>
          </div>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={inputCls}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        {/* Fiscal Year Start */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Fiscal Year Start</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Month when your fiscal year begins</p>
            </div>
          </div>
          <select
            value={fiscalYearStart}
            onChange={(e) => setFiscalYearStart(e.target.value)}
            className={inputCls}
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Working Days */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10">
              <Briefcase className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Working Days</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Select your organization's working days</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  workingDays.includes(day)
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
