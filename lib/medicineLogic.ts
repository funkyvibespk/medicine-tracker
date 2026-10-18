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
  scheduledInstant?: string;
  actualTakenTime?: string;
  isPrn?: boolean;
}

export type StockStatus = "out" | "low" | "available" | "unknown";
export const OVERDUE_THRESHOLD_MS = 5 * 60_000;

export function isOccurrenceOverdue(scheduledAt: Date, now: Date): boolean {
  return now.getTime() - scheduledAt.getTime() >= OVERDUE_THRESHOLD_MS;
}

export type OccurrenceTimeStatus = "upcoming" | "due" | "overdue";

export function getOccurrenceTimeStatus(scheduledAt: Date, now: Date): OccurrenceTimeStatus {
  const elapsedMs = now.getTime() - scheduledAt.getTime();
  if (elapsedMs < 0) return "upcoming";
  if (elapsedMs < OVERDUE_THRESHOLD_MS) return "due";
  return "overdue";
}

export interface MissedOccurrenceCandidate extends OccurrenceRecord {
  status: "missed";
  medicineName?: string;
  medicineType?: string;
  medicineStrength?: string;
}

export interface PendingOccurrenceCandidate extends OccurrenceRecord {
  status: "overdue";
  medicineName?: string;
  medicineType?: string;
  medicineStrength?: string;
}

export function scheduledOccurrenceKey(medicineId: string, scheduledDate: string, scheduledTime: string, scheduledInstant?: string): string {
  return JSON.stringify([medicineId, scheduledDate, scheduledTime, scheduledInstant ?? null]);
}

export function getOutstandingMissedOccurrences<T extends OccurrenceRecord & { status?: string }>(records: T[], today: string): T[] {
  return canonicalizeOccurrenceRecords(records)
    .filter((record) => !record.isPrn && record.status === "missed" && !record.actualTakenTime && record.scheduledDate < today)
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || b.scheduledTime.localeCompare(a.scheduledTime));
}

/** Same-day missed records not represented by today's current schedule still need an actionable dashboard row. */
export function getUnscheduledSameDayMissedOccurrences<T extends OccurrenceRecord & { status?: string }>(
  records: T[],
  today: string,
  representedOccurrenceKeys: ReadonlySet<string>,
): T[] {
  return canonicalizeOccurrenceRecords(records).filter((record) =>
    !record.isPrn && record.scheduledDate === today && record.status === "missed" && !record.actualTakenTime &&
    !representedOccurrenceKeys.has(scheduledOccurrenceKey(record.medicineId, record.scheduledDate, record.scheduledTime, record.scheduledInstant))
  );
}

interface DoseOutcomeRecord extends OccurrenceRecord {
  status?: string;
  medicineName?: string;
  medicineType?: string;
  medicineStrength?: string;
}

/** Collapse only records with the same explicit occurrence identity for display and summaries. */
export function canonicalizeOccurrenceRecords<R extends DoseOutcomeRecord>(records: R[]): R[] {
  const canonical = new Map<string, R>();
  for (const record of records) {
    const key = scheduledOccurrenceKey(record.medicineId, record.scheduledDate, record.scheduledTime, record.scheduledInstant);
    const existing = canonical.get(key);
    if (!existing) {
      canonical.set(key, record);
      continue;
    }

    const chosen = existing.actualTakenTime ? existing : record.actualTakenTime ? record : existing;
    const actualTakenTime = [existing.actualTakenTime, record.actualTakenTime]
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
    const hasTakenOutcome = Boolean(actualTakenTime) || isTakenOutcome(existing.status) || isTakenOutcome(record.status);
    const status = hasTakenOutcome
      ? actualTakenTime ? (isTakenOutcome(chosen.status) ? chosen.status : "taken_late") : chosen.status
      : existing.status === "missed" || record.status === "missed" ? "missed" : existing.status;
    canonical.set(key, {
      ...existing,
      ...chosen,
      id: existing.id,
      actualTakenTime,
      status,
      medicineName: existing.medicineName ?? record.medicineName,
      medicineType: existing.medicineType ?? record.medicineType,
      medicineStrength: existing.medicineStrength ?? record.medicineStrength,
    } as R);
  }
  return [...canonical.values()];
}

function isTakenOutcome(status?: string) {
  return Boolean(status?.startsWith("taken"));
}

