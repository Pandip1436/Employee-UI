import { useState, useEffect } from "react";
import {  Plus, Trash2, Save, Tag, ShieldCheck, Loader2 } from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { ActivityTypeItem, PolicyItem } from "../../types";
import toast from "react-hot-toast";
import { useConfirm } from "../../context/ConfirmContext";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const tabCls = (active: boolean) =>
  `px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
    active
      ? "bg-indigo-600 text-white shadow-sm"
      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
  }`;

const DEFAULT_POLICIES = [
  { key: "maxHoursPerDay", value: 8, label: "Max Hours Per Day" },
  { key: "submissionDeadline", value: "Friday", label: "Submission Deadline" },
  { key: "autoLockDays", value: 3, label: "Auto Lock Days" },
];

export default function AdminTimesheetConfig() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<"activity" | "policies">("activity");

  // Activity Types state
  const [activityTypes, setActivityTypes] = useState<ActivityTypeItem[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Policies state
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Fetch activity types
  const fetchTypes = () => {
    setLoadingTypes(true);
    weeklyTimesheetApi
      .getActivityTypes()
      .then((r) => setActivityTypes(r.data.data || []))
      .catch(() => toast.error("Failed to load activity types"))
      .finally(() => setLoadingTypes(false));
  };

  // Fetch policies
  const fetchPolicies = () => {
    setLoadingPolicies(true);
    weeklyTimesheetApi
      .getPolicies()
      .then((r) => {
        const fetched = r.data.data || [];
        // Merge with defaults so we always show all config keys
        const merged = DEFAULT_POLICIES.map((dp) => {
          const existing = fetched.find((p) => p.key === dp.key);
          return existing || ({ _id: dp.key, key: dp.key, value: dp.value, label: dp.label } as PolicyItem);
        });
        // Add any extra policies from server not in defaults
        fetched.forEach((p) => {
          if (!merged.find((m) => m.key === p.key)) merged.push(p);
        });
        setPolicies(merged);
        const vals: Record<string, string> = {};
        merged.forEach((p) => {
          vals[p.key] = String(p.value ?? "");
        });
        setEditValues(vals);
      })
      .catch(() => toast.error("Failed to load policies"))
      .finally(() => setLoadingPolicies(false));
  };

  useEffect(() => {
    fetchTypes();
    fetchPolicies();
  }, []);

  const handleAddType = async () => {
    const name = newTypeName.trim();
    if (!name) return toast.error("Enter a name");
    setAdding(true);
    try {
      await weeklyTimesheetApi.createActivityType(name);
      toast.success(`Activity type "${name}" added`);
      setNewTypeName("");
      fetchTypes();
    } catch {
      toast.error("Failed to create activity type");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteType = async (id: string, name: string) => {
    if (!(await confirm({ title: "Delete activity type?", description: <>Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">"{name}"</span>? Existing entries referencing it will not be affected.</>, confirmLabel: "Delete" }))) return;
    setDeletingId(id);
    try {
      await weeklyTimesheetApi.deleteActivityType(id);
      toast.success("Activity type deleted");
      fetchTypes();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSavePolicy = async (p: PolicyItem) => {
    const val = editValues[p.key];
    if (val === undefined) return;
    setSavingKey(p.key);
    try {
      // Try to send as number if it looks like one
      const parsed = isNaN(Number(val)) ? val : Number(val);
      await weeklyTimesheetApi.upsertPolicy(p.key, parsed, p.label);
      toast.success(`"${p.label || p.key}" updated`);
      fetchPolicies();
    } catch {
      toast.error("Failed to save policy");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Timesheet Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage activity types and timesheet policies
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1.5">
        <button onClick={() => setTab("activity")} className={tabCls(tab === "activity")}>
          <span className="flex items-center gap-2">
            <Tag className="h-4 w-4" /> Activity Types
          </span>
        </button>
        <button onClick={() => setTab("policies")} className={tabCls(tab === "policies")}>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Policies
          </span>
        </button>
      </div>

      {/* Activity Types Tab */}
      {tab === "activity" && (
        <div className="space-y-4">
          {/* Add new */}
          <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <input
              type="text"
              placeholder="New activity type name..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddType()}
              className={`flex-1 ${inputCls}`}
            />
            <button
              onClick={handleAddType}
              disabled={adding}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Type
            </button>
          </div>

          {/* List */}
          {loadingTypes ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400">
              Loading...
            </div>
          ) : activityTypes.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
              No activity types configured yet.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Name
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {activityTypes.map((at) => (
                      <tr
                        key={at._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {at.name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              at.isActive
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${at.isActive ? "bg-emerald-500" : "bg-gray-400"}`}
                            />
                            {at.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteType(at._id, at.name)}
                            disabled={deletingId === at._id}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                          >
                            {deletingId === at._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {activityTypes.map((at) => (
                  <div
                    key={at._id}
                    className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{at.name}</p>
                        <span
                          className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            at.isActive
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${at.isActive ? "bg-emerald-500" : "bg-gray-400"}`}
                          />
                          {at.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteType(at._id, at.name)}
                        disabled={deletingId === at._id}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === at._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Policies Tab */}
      {tab === "policies" && (
        <div className="space-y-4">
          {loadingPolicies ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400">
              Loading...
            </div>
          ) : policies.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
              No policies configured.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Policy
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Key
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Value
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {policies.map((p) => (
                      <tr
                        key={p.key}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {p.label || p.key}
                        </td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                            {p.key}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editValues[p.key] ?? ""}
                            onChange={(e) =>
                              setEditValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                            }
                            onKeyDown={(e) => e.key === "Enter" && handleSavePolicy(p)}
                            className={`w-full max-w-[200px] ${inputCls}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleSavePolicy(p)}
                            disabled={savingKey === p.key}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {savingKey === p.key ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {policies.map((p) => (
                  <div
                    key={p.key}
                    className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md space-y-3"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {p.label || p.key}
                      </p>
                      <code className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {p.key}
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editValues[p.key] ?? ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && handleSavePolicy(p)}
                        className={`flex-1 ${inputCls}`}
                      />
                      <button
                        onClick={() => handleSavePolicy(p)}
                        disabled={savingKey === p.key}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {savingKey === p.key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
