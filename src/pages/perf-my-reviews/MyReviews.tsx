import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, ChevronRight, ClipboardList } from "lucide-react";
import { performanceApi, type ReviewData } from "../../api/performanceApi";
import toast from "react-hot-toast";

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  "self-submitted": "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "manager-submitted": "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

export default function MyReviews() {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    performanceApi
      .getMyReviews()
      .then((r) => setReviews(r.data.data ?? []))
      .catch(() => toast.error("Failed to load reviews"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Star className="h-6 w-6 text-indigo-500" /> My Reviews
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your performance reviews across cycles</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No reviews assigned yet</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {reviews.map((rev) => (
          <Link
            key={rev._id}
            to={`/performance/reviews/${rev._id}/self`}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/40"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {rev.cycleId?.name || "Performance Review"}
                </p>
                {rev.cycleId?.startDate && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {new Date(rev.cycleId.startDate).toLocaleDateString()} – {new Date(rev.cycleId.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyle[rev.status] || statusStyle.pending}`}>
                {rev.status.replace("-", " ")}
              </span>
              {rev.finalRating != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <Star className="h-3 w-3 fill-current" /> {rev.finalRating}
                </span>
              )}
              {rev.managerId?.name && (
                <span className="text-xs text-gray-500 dark:text-gray-400">Mgr: {rev.managerId.name}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
