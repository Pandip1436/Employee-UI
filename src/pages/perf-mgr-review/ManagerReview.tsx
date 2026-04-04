import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserCheck, Star, ArrowLeft, Send } from "lucide-react";
import { performanceApi, type ReviewData, type GoalData } from "../../api/performanceApi";
import toast from "react-hot-toast";

function RatingSlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value || 3}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 rounded-full accent-indigo-600 bg-gray-200 dark:bg-gray-700 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow-md"
        />
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                n <= (value || 0)
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ManagerReview() {
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<ReviewData | null>(null);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [managerRating, setManagerRating] = useState(0);
  const [managerComments, setManagerComments] = useState("");
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

        if (rev.managerRating) setManagerRating(rev.managerRating);
        if (rev.managerComments) setManagerComments(rev.managerComments);
        if (rev.managerGoalRatings) {
          const map: Record<string, { rating: number; comment: string }> = {};
          rev.managerGoalRatings.forEach((gr) => { map[gr.goalId] = { rating: gr.rating, comment: gr.comment }; });
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
    if (managerRating === 0) return toast.error("Please provide an overall rating");

    setSubmitting(true);
    try {
      await performanceApi.submitManagerReview(id, {
        managerRating,
        managerComments: managerComments.trim(),
        managerGoalRatings: Object.entries(goalRatings)
          .filter(([, v]) => v.rating > 0)
          .map(([goalId, v]) => ({ goalId, rating: v.rating, comment: v.comment })),
      });
      toast.success("Manager review submitted");
      navigate(-1);
    } catch {
      toast.error("Failed to submit review");
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

  const isAlreadySubmitted = !!review.managerSubmittedAt;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-indigo-500" /> Manager Review
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {review.cycleId?.name || "Performance Review"} &middot; {review.employeeId.name}
          </p>
        </div>
      </div>

      {/* Employee Self-Review (Read-only) */}
      {review.selfSubmittedAt && (
        <div className={`${card} border-l-4 border-l-blue-500`}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" /> Employee Self Review
            <span className="ml-auto text-xs text-gray-400 font-normal">
              Submitted {new Date(review.selfSubmittedAt).toLocaleDateString()}
            </span>
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Self Rating:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{review.selfRating}/5</span>
              <span className="ml-1 inline-flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-3.5 w-3.5 ${n <= (review.selfRating || 0) ? "text-amber-500 fill-amber-500" : "text-gray-300 dark:text-gray-600"}`} />
                ))}
              </span>
            </div>
            {review.selfAchievements && (
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Achievements:</p>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 whitespace-pre-wrap">{review.selfAchievements}</p>
              </div>
            )}
            {review.selfChallenges && (
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Challenges:</p>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 whitespace-pre-wrap">{review.selfChallenges}</p>
              </div>
            )}
            {review.selfGoalRatings && review.selfGoalRatings.length > 0 && (
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-2">Goal Ratings:</p>
                <div className="space-y-2">
                  {review.selfGoalRatings.map((gr, i) => {
                    const goal = goals.find((g) => g._id === gr.goalId);
                    return (
                      <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                        <span className="text-gray-700 dark:text-gray-300">{goal?.title || gr.goalId}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{gr.rating}/5</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!review.selfSubmittedAt && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Employee has not submitted their self-review yet.
        </div>
      )}

      {isAlreadySubmitted && (
        <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
          Manager review was submitted on {new Date(review.managerSubmittedAt!).toLocaleDateString()}.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Overall Manager Rating */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Overall Manager Rating</h2>
          <RatingSlider value={managerRating} onChange={setManagerRating} />
        </div>

        {/* Goal-wise Manager Ratings */}
        {goals.length > 0 && (
          <div className={card}>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Goal Ratings</h2>
            <div className="space-y-5">
              {goals.map((goal) => (
                <div key={goal._id} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{goal.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Progress: {goal.progress}% &middot; Status: {goal.status}</p>
                  </div>
                  <RatingSlider
                    value={goalRatings[goal._id]?.rating || 0}
                    onChange={(v) => updateGoalRating(goal._id, "rating", v)}
                  />
                  <input
                    className={input}
                    placeholder="Manager comment on this goal..."
                    value={goalRatings[goal._id]?.comment || ""}
                    onChange={(e) => updateGoalRating(goal._id, "comment", e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manager Comments */}
        <div className={card}>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Manager Comments</h2>
          <textarea
            className={`${input} min-h-[120px] resize-y`}
            rows={4}
            value={managerComments}
            onChange={(e) => setManagerComments(e.target.value)}
            placeholder="Provide overall feedback, areas of strength, and areas for development..."
          />
        </div>

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
            <Send className="h-4 w-4" /> {submitting ? "Submitting..." : "Submit Manager Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