/** Add or update missed outcomes without replacing existing taken or missed records. */
export function upsertMissedOccurrenceRecords<R extends DoseOutcomeRecord>(
  doseRecords: R[],
  candidates: MissedOccurrenceCandidate[],
): R[] {
  const nextRecords = [...doseRecords];
  const recordsByOccurrence = new Map<string, number[]>();
  const keyFor = (record: OccurrenceRecord) => scheduledOccurrenceKey(record.medicineId, record.scheduledDate, record.scheduledTime, record.scheduledInstant);
  nextRecords.forEach((record, index) => {
    if (record.isPrn) return;
    const key = keyFor(record);
    const indices = recordsByOccurrence.get(key) ?? [];
    indices.push(index);
    recordsByOccurrence.set(key, indices);
  });

  let changed = false;
  for (const candidate of candidates) {
    if (candidate.isPrn) continue;
    const key = keyFor(candidate);
    const existingIndices = recordsByOccurrence.get(key);
    if (existingIndices?.length) {
      const existing = existingIndices.map((index) => nextRecords[index]);
      if (existing.some((record) => record.actualTakenTime || record.status === "missed")) continue;
      const existingIndex = existingIndices[0];
      nextRecords[existingIndex] = { ...nextRecords[existingIndex], status: "missed" } as R;
    } else {
      nextRecords.push(candidate as R);
      recordsByOccurrence.set(key, [nextRecords.length - 1]);
    }
    changed = true;
  }
  return changed ? nextRecords : doseRecords;
}

/** Add unresolved overdue occurrences once; reconciliation promotes these to missed at the next-dose cutoff. */
export function upsertPendingOccurrenceRecords<R extends DoseOutcomeRecord>(
  doseRecords: R[],
  candidates: PendingOccurrenceCandidate[],
): R[] {
  const existing = new Set(doseRecords.filter((record) => !record.isPrn).map((record) =>
    scheduledOccurrenceKey(record.medicineId, record.scheduledDate, record.scheduledTime, record.scheduledInstant)
  ));
  const additions: R[] = [];
  for (const candidate of candidates) {
    if (candidate.isPrn) continue;
    const key = scheduledOccurrenceKey(candidate.medicineId, candidate.scheduledDate, candidate.scheduledTime, candidate.scheduledInstant);
    if (existing.has(key)) continue;
    existing.add(key);
    additions.push(candidate as R);
  }
  return additions.length ? [...doseRecords, ...additions] : doseRecords;
}

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
  reason?: "pending" | "invalid-dose" | "medicine-not-found" | "incompatible-units" | "insufficient-stock" | "duplicate" | "ambiguous-occurrence";
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

  // Older interval records have only a local clock label. At fall-back, that
  // label cannot identify which real occurrence was recorded, so do not risk
  // associating it with a new instant or deducting stock a second time.
  if (record.scheduledInstant && doseRecords.some((saved) =>
    !saved.isPrn && saved.medicineId === record.medicineId && saved.scheduledDate === record.scheduledDate &&
    saved.scheduledTime === record.scheduledTime && !saved.scheduledInstant
  )) {
    return { accepted: false, reason: "ambiguous-occurrence", medicines, doseRecords };
  }

  const matchesOccurrence = (saved: R) =>
    saved.medicineId === record.medicineId &&
    saved.scheduledDate === record.scheduledDate &&
    (record.isPrn
      ? Boolean(saved.isPrn)
      : !saved.isPrn && saved.scheduledTime === record.scheduledTime &&
        (record.scheduledInstant ? saved.scheduledInstant === record.scheduledInstant : !saved.scheduledInstant))
  const existingIndex = doseRecords.findIndex(matchesOccurrence);
  if (doseRecords.some((saved) => matchesOccurrence(saved) && (Boolean(saved.actualTakenTime) || isTakenOutcome((saved as DoseOutcomeRecord).status)))) {
    return { accepted: false, reason: "duplicate", medicines, doseRecords };
  }

  const remaining = Math.max(0, Math.round((medicine.inventoryAmount - doseAmount + Number.EPSILON) * 1_000_000) / 1_000_000);
  const nextMedicines = medicines.map((item, index) => index === medicineIndex
    ? { ...item, inventoryAmount: remaining }
    : item);
  const nextRecords = [...doseRecords];
  if (existingIndex >= 0) {
    // Keep duplicate legacy representations consistent without removing their IDs or fields.
    for (let index = 0; index < nextRecords.length; index++) {
      if (matchesOccurrence(nextRecords[index])) {
        nextRecords[index] = { ...nextRecords[index], ...record, id: nextRecords[index].id };
      }
    }
  } else {
    nextRecords.push(record);
  }

  return { accepted: true, medicines: nextMedicines, doseRecords: nextRecords };
}

export function scheduledOccurrenceId(medicineId: string, scheduledDate: string, scheduledTime: string, scheduledInstant?: string): string {
  return `${medicineId}-${scheduledDate}-${scheduledTime}${scheduledInstant ? `-${new Date(scheduledInstant).getTime()}` : ""}`;
}

export function minutesFromScheduledOccurrence(
  scheduledDate: string,
  scheduledTime: string,
  actualTakenTime: string,
  scheduledInstant?: string,
): number {
  const [year, month, day] = scheduledDate.split("-").map(Number);
  const [hour, minute] = scheduledTime.split(":").map(Number);
  const scheduledAt = scheduledInstant ? new Date(scheduledInstant) : new Date(year, month - 1, day, hour, minute);
  return Math.round((new Date(actualTakenTime).getTime() - scheduledAt.getTime()) / 60_000);
}
