import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Save, ArrowLeft, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { performanceApi, type ReviewData } from "../../api/performanceApi";
import toast from "react-hot-toast";

const RATING_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Below Expectations",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
  5: "Outstanding",
};

const BAR_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#6366f1"];

export default function Calibration() {
  
  const navigate = useNavigate();

  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustedRatings, setAdjustedRatings] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    performanceApi
      .getCalibrationData()
      .then((r) => {
        const data = r.data.data ?? [];
        setReviews(data);
        const map: Record<string, number> = {};
        data.forEach((rev) => { map[rev._id] = rev.finalRating || rev.managerRating || rev.selfRating || 3; });
        setAdjustedRatings(map);
      })
      .catch(() => toast.error("Failed to load calibration data"))
      .finally(() => setLoading(false));
  }, []);

  // Bell curve data
  const distribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating: `${rating} - ${RATING_LABELS[rating]}`,
    ratingNum: rating,
    count: Object.values(adjustedRatings).filter((r) => r === rating).length,
  }));

  const handleSave = async (reviewId: string) => {
    const finalRating = adjustedRatings[reviewId];
    if (!finalRating) return;
    setSaving(reviewId);
    try {
      await performanceApi.calibrate(reviewId, finalRating);
      toast.success("Rating calibrated");
    } catch {
      toast.error("Failed to calibrate");
    } finally {
      setSaving(null);
    }
  };

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-500" /> Rating Calibration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and adjust final performance ratings</p>
        </div>
      </div>

      {/* Bell Curve Chart */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" /> Rating Distribution
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="rating"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "0.75rem",
                  fontSize: "0.875rem",
                  color: "#f3f4f6",
                }}
                formatter={(value) => [`${value} employees`, "Count"]}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={60}>
                {distribution.map((_entry, idx) => (
                  <Cell key={idx} fill={BAR_COLORS[idx]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-3 mt-3 flex-wrap">
          {distribution.map((d, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BAR_COLORS[idx] }} />
              {d.ratingNum}: {d.count}
            </span>
          ))}
        </div>
      </div>

      {/* Employee List */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Employee Ratings</h2>

        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <Scale className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No reviews available for calibration</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop Header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_120px_80px] gap-3 px-3 pb-2 border-b border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Employee</span>
              <span>Self</span>
              <span>Manager</span>
              <span>Final Rating</span>
              <span />
            </div>

            {reviews.map((rev) => (
              <div key={rev._id} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 sm:grid sm:grid-cols-[1fr_100px_100px_120px_80px] sm:items-center gap-3">
                {/* Employee */}
                <div className="flex items-center gap-2 mb-2 sm:mb-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    {rev.employeeId.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{rev.employeeId.name}</p>
                    <p className="text-xs text-gray-400">{rev.employeeId.department || rev.employeeId.email}</p>
                  </div>
                </div>

                {/* Self Rating */}
                <div className="flex items-center justify-between sm:block mb-1 sm:mb-0">
                  <span className="text-xs text-gray-400 sm:hidden">Self:</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rev.selfRating || "-"}/5</span>
                </div>

                {/* Manager Rating */}
                <div className="flex items-center justify-between sm:block mb-1 sm:mb-0">
                  <span className="text-xs text-gray-400 sm:hidden">Manager:</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rev.managerRating || "-"}/5</span>
                </div>

                {/* Final Rating Selector */}
                <div className="flex items-center justify-between sm:block mb-2 sm:mb-0">
                  <span className="text-xs text-gray-400 sm:hidden">Final:</span>
                  <select
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm font-medium text-gray-900 dark:text-white"
                    value={adjustedRatings[rev._id] || 3}
                    onChange={(e) => setAdjustedRatings((prev) => ({ ...prev, [rev._id]: Number(e.target.value) }))}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} - {RATING_LABELS[n]}</option>
                    ))}
                  </select>
                </div>

                {/* Save */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSave(rev._id)}
                    disabled={saving === rev._id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-3 w-3" /> {saving === rev._id ? "..." : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
