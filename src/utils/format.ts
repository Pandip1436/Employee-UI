/**
 * Format decimal hours (e.g. 5.76) into a human-readable "Xh Ym" string.
 *  5.76  -> "5h 46m"
 *  10.0  -> "10h"
 *  0.05  -> "3m"
 *  0     -> "0h"
 *  null  -> "—"
 */
export function fmtHours(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "—";
  const totalMinutes = Math.round(value * 60);
  if (totalMinutes <= 0) return "0h";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
