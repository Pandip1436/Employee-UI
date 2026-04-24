import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  XCircle,
  ChevronRight,
  BarChart3,
  Trash2,
  Sparkles,
  Search,
  Trash,
  ListChecks,
  X,
  Activity,
  FileCheck2,
} from "lucide-react";
import toast from "react-hot-toast";
import { surveyApi, type SurveyData } from "../../api/surveyApi";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";

type FilterTab = "all" | "active" | "closed" | "responded" | "pending";

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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </p>
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

export default function SurveysList() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const isAdmin = user?.role === "admin";
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([
    { text: "", type: "mcq" as const, options: ["", ""] },
  ]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    surveyApi
      .getAll()
      .then((r) => setSurveys(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addQuestion = () =>
    setQuestions([...questions, { text: "", type: "mcq", options: ["", ""] }]);

  const removeQuestion = (idx: number) =>
    setQuestions(questions.filter((_, i) => i !== idx));

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

  const removeOption = (qi: number, oi: number) => {
    const copy = [...questions];
    if (copy[qi].options && copy[qi].options!.length > 2) {
      copy[qi].options = copy[qi].options!.filter((_, i) => i !== oi);
      setQuestions(copy);
    }
  };

  const resetCreate = () => {
    setTitle("");
    setDescription("");
    setQuestions([{ text: "", type: "mcq", options: ["", ""] }]);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, surveyTitle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({
      title: "Delete survey?",
      description: `"${surveyTitle}" and all its responses will be permanently removed.`,
      confirmLabel: "Delete",
      cancelLabel: "Keep",
    });
    if (!ok) return;
    try {
      await surveyApi.delete(id);
      setSurveys((s) => s.filter((x) => x._id !== id));
      toast.success("Survey deleted.");
    } catch {
      /* interceptor */
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await surveyApi.create({ title, description, questions });
      setSurveys([res.data.data!, ...surveys]);
      setShowCreate(false);
      resetCreate();
    } catch {
      /* interceptor */
    } finally {
      setCreating(false);
    }
  };

  // Derived
  const stats = useMemo(() => {
    const total = surveys.length;
    const active = surveys.filter((s) => s.isActive).length;
    const responded = surveys.filter((s) => s.responded).length;
    const pending = surveys.filter((s) => s.isActive && !s.responded).length;
    return { total, active, responded, pending };
  }, [surveys]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return surveys.filter((s) => {
      if (filter === "active" && !s.isActive) return false;
      if (filter === "closed" && s.isActive) return false;
      if (filter === "responded" && !s.responded) return false;
      if (filter === "pending" && (!s.isActive || s.responded)) return false;
      if (q && !s.title.toLowerCase().includes(q) && !(s.description || "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [surveys, filter, search]);

  const input =
    "w-full rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "responded", label: "Responded" },
    { key: "active", label: "Active" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <div className="space-y-6">
      {/* ━━━ Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-teal-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-teal-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-cyan-500/25 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
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
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-teal-200 backdrop-blur-sm ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" /> Engagement · Surveys
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-teal-300" />
              Surveys
            </h1>
            <p className="mt-2 max-w-xl text-sm text-teal-100/80 sm:text-base">
              Your voice shapes the company. Share feedback, vote on initiatives, and help us build
              a better workplace together.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 px-5 py-3 text-sm font-bold text-gray-900 shadow-lg shadow-teal-500/30 transition-all hover:shadow-xl hover:shadow-teal-500/40 active:scale-[0.98]"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <Plus className="h-4 w-4" /> Create Survey
            </button>
          )}
        </div>
      </div>

      {/* ━━━ Stats ━━━ */}
      {surveys.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={ClipboardList} label="Total surveys" value={stats.total} sublabel="All time" tint="indigo" />
          <StatCard icon={Activity} label="Active" value={stats.active} sublabel="Currently open" tint="emerald" />
          <StatCard icon={FileCheck2} label="Responded" value={stats.responded} sublabel="By you" tint="amber" />
          <StatCard icon={ListChecks} label="Pending" value={stats.pending} sublabel="Awaiting response" tint="rose" />
        </div>
      )}

      {/* ━━━ Filters + Search ━━━ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 p-1 backdrop-blur-sm overflow-x-auto">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                filter === t.key
                  ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/30"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search surveys…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${input} pl-10`}
          />
        </div>
      </div>

      {/* ━━━ Create Form ━━━ */}
      {showCreate && isAdmin && (
        <form
          onSubmit={handleCreate}
          className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-white to-teal-50/50 dark:from-gray-900 dark:to-teal-950/30 shadow-xl"
        >
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="relative p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Survey</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Craft a survey and publish it to the team</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  resetCreate();
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q2 Engagement Pulse"
                  required
                  className={input}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this survey about? Help respondents understand the intent."
                  rows={2}
                  className={`${input} min-h-[72px] resize-y`}
                />
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Questions ({questions.length})
                </p>
              </div>
              {questions.map((q, qi) => (
                <div
                  key={qi}
                  className="rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white/80 dark:bg-gray-900/60 p-4 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-xs font-bold text-white">
                      {qi + 1}
                    </span>
                    <input
                      value={q.text}
                      onChange={(e) => updateQuestion(qi, "text", e.target.value)}
                      placeholder="Question text"
                      required
                      className={input}
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qi)}
                        className="mt-1 rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Remove question"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pl-9">
                    {(["mcq", "rating", "text"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateQuestion(qi, "type", t)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          q.type === t
                            ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/30"
                            : "bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/60"
                        }`}
                      >
                        {t === "mcq" ? "Multiple Choice" : t === "rating" ? "Rating 1–5" : "Free Text"}
                      </button>
                    ))}
                  </div>
                  {q.type === "mcq" && q.options && (
                    <div className="space-y-2 pl-9">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 text-[10px] font-bold text-gray-500">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <input
                            value={opt}
                            onChange={(e) => updateOption(qi, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`}
                            required
                            className={input}
                          />
                          {q.options!.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(qi, oi)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(qi)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                      >
                        <Plus className="h-3 w-3" /> Add option
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-teal-500/40 bg-teal-50/50 dark:bg-teal-500/5 px-4 py-2 text-sm font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add question
              </button>
            </div>

            <div className="flex items-center gap-3 border-t border-gray-200/70 dark:border-gray-800/60 pt-4">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 disabled:opacity-50 transition-all"
              >
                {creating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {creating ? "Publishing…" : "Publish Survey"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  resetCreate();
                }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ━━━ Survey Grid ━━━ */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-teal-500/20 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
              <ClipboardList className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {surveys.length === 0 ? "No surveys yet" : "No surveys match your filters"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {surveys.length === 0
              ? "When surveys are published, they'll appear here."
              : "Try adjusting the filter or search term."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((survey) => (
            <Link
              key={survey._id}
              to={`/surveys/${survey._id}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-200/60 dark:hover:shadow-black/40 hover:border-teal-400/50 dark:hover:border-teal-500/40"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/0 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"
              />

              <div className="relative flex-1">
                {/* Status pills */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                      survey.isActive
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20"
                        : "bg-gray-100 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 ring-gray-500/20"
                    }`}
                  >
                    {survey.isActive ? (
                      <>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" /> Closed
                      </>
                    )}
                  </span>
                  {survey.responded && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Responded
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold leading-snug tracking-tight text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                  {survey.title}
                </h3>

                {/* Description */}
                {survey.description && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-3">
                    {survey.description}
                  </p>
                )}

                {/* Question count */}
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                  <ListChecks className="h-3.5 w-3.5" />
                  {survey.questions.length} question{survey.questions.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Footer */}
              <div className="relative mt-4 flex items-center justify-between border-t border-gray-200/70 dark:border-gray-800/60 pt-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
                    {survey.createdBy.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <span className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                    by {survey.createdBy.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <>
                      <Link
                        to={`/admin/surveys/${survey._id}/results`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                        title="View results"
                      >
                        <BarChart3 className="h-3 w-3" /> Results
                      </Link>
                      <button
                        onClick={(e) => handleDelete(e, survey._id, survey.title)}
                        title="Delete survey"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}
