import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type Side = "right" | "left";
type Size = "sm" | "md" | "lg" | "xl" | "full";

interface Props {
  open: boolean;
  onClose: () => void;
  side?: Side;
  size?: Size;
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

export default function Drawer({
  open,
  onClose,
  side = "right",
  size = "xl",
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
      const t = setTimeout(() => setMounted(false), 250);
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

  const sideClasses =
    side === "right"
      ? `right-0 ${show ? "translate-x-0" : "translate-x-full"}`
      : `left-0 ${show ? "translate-x-0" : "-translate-x-full"}`;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <div
        onClick={() => closeOnBackdrop && onClose()}
        className={`absolute inset-0 bg-gray-950/50 backdrop-blur-sm transition-opacity duration-200 ${
          show ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute inset-y-0 ${sideClasses} flex w-full ${SIZES[size]} flex-col bg-white shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out dark:bg-gray-900 dark:ring-white/10 ${className}`}
      >
        {!hideHeader && (header || title || icon) && (
          <div className="relative overflow-hidden border-b border-gray-200/70 bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 px-5 py-4 text-white dark:from-black dark:via-indigo-950 dark:to-black">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl" />
            </div>
            <div className="relative flex items-center justify-between gap-3">
              {header ?? (
                <div className="flex min-w-0 items-center gap-3">
                  {icon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {subtitle && (
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200/80">
                        {subtitle}
                      </p>
                    )}
                    {title && (
                      <h2 className="truncate text-lg font-bold leading-tight">
                        {title}
                      </h2>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-lg p-2 text-indigo-200/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="border-t border-gray-200/70 bg-gray-50/60 px-5 py-3 dark:border-gray-800/60 dark:bg-gray-900/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
