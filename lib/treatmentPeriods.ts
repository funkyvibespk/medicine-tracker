import type { Medicine, MedicineTreatmentPeriod } from "@/contexts/MedicineContext";

function id(): string {
  const uuid = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `treatment-${uuid}`;
}

export function createTreatmentPeriod(medicine: Medicine, now = new Date(), periodId = id()): MedicineTreatmentPeriod {
  const startedAt = medicine.createdAt && new Date(medicine.createdAt).getTime() > now.getTime()
    ? medicine.createdAt
    : now.toISOString();
  return {
    id: periodId,
    status: "active",
    startDate: medicine.startDate,
    startedAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    medicineName: medicine.name,
    medicineType: medicine.type,
    medicineStrength: medicine.strength,
    doseAmount: medicine.doseAmount,
    doseUnit: medicine.doseUnit,
    frequency: medicine.frequency,
    intervalHours: medicine.intervalHours,
    scheduleTimes: [...medicine.scheduleTimes],
    prescribingDoctor: medicine.prescribingDoctor,
    prescribingClinic: medicine.prescribingClinic,
    prescriptionDate: medicine.prescriptionDate,
    prescriptionNotes: medicine.prescriptionNotes,
    instructions: medicine.instructions,
    scheduleRevisions: [{
      effectiveAt: startedAt,
      frequency: medicine.frequency,
      intervalHours: medicine.intervalHours,
      scheduleTimes: [...medicine.scheduleTimes],
      startDate: medicine.startDate,
      endDate: medicine.endDate,
    }],
  };
}

/** Archive an existing medicine identity without altering its saved historical snapshots. */
export function archiveMedicineForDeletion(medicine: Medicine, archivedAt: string, endDate: string): Medicine {
  return {
    ...medicine,
    archivedAt,
    endDate,
    updatedAt: archivedAt,
    treatmentPeriods: (medicine.treatmentPeriods ?? []).map((period) => period.status === "active"
      ? { ...period, status: "discontinued", endDate, endedAt: archivedAt, updatedAt: archivedAt }
      : period),
  };
}

/** Add a current-period baseline without assigning historical records to it. */
export function ensureCurrentTreatmentPeriod(medicine: Medicine, now = new Date()): Medicine {
  // Once period history exists, never infer a new active treatment on reload.
  if (medicine.archivedAt || medicine.treatmentPeriods?.length) return medicine;
  if (medicine.endDate && medicine.endDate < localDateString(now)) return medicine;
  const period = createTreatmentPeriod(medicine, now, `legacy-current-${medicine.id}`);
  // The former schedule baseline intentionally retained today's earlier times after hydration.
  // Bound this synthetic period to today only rather than assigning older dose history to it.
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  period.startedAt = dayStart;
  const lastLegacyRevision = medicine.scheduleRevisions?.at(-1);
  if (lastLegacyRevision) {
    period.scheduleRevisions = [{
      ...lastLegacyRevision,
      effectiveAt: dayStart,
      hydrationBaseline: true,
      startDate: period.startDate,
      endDate: medicine.endDate,
      scheduleTimes: [...lastLegacyRevision.scheduleTimes],
    }];
    period.frequency = lastLegacyRevision.frequency;
    period.intervalHours = lastLegacyRevision.intervalHours;
    period.scheduleTimes = [...lastLegacyRevision.scheduleTimes];
  } else {
    period.scheduleRevisions[0] = { ...period.scheduleRevisions[0], effectiveAt: dayStart, hydrationBaseline: true };
  }
  return { ...medicine, treatmentPeriods: [...(medicine.treatmentPeriods ?? []), period] };
}

export function treatmentPeriodForInstant(medicine: Medicine, instant: Date): MedicineTreatmentPeriod | undefined {
  const time = instant.getTime();
  return medicine.treatmentPeriods?.find((period) => {
    const startsAt = new Date(period.startedAt).getTime();
    const endsAt = period.endedAt ? new Date(period.endedAt).getTime() : Number.POSITIVE_INFINITY;
    const date = localDateString(instant);
    return period.startDate <= date && (!period.endDate || period.endDate >= date) &&
      Number.isFinite(startsAt) && time >= startsAt && time < endsAt;
  });
}

export function localDateString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
