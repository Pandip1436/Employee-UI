import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, Star, Users, Lightbulb, Target, Zap, HandHeart, CheckCircle, ArrowLeft,
} from "lucide-react";
import { recognitionApi } from "../../api/recognitionApi";
import { userApi } from "../../api/userApi";
import type { User } from "../../types";

const BADGES = [
  { key: "star-performer", label: "Star Performer", icon: Star, gradient: "from-amber-500 to-yellow-400", ring: "ring-amber-400", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/40" },
  { key: "team-player", label: "Team Player", icon: Users, gradient: "from-blue-500 to-cyan-400", ring: "ring-blue-400", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/40" },
  { key: "innovator", label: "Innovator", icon: Lightbulb, gradient: "from-purple-500 to-violet-400", ring: "ring-purple-400", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/40" },
  { key: "mentor", label: "Mentor", icon: Target, gradient: "from-emerald-500 to-green-400", ring: "ring-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/40" },
  { key: "go-getter", label: "Go-Getter", icon: Zap, gradient: "from-orange-500 to-amber-400", ring: "ring-orange-400", bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/40" },
  { key: "helping-hand", label: "Helping Hand", icon: HandHeart, gradient: "from-pink-500 to-rose-400", ring: "ring-pink-400", bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/40" },
];

export default function SendRecognition() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<User[]>([]);
  const [toUser, setToUser] = useState("");
  const [message, setMessage] = useState("");
  const [badge, setBadge] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    userApi
      .getAll({ limit: 500 })
      .then((r) => setEmployees(r.data.data ?? []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!toUser) return setError("Please select an employee.");
    if (!badge) return setError("Please select a badge.");
    if (!message.trim()) return setError("Please write a message.");

    setSubmitting(true);
    try {
      await recognitionApi.create({ toUser, message: message.trim(), badge });
      navigate("/recognition");
    } catch {
      setError("Failed to send recognition. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const card = "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md dark:hover:shadow-gray-800/30";
  const inputCls = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative">
          <button onClick={() => navigate("/recognition")} className="flex items-center gap-1 text-sm text-indigo-200 hover:text-white transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" /> Back to Wall
          </button>
          <h1 className="text-2xl font-bold sm:text-3xl flex items-center gap-2">
            <Send className="h-7 w-7" /> Send Recognition
          </h1>
          <p className="mt-1 text-sm text-indigo-200">Celebrate a teammate's contribution</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee select */}
        <div className={card}>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Who do you want to recognize?
          </label>
          <select value={toUser} onChange={(e) => setToUser(e.target.value)} className={inputCls}>
            <option value="">Select an employee...</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name} {emp.department ? `(${emp.department})` : ""} - {emp.email}
              </option>
            ))}
          </select>
        </div>

        {/* Badge selector */}
        <div className={card}>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Choose a badge
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BADGES.map((b) => {
              const Icon = b.icon;
              const selected = badge === b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setBadge(b.key)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    selected
                      ? `${b.border} ${b.bg} ring-2 ${b.ring} scale-105 shadow-lg`
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${b.gradient} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs font-semibold ${selected ? b.text : "text-gray-600 dark:text-gray-400"}`}>
                    {b.label}
                  </span>
                  {selected && <CheckCircle className={`h-4 w-4 ${b.text}`} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Message */}
        <div className={card}>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Your message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className={inputCls}
            placeholder="Tell them why they deserve this recognition..."
          />
          <p className="mt-1 text-xs text-gray-400">{message.length}/500 characters</p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Send className="h-4 w-4" /> Send Recognition
            </>
          )}
        </button>
      </form>
    </div>
  );
}
