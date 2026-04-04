import { useState, useEffect, type FormEvent } from "react";
import { Plus, Send, Pencil, Trash2, X, Clock } from "lucide-react";
import { timesheetApi } from "../../api/timesheetApi";
import { projectApi } from "../../api/projectApi";
import type { Timesheet, Project, Pagination } from "../../types";
import toast from "react-hot-toast";
import clsx from "clsx";

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  draft: {
    bg: "bg-gray-100 dark:bg-gray-700/50",
    text: "text-gray-700 dark:text-gray-300",
    dot: "bg-gray-400 dark:bg-gray-400",
  },
  submitted: {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500 dark:bg-blue-400",
  },
  approved: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  rejected: {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500 dark:bg-rose-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.draft;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        cfg.bg,
        cfg.text
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export default function Timesheets() {
  const [entries, setEntries] = useState<Timesheet[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Timesheet | null>(null);

  // Form state
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEntries = () => {
    timesheetApi.getAll({ page, limit: 10, sort: "-date" }).then((res) => {
      setEntries(res.data.data);
      setPagination(res.data.pagination);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchEntries();
  }, [page]);

  useEffect(() => {
    projectApi.getAll({ limit: 100 }).then((res) => setProjects(res.data.data)).catch(() => {});
  }, []);

  const resetForm = () => {
    setProjectId("");
    setDate(new Date().toISOString().split("T")[0]);
    setHours("");
    setDescription("");
    setEditing(null);
    setShowModal(false);
  };

  const openEdit = (entry: Timesheet) => {
    setEditing(entry);
    setProjectId(entry.projectId?._id || "");
    setDate(new Date(entry.date).toISOString().split("T")[0]);
    setHours(String(entry.hours));
    setDescription(entry.description);
    setShowModal(true);
  };

  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await timesheetApi.update(editing._id, {
          projectId,
          date,
          hours: Number(hours),
          description,
        });
        toast.success("Entry updated!");
      } else {
        await timesheetApi.create({
          projectId,
          date,
          hours: Number(hours),
          description,
        });
        toast.success("Entry created!");
      }
      resetForm();
      fetchEntries();
    } catch {
      // handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitTimesheet = async (id: string) => {
    try {
      await timesheetApi.submit(id);
      toast.success("Timesheet submitted for approval!");
      fetchEntries();
    } catch {
      // handled
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await timesheetApi.delete(id);
      toast.success("Entry deleted.");
      fetchEntries();
    } catch {
      // handled
    }
  };

  const inputClass =
    "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

  const labelClass =
    "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

  return (
    <div className="space-y-6">
      {/* Page title section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Timesheets</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track and manage your working hours
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log Hours
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50">
            <tr>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Date
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Project
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Hours
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Description
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <Clock className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                  <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    No timesheet entries yet
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Click "Log Hours" to get started
                  </p>
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry._id}
                  className="transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/50"
                >
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-white">
                    {entry.projectId?.name || "\u2014"}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">
                    {entry.hours}h
                  </td>
                  <td className="max-w-xs truncate px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                    {entry.description}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={entry.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    {entry.status === "draft" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(entry)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSubmitTimesheet(entry._id)}
                          className="rounded-lg p-2 text-blue-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-700 dark:hover:text-blue-400"
                          title="Submit"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="rounded-lg p-2 text-rose-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-rose-600 dark:hover:text-rose-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {entry.status === "rejected" && entry.rejectionComment && (
                      <span
                        className="text-xs text-rose-600 dark:text-rose-400"
                        title={entry.rejectionComment}
                      >
                        {entry.rejectionComment}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-16 text-center shadow-sm">
            <Clock className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              No timesheet entries yet
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Tap "Log Hours" to get started
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry._id}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition-shadow hover:shadow-md dark:hover:shadow-gray-800/30"
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {entry.projectId?.name || "\u2014"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(entry.date).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={entry.status} />
              </div>

              {/* Description */}
              {entry.description && (
                <p className="mt-2.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-2">
                  {entry.description}
                </p>
              )}

              {/* Stats row */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Hours
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                    {entry.hours}h
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Date
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                    {new Date(entry.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Status
                  </p>
                  <p className="mt-0.5 text-sm font-bold capitalize text-gray-900 dark:text-white">
                    {entry.status}
                  </p>
                </div>
              </div>

              {/* Rejection comment */}
              {entry.status === "rejected" && entry.rejectionComment && (
                <div className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 px-3 py-2">
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {entry.rejectionComment}
                  </p>
                </div>
              )}

              {/* Actions */}
              {entry.status === "draft" && (
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <button
                    onClick={() => openEdit(entry)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleSubmitTimesheet(entry._id)}
                    className="rounded-lg p-2 text-blue-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-700 dark:hover:text-blue-400"
                    title="Submit"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry._id)}
                    className="rounded-lg p-2 text-rose-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-rose-600 dark:hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {pagination.page} of {pagination.pages} ({pagination.total} entries)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editing ? "Edit Entry" : "Log Hours"}
              </h2>
              <button
                onClick={resetForm}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-5">
              <div>
                <label className={clsx("mb-1.5 block", labelClass)}>Project</label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className={clsx("w-full", inputClass)}
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — {p.client}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={clsx("mb-1.5 block", labelClass)}>Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={clsx("w-full", inputClass)}
                  />
                </div>
                <div>
                  <label className={clsx("mb-1.5 block", labelClass)}>Hours</label>
                  <input
                    type="number"
                    required
                    min="0.25"
                    max="24"
                    step="0.25"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className={clsx("w-full", inputClass)}
                  />
                </div>
              </div>
              <div>
                <label className={clsx("mb-1.5 block", labelClass)}>Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={clsx("w-full", inputClass)}
                  placeholder="What did you work on?"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
