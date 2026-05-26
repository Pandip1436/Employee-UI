import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type Side = "right" | "left";
type Size = "sm" | "md" | "lg" | "xl" | "full";
type Accent = "indigo" | "emerald" | "amber" | "rose" | "violet" | "sky";

interface Props {
  open: boolean;
  onClose: () => void;
  side?: Side;
  size?: Size;
  /** Hero gradient tint. Default: indigo. */
  accent?: Accent;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  hideHeader?: boolean;
  className?: string;
}

const SIZES: Record<Size, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
  full: "sm:max-w-full",
};

const ACCENTS: Record<Accent, {
  /** Vertical seam stripe along the drawer's hinge edge. */
  seam: string;
  /** Hero gradient classes (Tailwind tokens) used when a default header is rendered. */
  heroGradient: string;
  /** Decorative blob colors inside the hero. */
  blobA: string;
  blobB: string;
  /** Label tint above the title. */
  labelTint: string;
  /** Close button tint when sitting on the hero. */
  closeTint: string;
}> = {
  indigo: {
    seam: "from-indigo-400 via-fuchsia-500 to-purple-500",
    heroGradient: "from-gray-900 via-indigo-950 to-gray-900 dark:from-black dark:via-indigo-950 dark:to-black",
    blobA: "bg-indigo-500/30",
    blobB: "bg-fuchsia-500/20",
    labelTint: "text-indigo-200/80",
    closeTint: "text-indigo-200/80",
  },
  violet: {
    seam: "from-violet-400 via-purple-500 to-fuchsia-500",
    heroGradient: "from-gray-900 via-violet-950 to-gray-900 dark:from-black dark:via-violet-950 dark:to-black",
    blobA: "bg-violet-500/30",
    blobB: "bg-fuchsia-500/20",
    labelTint: "text-violet-200/80",
    closeTint: "text-violet-200/80",
  },
  emerald: {
    seam: "from-emerald-400 via-teal-500 to-sky-500",
    heroGradient: "from-gray-900 via-emerald-950 to-gray-900 dark:from-black dark:via-emerald-950 dark:to-black",
    blobA: "bg-emerald-500/30",
    blobB: "bg-teal-500/20",
    labelTint: "text-emerald-200/85",
    closeTint: "text-emerald-200/80",
  },
  amber: {
    seam: "from-amber-400 via-orange-500 to-rose-500",
    heroGradient: "from-gray-900 via-amber-950 to-gray-900 dark:from-black dark:via-amber-950 dark:to-black",
    blobA: "bg-amber-500/30",
    blobB: "bg-orange-500/20",
    labelTint: "text-amber-200/85",
    closeTint: "text-amber-200/85",
  },
  rose: {
    seam: "from-rose-400 via-pink-500 to-fuchsia-500",
    heroGradient: "from-gray-900 via-rose-950 to-gray-900 dark:from-black dark:via-rose-950 dark:to-black",
    blobA: "bg-rose-500/30",
    blobB: "bg-pink-500/20",
    labelTint: "text-rose-200/85",
    closeTint: "text-rose-200/85",
  },
  sky: {
    seam: "from-sky-400 via-blue-500 to-indigo-500",
    heroGradient: "from-gray-900 via-sky-950 to-gray-900 dark:from-black dark:via-sky-950 dark:to-black",
    blobA: "bg-sky-500/30",
    blobB: "bg-indigo-500/20",
    labelTint: "text-sky-200/85",
    closeTint: "text-sky-200/85",
  },
};

