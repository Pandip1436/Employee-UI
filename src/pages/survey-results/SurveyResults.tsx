import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ArrowLeft,
  Users,
  Star,
  MessageSquare,
  ClipboardList,
  Sparkles,
  TrendingUp,
  Activity,
  Quote,
  Download,
  Trophy,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { surveyApi, type SurveyData } from "../../api/surveyApi";

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#0ea5e9",
];

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
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
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

  const responses = survey?.responses ?? [];
  const totalResponses = responses.length;

  const questionResults = useMemo(() => {
    if (!survey) return [];
    return survey.questions.map((q, qi) => {
      const qAnswers = responses
        .map((r) => r.answers.find((a) => a.questionIndex === qi)?.value)
        .filter((v) => v !== undefined && v !== null);

      if (q.type === "mcq" && q.options) {
        const counts: Record<string, number> = {};
        q.options.forEach((o) => (counts[o] = 0));
        qAnswers.forEach((v) => {
          if (typeof v === "string" && counts[v] !== undefined) counts[v]++;
        });
        const total = qAnswers.length;
        const data = Object.entries(counts).map(([name, count]) => ({
          name,
          count,
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
        }));
        const top = data.reduce(
          (best, d) => (d.count > best.count ? d : best),
          data[0]
        );
        return { type: "mcq" as const, data, total, top };
      }

      if (q.type === "rating") {
        const nums = qAnswers.filter((v) => typeof v === "number") as number[];
        const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        const dist = [1, 2, 3, 4, 5].map((n) => ({
          rating: n,
          count: nums.filter((v) => v === n).length,
        }));
        return { type: "rating" as const, average: avg, distribution: dist, total: nums.length };
      }

      const texts = qAnswers.filter(
        (v) => typeof v === "string" && (v as string).trim()
      ) as string[];
      return { type: "text" as const, texts };
    });
  }, [survey, responses]);

  const overallEngagement = useMemo(() => {
    const answered = responses.reduce(
      (s, r) => s + r.answers.filter((a) => a.value !== undefined && a.value !== null).length,
      0
    );
    const possible = (survey?.questions.length || 0) * responses.length;
    return possible ? Math.round((answered / possible) * 100) : 0;
  }, [responses, survey]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          onClick={() => navigate("/surveys")}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Surveys
        </button>
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 shadow-lg mb-4">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            Survey not found or no results available.
          </p>
        </div>
      </div>
    );
  }

  const exportCsv = () => {
    const rows: string[] = [];
    rows.push(`# ${survey.title.replace(/"/g, '""')}`);
    rows.push(`# Total responses: ${totalResponses}`);
    rows.push("");
    rows.push(["#", "Question", "Type", "Respondent", "Answer"].join(","));
    survey.questions.forEach((q, qi) => {
      responses.forEach((r) => {
        const a = r.answers.find((x) => x.questionIndex === qi);
        const val = a?.value;
        const who = r.anonymous ? "Anonymous" : r.userId || "-";
        rows.push(
          [
            qi + 1,
            `"${q.text.replace(/"/g, '""')}"`,
            q.type,
            who,
            `"${String(val ?? "").replace(/"/g, '""')}"`,
          ].join(",")
        );
      });
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${survey.title.replace(/\s+/g, "-").toLowerCase()}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ━━━ Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-indigo-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
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
          <div className="min-w-0 flex-1">
            <button
              onClick={() => navigate("/surveys")}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-sm font-semibold text-indigo-200/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Surveys
            </button>
            <div className="mt-3 flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-200 backdrop-blur-sm ring-1 ring-white/15">
                <Sparkles className="h-3.5 w-3.5" /> Survey Analytics
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm ring-1 ${
                  survey.isActive
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                    : "bg-gray-500/15 text-gray-300 ring-gray-400/30"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    survey.isActive ? "bg-emerald-400 animate-pulse" : "bg-gray-400"
                  }`}
                />
                {survey.isActive ? "Active" : "Closed"}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {survey.title}
            </h1>
            {survey.description && (
              <p className="mt-2 max-w-2xl text-sm text-indigo-100/80 sm:text-base">
                {survey.description}
              </p>
            )}
          </div>
          <button
            onClick={exportCsv}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.98]"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* ━━━ Stats ━━━ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total responses"
          value={totalResponses}
          sublabel={totalResponses === 1 ? "person responded" : "people responded"}
          tint="indigo"
        />
        <StatCard
          icon={ClipboardList}
          label="Questions"
          value={survey.questions.length}
          sublabel="In this survey"
          tint="rose"
        />
        <StatCard
          icon={Activity}
          label="Completion"
          value={`${overallEngagement}%`}
          sublabel="Avg answer rate"
          tint="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="Latest"
          value={
            responses.length
              ? new Date(
                  responses.reduce(
                    (latest, r) =>
                      new Date(r.submittedAt) > new Date(latest) ? r.submittedAt : latest,
                    responses[0].submittedAt
                  )
                ).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : "—"
          }
          sublabel="Most recent response"
          tint="amber"
        />
      </div>

      {/* ━━━ Empty state ━━━ */}
      {totalResponses === 0 && (
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">No responses yet</p>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            As people complete the survey, their answers will appear here.
          </p>
        </div>
      )}

      {/* ━━━ Per-question results ━━━ */}
      {totalResponses > 0 &&
        survey.questions.map((q, qi) => {
          const result = questionResults[qi];
          return (
            <div
              key={qi}
              className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 sm:p-6 backdrop-blur-sm shadow-sm"
            >
              {/* Question header */}
              <div className="mb-5 flex items-start gap-3">
                <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-md shadow-indigo-500/30">
                  {qi + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-snug tracking-tight text-gray-900 dark:text-white">
                    {q.text}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      {q.type === "mcq" ? "Multiple Choice" : q.type === "rating" ? "Rating" : "Open Text"}
                    </span>
                    {result.type !== "text" && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {result.type === "mcq"
                          ? `${result.total} vote${result.total !== 1 ? "s" : ""}`
                          : `${result.total} rating${result.total !== 1 ? "s" : ""}`}
                      </span>
                    )}
                    {result.type === "text" && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {result.texts.length} response{result.texts.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* MCQ */}
              {result.type === "mcq" && (
                <div className="space-y-4">
                  {result.top && result.top.count > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 px-3 py-2 ring-1 ring-amber-500/20">
                      <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Top pick:{" "}
                        <span className="font-bold text-amber-700 dark:text-amber-300">
                          {result.top.name}
                        </span>{" "}
                        <span className="text-gray-500 dark:text-gray-400 font-normal">
                          ({result.top.pct}%)
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Custom bars */}
                  <div className="space-y-2">
                    {result.data.map((d, i) => {
                      const color = CHART_COLORS[i % CHART_COLORS.length];
                      return (
                        <div key={d.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {d.name}
                            </span>
                            <span className="tabular-nums text-gray-500 dark:text-gray-400">
                              {d.count} · {d.pct}%
                            </span>
                          </div>
                          <div className="relative h-6 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800/60">
                            <div
                              className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700 ease-out"
                              style={{ width: `${d.pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Optional inline recharts for >4 options */}
                  {result.data.length > 4 && (
                    <div className="h-56 min-w-0 mt-3 rounded-xl bg-gray-50/60 dark:bg-gray-800/30 p-3 ring-1 ring-gray-200/60 dark:ring-gray-800/60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={result.data} layout="vertical" margin={{ left: 20, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
                          <XAxis type="number" allowDecimals={false} tick={{ fill: "currentColor", fontSize: 11 }} className="text-gray-500" />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fill: "currentColor", fontSize: 11 }} className="text-gray-500" />
                          <Tooltip
                            cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
                            contentStyle={{
                              backgroundColor: "rgba(17, 24, 39, 0.95)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "0.75rem",
                              color: "#f3f4f6",
                              fontSize: "12px",
                            }}
                          />
                          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                            {result.data.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Rating */}
              {result.type === "rating" && (
                <div className="grid gap-6 md:grid-cols-5">
                  {/* Big average */}
                  <div className="md:col-span-2 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/5 dark:to-orange-500/5 p-5 ring-1 ring-amber-500/20">
                    <p className="text-5xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
                      {result.average.toFixed(1)}
                    </p>
                    <div className="mt-2 flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-5 w-5 drop-shadow ${
                            n <= Math.round(result.average)
                              ? "text-amber-500 fill-amber-400"
                              : "text-gray-300 dark:text-gray-700"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Avg from {result.total} rating{result.total !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Distribution */}
                  <div className="md:col-span-3 space-y-1.5 self-center">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const count = result.distribution.find((d) => d.rating === n)?.count ?? 0;
                      const pct = result.total > 0 ? (count / result.total) * 100 : 0;
                      return (
                        <div key={n} className="flex items-center gap-3 text-xs">
                          <span className="flex w-8 items-center gap-0.5 font-semibold text-gray-600 dark:text-gray-400">
                            {n}
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          </span>
                          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800/60">
                            <div
                              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700 ease-out"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-14 text-right tabular-nums font-medium text-gray-500 dark:text-gray-400">
                            {count} · {Math.round(pct)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Text */}
              {result.type === "text" && (
                <div className="space-y-2.5">
                  {result.texts.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 py-8 text-center">
                      <MessageSquare className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-700" />
                      <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        No written responses yet
                      </p>
                    </div>
                  ) : (
                    result.texts.map((t, i) => (
                      <div
                        key={i}
                        className="relative rounded-xl bg-gradient-to-br from-gray-50/80 to-gray-100/40 dark:from-gray-800/40 dark:to-gray-800/20 p-4 ring-1 ring-gray-200/60 dark:ring-gray-800/60"
                      >
                        <Quote className="absolute left-3 top-3 h-4 w-4 text-indigo-400/40 dark:text-indigo-500/30" />
                        <p className="pl-6 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                          {t}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
