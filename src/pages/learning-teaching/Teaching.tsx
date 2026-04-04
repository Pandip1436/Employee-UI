import { useState, useEffect, useCallback } from "react";
import {
  Presentation, Plus, Calendar, Clock, Users, Paperclip, X, Video,
  Monitor, BookOpen, Radio,
} from "lucide-react";
import toast from "react-hot-toast";
import { learningApi, type TrainingData } from "../../api/learningApi";

const TRAINING_TYPES = ["workshop", "webinar", "classroom", "online"] as const;

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  workshop:  { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/30",  icon: <BookOpen className="h-3.5 w-3.5" /> },
  webinar:   { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/30",   icon: <Radio className="h-3.5 w-3.5" /> },
  classroom: { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/30",  icon: <Monitor className="h-3.5 w-3.5" /> },
  online:    { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", icon: <Video className="h-3.5 w-3.5" /> },
};

const EMPTY_FORM = { title: "", description: "", date: "", duration: "", type: "workshop" };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Teaching() {
  const [trainings, setTrainings] = useState<TrainingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchTrainings = useCallback(() => {
    setLoading(true);
    learningApi
      .getTrainings()
      .then((r) => setTrainings(r.data.data ?? []))
      .catch(() => toast.error("Failed to load trainings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTrainings(); }, [fetchTrainings]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.date) return toast.error("Date is required");
    setSubmitting(true);
    try {
      await learningApi.createTraining(form);
      toast.success("Training session created!");
      setShowForm(false);
      setForm(EMPTY_FORM);
      fetchTrainings();
    } catch { toast.error("Failed to create training"); }
    finally { setSubmitting(false); }
  };

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";
  const inputCls = "w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-purple-200">Share knowledge, grow together</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl flex items-center gap-2">
              <Presentation className="h-7 w-7" /> Training Sessions
            </h1>
            <p className="mt-1 text-sm text-purple-200">{trainings.length} session{trainings.length !== 1 ? "s" : ""} available</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-purple-700 shadow-lg hover:scale-105 transition-all"
          >
            <Plus className="h-4 w-4" /> Create Training
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      ) : trainings.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <Presentation className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No training sessions yet. Create the first one!</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conducted By</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendees</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Materials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {trainings.map((t) => {
                  const typeStyle = TYPE_STYLES[t.type] ?? TYPE_STYLES.workshop;
                  return (
                    <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.title}</p>
                        {t.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{t.description}</p>}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">{t.conductedBy?.name ?? "—"}</td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">{fmtDate(t.date)}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                          {typeStyle.icon} {t.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                          <Users className="h-3.5 w-3.5" /> {t.attendees.length}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                          <Paperclip className="h-3.5 w-3.5" /> {t.materials.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {trainings.map((t) => {
              const typeStyle = TYPE_STYLES[t.type] ?? TYPE_STYLES.workshop;
              return (
                <div key={t._id} className={card}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex-1 mr-2">{t.title}</h3>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                      {typeStyle.icon} {t.type}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t.conductedBy?.name ?? "—"}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {fmtDate(t.date)}</span>
                    {t.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t.duration}</span>}
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t.attendees.length} attendees</span>
                    <span className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {t.materials.length} materials</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create Training Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Training</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Title *</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="React Advanced Patterns" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <textarea rows={3} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Date *</label>
                  <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Duration</label>
                  <input className={inputCls} placeholder="e.g. 2 hours" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Type</label>
                <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TRAINING_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors">
                  {submitting ? "Creating..." : "Create Training"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
