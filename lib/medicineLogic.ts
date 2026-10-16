export type MedicineTypeName = "Tablet" | "Capsule" | "Syrup" | "Sachet" | "Injection";

export interface StockedMedicine {
  id: string;
  type: MedicineTypeName;
  inventoryAmount: number;
  inventoryUnit?: string;
  doseUnit?: string;
  lowStockThreshold?: number;
  lowStockThresholdUnit?: string;
}

export interface OccurrenceRecord {
  id: string;
  medicineId: string;
  scheduledDate: string;
  scheduledTime: string;
  actualTakenTime?: string;
  isPrn?: boolean;
}

export type StockStatus = "out" | "low" | "available" | "unknown";

export function unitForMedicineType(type: MedicineTypeName): string {
  switch (type) {
    case "Tablet": return "tablets";
    case "Capsule": return "capsules";
    case "Syrup": return "ml";
    case "Sachet": return "sachets";
    case "Injection": return "vials";
  }
}

export function doseUnitFor(medicine: Pick<StockedMedicine, "type" | "doseUnit">): string {
  return medicine.doseUnit ?? unitForMedicineType(medicine.type);
}

export function inventoryUnitFor(medicine: Pick<StockedMedicine, "type" | "inventoryUnit">): string {
  // Older local records have no explicit unit; use the unit the existing UI used.
  return medicine.inventoryUnit ?? unitForMedicineType(medicine.type);
}

export function inventoryUnitsCompatible(medicine: StockedMedicine): boolean {
  return inventoryUnitFor(medicine).trim().toLowerCase() === doseUnitFor(medicine).trim().toLowerCase();
}

export function getStockStatus(medicine: StockedMedicine): StockStatus {
  if (!Number.isFinite(medicine.inventoryAmount)) return "unknown";
  if (medicine.inventoryAmount <= 0) return "out";
  if (!inventoryUnitsCompatible(medicine)) return "unknown";

  const threshold = medicine.lowStockThreshold;
  if (typeof threshold !== "number" || !Number.isFinite(threshold)) return "available";
  const thresholdUnit = medicine.lowStockThresholdUnit ?? inventoryUnitFor(medicine);
  if (thresholdUnit.trim().toLowerCase() !== inventoryUnitFor(medicine).trim().toLowerCase()) return "unknown";
  return medicine.inventoryAmount <= Math.max(0, threshold) ? "low" : "available";
}

export function availableVolumeFromContainers(containerCount: number, containerCapacityMl: number): number {
  if (!Number.isFinite(containerCount) || !Number.isFinite(containerCapacityMl) || containerCount < 0 || containerCapacityMl < 0) return 0;
  return Math.round((containerCount * containerCapacityMl + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export interface ApplyTakenDoseResult<M extends StockedMedicine, R extends OccurrenceRecord> {
  accepted: boolean;
  reason?: "pending" | "invalid-dose" | "medicine-not-found" | "incompatible-units" | "insufficient-stock" | "duplicate";
  medicines: M[];
  doseRecords: R[];
}

/** Pure operation used by the tracker when a dose is recorded as taken. */
export function applyTakenDose<M extends StockedMedicine, R extends OccurrenceRecord>(
  medicines: M[],
  doseRecords: R[],
  record: R,
  doseAmount: number,
): ApplyTakenDoseResult<M, R> {
  if (!record.actualTakenTime || Number.isNaN(new Date(record.actualTakenTime).getTime())) {
    return { accepted: false, reason: "pending", medicines, doseRecords };
  }
  if (!Number.isFinite(doseAmount) || doseAmount <= 0) {
    return { accepted: false, reason: "invalid-dose", medicines, doseRecords };
  }

  const medicineIndex = medicines.findIndex((medicine) => medicine.id === record.medicineId);
  if (medicineIndex < 0) return { accepted: false, reason: "medicine-not-found", medicines, doseRecords };
  const medicine = medicines[medicineIndex];
  if (!inventoryUnitsCompatible(medicine)) {
    return { accepted: false, reason: "incompatible-units", medicines, doseRecords };
  }
  if (medicine.inventoryAmount + Number.EPSILON < doseAmount) {
    return { accepted: false, reason: "insufficient-stock", medicines, doseRecords };
  }

  const matchesOccurrence = (saved: R) =>
    saved.medicineId === record.medicineId &&
    saved.scheduledDate === record.scheduledDate &&
    (record.isPrn
      ? Boolean(saved.isPrn)
      : !saved.isPrn && saved.scheduledTime === record.scheduledTime)
  const existingIndex = doseRecords.findIndex(matchesOccurrence);
  if (doseRecords.some((saved) => matchesOccurrence(saved) && Boolean(saved.actualTakenTime))) {
    return { accepted: false, reason: "duplicate", medicines, doseRecords };
  }

  const remaining = Math.max(0, Math.round((medicine.inventoryAmount - doseAmount + Number.EPSILON) * 1_000_000) / 1_000_000);
  const nextMedicines = medicines.map((item, index) => index === medicineIndex
    ? { ...item, inventoryAmount: remaining }
    : item);
  const nextRecords = [...doseRecords];
  if (existingIndex >= 0) {
    // Preserve an old pending occurrence's identity and other stored fields.
    nextRecords[existingIndex] = { ...nextRecords[existingIndex], ...record, id: nextRecords[existingIndex].id };
  } else {
    nextRecords.push(record);
  }

  return { accepted: true, medicines: nextMedicines, doseRecords: nextRecords };
}

export function scheduledOccurrenceId(medicineId: string, scheduledDate: string, scheduledTime: string): string {
  return `${medicineId}-${scheduledDate}-${scheduledTime}`;
}

export function minutesFromScheduledOccurrence(
  scheduledDate: string,
  scheduledTime: string,
  actualTakenTime: string,
): number {
  const [year, month, day] = scheduledDate.split("-").map(Number);
  const [hour, minute] = scheduledTime.split(":").map(Number);
  const scheduledAt = new Date(year, month - 1, day, hour, minute);
  return Math.round((new Date(actualTakenTime).getTime() - scheduledAt.getTime()) / 60_000);
}
