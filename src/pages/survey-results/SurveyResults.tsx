import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BarChart3, ArrowLeft, Users, Star, MessageSquare, ClipboardList,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { surveyApi, type SurveyData } from "../../api/surveyApi";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#6d28d9"];

export default function SurveyResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    surveyApi
      .getResults(id)
      .then((r) => setSurvey(r.data.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className={`${card} text-center py-16 max-w-3xl mx-auto`}>
        <ClipboardList className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Survey not found or no results available.</p>
      </div>
    );
  }

  const responses = survey.responses ?? [];
  const totalResponses = responses.length;

  /* Build per-question aggregates */
  const questionResults = survey.questions.map((q, qi) => {
    const qAnswers = responses.map((r) => {
      const a = r.answers.find((a) => a.questionIndex === qi);
      return a?.value;
    }).filter((v) => v !== undefined && v !== null);

    if (q.type === "mcq" && q.options) {
      const counts: Record<string, number> = {};
      q.options.forEach((o) => (counts[o] = 0));
      qAnswers.forEach((v) => { if (typeof v === "string" && counts[v] !== undefined) counts[v]++; });
      return { type: "mcq" as const, data: Object.entries(counts).map(([name, count]) => ({ name, count })) };
    }

    if (q.type === "rating") {
      const nums = qAnswers.filter((v) => typeof v === "number") as number[];
      const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
      const dist = [1, 2, 3, 4, 5].map((n) => ({ rating: `${n}`, count: nums.filter((v) => v === n).length }));
      return { type: "rating" as const, average: avg, distribution: dist, total: nums.length };
    }

    // text
    const texts = qAnswers.filter((v) => typeof v === "string" && (v as string).trim()) as string[];
    return { type: "text" as const, texts };
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative">
          <button onClick={() => navigate("/surveys")} className="flex items-center gap-1 text-sm text-indigo-200 hover:text-white transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" /> Back to Surveys
          </button>
          <h1 className="text-2xl font-bold sm:text-3xl flex items-center gap-2">
            <BarChart3 className="h-7 w-7" /> {survey.title} &mdash; Results
          </h1>
          {survey.description && <p className="mt-2 text-sm text-indigo-200">{survey.description}</p>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className={card}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalResponses}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Responses</p>
            </div>
          </div>
        </div>
        <div className={card}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{survey.questions.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Questions</p>
            </div>
          </div>
        </div>
        <div className={card}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${survey.isActive ? "bg-emerald-500/10" : "bg-gray-500/10"}`}>
              <div className={`h-3 w-3 rounded-full ${survey.isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{survey.isActive ? "Active" : "Closed"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-question results */}
      {survey.questions.map((q, qi) => {
        const result = questionResults[qi];
        return (
          <div key={qi} className={card}>
            <div className="flex items-start gap-3 mb-5">
              <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-500">
                {qi + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{q.text}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{q.type === "mcq" ? "Multiple Choice" : q.type}</p>
              </div>
            </div>

            {/* MCQ bar chart */}
            {result.type === "mcq" && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.data} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "0.75rem", color: "#f3f4f6" }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={32}>
                      {result.data.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Rating display */}
            {result.type === "rating" && (
              <div className="space-y-4">
                {/* Big average */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-amber-500">{result.average.toFixed(1)}</p>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-5 w-5 ${n <= Math.round(result.average) ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{result.total} rating{result.total !== 1 ? "s" : ""}</p>
                  </div>
                  {/* Distribution bars */}
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const count = result.distribution.find((d) => d.rating === `${n}`)?.count ?? 0;
                      const pct = result.total > 0 ? (count / result.total) * 100 : 0;
                      return (
                        <div key={n} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-3 text-right">{n}</span>
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Text responses */}
            {result.type === "text" && (
              <div className="space-y-2">
                {result.texts.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No text responses.</p>
                ) : (
                  result.texts.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
                      <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">{t}</p>
                    </div>
                  ))
                )}
                {result.texts.length > 0 && (
                  <p className="text-xs text-gray-400 pt-1">{result.texts.length} response{result.texts.length !== 1 ? "s" : ""}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
