import { useState, useEffect, useMemo } from "react";
import {
  Save,
  Loader2,
  Palmtree,
  Stethoscope,
  Sparkles,
  CalendarDays,
  AlertCircle,
  RotateCcw,
  Repeat,
  TrendingUp,
} from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import type { CompanySettingsData } from "../../api/adminSettingsApi";
import { useConfirm } from "../../context/ConfirmContext";
import toast from "react-hot-toast";

type LeavePolicy = CompanySettingsData["leavePolicy"];

interface LeaveTypeConfig {
  key: string;
  label: string;
  icon: any;
  description: string;
  gradient: string;
  chipBg: string;
  chipText: string;
  ringColor: string;
}

const LEAVE_TYPES: LeaveTypeConfig[] = [
  {
    key: "casual",
    label: "Personal Leave",
    icon: Palmtree,
    description: "Vacation, family time, and personal commitments",
    gradient: "from-indigo-500 to-purple-600",
    chipBg: "bg-indigo-50 dark:bg-indigo-500/10",
    chipText: "text-indigo-700 dark:text-indigo-300",
    ringColor: "ring-indigo-500/20",
  },
  {
    key: "sick",
    label: "Sick Leave",
    icon: Stethoscope,
    description: "Medical leave for illness or recovery",
    gradient: "from-rose-500 to-red-600",
    chipBg: "bg-rose-50 dark:bg-rose-500/10",
    chipText: "text-rose-700 dark:text-rose-300",
    ringColor: "ring-rose-500/20",
  },
];

const DEFAULT_POLICY: LeavePolicy = {
  casual: { total: 12, carryForward: false },
  sick: { total: 10, carryForward: false },
};

const sigOf = (p: LeavePolicy) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(p).map(([k, v]) => [
        k,
        { total: v.total, carryForward: v.carryForward, maxCarry: v.maxCarry ?? 0 },
      ])
    )
  );

const input =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

