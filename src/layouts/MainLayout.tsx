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
      {/* ── Ambient background — animated aurora + grid mesh + cursor spotlight ── */}
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

        {/* Subtle grid mesh — fades out toward edges via radial mask */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
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

        {/* Cursor-following spotlight — the "Apple-style" warm glow */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(600px circle at var(--cursor-x, 50%) var(--cursor-y, 30%), rgba(99,102,241,0.08), transparent 45%)",
          }}
        />
        <div
          className="absolute inset-0 mix-blend-overlay opacity-70 dark:opacity-100"
          style={{
            background:
              "radial-gradient(320px circle at var(--cursor-x, 50%) var(--cursor-y, 30%), rgba(168,85,247,0.10), transparent 50%)",
          }}
        />

        {/* Slow diagonal sheen sweep */}
        <div className="absolute inset-y-0 -left-1/3 w-1/2 animate-sheen bg-gradient-to-r from-transparent via-white/[0.04] to-transparent dark:via-white/[0.025]" />

        {/* Corner vignettes for subtle depth */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, rgba(0,0,0,0.04) 0%, transparent 30%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.04) 0%, transparent 30%)",
          }}
        />

        {/* Top edge highlight + bottom edge shadow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent dark:via-indigo-500/40" />
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
