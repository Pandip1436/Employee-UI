import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Pin,
  Loader2,
  Sparkles,
  Megaphone,
  Search,
  MessageCircle,
  Heart,
  Bell,
  Hash,
  Tag,
  Users,
  Activity,
} from "lucide-react";
import { announcementApi, type AnnouncementData } from "../../api/announcementApi";
import toast from "react-hot-toast";
import { useConfirm } from "../../context/ConfirmContext";

// ── Config ──
const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "General" },
  { value: "hr", label: "HR" },
  { value: "team", label: "Team" },
  { value: "important", label: "Important" },
];

const AUDIENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "department", label: "Department" },
  { value: "team", label: "Team" },
  { value: "individual", label: "Individual" },
];

const CAT_CFG: Record<
  string,
  { label: string; dot: string; bg: string; text: string; ring: string; accent: string }
> = {
  hr: {
    label: "HR",
    dot: "bg-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/20",
    accent: "from-sky-500/20 to-sky-500/0",
  },
  team: {
    label: "Team",
    dot: "bg-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
    accent: "from-emerald-500/20 to-emerald-500/0",
  },
  important: {
    label: "Important",
    dot: "bg-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/20",
    accent: "from-rose-500/20 to-rose-500/0",
  },
  all: {
    label: "General",
    dot: "bg-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800/50",
    text: "text-gray-700 dark:text-gray-300",
    ring: "ring-gray-500/20",
    accent: "from-gray-500/10 to-gray-500/0",
  },
};

interface FormState {
  title: string;
  content: string;
  category: string;
  targetAudience: string;
  tags: string;
  isPinned: boolean;
}

const emptyForm: FormState = {
  title: "",
  content: "",
  category: "all",
  targetAudience: "all",
  tags: "",
  isPinned: false,
};

