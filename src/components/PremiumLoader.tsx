import { useEffect, useState } from "react";
import { loaderBus } from "../utils/loaderBus";

export default function PremiumLoader() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unsub = loaderBus.subscribe((count) => setActive(count));
    return unsub;
  }, []);

  useEffect(() => {
    if (active === 0) {
      if (progress > 0) {
        setProgress(100);
        const t = setTimeout(() => setProgress(0), 350);
        return () => clearTimeout(t);
      }
      return;
    }
    setProgress((p) => (p < 10 ? 15 : p));
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const step = p < 40 ? 8 : p < 70 ? 4 : 1.5;
        return Math.min(90, p + step);
      });
    }, 240);
    return () => clearInterval(interval);
  }, [active]);

  const visible = progress > 0;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-[9999] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms ease" }}
    >
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 shadow-[0_0_12px_rgba(139,92,246,0.7)]"
        style={{
          width: `${progress}%`,
          transition: "width 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="h-full w-full animate-pulse bg-white/20" />
      </div>
    </div>
  );
}

/* Full-page premium spinner for Suspense / initial loads */
export function PremiumPageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-indigo-500 border-r-fuchsia-500" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 blur-md" />
      </div>
      <p className="text-sm font-medium tracking-wide text-gray-500 dark:text-gray-400">
        {label}
        <span className="inline-block animate-pulse">…</span>
      </p>
    </div>
  );
}
