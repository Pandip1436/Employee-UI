import { useState, useEffect } from "react";
import { Save, Loader2, Palmtree, Stethoscope, ToggleLeft, ToggleRight } from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import type { CompanySettingsData } from "../../api/adminSettingsApi";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full";

type LeavePolicy = CompanySettingsData["leavePolicy"];

interface LeaveTypeConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const LEAVE_TYPES: LeaveTypeConfig[] = [
  {
    key: "casual",
    label: "Casual Leave",
    icon: <Palmtree className="h-5 w-5" />,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-500/10",
  },
  {
    key: "sick",
    label: "Sick Leave",
    icon: <Stethoscope className="h-5 w-5" />,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-500/10",
  },
];

const DEFAULT_POLICY: LeavePolicy = {
  casual: { total: 12, carryForward: false },
  sick: { total: 10, carryForward: false },
};

export default function AdminLeavePolicy() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<LeavePolicy>(DEFAULT_POLICY);

  useEffect(() => {
    adminSettingsApi
      .getLeavePolicy()
      .then((r) => {
        const data = r.data.data;
        if (data && Object.keys(data).length > 0) {
          setPolicy({ ...DEFAULT_POLICY, ...data });
        }
      })
      .catch(() => toast.error("Failed to load leave policy"))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (key: string, field: string, value: number | boolean) => {
    setPolicy((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminSettingsApi.updateLeavePolicy(policy);
      toast.success("Leave policy saved");
    } catch {
      toast.error("Failed to save leave policy");
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Policy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure leave types, quotas, and carry-forward rules
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Policy
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {LEAVE_TYPES.map((lt) => {
          const data = policy[lt.key] || { total: 0, carryForward: false };
          return (
            <div
              key={lt.key}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md"
            >
              {/* Header */}
              <div className="mb-5 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${lt.bgColor} ${lt.color}`}>
                  {lt.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{lt.label}</h3>
              </div>

              {/* Total Days */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Total Days Per Year
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={data.total}
                  onChange={(e) => updateField(lt.key, "total", parseInt(e.target.value, 10) || 0)}
                  className={inputCls}
                />
              </div>

              {/* Carry Forward Toggle */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Carry Forward
                  </label>
                  <button
                    type="button"
                    onClick={() => updateField(lt.key, "carryForward", !data.carryForward)}
                    className="transition-colors"
                  >
                    {data.carryForward ? (
                      <ToggleRight className="h-7 w-7 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-gray-400 dark:text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {data.carryForward
                    ? "Unused leaves will carry over to next year"
                    : "Unused leaves will lapse at year end"}
                </p>
              </div>

              {/* Max Carry */}
              {data.carryForward && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Max Carry Forward Days
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={data.total}
                    value={data.maxCarry ?? 0}
                    onChange={(e) => updateField(lt.key, "maxCarry", parseInt(e.target.value, 10) || 0)}
                    className={inputCls}
                  />
                </div>
              )}

              {/* Summary Badge */}
              <div className="mt-5 rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">{data.total}</span> days/year
                  {data.carryForward && (
                    <span>
                      {" "}
                      &middot; up to <span className="font-semibold text-gray-900 dark:text-white">{data.maxCarry ?? 0}</span> carry forward
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
