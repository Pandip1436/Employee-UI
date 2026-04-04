import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2, Mail, Eye, EyeOff, FileText } from "lucide-react";
import { adminSettingsApi } from "../../api/adminSettingsApi";
import toast from "react-hot-toast";

const inputCls =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full";

interface EmailTemplate {
  key: string;
  subject: string;
  body: string;
}

export default function AdminEmailTemplates() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // New template form
  const [newKey, setNewKey] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");

  const fetchTemplates = () => {
    setLoading(true);
    adminSettingsApi
      .getEmailTemplates()
      .then((r) => setTemplates(r.data.data || []))
      .catch(() => toast.error("Failed to load email templates"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAdd = () => {
    const key = newKey.trim();
    const subject = newSubject.trim();
    const body = newBody.trim();
    if (!key) return toast.error("Template key is required");
    if (!subject) return toast.error("Subject is required");
    if (!body) return toast.error("Body is required");
    if (templates.some((t) => t.key.toLowerCase() === key.toLowerCase())) {
      return toast.error("Template key already exists");
    }
    setTemplates((prev) => [...prev, { key, subject, body }]);
    setNewKey("");
    setNewSubject("");
    setNewBody("");
    toast.success("Template added - remember to save");
  };

  const handleDelete = (index: number) => {
    if (previewIndex === index) setPreviewIndex(null);
    else if (previewIndex !== null && previewIndex > index) setPreviewIndex(previewIndex - 1);
    setTemplates((prev) => prev.filter((_, i) => i !== index));
    toast.success("Template removed - remember to save");
  };

  const updateTemplate = (index: number, field: keyof EmailTemplate, value: string) => {
    setTemplates((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await adminSettingsApi.updateEmailTemplates(templates);
      toast.success("Email templates saved");
    } catch {
      toast.error("Failed to save email templates");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage notification email templates and preview them
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All
        </button>
      </div>

      {/* Add New Template */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
            <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Add New Template</h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Template key (e.g. welcome_email)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="Subject line"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className={inputCls}
            />
          </div>
          <textarea
            placeholder="Email body (HTML supported)..."
            rows={4}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            className={inputCls}
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Template
          </button>
        </div>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-12 text-center text-gray-400 dark:text-gray-500">
          No email templates configured yet. Add one above.
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((tpl, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all hover:shadow-md"
            >
              {/* Template Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 dark:border-gray-800 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <code className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                      {tpl.key}
                    </code>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewIndex(previewIndex === i ? null : i)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                  >
                    {previewIndex === i ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {previewIndex === i ? "Hide Preview" : "Preview"}
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Edit Fields */}
              <div className="space-y-3 px-5 py-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={tpl.subject}
                    onChange={(e) => updateTemplate(i, "subject", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Body
                  </label>
                  <textarea
                    rows={5}
                    value={tpl.body}
                    onChange={(e) => updateTemplate(i, "body", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Preview Section */}
              {previewIndex === i && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Preview
                  </p>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
                    <div className="mb-3 border-b border-gray-200 dark:border-gray-700 pb-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Subject:</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{tpl.subject || "(empty)"}</p>
                    </div>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                      dangerouslySetInnerHTML={{ __html: tpl.body || "<em>No content</em>" }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
