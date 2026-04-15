import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

type Variant = "danger" | "warning" | "info";

interface Props {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles: Record<Variant, { icon: string; ring: string; btn: string }> = {
  danger: {
    icon: "text-rose-600 dark:text-rose-400",
    ring: "bg-rose-100 dark:bg-rose-500/10",
    btn: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    ring: "bg-amber-100 dark:bg-amber-500/10",
    btn: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
  },
  info: {
    icon: "text-indigo-600 dark:text-indigo-400",
    ring: "bg-indigo-100 dark:bg-indigo-500/10",
    btn: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500",
  },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
      if (e.key === "Enter" && !loading) onConfirm();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, loading, onCancel, onConfirm]);

  if (!open) return null;

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <button
          onClick={() => !loading && onCancel()}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${styles.ring}`}>
              <AlertTriangle className={`h-5 w-5 ${styles.icon}`} />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
              {description && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-900/60">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-gray-900 ${styles.btn}`}
          >
            {loading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
