import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  Image,
  Users,
} from "lucide-react";
import { dailyUpdateApi } from "../../api/dailyUpdateApi";
import type { DailyUpdateData } from "../../api/dailyUpdateApi";
import type { Pagination } from "../../types";

/* ── Status config ── */
const statusConfig: Record<string, { dot: string; badge: string; icon: typeof CheckCircle2; label: string }> = {
  completed: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    icon: CheckCircle2,
    label: "Completed",
  },
  "in-progress": {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    icon: Clock,
    label: "In Progress",
  },
  blocked: {
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    icon: AlertTriangle,
    label: "Blocked",
  },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getUserName = (u: DailyUpdateData["userId"]): string =>
  typeof u === "object" ? u.name : String(u);

const getUserEmail = (u: DailyUpdateData["userId"]): string =>
  typeof u === "object" ? u.email : "";

const getInitials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const parseLinks = (text: string) => {
  if (!text.trim()) return [];
  return text.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
};

/* ── Component ── */
export default function TeamDailyUpdates() {
  const [updates, setUpdates] = useState<DailyUpdateData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(todayISO());

  const fetchUpdates = () => {
    setLoading(true);
    dailyUpdateApi
      .getTeamUpdates({ page, limit: 20, date: filterDate })
      .then((res) => {
        setUpdates(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [filterDate]);

  useEffect(() => {
    fetchUpdates();
  }, [page, filterDate]);

  const prevDay = () => {
    const d = new Date(filterDate);
    d.setDate(d.getDate() - 1);
    setFilterDate(d.toISOString().slice(0, 10));
  };

  const nextDay = () => {
    const d = new Date(filterDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setFilterDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Team Daily Updates
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review your team's end-of-day work submissions
            </p>
          </div>
        </div>
      </div>

      {/* ── Date Navigator ── */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <button
          onClick={prevDay}
          className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            max={todayISO()}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 px-3 py-1.5 outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => setFilterDate(todayISO())}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Today
          </button>
        </div>
        <button
          onClick={nextDay}
          disabled={filterDate >= todayISO()}
          className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Summary ── */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: updates.length, cls: "text-indigo-600 dark:text-indigo-400" },
            { label: "Completed", value: updates.filter((u) => u.status === "completed").length, cls: "text-emerald-600 dark:text-emerald-400" },
            { label: "Blocked", value: updates.filter((u) => u.status === "blocked").length, cls: "text-red-600 dark:text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
        </div>
      ) : updates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-20 px-4 text-center">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
            <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No updates for {formatDate(filterDate)}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Team members haven't submitted their daily updates yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((u) => {
            const sConfig = statusConfig[u.status] || statusConfig.completed;
            const StatusIcon = sConfig.icon;
            const linksList = parseLinks(u.links);

            return (
              <div
                key={u._id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md"
              >
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                      {getInitials(getUserName(u.userId))}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {getUserName(u.userId)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getUserEmail(u.userId)}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sConfig.badge}`}>
                    <StatusIcon className="h-3 w-3" />
                    {sConfig.label}
                  </span>
                </div>

                {/* Tasks */}
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                    Tasks Worked On
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {u.tasks}
                  </p>
                </div>

                {/* Links */}
                {linksList.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                      Links / References
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {linksList.map((link, i) => {
                        const isUrl = link.startsWith("http");
                        return isUrl ? (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-600/20 dark:ring-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors truncate max-w-[280px]"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {link.replace(/^https?:\/\//, "").slice(0, 40)}
                          </a>
                        ) : (
                          <span key={i} className="inline-flex items-center rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400">
                            {link}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Proof */}
                {u.proof && (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                      Proof / Screenshot
                    </p>
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <Image className="h-3.5 w-3.5" />
                      {u.proof.startsWith("http") ? (
                        <a href={u.proof} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[200px]">
                          {u.proof.replace(/^https?:\/\//, "").slice(0, 40)}
                        </a>
                      ) : (
                        <span>{u.proof}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Plan */}
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 px-4 py-3">
                  <ArrowRight className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
                      Plan for Tomorrow
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {u.planForTomorrow}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
