import { useState, useEffect, type FormEvent } from "react";
import { Plus, Pencil, Trash2, X, Users, FolderKanban, ChevronLeft, ChevronRight, CalendarDays, UserCircle } from "lucide-react";
import { projectApi } from "../../api/projectApi";
import { userApi } from "../../api/userApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import type { Project, User, Pagination } from "../../types";
import toast from "react-hot-toast";
import clsx from "clsx";

const statusConfig: Record<string, { dot: string; badge: string; label: string }> = {
  active: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    label: "Active",
  },
  completed: {
    dot: "bg-gray-400 dark:bg-gray-500",
    badge: "bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20",
    label: "Completed",
  },
  "on-hold": {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    label: "On Hold",
  },
};

const inputClass =
  "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500";

const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";

export default function Projects() {
  const { isAdmin, isManager } = useAuth();
  const confirm = useConfirm();
  const canEdit = isAdmin || isManager;

  const [projects, setProjects] = useState<Project[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  // Form
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = (id: string) => {
    setDetailLoading(true);
    projectApi
      .getById(id)
      .then((res) => setDetailProject(res.data.data ?? null))
      .catch(() => toast.error("Failed to load project"))
      .finally(() => setDetailLoading(false));
  };

  const fetchProjects = () => {
    projectApi.getAll({ page, limit: 10 }).then((res) => {
      setProjects(res.data.data);
      setPagination(res.data.pagination);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchProjects();
  }, [page]);

  useEffect(() => {
    if (canEdit) {
      userApi.getAll({ limit: 100 }).then((res) => setUsers(res.data.data)).catch(() => {});
    }
  }, [canEdit]);

  const resetForm = () => {
    setName("");
    setClient("");
    setDescription("");
    setStatus("active");
    setAssignedUsers([]);
    setEditing(null);
    setShowModal(false);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setName(p.name);
    setClient(p.client);
    setDescription(p.description || "");
    setStatus(p.status);
    setAssignedUsers(p.assignedUsers?.map((u) => u._id) || []);
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { name, client, description, status: status as Project["status"], assignedUsers };
      if (editing) {
        await projectApi.update(editing._id, data);
        toast.success("Project updated!");
      } else {
        await projectApi.create(data);
        toast.success("Project created!");
      }
      resetForm();
      fetchProjects();
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete project?", description: "All timesheet entries linked to this project will remain but the project itself will be removed.", confirmLabel: "Delete project" }))) return;
    try {
      await projectApi.delete(id);
      toast.success("Project deleted.");
      fetchProjects();
    } catch {
      // handled
    }
  };

  const toggleUser = (id: string) => {
    setAssignedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and track all your team projects
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-800">
              <FolderKanban className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
              No projects yet
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Create your first project to get started
            </p>
          </div>
        ) : (
          projects.map((p) => {
            const cfg = statusConfig[p.status] || statusConfig.active;
            return (
              <div
                key={p._id}
                onClick={() => openDetail(p._id)}
                className="group cursor-pointer rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30 dark:hover:shadow-gray-800/30"
              >
                {/* Top row */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-gray-900 dark:text-white">
                      {p.name}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                      {p.client}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                      cfg.badge
                    )}
                  >
                    <span className={clsx("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                    {cfg.label}
                  </span>
                </div>

                {/* Description */}
                {p.description && (
                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {p.description}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>
                      {p.assignedUsers?.length || 0}{" "}
                      {(p.assignedUsers?.length || 0) === 1 ? "member" : "members"}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(p._id); }}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-gray-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-medium text-gray-700 dark:text-gray-300">{pagination.page}</span>{" "}
            of <span className="font-medium text-gray-700 dark:text-gray-300">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {(detailProject || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailProject(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-gray-900 dark:shadow-gray-950/50">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Project Details
              </h2>
              <button
                onClick={() => setDetailProject(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
                </div>
              ) : detailProject ? (
                <div className="space-y-5">
                  {/* Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {detailProject.name}
                      </h3>
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {detailProject.client}
                      </p>
                    </div>
                    {(() => {
                      const cfg = statusConfig[detailProject.status] || statusConfig.active;
                      return (
                        <span
                          className={clsx(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                            cfg.badge
                          )}
                        >
                          <span className={clsx("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Description */}
                  {detailProject.description && (
                    <div>
                      <p className={labelClass}>Description</p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        {detailProject.description}
                      </p>
                    </div>
                  )}

                  {/* Members */}
                  {detailProject.assignedUsers && detailProject.assignedUsers.length > 0 && (
                    <div>
                      <p className={labelClass}>
                        Members ({detailProject.assignedUsers.length})
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {detailProject.assignedUsers.map((u) => {
                          const user = typeof u === "object" ? u : null;
                          if (!user) return null;
                          return (
                            <div
                              key={user._id}
                              className="flex items-center gap-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                                {user.name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {user.name}
                                </p>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                      <p className={labelClass}>Created By</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <UserCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {typeof detailProject.createdBy === "object"
                            ? detailProject.createdBy.name
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                      <p className={labelClass}>Created</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {new Date(detailProject.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-6 py-4">
              {canEdit && detailProject && (
                <button
                  onClick={() => {
                    openEdit(detailProject);
                    setDetailProject(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
              <button
                onClick={() => setDetailProject(null)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetForm();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-gray-900 dark:shadow-gray-950/50">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editing ? "Edit Project" : "New Project"}
              </h2>
              <button
                onClick={resetForm}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Project name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Client</label>
                  <input
                    required
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="Client name"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief project description..."
                  className={clsx(inputClass, "resize-none")}
                />
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Assign Members</label>
                <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-gray-300 bg-white p-1.5 dark:border-gray-600 dark:bg-gray-800">
                  {users.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
                      No users available
                    </p>
                  )}
                  {users.map((u) => (
                    <label
                      key={u._id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={assignedUsers.includes(u._id)}
                        onChange={() => toggleUser(u._id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{u.name}</span>
                      <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        {u.role}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
