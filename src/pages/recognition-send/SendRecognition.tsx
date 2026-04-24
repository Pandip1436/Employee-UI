import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Star,
  Users,
  Lightbulb,
  Target,
  Zap,
  HandHeart,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  Search,
  AlertCircle,
} from "lucide-react";
import { recognitionApi } from "../../api/recognitionApi";
import { userApi } from "../../api/userApi";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../types";

const BADGES = [
  {
    key: "star-performer",
    label: "Star Performer",
    sub: "For exceptional results",
    icon: Star,
    gradient: "from-amber-500 to-orange-500",
    ringActive: "ring-amber-500/40",
    chip: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
  },
  {
    key: "team-player",
    label: "Team Player",
    sub: "Collaborates like a pro",
    icon: Users,
    gradient: "from-sky-500 to-blue-600",
    ringActive: "ring-sky-500/40",
    chip: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
  },
  {
    key: "innovator",
    label: "Innovator",
    sub: "Breaks new ground",
    icon: Lightbulb,
    gradient: "from-violet-500 to-purple-600",
    ringActive: "ring-violet-500/40",
    chip: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
  },
  {
    key: "mentor",
    label: "Mentor",
    sub: "Lifts the team up",
    icon: Target,
    gradient: "from-emerald-500 to-teal-600",
    ringActive: "ring-emerald-500/40",
    chip: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "go-getter",
    label: "Go-Getter",
    sub: "Drives things forward",
    icon: Zap,
    gradient: "from-orange-500 to-red-500",
    ringActive: "ring-orange-500/40",
    chip: "bg-orange-50 dark:bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-300",
  },
  {
    key: "helping-hand",
    label: "Helping Hand",
    sub: "Always there for others",
    icon: HandHeart,
    gradient: "from-pink-500 to-rose-600",
    ringActive: "ring-pink-500/40",
    chip: "bg-pink-50 dark:bg-pink-500/10",
    text: "text-pink-700 dark:text-pink-300",
  },
];

const MESSAGE_MAX = 500;

