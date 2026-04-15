import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, Send, X, Palmtree, ThermometerSun, Ban, Gift } from "lucide-react";
import { leaveApi } from "../../api/leaveApi";
import type { LeaveBalance } from "../../types";
import toast from "react-hot-toast";

const leaveTypes = [
  { value: "casual", label: "Personal Leave", icon: Palmtree, color: "text-blue-500" },
  { value: "sick", label: "Sick Leave", icon: ThermometerSun, color: "text-amber-500" },
  { value: "unpaid", label: "Unpaid Leave", icon: Ban, color: "text-red-500" },
  { value: "compoff", label: "Comp-Off", icon: Gift, color: "text-indigo-500" },
];

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full transition";

const labelCls =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

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
      .catch(() => {
        toast.error("Failed to submit leave application");
      })
      .finally(() => setSubmitting(false));
  };

  const balanceEntries: { key: keyof LeaveBalance; label: string; bar: string; border: string; bg: string; text: string }[] = [
    { key: "casual",  label: "Personal", bar: "bg-blue-500",    border: "border border-gray-100 dark:border-gray-800 border-l-4 border-l-blue-500",    bg: "bg-blue-50/40 dark:bg-blue-500/5",    text: "text-blue-600 dark:text-blue-400" },
    { key: "sick",    label: "Sick",     bar: "bg-amber-500",   border: "border border-gray-100 dark:border-gray-800 border-l-4 border-l-amber-500",   bg: "bg-amber-50/40 dark:bg-amber-500/5",  text: "text-amber-600 dark:text-amber-400" },
    { key: "compoff", label: "Comp-Off", bar: "bg-indigo-500",  border: "border border-gray-100 dark:border-gray-800 border-l-4 border-l-indigo-500",  bg: "bg-indigo-50/40 dark:bg-indigo-500/5",  text: "text-indigo-600 dark:text-indigo-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Apply for Leave</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Fill in the details below to submit your leave request.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Form Card */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10">
                    <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Leave Details</h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Leave Type */}
                <div>
                  <label className={labelCls}>Leave Type</label>
                  <select
                    value={type}
                    onChange={(e) => { setType(e.target.value); setErrors((p) => ({ ...p, type: "" })); }}
                    className={`${inputCls} mt-1.5 appearance-none cursor-pointer`}
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((lt) => (
                      <option key={lt.value} value={lt.value}>{lt.label}</option>
                    ))}
                  </select>
                  {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>From Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setErrors((p) => ({ ...p, startDate: "" })); }}
                      className={`${inputCls} mt-1.5`}
                    />
                    {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>To Date</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => { setEndDate(e.target.value); setErrors((p) => ({ ...p, endDate: "" })); }}
                      className={`${inputCls} mt-1.5`}
                    />
                    {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>}
                  </div>
                </div>

                {/* Day Count Badge */}
                {dayCount > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2.5">
                    <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                      {dayCount} day{dayCount !== 1 ? "s" : ""} selected
                    </span>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className={labelCls}>Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); setErrors((p) => ({ ...p, reason: "" })); }}
                    rows={4}
                    placeholder="Provide a brief reason for your leave..."
                    className={`${inputCls} mt-1.5 resize-none`}
                  />
                  {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Balance Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Leave Balance</h2>
              </div>

              <div className="p-6 space-y-4">
                {!balance ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                    ))}
                  </div>
                ) : (
                  balanceEntries.map(({ key, label, bar, border, bg, text }) => {
                    const b = balance[key];
                    if (!b) return null;
                    const pct = b.total > 0 ? (b.used / b.total) * 100 : 0;
                    return (
                      <div
                        key={key}
                        className={`rounded-xl ${border} ${bg} p-4`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                          <span className={`text-sm font-bold ${text}`}>
                            {b.remaining} / {b.total}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-full rounded-full ${bar} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
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
    </div>
  );
}
