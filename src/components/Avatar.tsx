import { useState, useEffect } from "react";

interface AvatarProps {
  name: string;
  photo?: string | null;
  /** Sizing / shape / ring classes applied to the circle (e.g. "h-10 w-10 rounded-full"). */
  className?: string;
  /** Text sizing classes for the initials fallback. */
  textClassName?: string;
  /** Gradient used behind the initials fallback. */
  gradient?: string;
}

/**
 * Renders a user's profile photo, falling back to their initials on a gradient
 * when no photo is set or the image fails to load.
 */
export default function Avatar({
  name,
  photo,
  className = "",
  textClassName = "text-xs font-bold",
  gradient = "from-indigo-500 to-purple-600",
}: AvatarProps) {
  const [broken, setBroken] = useState(false);
  // A freshly-issued signed URL deserves another load attempt.
  useEffect(() => { setBroken(false); }, [photo]);

  const init = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  // Absolute URLs (https://, http://, data:) are used as-is; relative paths get
  // a leading slash so they resolve from the public root.
  const src = photo
    ? (/^(https?:|data:)/i.test(photo) ? photo : `/${photo.replace(/^\/+/, "")}`)
    : null;

  if (src && !broken) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${gradient} text-white ${textClassName} ${className}`}>
      {init}
    </div>
  );
}
