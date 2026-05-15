import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ClipboardList, Star, Send, CheckCircle, ArrowLeft, EyeOff,
  Loader2, Sparkles, AlertCircle,
} from "lucide-react";
import { surveyApi, type SurveyData } from "../../api/surveyApi";

export default function SurveyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    surveyApi
      .getById(id)
      .then((r) => {
        setSurvey(r.data.data ?? null);
        if (r.data.data?.responded) setSubmitted(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const setAnswer = (qIdx: number, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !survey) return;
    setError("");

    const formatted = survey.questions.map((_, i) => ({
      questionIndex: i,
      value: answers[i] ?? null,
    }));

    const unanswered = survey.questions.filter((q, i) => q.required !== false && (answers[i] === undefined || answers[i] === null || answers[i] === ""));
    if (unanswered.length > 0) {
      setError("Please answer all required questions.");
      return;
    }

    setSubmitting(true);
    try {
      await surveyApi.submit(id, { answers: formatted, anonymous });
      setSubmitted(true);
    } catch {
      setError("Failed to submit survey. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const card = "rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 backdrop-blur-sm transition-all hover:shadow-md dark:hover:shadow-black/30";
  const inputCls = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

  // Progress
  const progress = useMemo(() => {
    if (!survey) return { answered: 0, total: 0, pct: 0 };
    const total = survey.questions.length;
    const answered = survey.questions.reduce(
      (n, _q, i) => n + (answers[i] !== undefined && answers[i] !== null && answers[i] !== "" ? 1 : 0),
      0
    );
    return { answered, total, pct: total ? Math.round((answered / total) * 100) : 0 };
  }, [survey, answers]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-40 animate-pulse rounded-3xl bg-gradient-to-br from-teal-600/40 to-cyan-600/40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-gray-200/70 bg-white p-5 dark:border-gray-800/80 dark:bg-gray-900/80">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 animate-pulse rounded-lg bg-gray-200/70 dark:bg-gray-800/70" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200/70 dark:bg-gray-800/70" />
            </div>
            <div className="ml-10 space-y-2">
              <div className="h-10 w-full animate-pulse rounded-xl bg-gray-200/50 dark:bg-gray-800/50" />
              <div className="h-10 w-5/6 animate-pulse rounded-xl bg-gray-200/50 dark:bg-gray-800/50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className={`${card} flex flex-col items-center gap-2 py-16 text-center`}>
          <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-50 p-3 ring-1 ring-gray-200/60 dark:from-gray-800 dark:to-gray-900 dark:ring-gray-700/60">
            <ClipboardList className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Survey not found</p>
          <button onClick={() => navigate("/surveys")} className="mt-2 text-xs font-semibold text-teal-600 hover:underline dark:text-teal-400">
            ← Back to Surveys
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 p-8 text-center text-white shadow-2xl ring-1 ring-white/10 sm:p-12">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-teal-400/25 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)", backgroundSize: "22px 22px" }} />
          </div>
          <div className="relative">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
              <CheckCircle className="h-9 w-9 text-emerald-200" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Thank you!</h1>
            <p className="mt-2 text-sm text-emerald-100/80">Your response has been recorded successfully.</p>
            <button
              onClick={() => navigate("/surveys")}
              className="group relative mt-6 inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-black/20 ring-1 ring-white/20 transition-all hover:shadow-xl"
            >
              <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-emerald-200/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
              <span className="relative inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Surveys
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ━━━ Premium Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-teal-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-teal-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-cyan-500/25 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        </div>
        <div className="relative">
          <button onClick={() => navigate("/surveys")} className="group inline-flex items-center gap-1 text-sm text-teal-200 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Surveys
          </button>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-teal-200 backdrop-blur-sm ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" /> Survey
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{survey.title}</h1>
          {survey.description && <p className="mt-2 max-w-xl text-sm text-teal-100/80">{survey.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-teal-200/80">
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">{survey.questions.length}</span>
              question{survey.questions.length !== 1 ? "s" : ""}
            </span>
            <span>By <span className="font-semibold text-white">{survey.createdBy.name}</span></span>
          </div>

          {/* Progress */}
          {survey.isActive && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-teal-100">
                <span className="uppercase tracking-wider opacity-70">Progress</span>
                <span className="font-mono tabular-nums">
                  {progress.answered} / {progress.total} · {progress.pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10 backdrop-blur-sm">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 shadow-[0_0_8px_rgba(45,212,191,0.6)] transition-all duration-500"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {!survey.isActive && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This survey is closed and no longer accepting responses.</span>
        </div>
      )}

      {/* Questions */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {survey.questions.map((q, idx) => {
          const isAnswered = answers[idx] !== undefined && answers[idx] !== null && answers[idx] !== "";
          return (
          <div key={idx} className={`${card} relative overflow-hidden`}>
            <div aria-hidden className={`absolute inset-y-0 left-0 w-1 transition-colors ${isAnswered ? "bg-gradient-to-b from-emerald-500 to-teal-600" : "bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"}`} />
            <div className="mb-4 flex items-start gap-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold tabular-nums shadow-md transition-all ${isAnswered ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 ring-1 ring-white/10" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/30 ring-1 ring-white/10"}`}>
                {idx + 1}
              </span>
              <p className="pt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{q.text}</p>
              {isAnswered && (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                  <CheckCircle className="h-2.5 w-2.5" /> Answered
                </span>
              )}
            </div>

            {/* MCQ */}
            {q.type === "mcq" && q.options && (
              <div className="space-y-2 pl-10">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                      answers[idx] === opt
                        ? "border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/10"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${idx}`}
                      value={opt}
                      checked={answers[idx] === opt}
                      onChange={() => setAnswer(idx, opt)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Rating */}
            {q.type === "rating" && (
              <div className="flex items-center gap-2 pl-10">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAnswer(idx, n)}
                    className="group transition-all"
                  >
                    <Star
                      className={`h-8 w-8 transition-all ${
                        (answers[idx] as number) >= n
                          ? "text-amber-400 fill-amber-400 scale-110"
                          : "text-gray-300 dark:text-gray-600 group-hover:text-amber-300 group-hover:scale-110"
                      }`}
                    />
                  </button>
                ))}
                {answers[idx] != null && (
                  <span className="ml-2 font-mono text-sm font-semibold tabular-nums text-amber-500">{String(answers[idx])}/5</span>
                )}
              </div>
            )}

            {/* Text */}
            {q.type === "text" && (
              <div className="pl-10">
                <textarea
                  value={(answers[idx] as string) ?? ""}
                  onChange={(e) => setAnswer(idx, e.target.value)}
                  rows={3}
                  className={inputCls}
                  placeholder="Type your answer..."
                />
              </div>
            )}
          </div>
          );
        })}

        {/* Anonymous toggle */}
        <div
          className={`flex items-center justify-between rounded-2xl border p-4 ring-1 transition-all ${
            anonymous
              ? "border-indigo-300/60 bg-indigo-50/60 ring-indigo-500/20 dark:border-indigo-500/30 dark:bg-indigo-500/10"
              : "border-gray-200/70 bg-white/80 ring-black/[0.02] backdrop-blur-sm dark:border-gray-800/80 dark:bg-gray-900/80 dark:ring-white/[0.03]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${anonymous ? "bg-indigo-500/20 text-indigo-600 ring-1 ring-indigo-500/30 dark:text-indigo-400" : "bg-white text-gray-400 dark:bg-gray-900"}`}>
              <EyeOff className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Submit anonymously</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {anonymous ? "Your identity will be hidden from results" : "Your name will be attached to your response"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAnonymous((v) => !v)}
            aria-pressed={anonymous}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${anonymous ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${anonymous ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        {survey.isActive && (
          <button
            type="submit"
            disabled={submitting}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/30 transition-all hover:shadow-xl hover:shadow-teal-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
            <span className="relative inline-flex items-center gap-2">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Submitting…" : "Submit Response"}
            </span>
          </button>
        )}
      </form>
    </div>
  );
}
