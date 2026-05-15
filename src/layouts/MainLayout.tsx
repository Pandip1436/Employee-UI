import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const ambientRef = useRef<HTMLDivElement>(null);

  // ── Cursor-following ambient spotlight ──
  // Updates CSS vars on the ambient layer so a radial gradient can chase the
  // pointer without forcing React re-renders. Throttled via requestAnimationFrame
  // and gracefully no-ops on touch devices (the spotlight just sits at center).
  useEffect(() => {
    const el = ambientRef.current;
    if (!el) return;
    let raf = 0;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 3;
    el.style.setProperty("--cursor-x", `${mx}px`);
    el.style.setProperty("--cursor-y", `${my}px`);

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          el.style.setProperty("--cursor-x", `${mx}px`);
          el.style.setProperty("--cursor-y", `${my}px`);
          raf = 0;
        });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden bg-gray-50 transition-colors dark:bg-gray-950">
      {/* ── Ambient background — aurora · grid mesh · grain · spotlight · twinkles ── */}
      <div
        ref={ambientRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Base radial wash (top + bottom-right) */}
        <div
          className="absolute inset-0 opacity-60 dark:opacity-100"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(99,102,241,0.10) 0%, transparent 60%), radial-gradient(ellipse 80% 50% at 100% 100%, rgba(168,85,247,0.08) 0%, transparent 60%)",
          }}
        />

        {/* Conic accent — adds subtle iridescence in dark mode */}
        <div
          className="absolute inset-0 opacity-0 dark:opacity-40"
          style={{
            background:
              "conic-gradient(from 220deg at 50% 40%, transparent 0deg, rgba(99,102,241,0.06) 60deg, transparent 120deg, rgba(168,85,247,0.05) 200deg, transparent 280deg, rgba(56,189,248,0.05) 340deg, transparent 360deg)",
          }}
        />

        {/* Subtle grid mesh — breathing opacity, fades out toward edges */}
        <div
          className="absolute inset-0 animate-grid-breathe"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            color: "rgb(99 102 241)",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />

        {/* Drifting aurora blobs (5 of them, 5 different colors) */}
        <div className="absolute -top-32 -left-20 h-80 w-80 animate-blob-1 rounded-full bg-indigo-300/30 blur-3xl dark:bg-indigo-500/20" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 animate-blob-2 rounded-full bg-purple-300/25 blur-3xl dark:bg-purple-500/15" />
        <div className="absolute -bottom-32 left-1/3 h-80 w-80 animate-blob-3 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/15" />
        <div className="absolute top-2/3 left-10 h-64 w-64 animate-blob-4 rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-500/12" />
        <div className="absolute top-1/4 left-1/2 h-72 w-72 animate-blob-5 rounded-full bg-emerald-300/15 blur-3xl dark:bg-emerald-500/10" />

        {/* Twinkling particles — small dots scattered for a "living canvas" feel */}
        <div className="absolute left-[12%] top-[18%] h-1 w-1 animate-twinkle-1 rounded-full bg-indigo-400/70 shadow-[0_0_6px_rgba(99,102,241,0.7)] dark:bg-indigo-300/80" />
        <div className="absolute left-[24%] top-[64%] h-1.5 w-1.5 animate-twinkle-2 rounded-full bg-fuchsia-400/60 shadow-[0_0_6px_rgba(217,70,239,0.7)] dark:bg-fuchsia-300/80" />
        <div className="absolute left-[42%] top-[32%] h-1 w-1 animate-twinkle-3 rounded-full bg-sky-400/70 shadow-[0_0_6px_rgba(56,189,248,0.7)] dark:bg-sky-300/80" />
        <div className="absolute left-[58%] top-[72%] h-1 w-1 animate-twinkle-4 rounded-full bg-purple-400/70 shadow-[0_0_6px_rgba(168,85,247,0.7)] dark:bg-purple-300/80" />
        <div className="absolute left-[74%] top-[22%] h-1.5 w-1.5 animate-twinkle-5 rounded-full bg-emerald-400/60 shadow-[0_0_6px_rgba(52,211,153,0.7)] dark:bg-emerald-300/80" />
        <div className="absolute left-[86%] top-[55%] h-1 w-1 animate-twinkle-2 rounded-full bg-cyan-400/70 shadow-[0_0_6px_rgba(34,211,238,0.7)] dark:bg-cyan-300/80" />
        <div className="absolute left-[68%] top-[14%] h-1 w-1 animate-twinkle-3 rounded-full bg-indigo-400/60 shadow-[0_0_6px_rgba(99,102,241,0.6)] dark:bg-indigo-300/70" />
        <div className="absolute left-[16%] top-[86%] h-1 w-1 animate-twinkle-1 rounded-full bg-pink-400/60 shadow-[0_0_6px_rgba(236,72,153,0.6)] dark:bg-pink-300/70" />
        <div className="absolute left-[36%] top-[8%] h-1 w-1 animate-twinkle-5 rounded-full bg-violet-400/60 shadow-[0_0_6px_rgba(167,139,250,0.6)] dark:bg-violet-300/70" />
        <div className="absolute left-[92%] top-[80%] h-1 w-1 animate-twinkle-4 rounded-full bg-teal-400/60 shadow-[0_0_6px_rgba(45,212,191,0.6)] dark:bg-teal-300/70" />

        {/* Cursor-following spotlight — outer warm glow */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(700px circle at var(--cursor-x, 50%) var(--cursor-y, 30%), rgba(99,102,241,0.10), transparent 45%)",
          }}
        />
        {/* Cursor-following spotlight — inner concentrated halo */}
        <div
          className="absolute inset-0 mix-blend-overlay opacity-70 dark:opacity-100"
          style={{
            background:
              "radial-gradient(380px circle at var(--cursor-x, 50%) var(--cursor-y, 30%), rgba(168,85,247,0.12), transparent 50%)",
          }}
        />
        {/* Cursor-following spotlight — pin-point bright center for added pop */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(120px circle at var(--cursor-x, 50%) var(--cursor-y, 30%), rgba(255,255,255,0.04), transparent 70%)",
          }}
        />

        {/* Slow diagonal sheen sweep */}
        <div className="absolute inset-y-0 -left-1/3 w-1/2 animate-sheen bg-gradient-to-r from-transparent via-white/[0.04] to-transparent dark:via-white/[0.025]" />

        {/* SVG grain — fine noise prevents banding and adds tactile depth */}
        <div className="bg-noise absolute inset-0 opacity-[0.018] mix-blend-overlay dark:opacity-[0.035]" />

        {/* Side-edge glow strips — soft vertical highlights breathe on left + right */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 animate-glow-pulse bg-gradient-to-r from-indigo-400/10 via-indigo-400/[0.03] to-transparent dark:from-indigo-500/15 dark:via-indigo-500/[0.04]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 animate-glow-pulse bg-gradient-to-l from-purple-400/10 via-purple-400/[0.03] to-transparent dark:from-purple-500/15 dark:via-purple-500/[0.04]" style={{ animationDelay: "3.5s" }} />

        {/* Corner vignettes for subtle depth */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, rgba(0,0,0,0.04) 0%, transparent 30%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.04) 0%, transparent 30%), radial-gradient(circle at 100% 0%, rgba(0,0,0,0.03) 0%, transparent 25%), radial-gradient(circle at 0% 100%, rgba(0,0,0,0.03) 0%, transparent 25%)",
          }}
        />

        {/* Top edge highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent dark:via-indigo-500/40" />
        {/* Bottom edge highlight — mirrors top for symmetric framing */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-300/40 to-transparent dark:via-purple-500/40" />
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="premium-scroll relative flex-1 overflow-y-auto scroll-smooth">
          {/* Gradient fade at top edge for seamless scroll into content */}
          <div
            aria-hidden
            className="pointer-events-none sticky top-0 z-10 -mb-6 h-6 bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-950"
          />

          {/* Route-keyed enter animation — gentle fade + slide on navigation */}
          <div
            key={location.pathname}
            className="mx-auto w-full max-w-[1600px] animate-page-enter px-4 py-6 lg:px-8 lg:py-8"
          >
            <Outlet />
          </div>

          {/* Gradient fade at bottom edge — mirrors the top one */}
          <div
            aria-hidden
            className="pointer-events-none sticky bottom-0 z-10 -mt-6 h-6 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-950"
          />
        </main>
      </div>
    </div>
  );
}
