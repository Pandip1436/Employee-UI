import { useState, useEffect, type FormEvent } from "react";
import {
  Plus, Pencil, Trash2, X, Users, FolderKanban, ChevronLeft, ChevronRight,
  CalendarDays, UserCircle, Sparkles, Briefcase,
} from "lucide-react";
import { projectApi } from "../../api/projectApi";
import { userApi } from "../../api/userApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import type { Project, User, Pagination } from "../../types";
import toast from "react-hot-toast";
import clsx from "clsx";

/* ── Shared tokens ── */
const cardCls =
  "rounded-2xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-all hover:shadow-md hover:ring-black/[0.04] dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03] dark:hover:ring-white/[0.06]";
const labelCls = "text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500";
const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

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

const statusConfig: Record<string, { dot: string; badge: string; label: string; gradient: string }> = {
  active: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    label: "Active",
    gradient: "from-emerald-500 to-teal-600",
  },
  completed: {
    dot: "bg-sky-500",
    badge:
      "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20",
    label: "Completed",
    gradient: "from-sky-500 to-blue-600",
  },
  "on-hold": {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    label: "On Hold",
    gradient: "from-amber-500 to-orange-600",
  },
};

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

  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => { fetchProjects(); }, [page]);

  useEffect(() => {
    if (canEdit) {
      userApi.getAll({ limit: 100 }).then((res) => setUsers(res.data.data)).catch(() => {});
    }
  }, [canEdit]);

  const resetForm = () => {
    setName(""); setClient(""); setDescription(""); setStatus("active");
    setAssignedUsers([]); setEditing(null); setShowModal(false);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setName(p.name); setClient(p.client);
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
    } catch { /* handled */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Delete project?", description: "All timesheet entries linked to this project will remain but the project itself will be removed.", confirmLabel: "Delete project" }))) return;
    try {
      await projectApi.delete(id);
      toast.success("Project deleted.");
      fetchProjects();
    } catch { /* handled */ }
  };

  const toggleUser = (id: string) =>
    setAssignedUsers((prev) => prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]);

  const totalProjects = pagination?.total ?? projects.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <FolderKanban className="h-10 w-10 text-indigo-200" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/80">
                <Sparkles className="h-3.5 w-3.5" />
                Project portfolio
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Your <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">Projects</span>
              </h1>
              <p className="mt-1 text-sm text-indigo-200/70">Manage and track all your team projects</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/80">Active</p>
              <p className="text-xl font-bold tracking-tight">
                {activeProjects}<span className="text-sm font-normal text-indigo-200/60"> / {totalProjects}</span>
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30"
              >
                <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                  <Plus className="h-3.5 w-3.5 text-white" />
                </span>
                New Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Project Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className={`${cardCls} col-span-full flex flex-col items-center gap-2 py-20 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <FolderKanban className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No projects yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {canEdit ? "Create your first project to get started" : "Projects will appear here once created"}
            </p>
          </div>
        ) : (
          projects.map((p) => {
            const cfg = statusConfig[p.status] || statusConfig.active;
            const members = p.assignedUsers || [];
            return (
              <div
                key={p._id}
                onClick={() => openDetail(p._id)}
                className={`${cardCls} group relative cursor-pointer overflow-hidden p-5 hover:-translate-y-0.5`}
              >
                {/* Status accent strip */}
                <span aria-hidden className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${cfg.gradient}`} />

                <div className="mb-3 flex items-start gap-3">
                  <div className={`rounded-xl bg-gradient-to-br ${cfg.gradient} p-2.5 shadow-lg shadow-black/[0.08] ring-1 ring-white/10`}>
                    <Briefcase className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{p.client}</p>
                  </div>
                  <span className={clsx("inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold", cfg.badge)}>
                    <span className={clsx("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                    {cfg.label}
                  </span>
                </div>

                {p.description && (
                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{p.description}</p>
                )}

                {/* Footer: member avatars + count + actions */}
                <div className="flex items-center justify-between border-t border-gray-200/70 pt-3 dark:border-gray-800/80">
                  <div className="flex items-center gap-2">
                    {members.length > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {members.slice(0, 4).map((u) => (
                            <div
                              key={u._id}
                              title={u.name}
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(u.name || "?")} text-[10px] font-semibold text-white ring-2 ring-white dark:ring-gray-900`}
                            >
                              {(u.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                          ))}
                          {members.length > 4 && (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 ring-2 ring-white dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-900">
                              +{members.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {members.length} {members.length === 1 ? "member" : "members"}
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Users className="h-3.5 w-3.5" /> No members
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                        aria-label="Edit"
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(p._id); }}
                          aria-label="Delete"
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
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

      {/* ── Pagination ── */}
      {pagination && pagination.pages > 1 && (
        <div className={`${cardCls} flex items-center justify-between p-3`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{pagination.page}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {(detailProject || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDetailProject(null); }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            {/* Header */}
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                    <FolderKanban className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Project Details</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Overview & team</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailProject(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {detailLoading ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading project...</p>
                </div>
              ) : detailProject ? (
                <div className="space-y-5">
                  {/* Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{detailProject.name}</h3>
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{detailProject.client}</p>
                    </div>
                    {(() => {
                      const cfg = statusConfig[detailProject.status] || statusConfig.active;
                      return (
                        <span className={clsx("inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold", cfg.badge)}>
                          <span className={clsx("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Description */}
                  {detailProject.description && (
                    <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 p-3 dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Description</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{detailProject.description}</p>
                    </div>
                  )}

                  {/* Members */}
                  {detailProject.assignedUsers && detailProject.assignedUsers.length > 0 && (
                    <div>
                      <p className={`${labelCls} mb-2`}>
                        Members ({detailProject.assignedUsers.length})
                      </p>
                      <div className="space-y-1.5">
                        {detailProject.assignedUsers.map((u) => {
                          const user = typeof u === "object" ? u : null;
                          if (!user) return null;
                          return (
                            <div
                              key={user._id}
                              className="flex items-center gap-3 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 dark:border-gray-800/80 dark:bg-gray-800/40"
                            >
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(user.name || "?")} text-[11px] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-900`}>
                                {(user.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Created By</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                        <UserCircle className="h-3.5 w-3.5 text-gray-400" />
                        {typeof detailProject.createdBy === "object" ? detailProject.createdBy.name : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2 dark:border-gray-800/80 dark:bg-gray-800/40">
                      <p className={labelCls}>Created</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(detailProject.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-gray-200/70 p-4 dark:border-gray-800/80">
              {canEdit && detailProject && (
                <button
                  onClick={() => { openEdit(detailProject); setDetailProject(null); }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
              <button
                onClick={() => setDetailProject(null)}
                className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10">
            <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:to-gray-900">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                    {editing ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      {editing ? "Edit Project" : "New Project"}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {editing ? "Update project details" : "Create a new project"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Name</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className={inputClass} />
                </div>
                <div>
                  <label className={`${labelCls} mb-1.5 block`}>Client</label>
                  <input required value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" className={inputClass} />
                </div>
              </div>

              <div>
                <label className={`${labelCls} mb-1.5 block`}>Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief project description..." className={clsx(inputClass, "resize-none")} />
              </div>

              <div>
                <label className={`${labelCls} mb-2 block`}>Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["active", "on-hold", "completed"] as const).map((s) => {
                    const cfg = statusConfig[s];
                    const active = status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                          active
                            ? "border-indigo-300 bg-gradient-to-br from-indigo-50 to-white shadow-sm ring-1 ring-indigo-500/20 text-indigo-700 dark:border-indigo-500/40 dark:from-indigo-500/10 dark:to-gray-900 dark:text-indigo-300 dark:ring-indigo-400/25"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={`${labelCls} mb-1.5 block`}>
                  Assign Members <span className="text-gray-400">({assignedUsers.length} selected)</span>
                </label>
                <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/60 p-1.5 dark:border-gray-700 dark:bg-gray-800/40">
                  {users.length === 0 && (
                    <p className="px-2 py-4 text-center text-xs text-gray-400 dark:text-gray-500">No users available</p>
                  )}
                  {users.map((u) => {
                    const checked = assignedUsers.includes(u._id);
                    return (
                      <label
                        key={u._id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors ${
                          checked ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-white dark:hover:bg-gray-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUser(u._id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${paletteFor(u.name || "?")} text-[9px] font-semibold text-white shadow-sm`}>
                          {(u.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{u.name}</span>
                        <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                          {u.role}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 border-t border-gray-200/70 pt-4 dark:border-gray-800/80">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:shadow-xl disabled:opacity-60"
                >
                  {saving ? "Saving..." : editing ? "Update Project" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