export default function Drawer({
  open,
  onClose,
  side = "right",
  size = "xl",
  accent = "indigo",
  title,
  subtitle,
  icon,
  header,
  footer,
  children,
  closeOnBackdrop = true,
  closeOnEsc = true,
  hideHeader = false,
  className = "",
}: Props) {
  const [mounted, setMounted] = useState(open);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setShow(true));
    } else {
      setShow(false);
      const t = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeOnEsc, onClose]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted) return null;

  const a = ACCENTS[accent];
  const isRight = side === "right";
  const sidePosition = isRight
    ? `right-0 ${show ? "translate-x-0" : "translate-x-full"}`
    : `left-0 ${show ? "translate-x-0" : "-translate-x-full"}`;
  // Round the inside edge so the drawer feels like a sheet, not an overlay slab.
  const roundedEdge = isRight ? "sm:rounded-l-3xl" : "sm:rounded-r-3xl";
  // Seam side — the gradient stripe sits on the hinge (the side facing the page).
  const seamSide = isRight ? "left-0" : "right-0";

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      {/* Backdrop — stronger blur + subtle radial vignette */}
      <div
        onClick={() => closeOnBackdrop && onClose()}
        className={`absolute inset-0 bg-gray-950/55 backdrop-blur-md transition-opacity duration-[280ms] ease-out ${
          show ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Drawer panel */}
      <div
        className={`absolute inset-y-0 ${sidePosition} flex w-full ${SIZES[size]} flex-col overflow-hidden bg-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.45)] ring-1 ring-black/5 transition-transform duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-gray-900 dark:ring-white/10 ${roundedEdge} ${className}`}
      >
        {/* Hinge-side seam stripe — soft animated gradient */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 ${seamSide} w-px bg-gradient-to-b ${a.seam} opacity-70`}
        />
        {/* Subtle inner sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/40 to-transparent opacity-50 dark:from-white/[0.06]"
        />

        {!hideHeader && (header || title || icon) && (
          <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${a.heroGradient} px-5 py-5 text-white sm:px-6`}>
            {/* Decorative blobs */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className={`absolute -right-10 -top-12 h-48 w-48 rounded-full blur-3xl ${a.blobA}`} />
              <div className={`absolute -bottom-14 -left-12 h-40 w-40 rounded-full blur-3xl ${a.blobB}`} />
              <div className={`absolute right-1/3 top-1/4 h-24 w-24 rounded-full blur-2xl ${a.blobB} opacity-50`} />
            </div>
            {/* Soft dot grid */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.10]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.65) 1px, transparent 0)",
                backgroundSize: "22px 22px",
                maskImage: "radial-gradient(ellipse at top right, black 35%, transparent 78%)",
              }}
            />
            {/* Diagonal sheen */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.65) 50%, transparent 65%)",
              }}
            />
            {/* Top hairline gradient */}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${a.seam} opacity-70`}
            />
            {/* Bottom aurora hairline */}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent`}
            />
            {/* Soft inner border */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent"
            />

            <div className="relative flex items-center justify-between gap-3">
              {header ?? (
                <div className="flex min-w-0 items-center gap-3.5">
                  {icon && (
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25 backdrop-blur-sm shadow-lg shadow-black/20">
                      {/* Glow halo */}
                      <span
                        aria-hidden
                        className={`pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-br ${a.seam} opacity-40 blur-md`}
                      />
                      {/* Inner shimmer */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-white/20 to-transparent"
                      />
                      <span className="relative">{icon}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    {subtitle && (
                      <p className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${a.labelTint}`}>
                        <span className={`inline-block h-1 w-1 rounded-full bg-current animate-pulse`} />
                        {subtitle}
                      </p>
                    )}
                    {title && (
                      <h2 className="mt-0.5 truncate text-lg font-bold leading-tight tracking-tight sm:text-xl">
                        {title}
                      </h2>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                className={`group/x shrink-0 rounded-xl bg-white/5 p-2 ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/20 hover:ring-white/30 hover:text-white active:scale-95 ${a.closeTint}`}
              >
                <X className="h-4 w-4 transition-transform group-hover/x:rotate-90" />
              </button>
            </div>
          </div>
        )}

        {/* Body — premium thin scrollbar */}
        <div className="sidebar-scroll relative flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="relative shrink-0 border-t border-gray-200/70 bg-gradient-to-br from-white via-gray-50/90 to-white px-5 py-4 backdrop-blur-xl dark:border-gray-800/70 dark:from-gray-900 dark:via-gray-900/90 dark:to-gray-950">
            {/* Top accent line — picks up the drawer's accent color */}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent ${
                accent === "indigo"  ? "via-indigo-400/50" :
                accent === "violet"  ? "via-violet-400/50" :
                accent === "emerald" ? "via-emerald-400/50" :
                accent === "amber"   ? "via-amber-400/50" :
                accent === "rose"    ? "via-rose-400/50" :
                "via-sky-400/50"
              } to-transparent`}
            />
            {/* Soft top edge shadow — hints at scrollable content above */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-3 h-3 bg-gradient-to-t from-black/[0.03] to-transparent dark:from-black/20"
            />
            <div className="relative">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
