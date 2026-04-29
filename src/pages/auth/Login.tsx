import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, Sparkles,
  Lock, User, Zap, Users, BarChart3,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useCompany } from "../../context/CompanyContext";
import toast from "react-hot-toast";

export default function Login() {
  const { login } = useAuth();
  const { companyName, logo } = useCompany();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const logoSrc = logo
    ? /^(https?:|\/)/.test(logo)
      ? logo
      : `/${logo}`
    : "/logodarkmode.png";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(userId, password, stayLoggedIn);
      toast.success("Login successful");
      navigate("/dashboard");
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Premium animation keyframes (scoped via .lp- class names) */}
      <style>{`
        @keyframes lp-blob-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33%      { transform: translate3d(40px, -30px, 0) scale(1.06); }
          66%      { transform: translate3d(-30px, 30px, 0) scale(0.96); }
        }
        @keyframes lp-blob-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(-50px, -40px, 0) scale(1.1); }
        }
        @keyframes lp-blob-c {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(35px, 50px, 0) scale(1.08); }
        }
        @keyframes lp-aurora {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes lp-float-up {
          0%   { transform: translateY(20vh); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(-110vh); opacity: 0; }
        }
        @keyframes lp-fadeup {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fadein {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes lp-halo {
          0%, 100% { box-shadow: 0 0 0 0 rgba(165,180,252,0.0), 0 0 30px 0 rgba(165,180,252,0.0); }
          50%      { box-shadow: 0 0 0 6px rgba(165,180,252,0.10), 0 0 30px 4px rgba(99,102,241,0.20); }
        }
        @keyframes lp-arrow-nudge {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(3px); }
        }
        @keyframes lp-card-glow {
          0%, 100% { opacity: 0.55; transform: translate3d(0,0,0) scale(1); }
          50%      { opacity: 0.85; transform: translate3d(0,-10px,0) scale(1.04); }
        }

        .lp-blob-a { animation: lp-blob-a 18s ease-in-out infinite; }
        .lp-blob-b { animation: lp-blob-b 22s ease-in-out infinite; }
        .lp-blob-c { animation: lp-blob-c 16s ease-in-out infinite; }
        .lp-aurora {
          background-size: 200% 200%;
          animation: lp-aurora 8s ease-in-out infinite;
        }
        .lp-fadeup { animation: lp-fadeup 700ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .lp-fadein { animation: lp-fadein 900ms ease-out both; }
        .lp-halo { animation: lp-halo 4s ease-in-out infinite; }
        .lp-arrow:hover .lp-arrow-icon { animation: lp-arrow-nudge 800ms ease-in-out infinite; }
        .lp-card-glow { animation: lp-card-glow 8s ease-in-out infinite; }

        .lp-particle {
          position: absolute;
          bottom: -6px;
          width: 4px;
          height: 4px;
          border-radius: 9999px;
          background: rgba(199, 210, 254, 0.55);
          box-shadow: 0 0 8px rgba(165, 180, 252, 0.6);
          animation: lp-float-up linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-blob-a, .lp-blob-b, .lp-blob-c, .lp-aurora, .lp-halo, .lp-card-glow,
          .lp-fadeup, .lp-fadein, .lp-particle { animation: none !important; }
        }
      `}</style>
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* ━━━━━━━━━━ Left: branded hero ━━━━━━━━━━ */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-10 text-white lg:flex lg:flex-col lg:justify-between dark:from-black dark:via-indigo-950 dark:to-black">
          {/* Ambient blobs (animated) */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="lp-blob-a absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl will-change-transform" />
            <div className="lp-blob-b absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl will-change-transform" />
            <div className="lp-blob-c absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl will-change-transform" />
          </div>
          {/* Dot pattern with soft mask */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
              backgroundSize: "22px 22px",
              maskImage:
                "radial-gradient(ellipse at 30% 30%, black 35%, transparent 80%)",
            }}
          />
          {/* Floating particles */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {[
              { left: "8%",  delay: "0s",   duration: "14s", size: 3 },
              { left: "22%", delay: "3s",   duration: "18s", size: 2 },
              { left: "37%", delay: "6s",   duration: "12s", size: 4 },
              { left: "52%", delay: "1.5s", duration: "20s", size: 3 },
              { left: "68%", delay: "9s",   duration: "16s", size: 2 },
              { left: "82%", delay: "4.5s", duration: "13s", size: 3 },
              { left: "92%", delay: "7.5s", duration: "19s", size: 2 },
            ].map((p, i) => (
              <span
                key={i}
                className="lp-particle"
                style={{
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                }}
              />
            ))}
          </div>

          {/* Top: logo + brand */}
          <div className="lp-fadeup relative flex items-center gap-3" style={{ animationDelay: "60ms" }}>
            <div className="lp-halo flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
              <img src={logoSrc} alt={companyName} className="h-7 w-7 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">{companyName}</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-200/70">
                Workspace
              </p>
            </div>
          </div>

          {/* Middle: marketing */}
          <div className="relative max-w-md">
            <div className="lp-fadeup inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-200 ring-1 ring-white/15 backdrop-blur-sm" style={{ animationDelay: "150ms" }}>
              <Sparkles className="h-3 w-3" /> Employee Portal
            </div>
            <h1 className="lp-fadeup mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl" style={{ animationDelay: "240ms" }}>
              Run your team
              <br />
              <span
                className="lp-aurora bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #c7d2fe 0%, #f5d0fe 25%, #bae6fd 50%, #f5d0fe 75%, #c7d2fe 100%)",
                }}
              >
                like clockwork.
              </span>
            </h1>
            <p className="lp-fadeup mt-4 text-sm leading-relaxed text-indigo-100/70" style={{ animationDelay: "330ms" }}>
              Attendance, timesheets, leaves, performance — one workspace for the
              whole organization.
            </p>

            {/* Feature pills */}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Users, label: "Team & people ops" },
                { icon: Zap, label: "Real-time attendance" },
                { icon: BarChart3, label: "Insights & reports" },
                { icon: ShieldCheck, label: "Role-based access" },
              ].map((f, i) => (
                <div
                  key={f.label}
                  className="lp-fadeup flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10"
                  style={{ animationDelay: `${420 + i * 70}ms` }}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/40 to-purple-500/30 ring-1 ring-white/10">
                    <f.icon className="h-3.5 w-3.5 text-white" strokeWidth={2.25} />
                  </div>
                  <span className="text-xs font-semibold text-indigo-100/90">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: trust */}
          <div className="lp-fadein relative flex items-center justify-between text-[11px] text-indigo-200/60" style={{ animationDelay: "800ms" }}>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Encrypted in transit & at rest
            </span>
            <span className="tabular-nums">© {new Date().getFullYear()} {companyName}</span>
          </div>
        </div>

        {/* ━━━━━━━━━━ Right: form ━━━━━━━━━━ */}
        <div className="relative flex items-center justify-center px-5 py-10 sm:px-10">
          {/* Subtle background accents on small screens (mobile-only) */}
          <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-fuchsia-400/10 blur-3xl" />
          </div>

          <div className="relative w-full max-w-md">
            {/* Mobile logo header */}
            <div className="lp-fadeup mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="lp-halo flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                <img src={logoSrc} alt={companyName} className="h-6 w-6 object-contain" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {companyName}
              </h2>
            </div>

            {/* Animated glow behind the card */}
            <div
              aria-hidden
              className="lp-card-glow pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/10 to-sky-500/20 blur-3xl"
            />

            <div className="lp-fadeup rounded-2xl border border-gray-200/70 bg-white/80 p-8 shadow-xl shadow-gray-200/50 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80 dark:shadow-black/30" style={{ animationDelay: "100ms" }}>
              {/* Heading */}
              <div className="mb-7">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Welcome back
                </h2>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Sign in with your user ID and password to continue.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* User ID */}
                <div className="lp-fadeup" style={{ animationDelay: "260ms" }}>
                  <label
                    htmlFor="userId"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    User ID
                  </label>
                  <div className="group relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500" />
                    <input
                      id="userId"
                      type="text"
                      required
                      autoFocus
                      autoComplete="username"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="e.g. UNT-0042"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="lp-fadeup" style={{ animationDelay: "340ms" }}>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Password
                  </label>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-11 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Stay logged in */}
                <label className="lp-fadeup flex cursor-pointer select-none items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200/70 transition-colors hover:bg-gray-100 dark:bg-gray-800/60 dark:ring-gray-700/70 dark:hover:bg-gray-800" style={{ animationDelay: "420ms" }}>
                  <input
                    type="checkbox"
                    checked={stayLoggedIn}
                    onChange={(e) => setStayLoggedIn(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-600 dark:bg-gray-900"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stay logged in
                  </span>
                  <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">
                    on this device
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="lp-fadeup lp-arrow group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ animationDelay: "500ms" }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="lp-arrow-icon h-4 w-4 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-7 flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                <span>Accounts are created by your administrator</span>
                <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              </div>
            </div>

            {/* Trust strip */}
            <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Secure sign-in
              </span>
              <span className="h-3 w-px bg-gray-200 dark:bg-gray-800" />
              <span>SOC-grade infrastructure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