export default function AdminLeavePolicy() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<LeavePolicy>(DEFAULT_POLICY);
  const [origSig, setOrigSig] = useState<string>("");

  const fetchPolicy = () => {
    setLoading(true);
    adminSettingsApi
      .getLeavePolicy()
      .then((r) => {
        const data = r.data.data;
        const next: LeavePolicy =
          data && Object.keys(data).length > 0
            ? { ...DEFAULT_POLICY, ...data }
            : DEFAULT_POLICY;
        setPolicy(next);
        setOrigSig(sigOf(next));
      })
      .catch(() => toast.error("Failed to load leave policy"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const dirty = useMemo(() => sigOf(policy) !== origSig, [policy, origSig]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const updateField = (key: string, field: string, value: number | boolean) => {
    setPolicy((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleReset = async () => {
    if (!dirty) return;
    const ok = await confirm({
      title: "Discard unsaved changes?",
      description: "Your edits to the leave policy will be reverted to the last saved state.",
      confirmLabel: "Discard",
      cancelLabel: "Keep editing",
    });
    if (!ok) return;
    fetchPolicy();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminSettingsApi.updateLeavePolicy(policy);
      setOrigSig(sigOf(policy));
      toast.success("Leave policy saved");
    } catch {
      toast.error("Failed to save leave policy");
    } finally {
      setSaving(false);
    }
  };

  // Stats — count only the leave types shown on this page
  const stats = useMemo(() => {
    const visible = LEAVE_TYPES.map((lt) => policy[lt.key]).filter(Boolean);
    const totalDays = visible.reduce((s, p) => s + (p.total || 0), 0);
    const carryEnabled = visible.filter((p) => p.carryForward).length;
    return { totalDays, carryEnabled, types: LEAVE_TYPES.length };
  }, [policy]);

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
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
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
              <Sparkles className="h-3.5 w-3.5" /> Admin · Time Off
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-indigo-300" />
              Leave Policy
            </h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/80 sm:text-base">
              Configure leave types, annual quotas, and carry-forward rules. These limits drive the
              employee leave balance and approval workflow.
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
              {saving ? "Saving…" : "Save Policy"}
            </button>
          </div>
        </div>
      </div>

      {/* ━━━ Stats ━━━ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-indigo-500/0 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Leave types</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{stats.types}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Configured policies</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/0 ring-1 ring-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="h-4 w-4" strokeWidth={2.25} />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/0 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total days/year</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">{stats.totalDays}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Combined annual quota</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/0 ring-1 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" strokeWidth={2.25} />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg col-span-2 lg:col-span-1">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/0 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Carry-forward</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">
                {stats.carryEnabled} <span className="text-base text-gray-400">/ {stats.types}</span>
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Types that roll over</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/0 ring-1 ring-amber-500/20 text-amber-600 dark:text-amber-400">
              <Repeat className="h-4 w-4" strokeWidth={2.25} />
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ Leave Type Cards ━━━ */}
      <div className="grid gap-5 md:grid-cols-2">
        {LEAVE_TYPES.map((lt) => {
          const data = policy[lt.key] || { total: 0, carryForward: false };
          const Icon = lt.icon;
          return (
            <div
              key={lt.key}
              className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 sm:p-6 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${lt.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}
              />

              <div className="relative">
                {/* Header */}
                <div className="mb-5 flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${lt.gradient} text-white shadow-md ring-1 ${lt.ringColor}`}>
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">{lt.label}</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{lt.description}</p>
                  </div>
                  <div className={`hidden sm:flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${lt.chipBg} ${lt.chipText} ${lt.ringColor}`}>
                    <span className="tabular-nums">{data.total}</span>
                    <span className="opacity-70">days</span>
                  </div>
                </div>

                {/* Total days */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total days per year
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={data.total}
                      onChange={(e) => updateField(lt.key, "total", parseInt(e.target.value, 10) || 0)}
                      className={`${input} flex-1 tabular-nums`}
                    />
                    {/* Quick chips */}
                    <div className="hidden sm:flex items-center gap-1">
                      {[10, 12, 15, 20].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateField(lt.key, "total", n)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            data.total === n
                              ? `${lt.chipBg} ${lt.chipText} ring-1 ${lt.ringColor}`
                              : "bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Carry-forward toggle */}
                <div
                  className={`flex items-center justify-between rounded-xl p-3.5 ring-1 transition-all ${
                    data.carryForward
                      ? "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-500/20"
                      : "bg-gray-50 dark:bg-gray-800/40 ring-gray-200 dark:ring-gray-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-colors ${
                        data.carryForward
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                          : "bg-white dark:bg-gray-900 text-gray-400"
                      }`}
                    >
                      <Repeat className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Carry forward</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                        {data.carryForward
                          ? "Unused leaves roll over to next year"
                          : "Unused leaves lapse at year end"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField(lt.key, "carryForward", !data.carryForward)}
                    aria-pressed={data.carryForward}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      data.carryForward ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                        data.carryForward ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Max carry */}
                {data.carryForward && (
                  <div className="mt-3">
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Max carry-forward days
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        max={data.total}
                        value={data.maxCarry ?? 0}
                        onChange={(e) =>
                          updateField(lt.key, "maxCarry", parseInt(e.target.value, 10) || 0)
                        }
                        className={`${input} flex-1 tabular-nums`}
                      />
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                        of {data.total}
                      </span>
                    </div>
                    {/* Visual progress */}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800/60">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${lt.gradient} transition-all duration-500`}
                        style={{
                          width: `${
                            data.total > 0
                              ? Math.min(100, ((data.maxCarry ?? 0) / data.total) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Summary footer */}
                <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/40 dark:to-gray-800/20 px-3.5 py-2.5 ring-1 ring-gray-200/60 dark:ring-gray-800/60">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                      {data.total}
                    </span>{" "}
                    days/year
                    {data.carryForward && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                          {data.maxCarry ?? 0}
                        </span>{" "}
                        carry-fwd
                      </>
                    )}
                  </p>
                  {data.carryForward && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
                      <Repeat className="h-2.5 w-2.5" /> Rolls over
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ━━━ Footer save bar ━━━ */}
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
            {saving ? "Saving…" : "Save Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}
