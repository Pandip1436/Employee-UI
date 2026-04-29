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
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* ━━━━━━━━━━ Left: branded hero ━━━━━━━━━━ */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-10 text-white lg:flex lg:flex-col lg:justify-between dark:from-black dark:via-indigo-950 dark:to-black">
          {/* Ambient blobs */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
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

          {/* Top: logo + brand */}
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
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
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-indigo-200 ring-1 ring-white/15 backdrop-blur-sm">
              <Sparkles className="h-3 w-3" /> Employee Portal
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Run your team
              <br />
              <span className="bg-gradient-to-r from-indigo-200 via-fuchsia-200 to-sky-200 bg-clip-text text-transparent">
                like clockwork.
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-indigo-100/70">
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
              ].map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm"
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
          <div className="relative flex items-center justify-between text-[11px] text-indigo-200/60">
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
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
                <img src={logoSrc} alt={companyName} className="h-6 w-6 object-contain" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {companyName}
              </h2>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-8 shadow-xl shadow-gray-200/50 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80 dark:shadow-black/30">
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
                <div>
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
                <div>
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
                <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-200/70 transition-colors hover:bg-gray-100 dark:bg-gray-800/60 dark:ring-gray-700/70 dark:hover:bg-gray-800">
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
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10 transition-all hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
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
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
