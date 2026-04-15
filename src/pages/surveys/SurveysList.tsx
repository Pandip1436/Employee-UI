import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList, Plus, CheckCircle2, Clock, XCircle, ChevronRight, BarChart3, Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { surveyApi, type SurveyData } from "../../api/surveyApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";

export default function SurveysList() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const isAdmin = user?.role === "admin";
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);

  /* Inline create form */
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([{ text: "", type: "mcq" as const, options: ["", ""] }]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    surveyApi
      .getAll()
      .then((r) => setSurveys(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addQuestion = () => setQuestions([...questions, { text: "", type: "mcq", options: ["", ""] }]);

  const updateQuestion = (idx: number, field: string, value: unknown) => {
    const copy = [...questions];
    (copy[idx] as Record<string, unknown>)[field] = value;
    if (field === "type" && value !== "mcq") delete (copy[idx] as Record<string, unknown>).options;
    if (field === "type" && value === "mcq") copy[idx].options = ["", ""];
    setQuestions(copy);
  };

  const updateOption = (qi: number, oi: number, val: string) => {
    const copy = [...questions];
    if (copy[qi].options) copy[qi].options![oi] = val;
    setQuestions(copy);
  };

  const addOption = (qi: number) => {
    const copy = [...questions];
    copy[qi].options = [...(copy[qi].options || []), ""];
    setQuestions(copy);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({
      title: "Delete survey?",
      description: `"${title}" and all its responses will be permanently removed.`,
      confirmLabel: "Delete",
      cancelLabel: "Keep",
    });
    if (!ok) return;
    try {
      await surveyApi.delete(id);
      setSurveys((s) => s.filter((x) => x._id !== id));
      toast.success("Survey deleted.");
    } catch { /* interceptor */ }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await surveyApi.create({ title, description, questions });
      setSurveys([res.data.data!, ...surveys]);
      setShowCreate(false);
      setTitle(""); setDescription(""); setQuestions([{ text: "", type: "mcq", options: ["", ""] }]);
    } catch { /* interceptor */ }
    finally { setCreating(false); }
  };

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";
  const inputCls = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-teal-200">Share your voice</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl flex items-center gap-2">
              <ClipboardList className="h-7 w-7" /> Surveys
            </h1>
            <p className="mt-1 text-sm text-teal-200">{surveys.length} survey{surveys.length !== 1 ? "s" : ""} available</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-teal-700 shadow-lg hover:scale-105 transition-all"
            >
              <Plus className="h-4 w-4" /> Create Survey
            </button>
          )}
        </div>
      </div>

      {/* Create form (admin only) */}
      {showCreate && isAdmin && (
        <form onSubmit={handleCreate} className={`${card} space-y-4`}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Survey</h2>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Survey title" required className={inputCls} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className={inputCls} />

          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Questions</p>
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-500">Q{qi + 1}</span>
                  <input value={q.text} onChange={(e) => updateQuestion(qi, "text", e.target.value)} placeholder="Question text" required className={inputCls} />
                </div>
                <select value={q.type} onChange={(e) => updateQuestion(qi, "type", e.target.value)} className={`${inputCls} max-w-xs`}>
                  <option value="mcq">Multiple Choice</option>
                  <option value="rating">Rating (1-5)</option>
                  <option value="text">Text</option>
                </select>
                {q.type === "mcq" && q.options && (
                  <div className="space-y-2 pl-4">
                    {q.options.map((opt, oi) => (
                      <input key={oi} value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} required className={inputCls} />
                    ))}
                    <button type="button" onClick={() => addOption(qi)} className="text-xs text-indigo-500 hover:text-indigo-400 font-medium">
                      + Add option
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addQuestion} className="text-sm text-indigo-500 hover:text-indigo-400 font-medium">
              + Add question
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={creating} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
              {creating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Survey list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      ) : surveys.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <ClipboardList className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No surveys available yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {surveys.map((survey) => (
            <Link
              key={survey._id}
              to={`/surveys/${survey._id}`}
              className={`${card} group flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                    {survey.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {survey.responded && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Responded
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${
                        survey.isActive
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                          : "bg-gray-500/10 border-gray-500/30 text-gray-400"
                      }`}
                    >
                      {survey.isActive ? <Clock className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {survey.isActive ? "Active" : "Closed"}
                    </span>
                  </div>
                </div>
                {survey.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{survey.description}</p>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>By {survey.createdBy.name}</span>
                  <span>{survey.questions.length} question{survey.questions.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <Link
                        to={`/admin/surveys/${survey._id}/results`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-indigo-500 hover:text-indigo-400 font-medium flex items-center gap-1"
                      >
                        <BarChart3 className="h-3 w-3" /> Results
                      </Link>
                      <button
                        onClick={(e) => handleDelete(e, survey._id, survey.title)}
                        title="Delete survey"
                        className="rounded-md p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