function initials(name?: string) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function SendRecognition() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [toUser, setToUser] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [badge, setBadge] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    userApi
      .getAll({ limit: 500 })
      .then((r) => {
        const all = r.data.data ?? [];
        setEmployees(all.filter((u) => u._id !== user?._id));
      })
      .catch(() => {});
  }, [user]);

  const selected = useMemo(
    () => employees.find((e) => e._id === toUser),
    [employees, toUser]
  );

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees.slice(0, 8);
    return employees
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          (e.department || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [employees, query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!toUser) return setError("Please select a teammate.");
    if (!badge) return setError("Please choose a badge.");
    if (!message.trim()) return setError("Please write a message.");
    if (message.length > MESSAGE_MAX)
      return setError(`Message is too long (max ${MESSAGE_MAX} characters).`);

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

  const selectedBadge = BADGES.find((b) => b.key === badge);

  const input =
    "w-full rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ━━━ Hero ━━━ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-orange-950 to-gray-900 p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-8 dark:from-black dark:via-orange-950 dark:to-black">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-pink-500/25 blur-3xl" />
          <div className="absolute right-1/3 top-6 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
        </div>
        <div className="relative">
          <button
            onClick={() => navigate("/recognition")}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-sm font-semibold text-amber-200/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Wall
          </button>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-200 backdrop-blur-sm ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" /> Culture · Give Recognition
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Celebrate someone's win
          </h1>
          <p className="mt-2 max-w-xl text-sm text-amber-100/80 sm:text-base">
            Pick a teammate, choose a badge, and share a genuine message — a minute of your time,
            a moment they'll remember.
          </p>
        </div>
      </div>

      {/* ━━━ Form + Preview ━━━ */}
      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-5">
        {/* Left column: form */}
        <div className="lg:col-span-3 space-y-5">
          {/* Step 1 — Recipient */}
          <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                1
              </span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Who are you recognizing?
              </h2>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or department…"
                className={`${input} pl-10`}
              />
            </div>

            <div className="mt-3 space-y-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200/70 dark:border-gray-800/80 bg-gray-50/60 dark:bg-gray-800/30 p-1.5">
              {filteredEmployees.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                  No teammates match your search.
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const active = toUser === emp._id;
                  return (
                    <button
                      key={emp._id}
                      type="button"
                      onClick={() => setToUser(emp._id)}
                      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                        active
                          ? "bg-white dark:bg-gray-900 ring-2 ring-amber-500/40 shadow-sm"
                          : "hover:bg-white dark:hover:bg-gray-900/60"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow">
                        {initials(emp.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {emp.name}
                        </p>
                        <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                          {emp.department ? `${emp.department} · ` : ""}
                          {emp.email}
                        </p>
                      </div>
                      {active && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-500 fill-amber-100 dark:fill-amber-500/30" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2 — Badge */}
          <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                2
              </span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Choose a badge</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {BADGES.map((b) => {
                const Icon = b.icon;
                const active = badge === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setBadge(b.key)}
                    className={`group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all ${
                      active
                        ? `border-transparent ring-4 ${b.ringActive} shadow-lg scale-[1.02]`
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    {active && (
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${b.gradient} opacity-10`}
                      />
                    )}
                    <div className="relative flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${b.gradient} text-white shadow-md`}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2.25} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                          {b.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                          {b.sub}
                        </p>
                      </div>
                      {active && (
                        <CheckCircle2 className={`h-4 w-4 shrink-0 ${b.text}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3 — Message */}
          <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                3
              </span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Your message</h2>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className={`${input} min-h-[140px] resize-y`}
              placeholder="Share specifics — what they did, the impact it had, and why it mattered."
              maxLength={MESSAGE_MAX}
            />
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-gray-500 dark:text-gray-400">
                Be specific. Shout-outs land harder with real examples.
              </span>
              <span
                className={`tabular-nums font-semibold ${
                  message.length > MESSAGE_MAX * 0.9
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {message.length}/{MESSAGE_MAX}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right column: live preview + submit */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Live preview
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 p-5">
              {selectedBadge && (
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${selectedBadge.gradient} opacity-10 blur-2xl`}
                />
              )}

              <div className="relative">
                {/* From → To row */}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md">
                    {initials(user?.name)}
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${
                      selectedBadge?.gradient || "from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800"
                    } text-sm font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow-md`}
                  >
                    {selected ? initials(selected.name) : "?"}
                  </div>
                  <div className="ml-1 min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      <span className="text-indigo-600 dark:text-indigo-400">{user?.name || "You"}</span>
                      <span className="text-gray-500 dark:text-gray-400 font-normal"> recognized </span>
                      <span className={selectedBadge?.text || "text-gray-500"}>
                        {selected?.name || "teammate"}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">just now</p>
                  </div>
                </div>

                {/* Badge pill */}
                {selectedBadge ? (
                  <div
                    className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${selectedBadge.chip} ${selectedBadge.text}`}
                  >
                    <selectedBadge.icon className="h-3.5 w-3.5" />
                    {selectedBadge.label}
                  </div>
                ) : (
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-[11px] font-semibold italic text-gray-400 dark:text-gray-500">
                    Pick a badge…
                  </div>
                )}

                {/* Message */}
                <div className="relative mt-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/40 dark:to-gray-800/20 p-4 ring-1 ring-gray-200/60 dark:ring-gray-800/60 min-h-[96px]">
                  <span className="absolute left-3 top-1 text-4xl font-serif text-gray-300 dark:text-gray-700 leading-none">
                    "
                  </span>
                  <p className="pl-5 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                    {message || (
                      <span className="italic text-gray-400 dark:text-gray-500">
                        Start typing to see your message here…
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Send Recognition
              </>
            )}
          </button>

          <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/5 p-3 ring-1 ring-amber-500/20">
            <Sparkles className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              Your shout-out will appear on the Recognition Wall for everyone to see. It can't be
              edited once sent.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
