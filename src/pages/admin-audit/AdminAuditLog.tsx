import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight, Filter, Clock, User } from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import type { AuditLogEntry } from "../../api/adminSettingsApi";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const MODULES = [
  "all",
  "auth",
  "attendance",
  "timesheet",
  "leave",
  "documents",
  "employees",
  "approvals",
  "settings",
  "roles",
  "reports",
];

const PAGE_SIZE = 15;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getModuleBadge(module: string) {
  const colors: Record<string, string> = {
    auth: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400",
    attendance: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
    timesheet: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    leave: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    documents: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
    employees: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    settings: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    roles: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400",
  };
  return colors[module] || "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
}

export default function AdminAuditLog() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionSearch, setActionSearch] = useState("");
  const [debouncedAction, setDebouncedAction] = useState("");

  // Debounce action search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAction(actionSearch), 400);
    return () => clearTimeout(timer);
  }, [actionSearch]);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = {
      page,
      limit: PAGE_SIZE,
    };
    if (moduleFilter !== "all") params.module = moduleFilter;
    if (debouncedAction.trim()) params.action = debouncedAction.trim();

    adminSettingsApi
      .getAuditLogs(params)
      .then((r) => {
        setLogs(r.data.data || []);
        setTotalPages(r.data.pagination?.pages || 1);
        setTotalCount(r.data.pagination?.total || 0);
      })
      .catch(() => toast.error("Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, [page, moduleFilter, debouncedAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [moduleFilter, debouncedAction]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track all administrative actions and changes across the system
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center gap-2 flex-1">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className={`${inputCls} flex-1 sm:max-w-[200px]`}
          >
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m === "all" ? "All Modules" : m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search actions..."
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            className={`${inputCls} w-full pl-9`}
          />
        </div>
        <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
          {totalCount} record{totalCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-16 text-center text-gray-400 dark:text-gray-500">
          <Clock className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p>No audit logs found</p>
          <p className="mt-1 text-xs">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    User
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Action
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Module
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Details
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                          {log.userId?.name ? getInitials(log.userId.name) : <User className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {log.userId?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {log.userId?.email || ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {log.action}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getModuleBadge(log.module)}`}
                      >
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[250px] truncate text-gray-500 dark:text-gray-400 text-xs">
                      {log.details || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div
                key={log._id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-400 shrink-0">
                      {log.userId?.name ? getInitials(log.userId.name) : <User className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {log.userId?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {log.userId?.email || ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize shrink-0 ${getModuleBadge(log.module)}`}
                  >
                    {log.module}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{log.action}</p>
                {log.details && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                    {log.details}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatDate(log.createdAt)}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