const input =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tint,
}: {
  icon: any;
  label: string;
  value: string | number;
  sublabel?: string;
  tint: "indigo" | "emerald" | "amber" | "rose";
}) {
  const tints: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/0 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    rose: "from-rose-500/20 to-rose-500/0 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-black/30">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${tints[tint]} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
          {sublabel && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tints[tint]} ring-1`}>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncements() {
  const confirm = useConfirm();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all-categories");

  const fetchAnnouncements = () => {
    setLoading(true);
    announcementApi
      .getAll({ limit: 100 })
      .then((res) => setAnnouncements(res.data.data))
      .catch(() => toast.error("Failed to load announcements"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (a: AnnouncementData) => {
    setEditingId(a._id);
    setForm({
      title: a.title,
      content: a.content,
      category: a.category || "all",
      targetAudience: a.targetAudience || "all",
      tags: a.tags?.join(", ") || "",
      isPinned: a.isPinned,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      targetAudience: form.targetAudience,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isPinned: form.isPinned,
    };
    try {
      if (editingId) {
        await announcementApi.update(editingId, payload);
        toast.success("Announcement updated");
      } else {
        await announcementApi.create(payload);
        toast.success("Announcement created");
      }
      closeModal();
      fetchAnnouncements();
    } catch {
      toast.error(editingId ? "Failed to update" : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (
      !(await confirm({
        title: "Delete announcement?",
        description: (
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900 dark:text-white">"{title}"</span>?
            Employees will lose access to this post.
          </>
        ),
        confirmLabel: "Delete",
      }))
    )
      return;
    try {
      await announcementApi.delete(id);
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ── Derived ──
  const stats = useMemo(() => {
    const total = announcements.length;
    const pinned = announcements.filter((a) => a.isPinned).length;
    const reactions = announcements.reduce(
      (s, a) =>
        s +
        (a.reactions?.like?.length || 0) +
        (a.reactions?.love?.length || 0) +
        (a.reactions?.celebrate?.length || 0),
      0
    );
    const comments = announcements.reduce((s, a) => s + (a.comments?.length || 0), 0);
    return { total, pinned, reactions, comments };
  }, [announcements]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return announcements.filter((a) => {
      const cat = (a.category || "all").toLowerCase();
      if (catFilter !== "all-categories" && cat !== catFilter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [announcements, search, catFilter]);

  return (
    <div className="space-y-6">
      {/* ━━━ Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-sky-500/15 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-200 backdrop-blur-sm ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" /> Admin · Post Manager
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-indigo-300" />
              Manage Announcements
            </h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/80 sm:text-base">
              Publish, pin, and curate company-wide updates. Keep your team aligned with timely,
              relevant communication.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.98]"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Plus className="h-4 w-4" /> New Announcement
          </button>
        </div>
      </div>

      {/* ━━━ Stats ━━━ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Bell} label="Total" value={stats.total} sublabel="All announcements" tint="indigo" />
        <StatCard icon={Pin} label="Pinned" value={stats.pinned} sublabel="On top" tint="amber" />
        <StatCard icon={Heart} label="Reactions" value={stats.reactions} sublabel="Across posts" tint="rose" />
        <StatCard icon={MessageCircle} label="Comments" value={stats.comments} sublabel="Across posts" tint="emerald" />
      </div>

      {/* ━━━ Toolbar ━━━ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 p-1 backdrop-blur-sm w-fit overflow-x-auto">
          {[{ value: "all-categories", label: "All" }, ...CATEGORY_OPTIONS].map((c) => (
            <button
              key={c.value}
              onClick={() => setCatFilter(c.value)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                catFilter === c.value
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, content, tag…"
            className={`${input} pl-10`}
          />
        </div>
      </div>

      {/* ━━━ List ━━━ */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Megaphone className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {announcements.length === 0 ? "No announcements yet" : "No announcements match"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {announcements.length === 0
              ? "Create your first announcement to get started."
              : "Try a different search term or category filter."}
          </p>
          {announcements.length === 0 && (
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/30"
            >
              <Plus className="h-4 w-4" /> New Announcement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => {
            const catKey = (a.category || "all").toLowerCase();
            const cfg = CAT_CFG[catKey] || CAT_CFG.all;
            const totalReactions =
              (a.reactions?.like?.length || 0) +
              (a.reactions?.love?.length || 0) +
              (a.reactions?.celebrate?.length || 0);
            return (
              <div
                key={a._id}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 backdrop-blur-sm transition-all hover:border-indigo-300/60 dark:hover:border-indigo-600/40 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-black/30"
              >
                {/* Category accent orb */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${cfg.accent} blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`}
                />
                <div className="relative p-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {a.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-amber-500/30">
                          <Pin className="h-3 w-3 fill-white" /> Pinned
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                    <h3 className="truncate text-base font-bold tracking-tight text-gray-900 dark:text-white sm:text-lg">
                      {a.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {a.content}
                    </p>
                    {a.tags?.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {a.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800/70 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-400"
                          >
                            <Hash className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right — Metrics + Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-rose-400" />
                        <span className="tabular-nums">{totalReactions}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="tabular-nums">{a.comments?.length || 0}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(a)}
                        title="Edit"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600/40 transition-all"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a._id, a.title)}
                        title="Delete"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-600/40 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ━━━ Modal ━━━ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-2xl">
            {/* Modal Header — gradient banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 px-6 py-5 text-white">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />
                <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl" />
              </div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
                    <Megaphone className="h-5 w-5 text-indigo-200" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200/80">
                      {editingId ? "Edit" : "Create"}
                    </p>
                    <h2 className="text-lg font-bold leading-tight">
                      {editingId ? "Edit Announcement" : "New Announcement"}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="rounded-lg p-2 text-indigo-200/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Quarterly all-hands meeting"
                  className={input}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Content
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Write your announcement…"
                  rows={6}
                  className={`${input} min-h-[140px] resize-y leading-relaxed`}
                />
              </div>

              {/* Category + Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    <Tag className="inline h-3 w-3 mr-1 -mt-0.5" /> Category
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_OPTIONS.map((c) => {
                      const cfg = CAT_CFG[c.value] || CAT_CFG.all;
                      const active = form.category === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            active
                              ? `${cfg.bg} ${cfg.text} ring-1 ${cfg.ring} shadow-sm`
                              : "bg-gray-100 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    <Users className="inline h-3 w-3 mr-1 -mt-0.5" /> Audience
                  </label>
                  <select
                    value={form.targetAudience}
                    onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
                    className={input}
                  >
                    {AUDIENCE_OPTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  <Hash className="inline h-3 w-3 mr-1 -mt-0.5" /> Tags
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="policy, update, benefits"
                  className={input}
                />
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Comma-separated · helps employees filter and search
                </p>
              </div>

              {/* Pinned */}
              <div
                className={`flex items-center justify-between rounded-xl p-4 ring-1 transition-all ${
                  form.isPinned
                    ? "bg-amber-50 dark:bg-amber-500/10 ring-amber-500/20"
                    : "bg-gray-50 dark:bg-gray-800/40 ring-gray-200 dark:ring-gray-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      form.isPinned
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                        : "bg-white dark:bg-gray-900 text-gray-400"
                    }`}
                  >
                    <Pin className={`h-4 w-4 ${form.isPinned ? "fill-current" : ""}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Pin this announcement</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Pinned posts stay at the top of the feed
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isPinned: !f.isPinned }))}
                  aria-pressed={form.isPinned}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    form.isPinned ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                      form.isPinned ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-gray-200/70 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-900/60 px-6 py-4">
              <p className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                <Activity className="h-3.5 w-3.5" />
                {editingId ? "Changes will be saved immediately" : "Will be visible to selected audience"}
              </p>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={closeModal}
                  className="rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Update" : "Publish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
