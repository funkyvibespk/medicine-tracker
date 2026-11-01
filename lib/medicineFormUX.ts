export type MedicineFormPrompt = "duplicate" | "unsaved" | null;
export type MedicineFormEscapeAction = "dismiss-duplicate" | "dismiss-unsaved" | "confirm-unsaved" | "close-form";
export type MedicineFormCloseAction = "confirm-unsaved" | "close-form";
export type MedicineDuplicateAction = "view-existing" | "restart-existing";

export function hasMedicineFormChanges(initialValues: unknown, currentValues: unknown): boolean {
  return JSON.stringify(initialValues) !== JSON.stringify(currentValues);
}

export function medicineFormCloseAction(isDirty: boolean): MedicineFormCloseAction {
  return isDirty ? "confirm-unsaved" : "close-form";
}

export function medicineFormEscapeAction(prompt: MedicineFormPrompt, isDirty: boolean): MedicineFormEscapeAction {
  if (prompt === "duplicate") return "dismiss-duplicate";
  if (prompt === "unsaved") return "dismiss-unsaved";
  return medicineFormCloseAction(isDirty);
}

export function unsavedChangesChoiceAction(choice: "save" | "discard" | "cancel"): "submit" | "close-form" | "resume-editing" {
  if (choice === "save") return "submit";
  if (choice === "discard") return "close-form";
  return "resume-editing";
}

export function medicineDuplicateAction(
  medicine: { archivedAt?: string; endDate?: string; treatmentPeriods?: Array<{ status: string; endDate?: string }> },
  today: string,
): MedicineDuplicateAction {
  if (medicine.archivedAt) return "restart-existing";
  const hasPeriods = Boolean(medicine.treatmentPeriods?.length);
  const active = hasPeriods
    ? medicine.treatmentPeriods!.some((period) => period.status === "active" && (!period.endDate || period.endDate >= today))
    : !medicine.endDate || medicine.endDate >= today;
  return active ? "view-existing" : "restart-existing";
}
