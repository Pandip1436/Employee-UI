import { useState, useEffect, type FormEvent } from "react";
import {
  Plus, Pencil, Trash2, X, Users, FolderKanban, ChevronLeft, ChevronRight,
  CalendarDays, UserCircle, Sparkles, Briefcase, Search, Loader2,
  FileText, Building, Tag,
} from "lucide-react";
import { projectApi } from "../../api/projectApi";
import { userApi } from "../../api/userApi";
import Avatar from "../../components/Avatar";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "on-hold" | "completed">("all");

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
      userApi.getAll({ limit: 100, role: "employee,manager" }).then((res) => setUsers(res.data.data)).catch(() => {});
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
  const onHoldProjects = projects.filter((p) => p.status === "on-hold").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;

  // Client-side filter applied to the current page of projects
  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Hero (no grid) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-10 h-48 w-48 rounded-full bg-sky-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* LEFT: identity + KPI chips */}
          <div className="min-w-0 flex-1 lg:max-w-[640px]">
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

            {/* Hero KPI chips — full hero width so they sit on one row */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur-sm">
                <FolderKanban className="h-3.5 w-3.5 text-indigo-200" />
                <span className="text-indigo-200/80">Total</span>
                <span className="font-mono font-semibold tabular-nums">{totalProjects}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs ring-1 ring-emerald-400/30 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-200/90">Active</span>
                <span className="font-mono font-semibold tabular-nums text-emerald-50">{activeProjects}</span>
              </span>
              {onHoldProjects > 0 && (
                <span className="inline-flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs ring-1 ring-amber-400/30 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-amber-200/90">On hold</span>
                  <span className="font-mono font-semibold tabular-nums text-amber-50">{onHoldProjects}</span>
                </span>
              )}
              {completedProjects > 0 && (
                <span className="inline-flex items-center gap-2 rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs ring-1 ring-sky-400/30 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span className="text-sky-200/90">Completed</span>
                  <span className="font-mono font-semibold tabular-nums text-sky-50">{completedProjects}</span>
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: action stack */}
          {canEdit && (
            <div className="flex w-full shrink-0 flex-col gap-2.5 sm:flex-row lg:w-auto lg:flex-col">
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl hover:shadow-black/30 active:scale-[0.98]"
              >
                <span className="rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-1">
                  <Plus className="h-3.5 w-3.5 text-white" />
                </span>
                New Project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className={`${cardCls} p-3`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by project or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded-lg border border-gray-200/70 bg-white/80 py-2 pl-9 ${search ? "pr-8" : "pr-3"} text-sm text-gray-900 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800/80 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-500 dark:ring-white/[0.03]`}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status chips */}
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/70 bg-gray-50/60 p-1 dark:border-gray-800/80 dark:bg-gray-800/40">
            {([
              { key: "all" as const,       label: "All",       count: totalProjects, dot: "bg-gray-400" },
              { key: "active" as const,    label: "Active",    count: activeProjects, dot: "bg-emerald-500" },
              { key: "on-hold" as const,   label: "On Hold",   count: onHoldProjects, dot: "bg-amber-500" },
              { key: "completed" as const, label: "Completed", count: completedProjects, dot: "bg-sky-500" },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  statusFilter === f.key
                    ? "bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-700 ring-1 ring-indigo-500/20 shadow-sm dark:from-indigo-400/15 dark:via-indigo-400/5 dark:text-indigo-300 dark:ring-indigo-400/25"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/60"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
                {f.label}
                <span className={`inline-flex min-w-[20px] items-center justify-center rounded-md px-1.5 py-0 text-[10px] font-bold ${
                  statusFilter === f.key
                    ? "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {(statusFilter !== "all" || search) && (
            <button
              onClick={() => { setStatusFilter("all"); setSearch(""); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Project Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.length === 0 ? (
          <div className={`${cardCls} col-span-full flex flex-col items-center gap-2 py-20 text-center`}>
            <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
              <FolderKanban className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {projects.length === 0 ? "No projects yet" : "No projects match your filters"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {projects.length === 0
                ? (canEdit ? "Create your first project to get started" : "Projects will appear here once created")
                : "Try clearing search or status filter"}
            </p>
          </div>
        ) : (
          filteredProjects.map((p) => {
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
                            <Avatar
                              key={u._id}
                              name={u.name}
                              photo={u.profilePhotoUrl}
                              gradient={paletteFor(u.name || "?")}
                              className="h-7 w-7 shrink-0 rounded-full ring-2 ring-white dark:ring-gray-900"
                              textClassName="text-[10px] font-semibold"
                            />
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

      {/* ── Detail Drawer (premium right-side panel) ── */}
      {(detailProject || detailLoading) && (() => {
        const cfg = detailProject ? statusConfig[detailProject.status] || statusConfig.active : statusConfig.active;
        const members = (detailProject?.assignedUsers || []).filter((u): u is User => typeof u === "object");
        const createdAt = detailProject ? new Date(detailProject.createdAt) : null;
        const daysActive = createdAt ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000)) : 0;
        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 animate-backdrop-fade bg-gray-950/60 backdrop-blur-md"
              onClick={() => setDetailProject(null)}
            />
            {/* Drawer panel */}
            <div
              role="dialog"
              aria-modal="true"
              className="relative flex h-full w-full max-w-md animate-drawer-slide-right flex-col overflow-hidden border-l border-gray-200/80 bg-white shadow-2xl ring-1 ring-black/5 dark:border-gray-800/80 dark:bg-gray-900 dark:ring-white/10 sm:max-w-xl sm:rounded-l-3xl"
            >
              {/* Edge glow on the drawer's left seam */}
              <div aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b ${cfg.gradient} opacity-60`} />

              {detailLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-700 dark:border-t-indigo-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading project…</p>
                </div>
              ) : detailProject ? (
                <>
                  {/* ── Hero header (compact) ── */}
                  <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${cfg.gradient} px-5 pb-4 pt-4 text-white sm:px-6 sm:pb-5 sm:pt-5`}>
                    {/* Decorative blobs */}
                    <div aria-hidden className="pointer-events-none absolute inset-0">
                      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
                      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
                    </div>
                    {/* Dot pattern */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-[0.10]"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)",
                        backgroundSize: "20px 20px",
                        maskImage: "radial-gradient(ellipse at top right, black 30%, transparent 75%)",
                      }}
                    />

                    {/* Close button */}
                    <button
                      onClick={() => setDetailProject(null)}
                      aria-label="Close"
                      className="absolute right-2.5 top-2.5 rounded-md bg-white/10 p-1 text-white/90 ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>

                    {/* Identity + status pill on one row */}
                    <div className="relative flex items-start gap-3 pr-8">
                      <div className="shrink-0 rounded-xl bg-white/15 p-2 ring-1 ring-white/20 backdrop-blur-sm">
                        <FolderKanban className="h-5 w-5 text-white" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70">Project</p>
                        <h2 className="mt-0.5 truncate text-lg font-bold tracking-tight sm:text-xl">
                          {detailProject.name}
                        </h2>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="flex min-w-0 items-center gap-1 truncate text-xs text-white/85">
                            <Building className="h-3 w-3 shrink-0" />
                            <span className="truncate">{detailProject.client || "No client"}</span>
                          </p>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/25 backdrop-blur-sm">
                            <span className={clsx("h-1 w-1 rounded-full", cfg.dot, detailProject.status === "active" && "animate-pulse")} />
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats strip (compact) */}
                    <div className="relative mt-3 grid grid-cols-3 gap-1.5">
                      {[
                        { label: "Members", value: members.length, icon: Users },
                        { label: "Status", value: cfg.label, icon: Tag },
                        { label: "Days", value: daysActive, icon: CalendarDays },
                      ].map((s) => (
                        <div key={s.label} className="rounded-lg bg-white/10 px-2.5 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
                          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-white/70">
                            <s.icon className="h-2.5 w-2.5" /> {s.label}
                          </p>
                          <p className="font-mono text-sm font-bold tabular-nums tracking-tight text-white">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Body — fills remaining drawer height, scrolls ── */}
                  <div className="sidebar-scroll flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6">
                    <div className="space-y-5">
                      {/* Description */}
                      {detailProject.description && (
                        <div className="group rounded-2xl border border-gray-200/70 bg-gradient-to-br from-gray-50/80 to-white p-4 transition-all hover:border-indigo-300/50 hover:shadow-sm dark:border-gray-800/80 dark:from-gray-800/40 dark:to-gray-900 dark:hover:border-indigo-500/40">
                          <p className={`${labelCls} flex items-center gap-1.5`}>
                            <FileText className="h-3 w-3" /> Description
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{detailProject.description}</p>
                        </div>
                      )}

                      {/* Members */}
                      {members.length > 0 && (
                        <div>
                          <div className="mb-2.5 flex items-center justify-between">
                            <p className={`${labelCls} flex items-center gap-1.5`}>
                              <Users className="h-3 w-3" /> Members
                            </p>
                            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20">
                              {members.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {members.map((user) => (
                              <div
                                key={user._id}
                                className="group flex items-center gap-3 rounded-xl border border-gray-200/70 bg-white px-3 py-2 transition-all hover:-translate-y-0.5 hover:border-indigo-300/60 hover:shadow-md dark:border-gray-800/80 dark:bg-gray-800/40 dark:hover:border-indigo-500/40"
                              >
                                <Avatar
                                  name={user.name}
                                  photo={user.profilePhotoUrl}
                                  gradient={paletteFor(user.name || "?")}
                                  className="h-9 w-9 shrink-0 rounded-full shadow-sm ring-2 ring-white transition-transform group-hover:scale-110 dark:ring-gray-900"
                                  textClassName="text-xs font-bold"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{user.email}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Meta — refined info rows */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3 rounded-xl border border-gray-200/70 bg-white px-3 py-2.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20">
                            <UserCircle className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className={labelCls}>Created by</p>
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {typeof detailProject.createdBy === "object" ? detailProject.createdBy.name : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-gray-200/70 bg-white px-3 py-2.5 dark:border-gray-800/80 dark:bg-gray-800/40">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20">
                            <CalendarDays className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className={labelCls}>Created</p>
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {createdAt?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Footer — sticky bottom action bar ── */}
                  <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200/70 bg-gradient-to-br from-gray-50/80 to-white px-5 py-4 dark:border-gray-800/80 dark:from-gray-900 dark:to-gray-950">
                    {canEdit && (
                      <button
                        onClick={() => { openEdit(detailProject); setDetailProject(null); }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => setDetailProject(null)}
                      className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40"
                    >
                      <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
                      <span className="relative">Close</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        );
      })()}

      {/* ── Create/Edit Drawer (premium) ── */}
      {showModal && (() => {
        const previewCfg = statusConfig[status] || statusConfig.active;
        const selectedMembers = users.filter((u) => assignedUsers.includes(u._id));
        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 animate-backdrop-fade bg-gray-950/60 backdrop-blur-sm"
              onClick={resetForm}
            />
            <div
              role="dialog"
              aria-modal="true"
              className="relative flex h-full w-full max-w-md animate-drawer-slide-right flex-col overflow-hidden border-l border-gray-200/80 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 dark:ring-white/10 sm:max-w-xl sm:rounded-l-3xl"
            >
              {/* Left stripe — color follows the chosen status */}
              <span aria-hidden className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${previewCfg.gradient}`} />

              {/* Header */}
              <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 px-5 pt-6 pb-5 dark:border-gray-800/80 dark:from-indigo-500/10 dark:via-gray-900 dark:to-purple-500/10">
                <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/25 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-purple-400/15 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className={`rounded-2xl bg-gradient-to-br ${previewCfg.gradient} p-3 shadow-lg shadow-black/[0.08] ring-1 ring-white/15`}>
                      {editing ? <Pencil className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">
                        <Sparkles className="h-3 w-3" />
                        {editing ? "Update project" : "New project"}
                      </p>
                      <h2 className="mt-0.5 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                        {editing ? "Edit Project" : "New Project"}
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {editing ? "Update name, status, members" : "Define scope and assign your team"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    aria-label="Close"
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <form
                onSubmit={handleSubmit}
                id="project-form"
                className="premium-scroll flex-1 space-y-5 overflow-y-auto p-5 sm:p-6"
              >
                {/* Live preview card */}
                <div className="relative overflow-hidden rounded-2xl border border-gray-200/70 bg-gradient-to-br from-gray-50 to-white p-4 ring-1 ring-black/[0.02] dark:border-gray-800/80 dark:from-gray-800/40 dark:to-gray-900/40 dark:ring-white/[0.02]">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
                  <span aria-hidden className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${previewCfg.gradient} opacity-15 blur-2xl`} />
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-400/80">
                    <Sparkles className="h-3 w-3" />
                    Live preview
                  </p>
                  <div className="flex items-start gap-3">
                    <div className={`rounded-xl bg-gradient-to-br ${previewCfg.gradient} p-2.5 shadow-md ring-1 ring-white/10`}>
                      <Briefcase className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {name || <span className="text-gray-400 dark:text-gray-500">Project name…</span>}
                        </p>
                        <span className={clsx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", previewCfg.badge)}>
                          <span className={clsx("h-1 w-1 rounded-full", previewCfg.dot)} />
                          {previewCfg.label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {client || <span className="text-gray-400 dark:text-gray-500">Client name…</span>}
                      </p>
                      {description && (
                        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                          {description}
                        </p>
                      )}
                      {selectedMembers.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 border-t border-gray-200/70 pt-2 dark:border-gray-800/80">
                          <div className="flex -space-x-1.5">
                            {selectedMembers.slice(0, 4).map((u) => (
                              <Avatar
                                key={u._id}
                                name={u.name}
                                photo={u.profilePhotoUrl}
                                gradient={paletteFor(u.name || "?")}
                                className="h-5 w-5 shrink-0 rounded-full ring-2 ring-white dark:ring-gray-900"
                                textClassName="text-[8px] font-semibold"
                              />
                            ))}
                            {selectedMembers.length > 4 && (
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[8px] font-semibold text-gray-600 ring-2 ring-white dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-900">
                                +{selectedMembers.length - 4}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {selectedMembers.length} {selectedMembers.length === 1 ? "member" : "members"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section: Basics */}
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600/70 dark:text-indigo-400/70">
                    <FolderKanban className="h-3 w-3" />
                    Basics
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={`${labelCls} mb-1.5 flex items-center gap-1.5`}>
                        <FolderKanban className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                        Name
                      </label>
                      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className={inputClass} />
                    </div>
                    <div>
                      <label className={`${labelCls} mb-1.5 flex items-center gap-1.5`}>
                        <Building className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                        Client
                      </label>
                      <input required value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" className={inputClass} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className={`${labelCls} mb-1.5 flex items-center gap-1.5`}>
                      <FileText className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                      Description
                    </label>
                    <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief project description..." className={clsx(inputClass, "resize-y")} />
                  </div>
                </div>

                {/* Section: Status */}
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600/70 dark:text-amber-400/70">
                    <Tag className="h-3 w-3" />
                    Status
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["active", "on-hold", "completed"] as const).map((s) => {
                      const cfg = statusConfig[s];
                      const active = status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(s)}
                          className={`group relative overflow-hidden rounded-xl border p-3 text-center transition-all ${
                            active
                              ? "border-transparent shadow-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                              : "border-gray-200/80 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700/80 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800/60"
                          }`}
                          style={
                            active
                              ? {
                                  background:
                                    s === "active"
                                      ? "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(20,184,166,0.05))"
                                      : s === "on-hold"
                                        ? "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(249,115,22,0.05))"
                                        : "linear-gradient(135deg, rgba(14,165,233,0.10), rgba(37,99,235,0.05))",
                                  boxShadow:
                                    "0 0 0 2px " +
                                    (s === "active"
                                      ? "rgba(16,185,129,0.55)"
                                      : s === "on-hold"
                                        ? "rgba(245,158,11,0.55)"
                                        : "rgba(14,165,233,0.55)"),
                                }
                              : undefined
                          }
                        >
                          <div className={`mx-auto mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${cfg.gradient} text-white shadow-sm ring-1 ring-white/10`}>
                            <Briefcase className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-[12px] font-semibold text-gray-900 dark:text-white">{cfg.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section: Team */}
                <div>
                  <p className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-purple-600/70 dark:text-purple-400/70">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      Team members
                    </span>
                    <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
                      {assignedUsers.length} selected
                    </span>
                  </p>
                  <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/60 p-1.5 dark:border-gray-700 dark:bg-gray-800/40">
                    {users.length === 0 && (
                      <p className="px-2 py-6 text-center text-xs text-gray-400 dark:text-gray-500">No users available</p>
                    )}
                    {users.map((u) => {
                      const checked = assignedUsers.includes(u._id);
                      return (
                        <label
                          key={u._id}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors ${
                            checked
                              ? "bg-indigo-50 ring-1 ring-inset ring-indigo-500/20 dark:bg-indigo-500/10 dark:ring-indigo-400/25"
                              : "hover:bg-white dark:hover:bg-gray-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUser(u._id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <Avatar
                            name={u.name}
                            photo={u.profilePhotoUrl}
                            gradient={paletteFor(u.name || "?")}
                            className="h-7 w-7 shrink-0 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-900"
                            textClassName="text-[10px] font-semibold"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{u.name}</p>
                            <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">{u.email}</p>
                          </div>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            {u.role}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </form>

              {/* Sticky footer */}
              <div className="shrink-0 border-t border-gray-200/70 bg-white/95 px-5 py-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/95 sm:px-6">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="project-form"
                    disabled={saving || !name || !client}
                    className="group relative flex-1 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative inline-flex items-center justify-center gap-2">
                      {saving
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                        : editing
                          ? <><Pencil className="h-4 w-4" />Update Project</>
                          : <><Plus className="h-4 w-4" />Create Project</>}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

