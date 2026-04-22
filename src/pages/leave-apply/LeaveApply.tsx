import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays, Send, X, Palmtree, ThermometerSun, Ban, Gift,
  Sparkles, Briefcase, Heart, Clock, FileText, ArrowLeft,
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
  const navigate = useNavigate();
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
        navigate("/leaves");
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

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <Palmtree className="h-10 w-10 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Apply for <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Leave</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Fill in the details to submit your leave request</p>
            </div>
          </div>
          {dayCount > 0 && (
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Selected</p>
              <p className="text-xl font-bold tracking-tight">{dayCount} day{dayCount !== 1 ? "s" : ""}</p>
            </div>
          )}
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

              {/* Day Count Summary */}
              {dayCount > 0 && (
                <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${
                  selectedType
                    ? "border-transparent bg-gradient-to-r from-indigo-50 via-white to-white ring-1 ring-indigo-500/10 dark:from-indigo-500/10 dark:via-gray-900 dark:to-gray-900 dark:ring-indigo-400/20"
                    : "border-gray-200 bg-gray-50/60 dark:border-gray-700/70 dark:bg-gray-800/40"
                }`}>
                  <div className={`rounded-lg ${selectedType ? `bg-gradient-to-br ${selectedType.gradient}` : "bg-gradient-to-br from-indigo-500 to-purple-600"} p-2 shadow-sm ring-1 ring-white/10`}>
                    <CalendarDays className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={labelCls}>Duration</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {dayCount} day{dayCount !== 1 ? "s" : ""}
                      {selectedType && <span className="ml-1 font-normal text-gray-500 dark:text-gray-400"> · {selectedType.label}</span>}
                    </p>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className={`${labelCls} mb-1.5 block`}>Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: "" })); }}
                  rows={4}
                  placeholder="Provide a brief reason for your leave..."
                  className={`${inputCls} resize-none`}
                />
                {errors.reason && <p className="mt-1 text-xs text-rose-500">{errors.reason}</p>}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-200/70 pt-5 dark:border-gray-800/80">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit Application"}
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
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {b.remaining} <span className="text-xs font-normal text-gray-400">/ {b.total}</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                        {b.used} used &middot; {b.remaining} remaining
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
