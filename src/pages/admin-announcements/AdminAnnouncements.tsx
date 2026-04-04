import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Pin, Loader2 } from "lucide-react";
import { announcementApi, type AnnouncementData } from "../../api/announcementApi";
import toast from "react-hot-toast";

const CATEGORY_OPTIONS = ["HR", "Team", "Important", "General"];
const AUDIENCE_OPTIONS = ["all", "department", "team", "individual"];

const categoryColors: Record<string, string> = {
  HR: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Team: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Important: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  General: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const categoryDots: Record<string, string> = {
  HR: "bg-blue-500",
  Team: "bg-emerald-500",
  Important: "bg-rose-500",
  General: "bg-gray-400 dark:bg-gray-500",
};

const card =
  "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

const inputCls =
  "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

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
  category: "General",
  targetAudience: "all",
  tags: "",
  isPinned: false,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

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
      category: a.category || "General",
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
    if (!confirm(`Delete announcement "${title}"?`)) return;
    try {
      await announcementApi.delete(id);
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Announcements</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create, edit, and delete company announcements
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="py-16 text-center text-gray-400 dark:text-gray-500">
          No announcements yet. Create your first one!
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const catKey = a.category || "General";
            const colorCls = categoryColors[catKey] || categoryColors.General;
            const dotCls = categoryDots[catKey] || categoryDots.General;
            return (
              <div key={a._id} className={card}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorCls}`}
                      >
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotCls}`} />
                        {catKey}
                      </span>
                      {a.isPinned && (
                        <Pin className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {a.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                      {a.content}
                    </p>
                    {a.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400 dark:text-gray-500 mr-2">
                      {a.reactions.like.length + a.reactions.love.length + a.reactions.celebrate.length} reactions
                      &middot; {a.comments?.length || 0} comments
                    </span>
                    <button
                      onClick={() => openEdit(a)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(a._id, a.title)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingId ? "Edit Announcement" : "Create Announcement"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-4">
              {/* Title */}
              <div>
                <label className={labelCls}>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Announcement title"
                  className={inputCls}
                />
              </div>

              {/* Content */}
              <div>
                <label className={labelCls}>Content</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Write your announcement..."
                  rows={5}
                  className={`${inputCls} resize-y`}
                />
              </div>

              {/* Category + Audience Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className={inputCls}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Target Audience</label>
                  <select
                    value={form.targetAudience}
                    onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
                    className={inputCls}
                  >
                    {AUDIENCE_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className={labelCls}>Tags (comma separated)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="e.g. policy, update, benefits"
                  className={inputCls}
                />
              </div>

              {/* Pinned */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-indigo-600 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pin this announcement
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
