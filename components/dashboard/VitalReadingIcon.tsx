import type { VitalReadingType } from "@/lib/vitalTrack";

export const VITAL_READING_ACCENT_CLASSES: Record<VitalReadingType, string> = {
  "blood-pressure": "border-red-100 bg-red-50/70 text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  "heart-rate": "border-orange-100 bg-orange-50/70 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300",
  "oxygen-saturation": "border-sky-100 bg-sky-50/70 text-sky-600 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300",
  "blood-sugar": "border-violet-100 bg-violet-50/70 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/50 dark:text-violet-300",
};

export const VITAL_READING_TEXT_CLASSES: Record<VitalReadingType, string> = {
  "blood-pressure": "text-red-600 dark:text-red-300",
  "heart-rate": "text-orange-600 dark:text-orange-300",
  "oxygen-saturation": "text-sky-600 dark:text-sky-300",
  "blood-sugar": "text-violet-700 dark:text-violet-300",
};

export function VitalReadingIcon({ type, className = "h-5 w-5" }: { type: VitalReadingType; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (type === "blood-pressure") return <svg {...common}><path d="M20.8 4.8a5.4 5.4 0 0 0-7.6 0L12 6l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/><path d="M4.8 12h3l1.4-2.7 2.2 5.3 1.7-3h3.4"/></svg>;
  if (type === "heart-rate") return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M5.5 12h3l1.5-4 3.2 8 1.6-4h3.7"/></svg>;
  if (type === "oxygen-saturation") return <svg {...common}><path d="M3 7h11a2.5 2.5 0 1 0-2.4-3.2"/><path d="M2 12h16a2.5 2.5 0 1 1-2.4 3.2"/><path d="M4 17h8"/></svg>;
  return <svg {...common}><path d="M12 22s-7-4.4-7-11a7 7 0 1 1 14 0c0 6.6-7 11-7 11Z"/></svg>;
}

export function VitalReadingIconBadge({ type, className = "h-9 w-9" }: { type: VitalReadingType; className?: string }) {
  return <span className={`flex shrink-0 items-center justify-center rounded-xl border ${VITAL_READING_ACCENT_CLASSES[type]} ${className}`} aria-hidden="true"><VitalReadingIcon type={type} /></span>;
}
