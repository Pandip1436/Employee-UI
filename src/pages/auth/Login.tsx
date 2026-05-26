import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Loader2, ArrowRight, ShieldCheck,
  Lock, User, Clock, CalendarDays, FileBarChart, FolderKanban,
  AlertCircle,
} from "lucide-react";

interface HeroSlide {
  src: string;
  title: string;
  tagline: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    src: "/login-hero-1.png",
    title: "Your workday, in focus",
    tagline: "Clock in, log hours, and stay aligned with your team from a single workspace.",
  },
  {
    src: "/login-hero-2.png",
    title: "Built for hybrid teams",
    tagline: "Attendance, leaves, and timesheets — synchronized across every location and timezone.",
  },
  {
    src: "/login-hero-3.png",
    title: "Insights at a glance",
    tagline: "Real-time dashboards keep managers informed and employees in flow.",
  },
];
const HERO_INTERVAL_MS = 5000;

const FEATURE_PILLS = [
  { icon: Clock,        label: "Time tracking" },
  { icon: CalendarDays, label: "Leaves & holidays" },
  { icon: FileBarChart, label: "Live reports" },
  { icon: FolderKanban, label: "Projects" },
];

function getGreeting(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  if (h >= 18 && h < 22) return "Good evening";
  return "Working late";
}

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
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (heroPaused) return;
    const id = setInterval(
      () => setHeroIndex((i) => (i + 1) % HERO_SLIDES.length),
      HERO_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, [heroPaused]);

  // Live clock for the hero footer + form greeting — ticks once a minute.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Replay any "session ended" / "signed in elsewhere" message that the axios
  // interceptor stashed before redirecting here. Shown once, then cleared.
  useEffect(() => {
    const msg = sessionStorage.getItem("postLogoutMessage");
    if (msg) {
      sessionStorage.removeItem("postLogoutMessage");
      toast.error(msg);
    }
  }, []);

  const greeting = getGreeting(now);
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const dayStr  = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

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
    <div className="min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950 transition-colors">
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

          {/* Top: logo + brand + live clock */}
          <div className="lp-fadeup relative flex items-start justify-between gap-3" style={{ animationDelay: "60ms" }}>
            <div className="flex items-center gap-3">
              <div className="lp-halo relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 p-2 ring-1 ring-white/15 backdrop-blur-sm">
                <img src={logoSrc} alt={companyName} className="h-full w-full object-contain" />
                {/* Rotating gradient ring */}
                <span aria-hidden className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-400/60 via-fuchsia-400/40 to-sky-400/60 opacity-50 blur-md" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight">{companyName}</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-200/70">
                  Workspace
                </p>
              </div>
            </div>
            {/* Live clock chip */}
            <div className="hidden flex-col items-end leading-tight md:flex">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200/70">{dayStr}</p>
              <p className="font-mono text-base font-bold tabular-nums tracking-tight">{timeStr}</p>
            </div>
          </div>

          {/* Middle: image carousel + rotating tagline */}
          <div
            className="lp-fadeup relative flex w-full flex-1 flex-col items-stretch py-4"
            style={{ animationDelay: "180ms" }}
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
          >
            <div className="relative min-h-0 w-full flex-1">
              {HERO_SLIDES.map((slide, i) => (
                <img
                  key={slide.src}
                  src={slide.src}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  draggable={false}
                  aria-hidden={i !== heroIndex}
                  className={`absolute inset-0 h-full w-full select-none rounded-2xl object-cover drop-shadow-2xl transition-opacity duration-700 ease-in-out ${
                    i === heroIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
              {/* Tagline overlay — fades + slides with the carousel */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5">
                <p key={`title-${heroIndex}`} className="lp-fadeup text-xl font-bold tracking-tight text-white drop-shadow sm:text-2xl">
                  {HERO_SLIDES[heroIndex].title}
                </p>
                <p key={`tag-${heroIndex}`} className="lp-fadeup mt-1 max-w-md text-sm text-indigo-100/90" style={{ animationDelay: "120ms" }}>
                  {HERO_SLIDES[heroIndex].tagline}
                </p>
              </div>
            </div>

            {/* Dot indicators */}
            <div className="mt-5 flex shrink-0 items-center justify-center gap-2">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setHeroIndex(i)}
                  aria-label={`Show illustration ${i + 1}`}
                  aria-current={i === heroIndex}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === heroIndex
                      ? "w-8 bg-indigo-300"
                      : "w-1.5 bg-white/30 hover:bg-white/55"
                  }`}
                />
              ))}
            </div>

            {/* Feature pills */}
            <div className="lp-fadein mt-5 flex shrink-0 flex-wrap items-center justify-center gap-1.5" style={{ animationDelay: "650ms" }}>
              {FEATURE_PILLS.map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-indigo-100/90 ring-1 ring-white/15 backdrop-blur-sm"
                >
                  <f.icon className="h-3 w-3 text-indigo-300" />
                  {f.label}
                </span>
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
        <div className="relative flex items-center justify-center overflow-hidden px-4 py-6 sm:px-10 sm:py-10">
          {/* Subtle background accents on small screens (mobile-only) */}
          <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-fuchsia-400/10 blur-3xl" />
          </div>

          <div className="relative w-full max-w-md">
            {/* Mobile logo header */}
            <div className="lp-fadeup mb-6 flex items-center justify-center gap-3 sm:mb-8 lg:hidden">
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

            <div className="lp-fadeup rounded-2xl border border-gray-200/70 bg-white/80 p-6 shadow-xl shadow-gray-200/50 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-900/80 dark:shadow-black/30 sm:p-8" style={{ animationDelay: "100ms" }}>
              {/* Heading */}
              <div className="mb-6 sm:mb-7">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80 dark:text-indigo-300/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
                  {greeting}
                </p>
                <h2 className="mt-1.5 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                  Welcome back<span className="text-indigo-500 dark:text-indigo-400">.</span>
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
                    className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    <span>Password</span>
                    {capsLock && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-amber-700 ring-1 ring-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30">
                        <AlertCircle className="h-3 w-3" />
                        Caps Lock is on
                      </span>
                    )}
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
                      onKeyDown={(e) => setCapsLock(e.getModifierState && e.getModifierState("CapsLock"))}
                      onKeyUp={(e) => setCapsLock(e.getModifierState && e.getModifierState("CapsLock"))}
                      onBlur={() => setCapsLock(false)}
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
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Secure sign-in
              </span>
              <span className="hidden h-3 w-px bg-gray-200 dark:bg-gray-800 sm:inline-block" />
              <span>SOC-grade infrastructure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
