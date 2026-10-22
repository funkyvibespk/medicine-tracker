export interface MedicineWithCreationDate {
  id: string;
  createdAt?: string;
}

export function applyMedicineUpdatePreservingCreationDate<T extends MedicineWithCreationDate>(
  medicine: T,
  updates: Partial<T>,
): T {
  return { ...medicine, ...updates, createdAt: medicine.createdAt };
}

function timestamp(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/** Sorts a derived view; dated medicines come first, newest first. */
export function sortMedicinesNewestFirst<T extends MedicineWithCreationDate>(medicines: readonly T[]): T[] {
  return medicines
    .map((medicine, index) => ({ medicine, index, createdAt: timestamp(medicine.createdAt) }))
    .sort((a, b) => {
      if (a.createdAt !== null && b.createdAt !== null && a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
      if (a.createdAt !== null && b.createdAt === null) return -1;
      if (a.createdAt === null && b.createdAt !== null) return 1;
      return a.medicine.id.localeCompare(b.medicine.id) || a.index - b.index;
    })
    .map(({ medicine }) => medicine);
}

/** Formats the original stored creation instant in the browser's local time zone. */
export function formatMedicineAddedAt(createdAt: string | undefined): string {
  const value = timestamp(createdAt);
  if (value === null) return "Added date unavailable";
  const date = new Date(value);
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `Added ${dateLabel} · ${timeLabel}`;
}
