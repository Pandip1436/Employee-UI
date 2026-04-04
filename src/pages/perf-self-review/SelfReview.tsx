import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ClipboardCheck, Star, ArrowLeft, Send } from "lucide-react";
import { performanceApi, type ReviewData, type GoalData } from "../../api/performanceApi";
import toast from "react-hot-toast";

function RatingSelector({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`relative h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
              n <= value
                ? "bg-amber-500 text-white shadow-sm scale-105"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Star className={`h-5 w-5 ${n <= value ? "fill-current" : ""}`} />
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          {value > 0 ? `${value}/5` : "Not rated"}
        </span>
      </div>
    </div>
  );
}

export default function SelfReview() {
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<ReviewData | null>(null);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selfRating, setSelfRating] = useState(0);
  const [achievements, setAchievements] = useState("");
  const [challenges, setChallenges] = useState("");
  const [goalRatings, setGoalRatings] = useState<Record<string, { rating: number; comment: string }>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      performanceApi.getReview(id),
      performanceApi.getGoals(),
    ])
      .then(([revRes, goalsRes]) => {
        const rev = revRes.data.data!;
        setReview(rev);
        setGoals(goalsRes.data.data ?? []);

        // Pre-fill if already submitted
        if (rev.selfRating) setSelfRating(rev.selfRating);
        if (rev.selfAchievements) setAchievements(rev.selfAchievements);
        if (rev.selfChallenges) setChallenges(rev.selfChallenges);
        if (rev.selfGoalRatings) {
          const map: Record<string, { rating: number; comment: string }> = {};
          rev.selfGoalRatings.forEach((gr) => { map[gr.goalId] = { rating: gr.rating, comment: gr.comment }; });
          setGoalRatings(map);
        }
      })
      .catch(() => toast.error("Failed to load review"))
      .finally(() => setLoading(false));
  }, [id]);

  const updateGoalRating = (goalId: string, field: "rating" | "comment", value: number | string) => {
    setGoalRatings((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], rating: prev[goalId]?.rating || 0, comment: prev[goalId]?.comment || "", [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (selfRating === 0) return toast.error("Please select an overall rating");

    setSubmitting(true);
    try {
      await performanceApi.submitSelfReview(id, {
        selfRating,
        selfAchievements: achievements.trim(),
        selfChallenges: challenges.trim(),
        selfGoalRatings: Object.entries(goalRatings)
          .filter(([, v]) => v.rating > 0)
          .map(([goalId, v]) => ({ goalId, rating: v.rating, comment: v.comment })),
      });
      toast.success("Self-review submitted");
      navigate(-1);
    } catch {
      toast.error("Failed to submit self-review");
    } finally {
      setSubmitting(false);
    }
  };

  const input = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";
  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className={`${card} max-w-lg mx-auto text-center py-12`}>
        <p className="text-gray-500 dark:text-gray-400">Review not found</p>
      </div>
    );
  }

  const isAlreadySubmitted = !!review.selfSubmittedAt;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-indigo-500" /> Self Review
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {review.cycleId?.name || "Performance Review"} &middot; {review.employeeId.name}
          </p>
        </div>
      </div>

      {isAlreadySubmitted && (
        <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
          Self-review was submitted on {new Date(review.selfSubmittedAt!).toLocaleDateString()}. You can view your responses below.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Overall Rating */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Overall Self Rating</h2>
          <RatingSelector value={selfRating} onChange={setSelfRating} />
        </div>

        {/* Achievements & Challenges */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Reflections</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Key Achievements</label>
              <textarea className={`${input} min-h-[100px] resize-y`} rows={3} value={achievements} onChange={(e) => setAchievements(e.target.value)} placeholder="List your major accomplishments during this review period..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Challenges & Areas for Growth</label>
              <textarea className={`${input} min-h-[100px] resize-y`} rows={3} value={challenges} onChange={(e) => setChallenges(e.target.value)} placeholder="What challenges did you face? Where do you want to improve?" />
            </div>
          </div>
        </div>

        {/* Goal-wise Ratings */}
        {goals.length > 0 && (
          <div className={card}>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Goal Ratings</h2>
            <div className="space-y-5">
              {goals.map((goal) => (
                <div key={goal._id} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{goal.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Progress: {goal.progress}%</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{goal.status}</span>
                  </div>
                  <RatingSelector
                    value={goalRatings[goal._id]?.rating || 0}
                    onChange={(v) => updateGoalRating(goal._id, "rating", v)}
                  />
                  <input
                    className={input}
                    placeholder="Comment on this goal..."
                    value={goalRatings[goal._id]?.comment || ""}
                    onChange={(e) => updateGoalRating(goal._id, "comment", e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || isAlreadySubmitted}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Send className="h-4 w-4" /> {submitting ? "Submitting..." : "Submit Self Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
