import { useState, useEffect } from "react";
import { MessageSquare, Send, Star, Eye, EyeOff } from "lucide-react";
import { performanceApi, type FeedbackData } from "../../api/performanceApi";
import { userApi } from "../../api/userApi";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../types";
import toast from "react-hot-toast";

const TYPE_CFG: Record<string, { dot: string; bg: string; text: string }> = {
  peer:        { dot: "bg-blue-400",    bg: "bg-blue-500/10",    text: "text-blue-400" },
  subordinate: { dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  manager:     { dot: "bg-purple-400",  bg: "bg-purple-500/10",  text: "text-purple-400" },
};

function RatingStars({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
            n <= value
              ? "text-amber-500"
              : "text-gray-300 dark:text-gray-600"
          } ${readonly ? "cursor-default" : "hover:scale-110"}`}
        >
          <Star className={`h-5 w-5 ${n <= value ? "fill-current" : ""}`} />
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"give" | "my">("give");

  // Give Feedback state
  const [users, setUsers] = useState<User[]>([]);
  const [toUser, setToUser] = useState("");
  const [type, setType] = useState("peer");
  const [rating, setRating] = useState(0);
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [comments, setComments] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // My Feedback state
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    userApi.getAll({ limit: 500 }).then((r) => {
      const all = r.data.data ?? [];
      setUsers(all.filter((u) => u._id !== user?._id));
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (activeTab === "my") {
      setLoadingFeedback(true);
      performanceApi
        .getMyFeedback()
        .then((r) => setFeedback(r.data.data ?? []))
        .catch(() => toast.error("Failed to load feedback"))
        .finally(() => setLoadingFeedback(false));
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUser) return toast.error("Select an employee");
    if (rating === 0) return toast.error("Please provide a rating");

    setSubmitting(true);
    try {
      await performanceApi.giveFeedback({
        toUser,
        type,
        rating,
        strengths: strengths.trim(),
        improvements: improvements.trim(),
        comments: comments.trim(),
        anonymous,
      });
      toast.success("Feedback submitted");
      setToUser("");
      setType("peer");
      setRating(0);
      setStrengths("");
      setImprovements("");
      setComments("");
      setAnonymous(false);
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const input = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";
  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-indigo-500" /> Feedback
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Give and receive performance feedback</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800/60 p-1">
        {(["give", "my"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t === "give" ? "Give Feedback" : "My Feedback"}
          </button>
        ))}
      </div>

      {/* Give Feedback Tab */}
      {activeTab === "give" && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className={card}>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Give Feedback</h2>
            <div className="space-y-4">
              {/* Employee Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Employee</label>
                <select className={input} value={toUser} onChange={(e) => setToUser(e.target.value)}>
                  <option value="">Select employee...</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Feedback Type</label>
                <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="peer">Peer</option>
                  <option value="subordinate">Subordinate</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rating</label>
                <RatingStars value={rating} onChange={setRating} />
              </div>

              {/* Strengths */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Strengths</label>
                <textarea className={`${input} min-h-[80px] resize-y`} rows={2} value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="What are this person's key strengths?" />
              </div>

              {/* Improvements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Areas for Improvement</label>
                <textarea className={`${input} min-h-[80px] resize-y`} rows={2} value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder="Where could they improve?" />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Additional Comments</label>
                <textarea className={`${input} min-h-[80px] resize-y`} rows={2} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Any other comments..." />
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                <div className="flex items-center gap-2">
                  {anonymous ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  <span className="text-sm text-gray-700 dark:text-gray-300">Submit anonymously</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnonymous(!anonymous)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    anonymous ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${anonymous ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Send className="h-4 w-4" /> {submitting ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      )}

      {/* My Feedback Tab */}
      {activeTab === "my" && (
        <div className="space-y-4">
          {loadingFeedback && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          )}

          {!loadingFeedback && feedback.length === 0 && (
            <div className={`${card} flex flex-col items-center justify-center py-16 text-center`}>
              <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No feedback received yet</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {feedback.map((fb) => {
              const cfg = TYPE_CFG[fb.type] || TYPE_CFG.peer;
              return (
                <div key={fb._id} className={card}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {fb.anonymous ? (
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {fb.fromUser?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2) || "?"}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {fb.anonymous ? "Anonymous" : fb.fromUser?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(fb.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {fb.type}
                    </span>
                  </div>

                  {/* Rating */}
                  {fb.rating && (
                    <div className="mb-3">
                      <RatingStars value={fb.rating} readonly />
                    </div>
                  )}

                  {/* Content */}
                  {fb.strengths && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-emerald-500 mb-0.5">Strengths</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{fb.strengths}</p>
                    </div>
                  )}
                  {fb.improvements && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-amber-500 mb-0.5">Improvements</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{fb.improvements}</p>
                    </div>
                  )}
                  {fb.comments && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-0.5">Comments</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{fb.comments}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
