export type MedicineFormIconName = "tablet" | "capsule" | "syrup" | "sachet" | "injection" | "unknown";

export interface MedicineFormAppearance {
  icon: MedicineFormIconName;
  backgroundClass: string;
  iconClass: string;
}

const appearanceByForm: Record<string, MedicineFormAppearance> = {
  tablet: { icon: "tablet", backgroundClass: "bg-blue-100 dark:bg-blue-950/60", iconClass: "text-blue-700 dark:text-blue-300" },
  capsule: { icon: "capsule", backgroundClass: "bg-purple-100 dark:bg-purple-950/60", iconClass: "text-purple-700 dark:text-purple-300" },
  syrup: { icon: "syrup", backgroundClass: "bg-emerald-100 dark:bg-emerald-950/60", iconClass: "text-emerald-700 dark:text-emerald-300" },
  sachet: { icon: "sachet", backgroundClass: "bg-amber-100 dark:bg-amber-950/60", iconClass: "text-amber-700 dark:text-amber-300" },
  injection: { icon: "injection", backgroundClass: "bg-orange-100 dark:bg-orange-950/60", iconClass: "text-orange-700 dark:text-orange-300" },
};

const fallbackAppearance: MedicineFormAppearance = {
  icon: "unknown",
  backgroundClass: "bg-slate-100 dark:bg-slate-800",
  iconClass: "text-slate-600 dark:text-slate-300",
};

/** Resolve presentation from a stored dosage-form value without changing that value. */
export function getMedicineFormAppearance(type: string | null | undefined): MedicineFormAppearance {
  const normalized = type?.trim().toLowerCase();
  return normalized ? appearanceByForm[normalized] ?? fallbackAppearance : fallbackAppearance;
}
