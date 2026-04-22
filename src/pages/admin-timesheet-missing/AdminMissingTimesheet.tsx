import { useState, useEffect } from "react";
import {
  UserX, Calendar, AlertCircle, Sparkles, CheckCircle2, Inbox, Mail, Building,
} from "lucide-react";
import { weeklyTimesheetApi } from "../../api/weeklyTimesheetApi";
import type { User } from "../../types";
import toast from "react-hot-toast";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";
const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

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

function Avatar({ name }: { name: string }) {
  const init = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(name || "?")} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
      {init}
    </div>
  );
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const dow = d.getUTCDay();
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((dow + 6) % 7))
  );
  return monday.toISOString().slice(0, 10);
}

function getCurrentMonday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return getMondayOfWeek(`${y}-${m}-${d}`);
}

export default function AdminMissingTimesheet() {
  const [weekStart, setWeekStart] = useState(getCurrentMonday);
  const [missing, setMissing] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMissing = () => {
    setLoading(true);
    const monday = getMondayOfWeek(weekStart);
    weeklyTimesheetApi
      .getMissing(monday)
      .then((r) => setMissing(r.data.data || []))
      .catch(() => toast.error("Failed to load missing timesheets"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMissing(); }, [weekStart]);

  const weekLabel = (() => {
    const [yy, mm, dd] = getMondayOfWeek(weekStart).split("-").map(Number);
    return new Date(yy, mm - 1, dd).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  })();

  const missingCount = missing.length;

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-rose-500/25 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <UserX className="h-10 w-10 text-rose-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Week of {weekLabel}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Missing <span className="bg-gradient-to-r from-rose-200 to-fuchsia-200 bg-clip-text text-transparent">Timesheets</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Employees who haven't submitted their weekly timesheet</p>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Missing</p>
            <p className="text-xl font-bold tracking-tight">{missingCount}</p>
          </div>
        </div>
      </div>

      {/* ── Week picker ── */}
      <div className={`${cardCls} flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-end`}>
        <div>
          <label className={`${labelCls} mb-1.5 block`}>Week Of</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/80 px-3 py-2 text-sm text-gray-600 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-300">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span>Week of <span className="font-semibold text-gray-900 dark:text-white">{weekLabel}</span></span>
        </div>
      </div>

      {/* ── Summary KPIs ── */}
      {!loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={`${cardCls} group relative overflow-hidden p-4`}>
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-rose-400/25 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25" />
            <div className="flex items-start justify-between">
              <div>
                <p className={labelCls}>Missing Submissions</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{missingCount}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10">
                <UserX className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
          <div className={`${cardCls} group relative overflow-hidden p-4`}>
            <div aria-hidden className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25 ${missingCount > 0 ? "bg-amber-400/25" : "bg-emerald-400/25"}`} />
            <div className="flex items-start justify-between">
              <div>
                <p className={labelCls}>Status</p>
                <p className={`mt-2 text-xl font-bold tracking-tight ${missingCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {missingCount > 0 ? "Action Needed" : "All Clear"}
                </p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${missingCount > 0 ? "from-amber-500 to-orange-600" : "from-emerald-500 to-teal-600"} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                {missingCount > 0 ? <AlertCircle className="h-5 w-5 text-white" /> : <CheckCircle2 className="h-5 w-5 text-white" />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className={`${cardCls} flex flex-col items-center gap-3 py-16 text-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading missing timesheets...</p>
        </div>
      ) : missing.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 p-3 ring-1 ring-emerald-500/10 dark:from-emerald-500/20 dark:to-emerald-500/5 dark:ring-emerald-400/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">All clear!</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Everyone has submitted their timesheet for this week</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`${cardCls} hidden overflow-hidden p-0 md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200/70 bg-gray-50/60 dark:border-gray-800/80 dark:bg-gray-800/40">
                  <tr>
                    {["Employee", "Email", "Department", "Status"].map((h) => (
                      <th key={h} className={`px-4 py-3 ${labelCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {missing.map((u) => (
                    <tr key={u._id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <span className="font-semibold text-gray-900 dark:text-white">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {u.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <Building className="h-3.5 w-3.5 text-gray-400" />
                          {u.department || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Not Submitted
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {missing.map((u) => (
              <div key={u._id} className={`${cardCls} p-4`}>
                <div className="mb-3 flex items-center gap-3">
                  <Avatar name={u.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{u.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200/70 pt-3 dark:border-gray-800/80">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Building className="h-3 w-3 text-gray-400" />
                    {u.department || "No department"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Missing
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Hint: Inbox icon kept for potential use */}
          <span className="hidden">
            <Inbox className="h-0 w-0" />
          </span>
        </>
      )}
    </div>
  );
}
