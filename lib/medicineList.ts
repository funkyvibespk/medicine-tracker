export interface MedicineWithCreationDate {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  name?: string;
}

export interface OptionalMedicineDetails {
  expiryDate?: string;
  composition?: string;
}

export function normalizeOptionalMedicineDetails(details: OptionalMedicineDetails): OptionalMedicineDetails {
  return {
    expiryDate: details.expiryDate?.trim() || undefined,
    composition: details.composition?.trim() || undefined,
  };
}

export function applyMedicineUpdatePreservingCreationDate<T extends MedicineWithCreationDate>(
  medicine: T,
  updates: Partial<T>,
): T {
  return { ...medicine, ...updates, id: medicine.id, createdAt: medicine.createdAt };
}

function timestamp(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/** Sorts a derived view; dated medicines come first, newest first. */
export function sortMedicinesNewestFirst<T extends MedicineWithCreationDate>(medicines: readonly T[]): T[] {
  return medicines
    .map((medicine, index) => ({ medicine, index, sortTime: timestamp(medicine.updatedAt) ?? timestamp(medicine.createdAt) }))
    .sort((a, b) => {
      if (a.sortTime !== null && b.sortTime !== null && a.sortTime !== b.sortTime) return b.sortTime - a.sortTime;
      if (a.sortTime !== null && b.sortTime === null) return -1;
      if (a.sortTime === null && b.sortTime !== null) return 1;
      return (a.medicine.name ?? "").localeCompare(b.medicine.name ?? "") || a.medicine.id.localeCompare(b.medicine.id) || a.index - b.index;
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
