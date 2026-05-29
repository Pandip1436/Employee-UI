import { useState, useEffect, useMemo } from "react";
import {  useSearchParams } from "react-router-dom";
import {
  CalendarDays, Send, Palmtree, ThermometerSun, Ban, Gift,
  Sparkles, Briefcase, Heart, Clock, FileText, Loader2, AlertCircle, Zap,
} from "lucide-react";
import { leaveApi } from "../../api/leaveApi";
import type { LeaveBalance } from "../../types";
import toast from "react-hot-toast";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";
const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

/* Leave types with gradient palettes */
const leaveTypes = [
  { value: "casual", label: "Personal Leave", icon: Palmtree, gradient: "from-sky-500 to-indigo-600" },
  { value: "sick", label: "Sick Leave", icon: ThermometerSun, gradient: "from-orange-500 to-rose-600" },
  { value: "unpaid", label: "Unpaid Leave", icon: Ban, gradient: "from-gray-500 to-gray-700" },
  { value: "compoff", label: "Comp-Off", icon: Gift, gradient: "from-indigo-500 to-purple-600" },
];

export default function LeaveApply() {
  const [searchParams] = useSearchParams();

  const [type, setType] = useState(searchParams.get("type") || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    leaveApi.getBalance().then((res) => { if (res.data.data) setBalance(res.data.data); }).catch(() => {});
  }, []);

  const dayCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }, [startDate, endDate]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!type) e.type = "Please select a leave type";
    if (!startDate) e.startDate = "Start date is required";
    if (!endDate) e.endDate = "End date is required";
    if (startDate && endDate && new Date(endDate) < new Date(startDate))
      e.endDate = "End date must be on or after start date";
    if (!reason.trim()) e.reason = "Reason is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    leaveApi
      .apply({ type, startDate, endDate, reason: reason.trim() })
      .then(() => {
        toast.success("Leave application submitted successfully");
        // Hard refresh on /leaves so the dashboard fetches the new entry from scratch
        window.location.href = "/leaves";
      })
      .catch(() => toast.error("Failed to submit leave application"))
      .finally(() => setSubmitting(false));
  };

  const balanceEntries: { key: keyof LeaveBalance; label: string; gradient: string; icon: typeof Briefcase }[] = [
    { key: "casual", label: "Personal", gradient: "from-sky-500 to-indigo-600", icon: Briefcase },
    { key: "sick", label: "Sick", gradient: "from-orange-500 to-rose-600", icon: Heart },
    { key: "compoff", label: "Comp-Off", gradient: "from-indigo-500 to-purple-600", icon: Clock },
  ];

  const selectedType = leaveTypes.find((t) => t.value === type);

  /* Balance for the selected type (unpaid has no balance) */
  const selectedBalance = useMemo(() => {
    if (!balance || !type || type === "unpaid") return null;
    const b = (balance as any)[type];
    return b ? { used: b.used ?? 0, total: b.total ?? 0, remaining: b.remaining ?? 0 } : null;
  }, [balance, type]);

  const exceedsBalance = !!(selectedBalance && dayCount > selectedBalance.remaining);

  /* Reason character counter */
  const REASON_MAX = 500;

  /* Quick-pick date helpers — format in local time, not UTC, otherwise
     midnight-local for timezones east of UTC rolls back one day. */
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const setRange = (start: Date, end: Date) => {
    setStartDate(fmt(start));
    setEndDate(fmt(end));
    setErrors((p) => ({ ...p, startDate: "", endDate: "" }));
  };
  const quickPicks = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const fri = new Date(today); fri.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7));
    const nextMon = new Date(today); nextMon.setDate(today.getDate() + ((1 - today.getDay() + 7) % 7 || 7));
    const nextMonFri = new Date(nextMon); nextMonFri.setDate(nextMon.getDate() + 4);
    return [
      { label: "Today", action: () => setRange(today, today) },
      { label: "Tomorrow", action: () => setRange(tomorrow, tomorrow) },
      { label: "Rest of week", action: () => setRange(today, fri) },
      { label: "Next week", action: () => setRange(nextMon, nextMonFri) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 lg:max-w-[640px]">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
                <CalendarDays className="h-10 w-10 text-emerald-200" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Leave application
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Apply for <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Leave</span>
                </h1>
                <p className="mt-1 text-sm text-indigo-200/70">Fill in the details to submit your leave request</p>
              </div>
            </div>

            {/* KPI chips */}
            <div className="mt-4 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-400/20 ring-1 ring-emerald-300/30">
                    <CalendarDays className="h-3 w-3 text-emerald-200" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Selected</span>
                  <span className="font-mono text-sm font-bold tabular-nums tracking-tight">{dayCount}</span>
                  <span className="text-[11px] text-indigo-200/60">day{dayCount !== 1 ? "s" : ""}</span>
                </div>
                {selectedType && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br ${selectedType.gradient} ring-1 ring-white/20`}>
                      <selectedType.icon className="h-3 w-3 text-white" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Type</span>
                    <span className="text-xs font-bold tracking-tight">{selectedType.label}</span>
                  </div>
                )}
                {selectedBalance && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-purple-400/20 ring-1 ring-purple-300/30">
                      <Clock className="h-3 w-3 text-purple-200" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Available</span>
                    <span className="font-mono text-sm font-bold tabular-nums tracking-tight">{selectedBalance.remaining}</span>
                    <span className="font-mono text-[11px] tabular-nums text-indigo-200/60">/ {selectedBalance.total}</span>
                  </div>
                )}
                {exceedsBalance && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-amber-400/15 px-3 py-1.5 ring-1 ring-amber-300/30 backdrop-blur-sm">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-200" />
                    <span className="text-[11px] font-semibold text-amber-100">Exceeds available balance</span>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Form ── */}
        <div className="lg:col-span-2">
          <div className={cardCls}>
            {/* Form header */}
            <div className="flex items-center gap-3 border-b border-gray-200/70 px-6 py-4 dark:border-gray-800/80">
              <div className="rounded-lg bg-indigo-50 p-2 ring-1 ring-indigo-500/10 dark:bg-indigo-500/10 dark:ring-indigo-400/20">
                <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Leave Details</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">All fields are required</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Leave Type — visual selector */}
              <div>
                <label className={`${labelCls} mb-2 block`}>Leave Type</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {leaveTypes.map((lt) => {
                    const active = type === lt.value;
                    const Icon = lt.icon;
                    return (
                      <button
                        key={lt.value}
                        type="button"
                        onClick={() => { setType(lt.value); setErrors((p) => ({ ...p, type: "" })); }}
                        className={`group relative flex items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                          active
                            ? "border-indigo-300 bg-gradient-to-br from-indigo-50 to-white shadow-sm ring-1 ring-indigo-500/20 dark:border-indigo-500/40 dark:from-indigo-500/10 dark:to-gray-900 dark:ring-indigo-400/25"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                        }`}
                      >
                        <div className={`rounded-lg bg-gradient-to-br ${lt.gradient} p-1.5 shadow-sm ring-1 ring-white/10`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className={`text-[12px] font-semibold ${active ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>
                          {lt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.type && <p className="mt-1.5 text-xs text-rose-500">{errors.type}</p>}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setErrors((p) => ({ ...p, startDate: "" })); }}
                    className={inputCls}
                  />
                  {errors.startDate && <p className="mt-1 text-xs text-rose-500">{errors.startDate}</p>}
                </div>
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => { setEndDate(e.target.value); setErrors((p) => ({ ...p, endDate: "" })); }}
                    className={inputCls}
                  />
                  {errors.endDate && <p className="mt-1 text-xs text-rose-500">{errors.endDate}</p>}
                </div>
              </div>

              {/* Quick picks */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <Zap className="h-3 w-3" /> Quick pick
                </span>
                {quickPicks.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={q.action}
                    className="group relative inline-flex items-center gap-1 overflow-hidden rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  >
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-indigo-200/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%] dark:via-indigo-400/20" />
                    <span className="relative">{q.label}</span>
                  </button>
                ))}
              </div>

              {/* Day Count Summary */}
              {dayCount > 0 && (
                <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${
                  exceedsBalance
                    ? "border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-white ring-1 ring-amber-500/15 dark:border-amber-500/30 dark:from-amber-500/10 dark:via-gray-900 dark:to-gray-900 dark:ring-amber-400/20"
                    : selectedType
                      ? "border-transparent bg-gradient-to-r from-indigo-50 via-white to-white ring-1 ring-indigo-500/10 dark:from-indigo-500/10 dark:via-gray-900 dark:to-gray-900 dark:ring-indigo-400/20"
                      : "border-gray-200 bg-gray-50/60 dark:border-gray-700/70 dark:bg-gray-800/40"
                }`}>
                  <div className={`rounded-lg ${selectedType ? `bg-gradient-to-br ${selectedType.gradient}` : "bg-gradient-to-br from-indigo-500 to-purple-600"} p-2 shadow-sm ring-1 ring-white/10`}>
                    <CalendarDays className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={labelCls}>Duration</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      <span className="font-mono tabular-nums">{dayCount}</span> day{dayCount !== 1 ? "s" : ""}
                      {selectedType && <span className="ml-1 font-normal text-gray-500 dark:text-gray-400"> · {selectedType.label}</span>}
                    </p>
                  </div>
                  {selectedBalance && (
                    <div className="hidden text-right sm:block">
                      <p className={labelCls}>After this leave</p>
                      <p className="font-mono text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                        {Math.max(selectedBalance.remaining - dayCount, 0)}
                        <span className="ml-1 font-normal text-gray-400">/ {selectedBalance.total}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Balance-exceeded warning */}
              {exceedsBalance && selectedBalance && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    You're requesting <span className="font-mono font-semibold tabular-nums">{dayCount}</span> day{dayCount !== 1 ? "s" : ""} but only{" "}
                    <span className="font-mono font-semibold tabular-nums">{selectedBalance.remaining}</span> remain. Your manager may need to convert the excess to unpaid leave.
                  </span>
                </div>
              )}

              {/* Reason */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className={labelCls}>Reason</label>
                  <span className={`font-mono text-[10px] tabular-nums ${reason.length > REASON_MAX ? "text-rose-500" : "text-gray-400 dark:text-gray-500"}`}>
                    {reason.length} / {REASON_MAX}
                  </span>
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: "" })); }}
                  rows={4}
                  maxLength={REASON_MAX}
                  placeholder="Provide a brief reason for your leave..."
                  className={`${inputCls} resize-none`}
                />
                {errors.reason && <p className="mt-1 text-xs text-rose-500">{errors.reason}</p>}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-200/70 pt-5 dark:border-gray-800/80">
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-60"
                >
                  <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
                  <span className="relative inline-flex items-center gap-1.5">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? "Submitting..." : "Submit Application"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Balance Sidebar ── */}
        <div>
          <div className={cardCls}>
            <div className="flex items-center gap-3 border-b border-gray-200/70 px-6 py-4 dark:border-gray-800/80">
              <div className="rounded-lg bg-emerald-50 p-2 ring-1 ring-emerald-500/10 dark:bg-emerald-500/10 dark:ring-emerald-400/20">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Your Balances</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Days remaining this year</p>
              </div>
            </div>

            <div className="space-y-3 p-5">
              {!balance ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              ) : (
                balanceEntries.map(({ key, label, gradient, icon: Icon }) => {
                  const b = balance[key];
                  if (!b) return null;
                  const pct = b.total > 0 ? (b.used / b.total) * 100 : 0;
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-gray-200/70 bg-white/80 p-4 transition-all hover:shadow-sm dark:border-gray-800/80 dark:bg-gray-900/60"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`rounded-lg bg-gradient-to-br ${gradient} p-1.5 shadow-sm ring-1 ring-white/10`}>
                            <Icon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div>
                            <p className={labelCls}>{label}</p>
                            <p className="font-mono text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                              {b.remaining} <span className="text-xs font-normal text-gray-400">/ {b.total}</span>
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="font-mono tabular-nums">{b.used}</span> used &middot; <span className="font-mono tabular-nums">{b.remaining}</span> remaining
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
