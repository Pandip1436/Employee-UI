import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ClipboardList, Star, Send, CheckCircle, ArrowLeft, EyeOff,
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

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";
  const inputCls = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className={`${card} text-center py-16 max-w-2xl mx-auto`}>
        <ClipboardList className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Survey not found.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 p-8 sm:p-12 text-white shadow-xl text-center">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative">
            <CheckCircle className="mx-auto h-16 w-16 mb-4" />
            <h1 className="text-2xl font-bold sm:text-3xl">Thank you!</h1>
            <p className="mt-2 text-emerald-200">Your response has been recorded successfully.</p>
            <button
              onClick={() => navigate("/surveys")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-lg hover:scale-105 transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Surveys
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative">
          <button onClick={() => navigate("/surveys")} className="flex items-center gap-1 text-sm text-teal-200 hover:text-white transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" /> Back to Surveys
          </button>
          <h1 className="text-2xl font-bold sm:text-3xl">{survey.title}</h1>
          {survey.description && <p className="mt-2 text-sm text-teal-200">{survey.description}</p>}
          <p className="mt-2 text-xs text-teal-300">
            {survey.questions.length} question{survey.questions.length !== 1 ? "s" : ""} &middot; By {survey.createdBy.name}
          </p>
        </div>
      </div>

      {!survey.isActive && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          This survey is closed and no longer accepting responses.
        </div>
      )}

      {/* Questions */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {survey.questions.map((q, idx) => (
          <div key={idx} className={card}>
            <div className="flex items-start gap-3 mb-4">
              <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-500">
                {idx + 1}
              </span>
              <p className="text-sm font-semibold text-gray-900 dark:text-white pt-0.5">{q.text}</p>
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
                  <span className="ml-2 text-sm font-semibold text-amber-500">{String(answers[idx])}/5</span>
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
        ))}

        {/* Anonymous toggle */}
        <div className={card}>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative h-6 w-11 rounded-full transition-colors ${anonymous ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`}>
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="sr-only" />
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${anonymous ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Submit anonymously</span>
            </div>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        {survey.isActive && (
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send className="h-4 w-4" /> Submit Response
              </>
            )}
          </button>
        )}
      </form>
    </div>
  );
}
